"""
Aggregate LPJmL yield CSV (per-district, per-model, per-year, per-scenario) into
delta-% values for 2050 and 2080 windows under low/high SSPs, then merge them
into a GADM admin2 GeoJSON as feature properties for the atlas-viewer.

Output features get four new properties:
  yield_2050_low, yield_2050_high, yield_2080_low, yield_2080_high
each a percentage change vs the historical baseline (1995-2014).

Usage:
  python scripts/merge_yield_to_geojson.py \
      --csv  "C:/yld/.../yield_aggregated_admin2.csv" \
      --gadm "C:/yld/.../gadm41_KEN_2.json" \
      --crop maize \
      --out  static/kenya_yield_maize.geojson
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

CROP_CFT_MAP = {
    "maize": ["maize_1", "maize_2"],
    "sorghum": ["tropical_cereals_sorghum_1", "tropical_cereals_sorghum_2"],
    "millet": ["tropical_cereals_millet"],
    "cassava": ["tropical_roots_cassava"],
    "sugarcane": ["sugarcane"],
    "pulses": ["pulses", "pulses_beans_1", "pulses_beans_2", "pulses_pigeon_peas"],
}

SCENARIO_MAP = {"low": "ssp126", "high": "ssp585"}
BASELINE_YEARS = (1995, 2014)
WINDOW_2050 = (2041, 2060)
WINDOW_2080 = (2071, 2090)

USECOLS = ["scenario", "model", "cft", "year", "GID_2", "area_ha", "yield_t_ha"]
DTYPES = {
    "scenario": "category",
    "model": "category",
    "cft": "category",
    "year": "int32",
    "GID_2": "string",
    "area_ha": "float32",
    "yield_t_ha": "float32",
}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True, help="Path to yield_aggregated_admin2.csv")
    p.add_argument("--gadm", required=True, help="Path to gadm41_*_2.json")
    p.add_argument("--crop", required=True, choices=sorted(CROP_CFT_MAP), help="Crop key")
    p.add_argument("--out", required=True, help="Output GeoJSON path")
    p.add_argument("--chunksize", type=int, default=1_000_000)
    return p.parse_args()


def load_filtered(csv_path: str, cfts: list[str], chunksize: int) -> pd.DataFrame:
    """Stream the CSV, keep only rows for the target crop + scenarios + year windows."""
    keep_scenarios = {"historical", "ssp126", "ssp585"}
    all_years = set(range(BASELINE_YEARS[0], BASELINE_YEARS[1] + 1)) \
        | set(range(WINDOW_2050[0], WINDOW_2050[1] + 1)) \
        | set(range(WINDOW_2080[0], WINDOW_2080[1] + 1))

    cft_set = set(cfts)
    pieces = []
    total_rows = 0
    kept_rows = 0
    for i, chunk in enumerate(pd.read_csv(
        csv_path, usecols=USECOLS, dtype=DTYPES, chunksize=chunksize
    )):
        total_rows += len(chunk)
        m = (
            chunk["scenario"].isin(keep_scenarios)
            & chunk["cft"].isin(cft_set)
            & chunk["year"].isin(all_years)
        )
        sub = chunk.loc[m]
        if not sub.empty:
            pieces.append(sub)
            kept_rows += len(sub)
        if (i + 1) % 10 == 0:
            print(f"  chunk {i+1}: scanned {total_rows:,} rows, kept {kept_rows:,}", file=sys.stderr)
    df = pd.concat(pieces, ignore_index=True) if pieces else pd.DataFrame(columns=USECOLS)
    print(f"Total scanned: {total_rows:,} rows. Kept after filter: {kept_rows:,}", file=sys.stderr)
    return df


def weighted_mean(df: pd.DataFrame, value_col: str, weight_col: str, by: list[str]) -> pd.Series:
    """area-weighted mean of value_col within groups."""
    g = df.assign(_w=df[weight_col], _wv=df[value_col] * df[weight_col]).groupby(by, observed=True)
    return (g["_wv"].sum() / g["_w"].sum()).rename(value_col)


def aggregate(df: pd.DataFrame) -> pd.DataFrame:
    """Return per-district baseline + per-(scenario, window) mean yields."""
    # 1) Per (scenario, model, year, GID_2): area-weighted yield across cft variants
    per_year = weighted_mean(df, "yield_t_ha", "area_ha", ["scenario", "model", "year", "GID_2"]).reset_index()

    # 2) Tag period
    def tag(y):
        if BASELINE_YEARS[0] <= y <= BASELINE_YEARS[1]: return "baseline"
        if WINDOW_2050[0] <= y <= WINDOW_2050[1]: return "2050"
        if WINDOW_2080[0] <= y <= WINDOW_2080[1]: return "2080"
        return None
    per_year["period"] = per_year["year"].map(tag)
    per_year = per_year.dropna(subset=["period"])

    # 3) Average across years AND models per (scenario, period, GID_2)
    means = per_year.groupby(["scenario", "period", "GID_2"], observed=True)["yield_t_ha"].mean().reset_index()
    return means


def to_deltas(means: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Pivot to {GID_2: {yield_2050_low, yield_2050_high, yield_2080_low, yield_2080_high}}."""
    # baseline: only "historical" matters; ignore baseline rows tagged under SSPs
    base = means[(means["scenario"] == "historical") & (means["period"] == "baseline")] \
        .set_index("GID_2")["yield_t_ha"]
    out: dict[str, dict[str, float]] = {}
    for label, ssp in SCENARIO_MAP.items():  # low->ssp126, high->ssp585
        for window in ("2050", "2080"):
            fut = means[(means["scenario"] == ssp) & (means["period"] == window)] \
                .set_index("GID_2")["yield_t_ha"]
            common = base.index.intersection(fut.index)
            for gid in common:
                b = base.loc[gid]
                f = fut.loc[gid]
                if pd.isna(b) or b == 0 or pd.isna(f):
                    continue
                delta_pct = float((f - b) / b * 100.0)
                out.setdefault(gid, {})[f"yield_{window}_{label}"] = round(delta_pct, 2)
    return out


def merge_into_geojson(gadm_path: str, deltas: dict[str, dict[str, float]], out_path: str) -> None:
    with open(gadm_path, "r", encoding="utf-8") as f:
        gj = json.load(f)
    matched = 0
    missing = 0
    for feat in gj["features"]:
        gid = feat["properties"].get("GID_2")
        d = deltas.get(gid)
        if d:
            feat["properties"].update(d)
            matched += 1
        else:
            missing += 1
            feat["properties"].update({
                "yield_2050_low": None, "yield_2050_high": None,
                "yield_2080_low": None, "yield_2080_high": None,
            })
    print(f"Merged: {matched} matched, {missing} without yield data", file=sys.stderr)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(gj, f, separators=(",", ":"))
    print(f"Wrote {out_path} ({Path(out_path).stat().st_size:,} bytes)", file=sys.stderr)


def main():
    args = parse_args()
    cfts = CROP_CFT_MAP[args.crop]
    print(f"Crop={args.crop} cfts={cfts}", file=sys.stderr)

    df = load_filtered(args.csv, cfts, args.chunksize)
    if df.empty:
        sys.exit("ERROR: no matching rows in CSV")

    means = aggregate(df)
    print("Aggregated means (head):", file=sys.stderr)
    print(means.head(10).to_string(), file=sys.stderr)

    deltas = to_deltas(means)
    print(f"Computed deltas for {len(deltas)} districts", file=sys.stderr)

    # Quick summary stats
    all_vals = [v for d in deltas.values() for v in d.values() if v is not None]
    if all_vals:
        s = pd.Series(all_vals)
        print(f"Delta % stats: min={s.min():.1f} p10={s.quantile(0.1):.1f} "
              f"median={s.median():.1f} p90={s.quantile(0.9):.1f} max={s.max():.1f}",
              file=sys.stderr)

    merge_into_geojson(args.gadm, deltas, args.out)


if __name__ == "__main__":
    main()
