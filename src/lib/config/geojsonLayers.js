/**
 * Configuration for GeoJSON-based map layers
 * These are layers that are stored as static GeoJSON files rather than WMS or CSV data
 */

/**
 * @typedef {Object} GeojsonLayerStyle
 * @property {Function} getColor - Function to get fill color based on feature properties
 * @property {number} weight - Border weight
 * @property {number} opacity - Border opacity
 * @property {string} color - Border color
 * @property {number} fillOpacity - Fill opacity
 */

/**
 * @typedef {Object} GeojsonLayerConfig
 * @property {string} filename - Filename of the GeoJSON file
 * @property {string} baseUrl - Base URL (empty string for local static files, or API proxy URL)
 * @property {string} propertyName - Property name containing the data value
 * @property {Function} getStyle - Function to generate Leaflet style for features
 * @property {boolean} interactive - Whether layer should be interactive
 * @property {Array<{color: string, label: string}>} legendItems - Legend configuration
 */

/**
 * Color scale function for River Flood layer
 * @param {number} depth - Flood depth in meters
 * @returns {string} Hex color code
 */
function getRiverFloodColor(depth) {
  if (depth < 0.5) return "#e0f3ff" // <0.5m - very light blue
  if (depth < 1) return "#a6d8ff" // 0.5-1m - light blue
  if (depth < 2) return "#4db8ff" // 1-2m - medium blue
  if (depth < 5) return "#0080ff" // 2-5m - blue
  return "#0040a0" // ≥5m - dark blue
}

/**
 * Color scale function for Yield Change layer.
 * Diverging brown→teal scale split at 0; loss = brown, gain = teal — sign is
 * never grouped into one neutral bucket. Capped at ±75%.
 * @param {number|null|undefined} delta - Yield change in percent
 * @returns {string} Hex color code
 */
function getYieldChangeColor(delta) {
  if (delta === null || delta === undefined || isNaN(delta)) return "#d1d1d1"
  if (delta <= -75) return "#8b3a1a"
  if (delta <= -50) return "#c47948"
  if (delta <= -25) return "#e6cbae"
  if (delta < 0) return "#f3e2d0"
  if (delta < 25) return "#d9ede0"
  if (delta < 50) return "#a8d4b8"
  if (delta < 75) return "#4a9d7a"
  return "#1e5e3f"
}

/**
 * Color scale function for Water Stress layer
 * @param {number} category - Water stress category (-1 to 4)
 * @returns {string} Hex color code
 */
function getWaterStressColor(category) {
  const colors = {
    "-1": "#d1d1d1", // Arid and low water use - light gray
    0: "#ffffbe", // Low - pale yellow
    1: "#fed976", // Low-Medium - darker yellow
    2: "#f47b50", // Medium-High - orange
    3: "#d8392c", // High - red
    4: "#a41f35", // Extremely High - dark red
  }
  return colors[category] !== undefined ? colors[category] : "#d1d1d1"
}

/**
 * Crop impact layers all share one source file (kenya_admin2_deltas.geojson).
 * Each crop+season is exposed as its own layer that reads a different
 * property family. Property naming: `<cropKey>__<ssp>__<period>__median`
 *   - period: mid (~2050) | late (~2080)
 *   - ssp: ssp126 (Low) | ssp585 (High)
 *
 * Kenya has a bimodal rainfall regime so Maize/Beans/Sorghum appear in two
 * seasons. _1 = "long rains" (plant Mar–May, harvest Jul–Aug — main season,
 * biggest area & yields). _2 = "short rains" (plant Oct–Nov, harvest Jan–Feb
 * — ~5% of area, lower yields). Single-season crops have no suffix.
 */
const CROP_IMPACT_LAYERS = [
  { name: "Maize (long rains)", cropKey: "maize_1" },
  { name: "Maize (short rains)", cropKey: "maize_2" },
  { name: "Beans (long rains)", cropKey: "pulses_beans_1" },
  { name: "Beans (short rains)", cropKey: "pulses_beans_2" },
  { name: "Sorghum (long rains)", cropKey: "tropical_cereals_sorghum_1" },
  { name: "Sorghum (short rains)", cropKey: "tropical_cereals_sorghum_2" },
  { name: "Millet", cropKey: "tropical_cereals_millet" },
  { name: "Pigeon peas", cropKey: "pulses_pigeon_peas" },
  { name: "Potatoes", cropKey: "temperate_roots" },
]

const CROP_LEGEND_ITEMS = [
  { color: "#1e5e3f", label: "≥ +75%" },
  { color: "#4a9d7a", label: "+50 to +75%" },
  { color: "#a8d4b8", label: "+25 to +50%" },
  { color: "#d9ede0", label: "0 to +25%" },
  { color: "#f3e2d0", label: "-25 to 0%" },
  { color: "#e6cbae", label: "-50 to -25%" },
  { color: "#c47948", label: "-75 to -50%" },
  { color: "#8b3a1a", label: "≤ -75%" },
  { color: "#d1d1d1", label: "No data" },
]

/**
 * Build per-crop layer configs that all share the same source GeoJSON.
 * @returns {Record<string, GeojsonLayerConfig>}
 */
function buildCropImpactLayers() {
  /** @type {Record<string, GeojsonLayerConfig>} */
  const entries = {}
  for (const { name, cropKey } of CROP_IMPACT_LAYERS) {
    entries[name] = {
      filename: "kenya_admin2_deltas.geojson",
      baseUrl: "https://fsn1.your-objectstorage.com/kenyaciaviewer/",
      propertyName: `${cropKey}__ssp585__late__median`,
      supportsTimeScenario: true,
      singleFileMultiTime: true,
      getStyle: (feature, time, scenario) => {
        const period = (time || "2050") === "2080" ? "late" : "mid"
        const ssp = (scenario || "High").toLowerCase() === "low" ? "ssp126" : "ssp585"
        const field = `${cropKey}__${ssp}__${period}__median`
        const delta = feature.properties?.[field]
        return {
          fillColor: getYieldChangeColor(delta),
          weight: 0.3,
          opacity: 0.4,
          color: "#666",
          fillOpacity: 0.75,
        }
      },
      interactive: true,
      legendItems: CROP_LEGEND_ITEMS,
    }
  }
  return entries
}

/**
 * Ordered list of crop impact layer display names — used by the sidepanel
 * to populate the Impact-layers collapsible section.
 */
export const cropImpactLayerNames = CROP_IMPACT_LAYERS.map((c) => c.name)

const CROP_KEY_BY_LAYER = Object.fromEntries(
  CROP_IMPACT_LAYERS.map((c) => [c.name, c.cropKey])
)

/**
 * @param {string} layerName
 * @returns {boolean}
 */
export function isCropImpactLayer(layerName) {
  return layerName in CROP_KEY_BY_LAYER
}

/**
 * Property prefix in kenya_admin2_deltas.geojson for a crop impact layer.
 * Combined with `__<ssp>__<period>__<stat>` it yields the full property key.
 * @param {string} layerName
 * @returns {string | null}
 */
export function getCropKey(layerName) {
  return CROP_KEY_BY_LAYER[layerName] ?? null
}

/**
 * Configuration for all GeoJSON-based map layers
 * @type {Record<string, GeojsonLayerConfig>}
 */
export const geojsonLayerConfigs = {
  "Water Stress": {
    filename: "kenya_water_stress.geojson", // Base filename, will be modified for time periods
    baseUrl: "https://fsn1.your-objectstorage.com/kenyaciaviewer/",
    propertyName: "bws_cat",
    supportsTimeScenario: true, // Flag to indicate this layer supports time and scenario
    getStyle: (feature, time, scenario) => {
      let category = -1
      const timeNormalized = time ? time.toLowerCase() : "past"

      if (timeNormalized === "past" || timeNormalized === "hist") {
        // Baseline file uses bws_cat
        category = feature.properties?.bws_cat ?? -1
      } else if (timeNormalized === "2050") {
        // 2050 file uses opt50_ws_x_c or pes50_ws_x_c
        const scenarioNormalized = scenario ? scenario.toLowerCase() : "high"
        const field = scenarioNormalized === "low" ? "opt50_ws_x_c" : "pes50_ws_x_c"
        category = feature.properties?.[field] ?? -1
      } else if (timeNormalized === "2080") {
        // 2080 file uses opt80_ws_x_c or pes80_ws_x_c
        const scenarioNormalized = scenario ? scenario.toLowerCase() : "high"
        const field = scenarioNormalized === "low" ? "opt80_ws_x_c" : "pes80_ws_x_c"
        category = feature.properties?.[field] ?? -1
      }

      return {
        fillColor: getWaterStressColor(category),
        weight: 0,
        opacity: 0,
        color: "transparent",
        fillOpacity: 0.7,
      }
    },
    interactive: true,
    legendItems: [
      { color: "#a41f35", label: "Extremely high", subtitle: "(>80%)" },
      { color: "#d8392c", label: "High", subtitle: "(40-80%)" },
      { color: "#f47b50", label: "Medium-high", subtitle: "(20-40%)" },
      { color: "#fed976", label: "Low-medium", subtitle: "(10-20%)" },
      { color: "#ffffbe", label: "Low", subtitle: "(<10%)" },
      { color: "#d1d1d1", label: "Arid and low water use", subtitle: "" },
    ],
  },
  ...buildCropImpactLayers(),
  "River Flood": {
    filename: "kenya_river_flood.geojson",
    baseUrl: "https://fsn1.your-objectstorage.com/kenyaciaviewer/",
    propertyName: "DN", // Property containing the flood depth value
    getStyle: (feature) => {
      const depth = feature.properties?.DN ?? 0
      return {
        fillColor: getRiverFloodColor(depth),
        weight: 0.3,
        opacity: 0.2,
        color: "#0066cc",
        fillOpacity: 0.6,
      }
    },
    interactive: true,
    legendItems: [
      { color: "#0040a0", label: "≥5 m" },
      { color: "#0080ff", label: "2-5 m" },
      { color: "#4db8ff", label: "1-2 m" },
      { color: "#a6d8ff", label: "0.5-1 m" },
      { color: "#e0f3ff", label: "<0.5 m" },
    ],
  },
  // Add more GeoJSON layers here as needed
  // Example:
  // 'Landslide Risk': {
  //   filename: 'kenya_landslide.geojson',
  //   baseUrl: '/api/geojson/',
  //   propertyName: 'risk_level',
  //   getStyle: (feature) => { ... },
  //   interactive: true,
  //   legendItems: [...]
  // }
}

/**
 * Check if a layer is a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {boolean}
 */
export function isGeojsonLayer(layerName) {
  return layerName in geojsonLayerConfigs
}

/**
 * Get configuration for a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {GeojsonLayerConfig|null}
 */
export function getGeojsonLayerConfig(layerName) {
  return geojsonLayerConfigs[layerName] || null
}

/**
 * Get the full URL for a GeoJSON layer file
 * @param {string} layerName - Name of the layer
 * @param {string} time - Time period (optional, for layers that support it)
 * @param {string} scenario - Scenario (optional, for layers that support it)
 * @returns {string|null}
 */
export function getGeojsonLayerUrl(layerName, time, scenario) {
  const config = getGeojsonLayerConfig(layerName)
  if (!config) return null

  let filename = config.filename

  // If the layer supports time periods, modify the filename, unless all time periods
  // are stored as properties inside a single file (singleFileMultiTime).
  if (config.supportsTimeScenario && !config.singleFileMultiTime) {
    const timeNormalized = time ? time.toLowerCase() : "past"
    const baseName = filename.replace(".geojson", "")

    if (timeNormalized === "past" || timeNormalized === "hist") {
      filename = `${baseName}.geojson`
    } else if (timeNormalized === "2050" || timeNormalized === "2080") {
      filename = `${baseName}_${timeNormalized}.geojson`
    }
  }

  // If baseUrl is empty, use local static folder
  const base = config.baseUrl || "/"
  return `${base}${filename}`
}

/**
 * Get legend items for a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {Array<{color: string, label: string}>|null}
 */
export function getGeojsonLayerLegend(layerName) {
  const config = getGeojsonLayerConfig(layerName)
  return config?.legendItems || null
}
