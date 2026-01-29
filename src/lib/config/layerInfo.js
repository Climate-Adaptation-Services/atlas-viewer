/**
 * Layer information configuration
 * Contains metadata about each layer: description, source, and methodology
 */

/**
 * @typedef {Object} LayerInfo
 * @property {string} description - Short description of what the layer shows
 * @property {string} source - Data source/provider
 * @property {string} [methodology] - Optional methodology note
 */

/**
 * Information for all map layers
 * @type {Record<string, LayerInfo>}
 */
export const layerInfo = {
  // Climate layers
  'Maximum temperature': {
    description: 'Highest daily temperature averaged over the selected period.',
    source: 'CHIRPS & CHIRTS climate data'
  },
  'Minimum temperature': {
    description: 'Lowest daily temperature averaged over the selected period.',
    source: 'CHIRPS & CHIRTS climate data'
  },
  'Average temperature': {
    description: 'Mean daily temperature averaged over the selected period.',
    source: 'CHIRPS & CHIRTS climate data'
  },
  'Total rainfall': {
    description: 'Cumulative precipitation over the selected period.',
    source: 'CHIRPS & CHIRTS climate data'
  },
  'Days above 20 mm': {
    description: 'Number of days with more than 20mm rainfall (heavy rain days).',
    source: 'CHIRPS & CHIRTS climate data'
  },
  'Dry spells': {
    description: 'Number of periods with 5+ consecutive days without significant rainfall.',
    source: 'CHIRPS & CHIRTS climate data'
  },

  // GeoJSON layers
  'Water Stress': {
    description: 'Ratio of water withdrawals to available water supply per basin.',
    source: 'World Resources Institute, Aqueduct',
    methodology: 'Categories based on withdrawal-to-availability ratio'
  },
  'River Flood': {
    description: 'Expected flood inundation depth during a 1-in-100 year flood event.',
    source: 'World Resources Institute, Aqueduct Floods'
  },

  // Context layers
  'Population': {
    description: 'Urban agglomerations with population estimates.',
    source: 'UN World Urbanization Prospects'
  },
  'Agroclimatic zones': {
    description: 'Agro-ecological zones based on climate and soil conditions.',
    source: 'Kenya Ministry of Agriculture'
  }
};

/**
 * Get information for a specific layer
 * @param {string} layerName - Name of the layer
 * @returns {LayerInfo|null}
 */
export function getLayerInfo(layerName) {
  return layerInfo[layerName] || null;
}
