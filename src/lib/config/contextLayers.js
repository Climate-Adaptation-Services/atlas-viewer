/**
 * Context layer configuration
 * Defines all available context layers and their behavior
 */

/**
 * @typedef {Object} ContextLayerConfig
 * @property {string} name - Display name of the layer
 * @property {string} type - Type of layer ('point', 'polygon', 'wms', etc.)
 * @property {Function} getPopupContent - Function to generate popup content for this layer
 * @property {number} clickThreshold - Distance threshold for click detection (in meters)
 * @property {Object} popupOptions - Leaflet popup options for this layer
 * @property {string} [url] - Optional full URL for the layer data (overrides default filename logic)
 * @property {string} [wmsEndpoint] - WMS service endpoint (when type is 'wms')
 * @property {string} [wmsLayer] - WMS layer name (when type is 'wms')
 * @property {string} [wmsStyle] - WMS style name (when type is 'wms')
 * @property {string} [wmsVersion] - WMS version, e.g. '1.3.0' (when type is 'wms')
 * @property {string} [legendUrl] - Full GetLegendGraphic URL (when type is 'wms')
 * @property {string} [attribution] - Map attribution string (when type is 'wms')
 * @property {{present?: string, absent?: string, none?: string}} [wmsValueLabels] - Popup labels for a binary GRAY_INDEX raster (1 = present, 0 = absent, no feature = none)
 */

/**
 * Get popup content for population layer
 * @param {Object} feature - GeoJSON feature
 * @param {string} time - Current time period ('Past' or '2050')
 * @param {string} scenario - Current scenario (not used for population)
 * @returns {string|null} HTML content for popup
 */
function getPopulationPopupContent(feature, time, scenario) {
  const props = feature.properties

  // Map time period to population property - only 2025 and 2050 available
  const is2050 = time === "2050"
  const popProperty = is2050 ? "Population_2050" : "Population_2025"
  const displayYear = is2050 ? "2050" : "2025"

  const population = props[popProperty]
  const name = props.Agglomeration_Name || "Unknown"

  if (population) {
    const formattedPop = population.toLocaleString()

    return `
      <div class="popup-content">
        <div class="value-text"><strong>${name}</strong></div>
        <div style="text-align: center; margin-top: 5px;">
          Population (${displayYear}): ${formattedPop}
        </div>
      </div>
    `
  }

  return null
}

/**
 * Get popup content for water stress layer
 * @param {Object} feature - GeoJSON feature
 * @param {string} time - Current time period
 * @param {string} scenario - Current scenario (low/high)
 * @returns {string|null} HTML content for popup
 */
function getWaterStressPopupContent(feature, time, scenario) {
  const props = feature.properties
  const basinName = props.name_1 || "Water Basin"

  let stressLabel, stressRaw
  const timeNormalized = time ? time.toLowerCase() : "past"

  if (timeNormalized === "past" || timeNormalized === "hist") {
    // Baseline uses bws_label and bws_raw
    stressLabel = props.bws_label || "No data"
    stressRaw = props.bws_raw
  } else {
    // Future data (2050/2080) uses scenario-specific fields
    const scenarioNormalized = scenario ? scenario.toLowerCase() : "high"
    const scenarioPrefix = scenarioNormalized === "low" ? "opt" : "pes"
    const year = timeNormalized === "2080" ? "80" : "50"
    const labelField = `${scenarioPrefix}${year}_ws_x_l`
    const rawField = `${scenarioPrefix}${year}_ws_x_r`

    stressLabel = props[labelField] || "No data"
    stressRaw = props[rawField]
  }

  return `
    <div class="popup-content">
      <div class="value-text"><strong>${basinName}</strong></div>
      <div style="text-align: center; margin-top: 5px;">
        Water Stress: ${stressLabel}
        ${stressRaw != null ? `<br><small>(${(stressRaw * 100).toFixed(1)}%)</small>` : ""}
      </div>
    </div>
  `
}

/**
 * @type {Record<string, ContextLayerConfig>}
 */
export const contextLayerConfigs = {
  "Urban population": {
    name: "Urban population",
    type: "point",
    getPopupContent: getPopulationPopupContent,
    // Distance threshold for click detection (in meters)
    clickThreshold: 20000,
    // Popup display options
    popupOptions: {
      maxWidth: 350,
      minWidth: 200,
      className: "compact-popup", // CSS class for styling
    },
  },
  "Agroclimatic zones": {
    name: "Agroclimatic zones",
    type: "polygon",
    // Full URL for the agroclimatic zones GeoJSON
    url: "https://fsn1.your-objectstorage.com/kenyaciaviewer/kenya_dissolved.geojson",
    getPopupContent: () => null, // No popup for this layer
    clickThreshold: 0,
    popupOptions: {},
  },
  "Livestock density": {
    name: "Livestock density",
    type: "polygon",
    // No `url`: the loader builds the filename (kenya_livestock_tlu.geojson) and
    // tries the local static/ copy first, then falls back to the Hetzner bucket
    // once the file is uploaded there for production.
    getPopupContent: () => null, // Polygon popups are not yet supported (see MapPopup.svelte)
    clickThreshold: 0,
    popupOptions: {},
  },
  "Bund suitability": {
    name: "Bund suitability",
    type: "wms",
    wmsEndpoint:
      "https://climate-adaptation-services.geospatialhosting.com/geoserver/cia_kenya/wms",
    wmsLayer: "kenya_bunds_justdiggit_v20260603",
    wmsStyle: "kenya_bunds_burgundy_binary_raster",
    wmsVersion: "1.3.0",
    legendUrl:
      "https://climate-adaptation-services.geospatialhosting.com/geoserver/cia_kenya/ows?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=kenya_bunds_justdiggit_v20260603",
    attribution: "Justdiggit",
    // Binary suitability raster: GRAY_INDEX 1 = suitable, 0 = not suitable.
    wmsValueLabels: {
      present: "Suitable for bunds",
      absent: "Not suitable",
      none: "No data at this location",
    },
    getPopupContent: () => null,
    clickThreshold: 0,
    popupOptions: { maxWidth: 300, minWidth: 200, className: "compact-popup" },
  },
  "Tree cover (FMNR) suitability": {
    name: "Tree cover (FMNR) suitability",
    type: "wms",
    wmsEndpoint:
      "https://climate-adaptation-services.geospatialhosting.com/geoserver/cia_kenya/wms",
    wmsLayer: "kenya_treecover_fmnr_justdiggit_v20260603",
    wmsStyle: "kenya_treecover_fmnr_purple_binary_raster",
    wmsVersion: "1.3.0",
    legendUrl:
      "https://climate-adaptation-services.geospatialhosting.com/geoserver/cia_kenya/ows?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=kenya_treecover_fmnr_justdiggit_v20260603",
    attribution: "Justdiggit",
    // Binary suitability raster: GRAY_INDEX 1 = suitable, 0 = not suitable.
    wmsValueLabels: {
      present: "Suitable for tree cover (FMNR)",
      absent: "Not suitable",
      none: "No data at this location",
    },
    getPopupContent: () => null,
    clickThreshold: 0,
    popupOptions: { maxWidth: 300, minWidth: 200, className: "compact-popup" },
  },
}

/**
 * Get list of all context layer names
 * @returns {string[]}
 */
export function getContextLayerNames() {
  return Object.keys(contextLayerConfigs)
}

/**
 * Check if a layer is a context layer
 * @param {string} layerName - Name of the layer
 * @returns {boolean}
 */
export function isContextLayer(layerName) {
  return layerName in contextLayerConfigs
}

/**
 * Get configuration for a context layer
 * @param {string} layerName - Name of the layer
 * @returns {ContextLayerConfig|null}
 */
export function getContextLayerConfig(layerName) {
  return contextLayerConfigs[layerName] || null
}
