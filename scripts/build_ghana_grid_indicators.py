"""
Build the Ghana 0.5-degree indicator grid for the atlas-viewer.

Takes the per-variable CSVs from the PIK/ISIMIP impact delivery (one file per
variable x scenario x period, columns lat,lon,value,name,sceno,period) and
turns them into one GeoJSON per variable: a 0.5-degree cell grid clipped to the
Ghana adm0 border, carrying every time slice as a feature property.

One file per variable (not per variable+time+scenario) because the geometry is
~63 KB while the values are ~1.2 KB: repeating the geometry across 60 files
would mean re-downloading the coastline on every time/scenario switch. This way
switching time or scenario is a restyle with no fetch, matching the
`singleFileMultiTime` pattern the crop layers already use.

Properties per feature:
  lat_lon               join key, "<lat>_<lon>" of the cell centre
  hist                  historical 1985-2014 median
  ssp126__mid           ssp126 2036-2065 median   (Low, ~2050)
  ssp126__late          ssp126 2066-2095 median   (Low, ~2080)
  ssp585__mid           ssp585 2036-2065 median   (High, ~2050)
  ssp585__late          ssp585 2066-2095 median   (High, ~2080)

Only absolute values are stored. Change vs the baseline is derivable in the
frontend (`props.ssp585__late - props.hist`), so it is not duplicated here —
that keeps the choice between absolute / difference / percent a styling
decision instead of a data rebuild. ssp370 is present in the source delivery
but deliberately skipped: the viewer only exposes Low/High.

Usage:
  python scripts/build_ghana_grid_indicators.py \
      --data     "C:/.../Data/impact_data_Ghana (13.08.2026)" \
      --boundary "C:/.../Data/ghana_boundaries/gha_admbnda_adm0_gss_20210308.shp" \
      --out      build/ghana_grid [--gzip]

Writes <out>/ghana_grid_<variable>.geojson plus <out>/ghana_grid_manifest.json
(prefixed, because the bucket is shared with other datasets). The manifest lists
every file with its value ranges (min/p2/p98/max per time slice, and for the
differences vs baseline) — those are the numbers to base the legend colour
scales on. The bucket does not allow listing, so the manifest is also the only
inventory of what was uploaded.
"""

import argparse
import csv
import gzip
import json
import re
import struct
from collections import defaultdict
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, box, mapping
from shapely.ops import unary_union

# sceno/period values in the source filenames -> property suffixes
SCENARIOS = {"ssp126": "ssp126", "ssp585": "ssp585"}  # ssp370 intentionally dropped
PERIODS = {"1985-2014": "hist", "2036-2065": "mid", "2066-2095": "late"}

FILENAME_RE = re.compile(r"^(?P<var>.+)_ghana_(?P<sceno>[^_]+)_(?P<period>[\d-]+)_median$")

NODATA = {"", "nan", "NaN", "NA", "na", "None"}


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", required=True, help="Folder with the per-variable CSVs")
    p.add_argument("--boundary", required=True, help="adm0 boundary (.shp or .geojson)")
    p.add_argument("--out", default="build/ghana_grid", help="Output folder")
    p.add_argument("--precision", type=int, default=5, help="Coordinate decimals (5 = ~1 m)")
    p.add_argument("--value-precision", type=int, default=3, help="Value decimals")
    p.add_argument("--gzip", action="store_true", help="Also write .geojson.gz (upload with Content-Encoding: gzip)")
    return p.parse_args()


def read_shapefile_polygons(path):
    """Rings out of a polygon shapefile (type 5), without pyshp/geopandas."""
    buf = path.read_bytes()
    (shape_type,) = struct.unpack("<i", buf[32:36])
    if shape_type not in (5, 15, 25):
        raise SystemExit(f"{path.name}: shape type {shape_type} is not a polygon")

    pos, rings = 100, []
    while pos < len(buf):
        _, content_len = struct.unpack(">ii", buf[pos:pos + 8])
        record = buf[pos + 8: pos + 8 + content_len * 2]
        pos += 8 + content_len * 2
        (rec_type,) = struct.unpack("<i", record[:4])
        if rec_type == 0:  # null shape
            continue
        n_parts, n_points = struct.unpack("<ii", record[36:44])
        parts = struct.unpack(f"<{n_parts}i", record[44:44 + 4 * n_parts])
        offset = 44 + 4 * n_parts
        flat = struct.unpack(f"<{n_points * 2}d", record[offset:offset + 16 * n_points])
        xy = list(zip(flat[0::2], flat[1::2]))
        for i, start in enumerate(parts):
            end = parts[i + 1] if i + 1 < n_parts else n_points
            ring = xy[start:end]
            if len(ring) >= 4:
                rings.append(ring)
    return rings


def load_boundary(path):
    """Country outline as a single (Multi)Polygon."""
    path = Path(path)
    if path.suffix.lower() == ".shp":
        polys = [Polygon(r).buffer(0) for r in read_shapefile_polygons(path)]
    else:
        data = json.loads(path.read_text(encoding="utf-8"))
        feats = data["features"] if data.get("type") == "FeatureCollection" else [data]
        polys = []
        for feat in feats:
            geom = feat.get("geometry", feat)
            if geom["type"] == "Polygon":
                polys.append(Polygon(geom["coordinates"][0], geom["coordinates"][1:]).buffer(0))
            elif geom["type"] == "MultiPolygon":
                for rings in geom["coordinates"]:
                    polys.append(Polygon(rings[0], rings[1:]).buffer(0))
    outline = unary_union(polys)
    if outline.is_empty:
        raise SystemExit(f"{path.name}: empty geometry")
    return outline


def read_values(data_dir, value_precision):
    """{variable: {slice_key: {lat_lon: value}}} plus the set of grid cell centres."""
    per_variable = defaultdict(dict)
    cells, skipped = {}, defaultdict(int)

    for csv_path in sorted(Path(data_dir).glob("*.csv")):
        match = FILENAME_RE.match(csv_path.stem)
        if not match:
            skipped["unrecognised filename"] += 1
            continue
        variable, sceno, period = match.group("var"), match.group("sceno"), match.group("period")

        if period not in PERIODS:
            skipped[f"period {period}"] += 1
            continue
        if sceno == "historical":
            slice_key = "hist"
        elif sceno in SCENARIOS:
            if period == "1985-2014":
                skipped["future scenario on baseline period"] += 1
                continue
            slice_key = f"{SCENARIOS[sceno]}__{PERIODS[period]}"
        else:
            skipped[f"scenario {sceno}"] += 1
            continue

        with csv_path.open(newline="", encoding="utf-8-sig") as fh:
            values = {}
            for row in csv.DictReader(fh):
                lat, lon = round(float(row["lat"]), 2), round(float(row["lon"]), 2)
                key = f"{lat}_{lon}"
                cells[key] = (lat, lon)
                if row["value"].strip() in NODATA:
                    continue
                values[key] = round(float(row["value"]), value_precision)
        per_variable[variable][slice_key] = values

    return per_variable, cells, skipped


def build_geometry(cells, outline, step, precision):
    """{lat_lon: geojson geometry} for every cell that overlaps the country."""
    geometries, dropped = {}, []
    half = step / 2
    for key, (lat, lon) in sorted(cells.items()):
        cell = box(lon - half, lat - half, lon + half, lat + half)
        clipped = cell.intersection(outline)
        if clipped.is_empty or clipped.area == 0:
            dropped.append(key)
            continue
        # Drop stray lines/points from touching edges, keep polygonal parts only
        parts = [g for g in getattr(clipped, "geoms", [clipped]) if isinstance(g, Polygon) and g.area > 0]
        if not parts:
            dropped.append(key)
            continue
        geom = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        geometries[key] = round_coords(mapping(geom), precision)
    return geometries, dropped


def round_coords(geom, precision):
    """Trim coordinate precision — full float64 doubles the file for no visible gain."""
    def walk(node):
        if isinstance(node, (list, tuple)):
            if node and isinstance(node[0], (int, float)):
                return [round(float(c), precision) for c in node]
            return [walk(child) for child in node]
        return node

    return {"type": geom["type"], "coordinates": walk(geom["coordinates"])}


def summarise(values):
    """min/p2/p98/max of a value list, for picking legend bounds."""
    ordered = sorted(values)
    if not ordered:
        return None

    def pct(p):
        idx = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * p)))
        return round(ordered[idx], 3)

    return {"n": len(ordered), "min": round(ordered[0], 3), "p2": pct(0.02),
            "p98": pct(0.98), "max": round(ordered[-1], 3)}


def main():
    args = parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    outline = load_boundary(args.boundary)
    print(f"Boundary: {args.boundary}")
    print(f"  bounds {tuple(round(b, 3) for b in outline.bounds)}")

    per_variable, cells, skipped = read_values(args.data, args.value_precision)
    if not per_variable:
        raise SystemExit("No usable CSVs found — check --data")

    lats = sorted({lat for lat, _ in cells.values()})
    step = round(lats[1] - lats[0], 3) if len(lats) > 1 else 0.5
    print(f"CSVs: {len(per_variable)} variables, grid step {step} deg, {len(cells)} cells in the bbox")
    for reason, count in sorted(skipped.items()):
        print(f"  skipped {count} file(s): {reason}")

    geometries, dropped = build_geometry(cells, outline, step, args.precision)
    print(f"  {len(geometries)} cells overlap Ghana ({len(dropped)} outside the border, dropped)")

    slice_order = ["hist", "ssp126__mid", "ssp126__late", "ssp585__mid", "ssp585__late"]
    manifest = {
        "country": "ghana",
        "grid_step_deg": step,
        "cells": len(geometries),
        "coordinate_precision": args.precision,
        "scenarios": {"Low": "ssp126", "High": "ssp585"},
        "periods": {"Past": "1985-2014", "2050": "2036-2065", "2080": "2066-2095"},
        "note": "Absolute values only; change vs baseline = <slice> - hist. ssp370 exists in the source data but is not exported.",
        "variables": {},
    }

    for variable, slices in sorted(per_variable.items()):
        present = [s for s in slice_order if s in slices]
        missing = [s for s in slice_order if s not in slices]

        features, per_slice, empty = [], defaultdict(list), 0
        for key, geom in geometries.items():
            props = {"lat_lon": key}
            for slice_key in present:
                value = slices[slice_key].get(key)
                if value is not None:
                    props[slice_key] = value
                    per_slice[slice_key].append(value)
            # Cells the model has no value for in any slice are border slivers
            # with no land fraction — leaving them in would draw "no data" holes
            # along the coast and the northern border instead of nothing.
            if len(props) == 1:
                empty += 1
                continue
            features.append({"type": "Feature", "geometry": geom, "properties": props})

        stats = {s: summarise(per_slice[s]) for s in present}
        for slice_key in present:
            if slice_key == "hist":
                continue
            diffs = [slices[slice_key][k] - slices["hist"][k]
                     for k in slices[slice_key]
                     if k in geometries and k in slices.get("hist", {})]
            if diffs:
                stats[f"{slice_key}__diff"] = summarise(diffs)

        payload = json.dumps({"type": "FeatureCollection", "features": features},
                             separators=(",", ":")).encode("utf-8")
        path = out_dir / f"ghana_grid_{variable}.geojson"
        path.write_bytes(payload)

        entry = {"file": path.name, "slices": present, "cells": len(features),
                 "bytes": len(payload), "value_range": stats}
        if missing:
            entry["missing_slices"] = missing
        if empty:
            entry["cells_without_data"] = empty
        if args.gzip:
            gz_path = path.with_suffix(".geojson.gz")
            gz_path.write_bytes(gzip.compress(payload, 9))
            entry["gzip_file"] = gz_path.name
            entry["gzip_bytes"] = gz_path.stat().st_size
        manifest["variables"][variable] = entry

        size = f"{len(payload) / 1024:6.1f} KB"
        if args.gzip:
            size += f" ({entry['gzip_bytes'] / 1024:5.1f} KB gz)"
        flag = "  MISSING: " + ", ".join(missing) if missing else ""
        print(f"  {path.name:44s} {size}  {len(features):3d} cells, {len(present)} slices{flag}")

    (out_dir / "ghana_grid_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    total = sum(v["bytes"] for v in manifest["variables"].values())
    print(f"\n{len(manifest['variables'])} files, {total / 1024:.1f} KB total -> {out_dir}")
    print("ghana_grid_manifest.json written (value ranges are in there — use them for the legend scales)")


if __name__ == "__main__":
    main()
