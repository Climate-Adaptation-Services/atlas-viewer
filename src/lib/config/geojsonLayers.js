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
 * @property {string} baseUrl - Base URL (empty string for local static files, or AWS S3 URL)
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
  if (depth < 0.5) return '#e0f3ff';  // <0.5m - very light blue
  if (depth < 1) return '#a6d8ff';    // 0.5-1m - light blue
  if (depth < 2) return '#4db8ff';    // 1-2m - medium blue
  if (depth < 5) return '#0080ff';    // 2-5m - blue
  return '#0040a0';                   // ≥5m - dark blue
}

/**
 * Color scale function for Water Stress layer
 * @param {number} category - Water stress category (-1 to 4)
 * @returns {string} Hex color code
 */
function getWaterStressColor(category) {
  const colors = {
    '-1': '#d1d1d1', // Arid and low water use - light gray
    0: '#ffffbe', // Low - pale yellow
    1: '#fed976', // Low-Medium - darker yellow
    2: '#f47b50', // Medium-High - orange
    3: '#d8392c', // High - red
    4: '#a41f35' // Extremely High - dark red
  };
  return colors[category] !== undefined ? colors[category] : '#d1d1d1';
}

/**
 * Configuration for all GeoJSON-based map layers
 * @type {Record<string, GeojsonLayerConfig>}
 */
export const geojsonLayerConfigs = {
  'Water Stress': {
    filename: 'kenya_water_stress.geojson', // Base filename, will be modified for time periods
    baseUrl: 'https://kenyaciaviewer.s3.eu-north-1.amazonaws.com/',
    propertyName: 'bws_cat',
    supportsTimeScenario: true, // Flag to indicate this layer supports time and scenario
    getStyle: (feature, time, scenario) => {
      let category = -1;
      const timeNormalized = time ? time.toLowerCase() : 'past';

      if (timeNormalized === 'past' || timeNormalized === 'hist') {
        // Baseline file uses bws_cat
        category = feature.properties?.bws_cat ?? -1;
      } else if (timeNormalized === '2050') {
        // 2050 file uses opt50_ws_x_c or pes50_ws_x_c
        const scenarioNormalized = scenario ? scenario.toLowerCase() : 'high';
        const field = scenarioNormalized === 'low' ? 'opt50_ws_x_c' : 'pes50_ws_x_c';
        category = feature.properties?.[field] ?? -1;
      } else if (timeNormalized === '2080') {
        // 2080 file uses opt80_ws_x_c or pes80_ws_x_c
        const scenarioNormalized = scenario ? scenario.toLowerCase() : 'high';
        const field = scenarioNormalized === 'low' ? 'opt80_ws_x_c' : 'pes80_ws_x_c';
        category = feature.properties?.[field] ?? -1;
      }

      return {
        fillColor: getWaterStressColor(category),
        weight: 0,
        opacity: 0,
        color: 'transparent',
        fillOpacity: 0.7
      };
    },
    interactive: true,
    legendItems: [
      { color: '#a41f35', label: 'Extremely high', subtitle: '(>80%)' },
      { color: '#d8392c', label: 'High', subtitle: '(40-80%)' },
      { color: '#f47b50', label: 'Medium-high', subtitle: '(20-40%)' },
      { color: '#fed976', label: 'Low-medium', subtitle: '(10-20%)' },
      { color: '#ffffbe', label: 'Low', subtitle: '(<10%)' },
      { color: '#d1d1d1', label: 'Arid and low water use', subtitle: '' }
    ]
  },
  'River Flood': {
    filename: 'kenya_river_flood.geojson',
    baseUrl: 'https://kenyaciaviewer.s3.eu-north-1.amazonaws.com/',
    propertyName: 'DN', // Property containing the flood depth value
    getStyle: (feature) => {
      const depth = feature.properties?.DN ?? 0;
      return {
        fillColor: getRiverFloodColor(depth),
        weight: 0.3,
        opacity: 0.2,
        color: '#0066cc',
        fillOpacity: 0.6
      };
    },
    interactive: true,
    legendItems: [
      { color: '#0040a0', label: '≥5 m' },
      { color: '#0080ff', label: '2-5 m' },
      { color: '#4db8ff', label: '1-2 m' },
      { color: '#a6d8ff', label: '0.5-1 m' },
      { color: '#e0f3ff', label: '<0.5 m' }
    ]
  }
  // Add more GeoJSON layers here as needed
  // Example:
  // 'Landslide Risk': {
  //   filename: 'kenya_landslide.geojson',
  //   baseUrl: 'https://yourbucket.s3.region.amazonaws.com/',
  //   propertyName: 'risk_level',
  //   getStyle: (feature) => { ... },
  //   interactive: true,
  //   legendItems: [...]
  // }
};

/**
 * Check if a layer is a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {boolean}
 */
export function isGeojsonLayer(layerName) {
  return layerName in geojsonLayerConfigs;
}

/**
 * Get configuration for a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {GeojsonLayerConfig|null}
 */
export function getGeojsonLayerConfig(layerName) {
  return geojsonLayerConfigs[layerName] || null;
}

/**
 * Get the full URL for a GeoJSON layer file
 * @param {string} layerName - Name of the layer
 * @param {string} time - Time period (optional, for layers that support it)
 * @param {string} scenario - Scenario (optional, for layers that support it)
 * @returns {string|null}
 */
export function getGeojsonLayerUrl(layerName, time, scenario) {
  const config = getGeojsonLayerConfig(layerName);
  if (!config) return null;

  let filename = config.filename;

  // If the layer supports time periods, modify the filename
  if (config.supportsTimeScenario) {
    const timeNormalized = time ? time.toLowerCase() : 'past';
    const baseName = filename.replace('.geojson', '');

    if (timeNormalized === 'past' || timeNormalized === 'hist') {
      filename = `${baseName}.geojson`;
    } else if (timeNormalized === '2050' || timeNormalized === '2080') {
      filename = `${baseName}_${timeNormalized}.geojson`;
    }
  }

  // If baseUrl is empty, use local static folder
  const base = config.baseUrl || '/';
  return `${base}${filename}`;
}

/**
 * Get legend items for a GeoJSON layer
 * @param {string} layerName - Name of the layer
 * @returns {Array<{color: string, label: string}>|null}
 */
export function getGeojsonLayerLegend(layerName) {
  const config = getGeojsonLayerConfig(layerName);
  return config?.legendItems || null;
}
