/**
 * Gridded indicator layers (0.5° cells) built by
 * scripts/build_ghana_grid_indicators.py from the PIK/ISIMIP impact delivery.
 *
 * One source file per variable (`ghana_grid_<variable>.geojson`) carrying every
 * time slice as a property, so switching time or scenario is a restyle without
 * a fetch:
 *   hist | ssp126__mid | ssp126__late | ssp585__mid | ssp585__late
 *
 * Past shows the ABSOLUTE value; 2050/2080 show the CHANGE vs the 1985-2014
 * baseline (future − hist), computed here rather than stored, so the same file
 * serves both readings.
 *
 * Every layer's class bounds, colours and unit are taken from the summary figure
 * delivered with the data, so the atlas and the report show the same maps. Two
 * consequences of following the figures rather than deriving scales here:
 *
 *   - Outer classes are left OPEN-ENDED where a figure's colour bar is capped.
 *     The figures cover SSP1-2.6 and SSP3-7.0 while the viewer exposes SSP1-2.6
 *     and SSP5-8.5, so our High runs hotter than anything on their bars — WBGT
 *     reaches +3.5 °C against a bar that stops at 3.0.
 *   - The four labour-productivity intensities each got their own figure with
 *     its own range, so they no longer share a scale and their colours are not
 *     comparable between intensities.
 *
 * Runoff, solar PV and wind speed express their change as a PERCENTAGE of the
 * baseline in the figures rather than in the variable's own unit; those layers
 * carry `changeMode: 'relative'` and report their change in '%'.
 *
 * Ramps come from d3-scale-chromatic and are sampled across their full width to
 * match matplotlib's discretised colour bars (palest class nearly white, darkest
 * nearly black). Two figures use matplotlib's `terrain` reversed, which no d3
 * ramp matches — see TERRAIN_REVERSED.
 */

import {
  interpolateBlues,
  interpolateGreens,
  interpolatePuBuGn,
  interpolateRdBu,
  interpolateReds,
  interpolateYlGnBu,
  interpolateYlOrBr,
} from "d3-scale-chromatic"

/**
 * matplotlib's `terrain` colormap reversed, sampled into six classes — the
 * absolute colour bar of the delivered tropical-nights and wind-speed figures.
 * No d3 ramp matches it, hence the literal list. It runs white → taupe → khaki
 * → light green → teal → blue, which has no light-to-dark ordering, so it reads
 * as six categories rather than a rising quantity; kept to match the report.
 */
const TERRAIN_REVERSED = ["#ffffff", "#997c76", "#ccbe7d", "#99eb85", "#00b3b3", "#333399"]

/** Fill for cells with no value — same grey the other layers use. */
const NO_DATA = "#d1d1d1"

/** Bucket path prefix; the grid files are per-country by filename. */
const GRID_FILE_PREFIX = "ghana_grid_"

/**
 * How a change scale is read.
 *   'diverging' two hues around zero — the sign genuinely flips between cells
 *               or between scenarios
 *   'up'        one sign, always an increase — sequential, light = no change
 *   'down'      one sign, always a decrease — sequential, dark = biggest loss
 * @typedef {'diverging'|'up'|'down'} ChangeKind
 */

/**
 * @typedef {Object} GridIndicator
 * @property {string} name - Display name (also the layer key across the app)
 * @property {string} variable - Source variable code = filename suffix
 * @property {'hazard'|'impact'} category - Sidepanel category
 * @property {'heat'|'drought'|'rain'} [theme] - Hazard sub-theme (hazard only)
 * @property {string} [group] - Groups sibling layers under one accordion in the
 *   sidepanel (see IMPACT_GROUP_LABELS); layers without one are listed loose
 * @property {string|null} unit - Legend unit; null until confirmed with the data provider
 * @property {number} [decimals] - Decimals in the popup readouts (default 1); 0
 *   for counts, where a fraction of a night or a day is spurious precision
 * @property {'absolute'|'relative'} [changeMode] - How the change is expressed:
 *   'absolute' (default) is future − baseline in the layer's own unit;
 *   'relative' is the percentage of the baseline, which is how the delivered
 *   figures for runoff, solar PV and wind speed express it
 * @property {number} [changeDecimals] - Decimals for the change readout; defaults
 *   to 1 for a relative change and to `decimals` otherwise
 * @property {number[]} absBounds - Ascending class bounds for the absolute (Past) scale
 * @property {((t: number) => string)} [absRamp] - Sequential interpolator; ignored when absPalette is set
 * @property {string[]} [absPalette] - Explicit class colours, low→high, one more
 *   than absBounds — for reproducing a delivered figure whose colour bar is not
 *   one of the standard ramps
 * @property {number[]} changeBounds - Ascending class bounds for the change scale
 * @property {ChangeKind} changeKind
 * @property {((t: number) => string)} [changeRamp]
 * @property {string[]} [changePalette] - Explicit class colours, low→high
 * @property {boolean} [changeReversed] - Flip the ramp so + takes the brown/warm side
 * @property {boolean} [rampFullWidth] - Sample the sequential ramps across their
 *   whole range instead of skipping the palest 15%, for layers that must match a
 *   published figure's colour bar
 */

/**
 * Display names for the sidepanel accordion groups, keyed by `group`.
 * Ordered as the groups should appear.
 * @type {Record<string, string>}
 */
export const IMPACT_GROUP_LABELS = {
  labour: "Labour productivity",
}

/**
 * The 12 delivered variables. Units are read off the delivered summary figures'
 * colour-bar labels, which is the only place the delivery states them — the CSVs
 * and NetCDFs carry none.
 *
 * @type {GridIndicator[]}
 */
const GRID_INDICATORS = [
  // ---- Hazards -----------------------------------------------------------
  {
    // "WBGT" lives in the info panel (layerInfo.js) rather than the layer name —
    // the sidepanel row, the legend title and the layer stack all read this name.
    name: "Heat stress",
    variable: "wbgt",
    category: "hazard",
    theme: "heat",
    unit: "°C",
    // Scales, colours and unit taken from the delivered WBGT summary figure so
    // the layer matches the report: YlOrBr over 24.5-27.5 °C for the absolute
    // map and Reds over 0-3.0 °C for the change, both in 0.5 steps, both ramps
    // sampled across their full width (that figure's palest class is nearly
    // white and its darkest nearly black). The top class is left open-ended
    // rather than capped at the figure's 27.5 / 3.0, because the data reaches
    // +3.51 under High/2080.
    absBounds: [25, 25.5, 26, 26.5, 27],
    absRamp: interpolateYlOrBr,
    // Warming is uniform across the country (+1.0 under Low/2050 to +3.5 under
    // High/2080, with barely 0.1 of spread within a slice), so the 0.5 steps are
    // what separate the scenarios — a single map will look near-flat, which is
    // what the data says.
    changeBounds: [0.5, 1, 1.5, 2, 2.5],
    changeKind: "up",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Tropical nights",
    variable: "trop_nights",
    category: "hazard",
    theme: "heat",
    unit: "nights/year",
    decimals: 0, // a count of nights — no fractions in the readout
    // Scales, colours and unit taken from the delivered tropical-nights summary
    // figure: 300-360 nights/year in steps of 10 for the absolute map, and Reds
    // over 0-45 nights/year in steps of 5 for the change.
    //
    // The figure's absolute colour bar is matplotlib's `terrain` reversed, which
    // is why it needs an explicit palette rather than a ramp — it runs white →
    // taupe → khaki → light green → teal → blue. Note that this is a multi-hue
    // ramp with no light-to-dark ordering, so it reads as six categories rather
    // than as a rising quantity; kept anyway so the layer matches the report.
    absBounds: [310, 320, 330, 340, 350],
    absPalette: TERRAIN_REVERSED,
    // Top class is open-ended where the figure caps at 45: the north reaches
    // +66 nights under High/2080.
    changeBounds: [5, 10, 15, 20, 25, 30, 35, 40],
    changeKind: "up",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Potential evapotranspiration",
    variable: "potevap",
    category: "hazard",
    theme: "drought",
    unit: "mm/year",
    decimals: 0, // mm/year in the low thousands — a tenth of a mm is noise
    // Scales, colours and unit taken from the delivered summary figure:
    // YlGnBu over 1200-2600 mm/year in steps of 200 for the absolute map, and a
    // reversed RdBu in steps of 20 around zero for the change, so blue reads as
    // less evaporative demand and red as more. Outer classes are open-ended
    // where the figure caps at ±100: the change reaches +146 under High/2080.
    absBounds: [1400, 1600, 1800, 2000, 2200, 2400],
    absRamp: interpolateYlGnBu,
    changeBounds: [-80, -60, -40, -20, 0, 20, 40, 60, 80],
    changeKind: "diverging",
    changeRamp: interpolateRdBu,
    changeReversed: true, // RdBu runs red→blue; we want + (more demand) = red
    rampFullWidth: true,
  },
  {
    name: "Soil moisture",
    variable: "soilmoist",
    category: "hazard",
    theme: "drought",
    unit: "mm/day",
    // Figure: PuBuGn over 0-140 mm/day in steps of 20; change in RdBu over
    // ±15 mm/day in steps of 5, red for drying. Lowest class open-ended where
    // the figure stops at -15: the change reaches -40 under High/2080.
    absBounds: [20, 40, 60, 80, 100, 120],
    absRamp: interpolatePuBuGn,
    changeBounds: [-10, -5, 0, 5, 10],
    changeKind: "diverging",
    changeRamp: interpolateRdBu, // not reversed: RdBu starts red, so - = red = drier
    rampFullWidth: true,
  },
  {
    name: "Runoff",
    variable: "runoff",
    category: "hazard",
    theme: "rain",
    unit: "mm/day",
    // Figure: Blues over 0-3.5 mm/day in steps of 0.5. The change is expressed
    // as a PERCENTAGE there, not in mm/day — RdBu over ±40% in steps of 10, red
    // for less runoff. Both outer classes stay open: the relative change spans
    // -59% to +79% across the scenarios.
    absBounds: [0.5, 1, 1.5, 2, 2.5, 3],
    absRamp: interpolateBlues,
    changeMode: "relative",
    changeBounds: [-30, -20, -10, 0, 10, 20, 30],
    changeKind: "diverging",
    changeRamp: interpolateRdBu,
    rampFullWidth: true,
  },
  // ---- Impacts -----------------------------------------------------------
  // Labour productivity under heat, per work intensity. Each intensity has its
  // own figure with its own range, so unlike the first version of these layers
  // they no longer share one scale — the four maps match their figures but are
  // not directly comparable with each other by colour.
  // Absolute: Greens; change: Reds darkest at the biggest loss. The change is a
  // difference in percentage points (the variable is itself a %), which is what
  // the figures label "%".
  {
    name: "Labour productivity (light work)",
    variable: "day_prod_lowInt",
    category: "impact",
    group: "labour",
    unit: "%",
    // Figure: 97.5-100% in steps of 0.5; change -12 to 0 in steps of 2.
    absBounds: [98, 98.5, 99, 99.5],
    absRamp: interpolateGreens,
    changeBounds: [-10, -8, -6, -4, -2],
    changeKind: "down",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Labour productivity (moderate work)",
    variable: "day_prod_medInt",
    category: "impact",
    group: "labour",
    unit: "%",
    // Figure: 84-98% in steps of 2; change -14 to 0 in steps of 2.
    absBounds: [86, 88, 90, 92, 94, 96],
    absRamp: interpolateGreens,
    changeBounds: [-12, -10, -8, -6, -4, -2],
    changeKind: "down",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Labour productivity (heavy work)",
    variable: "day_prod_highInt",
    category: "impact",
    group: "labour",
    unit: "%",
    // Figure: 78-94% in steps of 2; change -18 to 0 in steps of 2.
    absBounds: [80, 82, 84, 86, 88, 90, 92],
    absRamp: interpolateGreens,
    changeBounds: [-16, -14, -12, -10, -8, -6, -4, -2],
    changeKind: "down",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Labour productivity (very heavy work)",
    variable: "day_prod_veryhighInt",
    category: "impact",
    group: "labour",
    unit: "%",
    // Figure: 72-88% in steps of 2; change -25 to 0 in steps of 5.
    absBounds: [74, 76, 78, 80, 82, 84, 86],
    absRamp: interpolateGreens,
    changeBounds: [-20, -15, -10, -5],
    changeKind: "down",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
  {
    name: "Tree cover",
    variable: "treecover",
    category: "impact",
    unit: "%",
    // Figure: Greens over 0-60% in steps of 10; change in RdBu over ±15% in
    // steps of 5, red for loss.
    absBounds: [10, 20, 30, 40, 50],
    absRamp: interpolateGreens,
    changeBounds: [-10, -5, 0, 5, 10],
    changeKind: "diverging",
    changeRamp: interpolateRdBu,
    rampFullWidth: true,
  },
  {
    name: "Solar PV potential",
    variable: "photovol",
    category: "impact",
    unit: "kWh/m2",
    decimals: 0, // kWh/m2 in the high hundreds — a tenth is noise
    // Figure: YlOrBr over 1550-2050 kWh/m2 in steps of 50. The change is a
    // PERCENTAGE there — RdBu over ±5% in steps of 1, red for less yield.
    // Genuinely two-directional: Low gives +0.4 to +1.6%, High -5.2 to -2.1%.
    absBounds: [1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000],
    absRamp: interpolateYlOrBr,
    changeMode: "relative",
    changeBounds: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
    changeKind: "diverging",
    changeRamp: interpolateRdBu,
    rampFullWidth: true,
  },
  {
    name: "Wind speed",
    variable: "sfcwind",
    category: "impact",
    unit: "m/s",
    // Figure: the same reversed-terrain bar as tropical nights, over 2.5-5.5 m/s
    // in steps of 0.5. The change is a PERCENTAGE there — Reds over 0-18% in
    // steps of 2, always an increase. Top class open-ended: the relative change
    // reaches +33% under High/2080.
    //
    // The figure is titled "100m Wind Speed" while the source variable is
    // `sfcwind`; the height is recorded in the layer's info panel.
    absBounds: [3, 3.5, 4, 4.5, 5],
    absPalette: TERRAIN_REVERSED,
    changeMode: "relative",
    changeBounds: [2, 4, 6, 8, 10, 12, 14, 16],
    changeKind: "up",
    changeRamp: interpolateReds,
    rampFullWidth: true,
  },
]

/**
 * Sample an interpolator into n colours.
 * Sequential ramps skip the palest 15% by default (unreadably close to the
 * basemap); diverging ramps and `fullWidth` ones use the whole range — the
 * former so the neutral midpoint stays neutral, the latter to reproduce a
 * published figure's colour bar exactly.
 * @param {(t: number) => string} ramp
 * @param {number} n
 * @param {boolean} diverging
 * @param {boolean} [reversed]
 * @param {boolean} [fullWidth]
 * @returns {string[]}
 */
function sampleRamp(ramp, n, diverging, reversed = false, fullWidth = false) {
  const lo = diverging || fullWidth ? 0 : 0.15
  const colors = Array.from({ length: n }, (_, i) => ramp(lo + ((1 - lo) * i) / (n - 1)))
  return reversed ? colors.reverse() : colors
}

/**
 * Colours for a change scale, ordered to match ascending class bounds.
 * 'down' scales are reversed so the darkest colour sits on the biggest loss
 * (class 0) rather than on the smallest.
 * @param {GridIndicator} indicator
 * @param {number} n
 * @returns {string[]}
 */
function buildChangeColors(indicator, n) {
  if (indicator.changePalette) return checkPalette(indicator, indicator.changePalette, n, "change")
  const ramp = /** @type {(t: number) => string} */ (indicator.changeRamp)
  if (indicator.changeKind === "diverging") {
    return sampleRamp(ramp, n, true, indicator.changeReversed)
  }
  return sampleRamp(ramp, n, false, indicator.changeKind === "down", indicator.rampFullWidth)
}

/**
 * An explicit palette must have exactly one colour per class, otherwise cells
 * silently render `undefined`. Fails at module load rather than on the map.
 * @param {GridIndicator} indicator
 * @param {string[]} palette
 * @param {number} n - Expected length (bounds + 1)
 * @param {string} which
 * @returns {string[]}
 */
function checkPalette(indicator, palette, n, which) {
  if (palette.length !== n) {
    throw new Error(
      `${indicator.name}: ${which} palette has ${palette.length} colours but ${n} classes`
    )
  }
  return palette
}

/**
 * Index of the class a value falls in: 0 below the first bound, n for ≥ last.
 * @param {number} value
 * @param {number[]} bounds - Ascending
 * @returns {number}
 */
function classIndex(value, bounds) {
  let i = 0
  while (i < bounds.length && value >= bounds[i]) i++
  return i
}

/** Trim float noise in legend labels: 0.4 not 0.4000000000000001, 20 not 20.0. */
function formatNumber(/** @type {number} */ value) {
  return String(Math.round(value * 1000) / 1000)
}

/** Signed label for change classes. */
function formatSigned(/** @type {number} */ value) {
  return (value > 0 ? "+" : "") + formatNumber(value)
}

/**
 * Legend rows for a set of class bounds, ordered high → low like the other
 * legends in the app, with a "No data" row appended.
 *
 * Bare numbers, no unit: the unit is stated once in the legend subheading
 * (getGridIndicatorSubhead), so repeating it on every row is noise.
 * @param {number[]} bounds
 * @param {string[]} colors - One per class (bounds.length + 1)
 * @param {boolean} signed - Render values with an explicit +/-
 * @returns {Array<{color: string, label: string}>}
 */
function buildLegendItems(bounds, colors, signed) {
  const fmt = signed ? formatSigned : formatNumber
  /** @type {Array<{color: string, label: string}>} */
  const items = []
  for (let i = bounds.length; i >= 0; i--) {
    let label
    if (i === bounds.length) label = `≥ ${fmt(bounds[i - 1])}`
    else if (i === 0) label = `< ${fmt(bounds[0])}`
    else label = `${fmt(bounds[i - 1])} to ${fmt(bounds[i])}`
    items.push({ color: colors[i], label })
  }
  items.push({ color: NO_DATA, label: "No data" })
  return items
}

/** Property key for a time/scenario pair, or 'hist' for the baseline. */
function sliceKey(/** @type {string} */ time, /** @type {string} */ scenario) {
  const t = (time || "Past").toLowerCase()
  if (t !== "2050" && t !== "2080") return "hist"
  const ssp = (scenario || "High").toLowerCase() === "low" ? "ssp126" : "ssp585"
  return `${ssp}__${t === "2080" ? "late" : "mid"}`
}

/**
 * The change of a future value against the baseline, in whichever form the layer
 * reports it. Single source of truth: the map fill, the legend, the popup readout
 * and the chart all go through this, so none of them can disagree.
 * @param {number|null} future
 * @param {number|null} baseline
 * @param {'absolute'|'relative'} [mode]
 * @returns {number|null} null when either value is missing, or when a relative
 *   change would divide by a zero baseline
 */
export function indicatorChange(future, baseline, mode = "absolute") {
  if (typeof future !== "number" || typeof baseline !== "number") return null
  if (mode !== "relative") return future - baseline
  return baseline === 0 ? null : ((future - baseline) / baseline) * 100
}

/** The unit a layer's change is reported in — '%' for a relative change. */
function changeUnitOf(/** @type {GridIndicator} */ indicator) {
  return indicator.changeMode === "relative" ? "%" : indicator.unit
}

/** Decimals for a layer's change readout. */
function changeDecimalsOf(/** @type {GridIndicator} */ indicator) {
  if (indicator.changeDecimals !== undefined) return indicator.changeDecimals
  return indicator.changeMode === "relative" ? 1 : (indicator.decimals ?? 1)
}

/**
 * Build the layer config for one indicator.
 * @param {GridIndicator} indicator
 */
function buildLayer(indicator) {
  const absClasses = indicator.absBounds.length + 1
  const absColors = indicator.absPalette
    ? checkPalette(indicator, indicator.absPalette, absClasses, "absolute")
    : sampleRamp(
        /** @type {(t: number) => string} */ (indicator.absRamp),
        absClasses,
        false,
        false,
        indicator.rampFullWidth
      )
  const chgColors = buildChangeColors(indicator, indicator.changeBounds.length + 1)

  /** @param {any} feature @param {string} time @param {string} scenario */
  const valueFor = (feature, time, scenario) => {
    const props = feature?.properties
    if (!props) return null
    const key = sliceKey(time, scenario)
    const value = props[key]
    if (typeof value !== "number") return null
    if (key === "hist") return value
    // Future periods show the change vs the baseline, so both are required.
    return indicatorChange(value, props.hist, indicator.changeMode)
  }

  return {
    filename: `${GRID_FILE_PREFIX}${indicator.variable}.geojson`,
    // Grid files live in the active country's bucket; resolved via countryConfig
    // in getGeojsonLayerUrl, so this stays empty here.
    baseUrl: "",
    propertyName: "hist",
    supportsTimeScenario: true,
    singleFileMultiTime: true,
    isGridIndicator: true,
    unit: indicator.unit,
    decimals: indicator.decimals ?? 1,
    // The change can be reported in a different unit and precision than the
    // level — a percentage for runoff, solar PV and wind speed.
    changeMode: indicator.changeMode ?? "absolute",
    changeUnit: changeUnitOf(indicator),
    changeDecimals: changeDecimalsOf(indicator),
    /** @param {any} feature @param {string} time @param {string} scenario */
    getStyle: (feature, time, scenario) => {
      const value = valueFor(feature, time, scenario)
      const isChange = sliceKey(time, scenario) !== "hist"
      const bounds = isChange ? indicator.changeBounds : indicator.absBounds
      const colors = isChange ? chgColors : absColors
      const color = value === null ? NO_DATA : colors[classIndex(value, bounds)]
      return {
        // Stroke in the fill colour so the anti-aliasing seams between adjacent
        // cells don't show the basemap through as faint grid lines.
        fillColor: color,
        weight: 1,
        color,
        opacity: 1,
        fillOpacity: 1,
      }
    },
    /** The number behind a cell: absolute for Past, change for 2050/2080. */
    getValue: valueFor,
    /** Legend depends on the period: absolute for Past, change for 2050/2080. */
    legendItemsFor: (/** @type {string} */ time) => {
      const isChange = time === "2050" || time === "2080"
      return isChange
        ? buildLegendItems(indicator.changeBounds, chgColors, true)
        : buildLegendItems(indicator.absBounds, absColors, false)
    },
    interactive: true,
    // Static fallback for callers that don't pass a period (absolute scale).
    legendItems: buildLegendItems(indicator.absBounds, absColors, false),
  }
}

/**
 * Layer configs keyed by display name, to spread into geojsonLayerConfigs.
 * @type {Record<string, any>}
 */
export const gridIndicatorLayerConfigs = Object.fromEntries(
  GRID_INDICATORS.map((indicator) => [indicator.name, buildLayer(indicator)])
)

/** All grid indicator layer names, in declaration order. */
export const gridIndicatorLayerNames = GRID_INDICATORS.map((i) => i.name)

/** @param {string} layerName */
export function isGridIndicatorLayer(layerName) {
  return layerName in gridIndicatorLayerConfigs
}

/**
 * Grid hazard layers per sub-theme, to merge into hazardThemeLayerMap.
 * @type {Record<string, string[]>}
 */
export const gridHazardLayersByTheme = GRID_INDICATORS.reduce((acc, i) => {
  if (i.category === "hazard" && i.theme) (acc[i.theme] ||= []).push(i.name)
  return acc
}, /** @type {Record<string, string[]>} */ ({}))

/** Grid impact layer names, to append to the Impact category. */
export const gridImpactLayerNames = GRID_INDICATORS.filter((i) => i.category === "impact").map(
  (i) => i.name
)

/**
 * Impact layers that belong together under one sidepanel accordion, in the order
 * of IMPACT_GROUP_LABELS. Layers with no `group` are absent here on purpose —
 * the sidepanel lists those loose below the accordions rather than wrapping a
 * single layer in a collapsible of its own.
 * @type {Array<{id: string, name: string, layers: string[]}>}
 */
export const gridImpactGroups = Object.entries(IMPACT_GROUP_LABELS)
  .map(([id, name]) => ({
    id,
    name,
    layers: GRID_INDICATORS.filter((i) => i.category === "impact" && i.group === id).map(
      (i) => i.name
    ),
  }))
  .filter((g) => g.layers.length > 0)

/**
 * Format an indicator value for a readout, at the layer's own precision
 * (`decimals`, one by default — whole numbers for counts like tropical nights).
 *
 * Two corrections on plain toFixed:
 *   - a value that rounds to zero without being zero gains decimals (up to
 *     three) so a real change isn't printed as "0.0" — but only for layers that
 *     show decimals at all; on a whole-number layer "0" is the honest answer.
 *   - a rounded zero never keeps a minus sign, so no readout says "-0".
 * @param {number|null|undefined} value
 * @param {number} [decimals]
 * @returns {string} '—' when there is no value
 */
export function formatIndicatorValue(value, decimals = 1) {
  if (typeof value !== "number" || isNaN(value)) return "—"

  let text = value.toFixed(decimals)
  if (decimals > 0) {
    for (let extra = decimals; extra <= 3 && Number(text) === 0 && value !== 0; extra++) {
      text = value.toFixed(extra)
    }
  }
  return Number(text) === 0 ? (0).toFixed(decimals) : text
}

/**
 * Same, with an explicit + on increases — for changes vs the baseline. The sign
 * follows the ROUNDED value, so a change that rounds away doesn't show up as a
 * signed "+0".
 * @param {number|null|undefined} value
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatIndicatorChange(value, decimals = 1) {
  const text = formatIndicatorValue(value, decimals)
  return Number(text) > 0 ? `+${text}` : text
}

/**
 * The numbers behind one grid cell, for the popup chart: the baseline level plus
 * the change and the absolute level of every future slice. Keeping the property
 * keys in this module means the popup never has to know the naming scheme.
 * @param {string} layerName
 * @param {any} feature - GeoJSON feature of the clicked cell
 * @returns {{hist: number|null, changes: Record<string, number|null>, absolutes: Record<string, number|null>, unit: string|null, decimals: number, changeUnit: string|null, changeDecimals: number}|null}
 */
export function getGridIndicatorCellData(layerName, feature) {
  const config = gridIndicatorLayerConfigs[layerName]
  if (!config) return null

  const props = feature?.properties || {}
  /** @param {any} v */
  const num = (v) => (typeof v === "number" && !isNaN(v) ? v : null)
  const hist = num(props.hist)

  /** @type {Array<[string, string]>} */
  const slices = [
    ["low_2050", "ssp126__mid"],
    ["high_2050", "ssp585__mid"],
    ["low_2080", "ssp126__late"],
    ["high_2080", "ssp585__late"],
  ]
  /** @type {Record<string, number|null>} */
  const changes = {}
  /** @type {Record<string, number|null>} */
  const absolutes = {}
  for (const [key, prop] of slices) {
    const value = num(props[prop])
    absolutes[key] = value
    changes[key] = indicatorChange(value, hist, config.changeMode)
  }

  return {
    hist,
    changes,
    absolutes,
    unit: config.unit,
    decimals: config.decimals,
    changeUnit: config.changeUnit,
    changeDecimals: config.changeDecimals,
  }
}

/**
 * Whether a feature looks like a grid indicator cell — it carries the `hist`
 * baseline and the `lat_lon` join key. Used to tell grid cells apart from the
 * admin2 polygons of other layers when hit-testing a click.
 * @param {any} feature
 */
export function isGridIndicatorFeature(feature) {
  const props = feature?.properties
  return !!props && typeof props.hist === "number" && typeof props.lat_lon === "string"
}

/**
 * Legend subheading: the unit for Past, and what the numbers mean for a future
 * period. Returns '' when the unit is still unknown.
 * @param {string} layerName
 * @param {string} time
 * @returns {string}
 */
export function getGridIndicatorSubhead(layerName, time) {
  const config = gridIndicatorLayerConfigs[layerName]
  if (!config) return ""
  const isChange = time === "2050" || time === "2080"
  if (!isChange) return config.unit || ""
  // The change unit is not always the layer's unit: runoff, solar PV and wind
  // speed report their change as a percentage of the baseline.
  return config.changeUnit
    ? `Change vs 1985-2014 (${config.changeUnit})`
    : "Change vs 1985-2014"
}

/**
 * Every layerAvailability entry for the grid indicators, to spread into a
 * country config. All 12 carry Past + both future periods and both scenarios.
 * @returns {Record<string, {times: string[], hasScenarios: boolean}>}
 */
export function gridIndicatorAvailability() {
  return Object.fromEntries(
    gridIndicatorLayerNames.map((name) => [name, { times: ["Past", "2050", "2080"], hasScenarios: true }])
  )
}
