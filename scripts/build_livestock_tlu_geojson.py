"""
Build a county-level livestock-density context layer for the atlas-viewer.

Input is a flat per-county Total Livestock Units (TLU) table (county -> value) at
GADM admin1 resolution, with NO geometry. We borrow geometry from the admin2 crop
GeoJSON (kenya_admin2_deltas.geojson), whose NAME_1 county names match the TLU
table exactly. For each county we sum the geodesic area of its admin2 polygons,
then density = TLU / area_km2. Every admin2 feature is stamped with its parent
county's TLU + density so the viewer can paint a county choropleth (internal
constituency borders are hidden client-side).

Output: static/kenya_livestock_tlu.geojson — admin2 geometry, trimmed properties:
  county, tlu (county total), area_km2 (county total), tlu_density (TLU/km2).

Usage:
  python scripts/build_livestock_tlu_geojson.py \
      --tlu    "C:/Users/Sophie/Downloads/livestock_TLU_Kenya.json" \
      --admin2 "https://fsn1.your-objectstorage.com/kenyaciaviewer/kenya_admin2_deltas.geojson" \
      --out    "static/kenya_livestock_tlu.geojson"
"""

import argparse
import json
import sys
import urllib.request
from math import radians, sin
from pathlib import Path
from statistics import quantiles

# WGS84 authalic-ish radius; good enough for choropleth classification.
EARTH_RADIUS_M = 6378137.0


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--tlu", required=True, help="Path to livestock_TLU_Kenya.json")
    p.add_argument("--admin2", required=True, help="Path or URL to kenya_admin2_deltas.geojson")
    p.add_argument("--out", required=True, help="Output GeoJSON path")
    return p.parse_args()


def norm_county(name: str) -> str:
    """Normalise county names for joining: the TLU table uses spaces/hyphens
    ('Homa Bay', 'Trans-Nzoia', 'Muranga') while GADM NAME_1 is concatenated /
    apostrophised ('HomaBay', 'TransNzoia', "Murang'a"). Strip both to a common key."""
    if not name:
        return ""
    return "".join(ch for ch in name.lower() if ch.isalnum())


def load_json(src: str):
    """Read JSON from a local path or an http(s) URL."""
    if src.startswith("http://") or src.startswith("https://"):
        with urllib.request.urlopen(src, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    with open(src, "r", encoding="utf-8") as f:
        return json.load(f)


def ring_area_m2(ring: list) -> float:
    """Geodesic area of a single linear ring (lon/lat) via the spherical-excess
    formula used by Leaflet.GeometryUtil — sign-agnostic, returns absolute m^2."""
    n = len(ring)
    if n < 3:
        return 0.0
    total = 0.0
    for i in range(n):
        lon1, lat1 = ring[i][0], ring[i][1]
        lon2, lat2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        total += radians(lon2 - lon1) * (2 + sin(radians(lat1)) + sin(radians(lat2)))
    return abs(total * EARTH_RADIUS_M * EARTH_RADIUS_M / 2.0)


def polygon_area_m2(rings: list) -> float:
    """First ring is outer, remaining rings are holes."""
    if not rings:
        return 0.0
    area = ring_area_m2(rings[0])
    for hole in rings[1:]:
        area -= ring_area_m2(hole)
    return max(area, 0.0)


def geometry_area_km2(geom: dict) -> float:
    if not geom:
        return 0.0
    t = geom.get("type")
    coords = geom.get("coordinates", [])
    if t == "Polygon":
        return polygon_area_m2(coords) / 1e6
    if t == "MultiPolygon":
        return sum(polygon_area_m2(poly) for poly in coords) / 1e6
    return 0.0


def main():
    args = parse_args()

    tlu_rows = load_json(args.tlu)
    # Join on a normalised key; keep the TLU table's (properly spaced) name for display.
    tlu_by_norm = {norm_county(row["county"]): float(row["value"]) for row in tlu_rows}
    name_by_norm = {norm_county(row["county"]): row["county"] for row in tlu_rows}
    print(f"TLU counties: {len(tlu_by_norm)}", file=sys.stderr)

    gj = load_json(args.admin2)
    feats = gj.get("features", [])
    print(f"admin2 features: {len(feats)}", file=sys.stderr)

    # 1) Sum geodesic area per county (normalised key) across its admin2 polygons.
    area_by_norm: dict[str, float] = {}
    feat_area: list[float] = []
    unmatched = set()
    for feat in feats:
        key = norm_county(feat.get("properties", {}).get("NAME_1"))
        a = geometry_area_km2(feat.get("geometry"))
        feat_area.append(a)
        if key not in tlu_by_norm:
            unmatched.add(feat.get("properties", {}).get("NAME_1"))
        area_by_norm[key] = area_by_norm.get(key, 0.0) + a

    if unmatched:
        print(f"WARNING: counties in geometry without TLU data: {sorted(unmatched)}", file=sys.stderr)

    # 2) county density (keyed by normalised name)
    density_by_norm = {
        k: (tlu_by_norm[k] / area_by_norm[k])
        for k in area_by_norm
        if k in tlu_by_norm and area_by_norm[k] > 0
    }

    # 3) stamp every admin2 feature with its county's totals + density, trim props
    out_feats = []
    for feat, a in zip(feats, feat_area):
        key = norm_county(feat.get("properties", {}).get("NAME_1"))
        county = name_by_norm.get(key, feat.get("properties", {}).get("NAME_1"))
        tlu = tlu_by_norm.get(key)
        dens = density_by_norm.get(key)
        out_feats.append({
            "type": "Feature",
            "geometry": feat.get("geometry"),
            "properties": {
                "county": county,
                "tlu": round(tlu, 1) if tlu is not None else None,
                "area_km2": round(area_by_norm.get(key, 0.0), 1),
                "tlu_density": round(dens, 2) if dens is not None else None,
            },
        })

    out = {
        "type": "FeatureCollection",
        "metadata": {
            "country": "KEN",
            "admin_level": "admin1 (county) values painted on admin2 geometry",
            "variable": "Total Livestock Units (TLU) density",
            "unit": "TLU per km2",
            "source": "Ministry of Agriculture and Livestock Development, State Department for Livestock Development",
            "geometry_source": "GADM admin2 (kenya_admin2_deltas.geojson)",
        },
        "features": out_feats,
    }

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"Wrote {args.out} ({Path(args.out).stat().st_size:,} bytes)", file=sys.stderr)

    # 4) density distribution -> suggest quantile class breaks for the legend
    vals = sorted(density_by_norm.values())
    qs = quantiles(vals, n=6, method="inclusive")  # 5 internal cut points -> 6 classes
    print("\nCounty density (TLU/km2):", file=sys.stderr)
    print(f"  min={vals[0]:.1f}  max={vals[-1]:.1f}  n={len(vals)}", file=sys.stderr)
    print("  quantile breaks (6 classes): " + ", ".join(f"{q:.1f}" for q in qs), file=sys.stderr)
    # also show the extremes by county for sanity
    by_d = sorted(density_by_norm.items(), key=lambda kv: kv[1])
    print("  lowest:  " + ", ".join(f"{name_by_norm[k]}={d:.1f}" for k, d in by_d[:5]), file=sys.stderr)
    print("  highest: " + ", ".join(f"{name_by_norm[k]}={d:.1f}" for k, d in by_d[-5:]), file=sys.stderr)


if __name__ == "__main__":
    main()
