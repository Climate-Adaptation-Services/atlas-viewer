/**
 * Layer information configuration
 * Contains metadata about each layer: description, source, baseline, resolution, etc.
 */

/**
 * @typedef {Object} LayerInfo
 * @property {string} description - Short description of what the layer shows
 * @property {string} source - Data source/provider
 * @property {string} [sourceUrl] - URL to the data source
 * @property {string} [baseline] - Baseline period
 * @property {string} [resolution] - Spatial resolution
 * @property {string} [uncertainty] - Uncertainty information
 */

/**
 * Information for all map layers
 * @type {Record<string, LayerInfo>}
 */
export const layerInfo = {
  // Climate layers
  'Maximum temperature': {
    description: 'Highest daily temperature averaged over the selected period.',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },
  'Minimum temperature': {
    description: 'Lowest daily temperature averaged over the selected period.',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },
  'Average temperature': {
    description: 'Mean daily temperature averaged over the selected period.',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },
  'Total rainfall': {
    description: 'Cumulative precipitation over the selected period.',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },
  'Days above 20 mm': {
    description: 'Number of days with more than 20mm rainfall (heavy rain days).',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },
  'Dry spells': {
    description: 'Number of periods with 5+ consecutive days without significant rainfall.',
    source: 'CMIP6 multi-model ensemble',
    sourceUrl: 'https://pcmdi.llnl.gov/CMIP6/',
    baseline: '1981–2010',
    resolution: '0.25°'
  },

  // GeoJSON layers
  'Water Stress': {
    description: 'Ratio of water withdrawals to available water supply per basin.',
    source: 'World Resources Institute, Aqueduct',
    sourceUrl: 'https://www.wri.org/aqueduct'
  },
  'River Flood': {
    description: 'Expected flood inundation depth during a 1-in-100 year flood event.',
    source: 'World Resources Institute, Aqueduct Floods',
    sourceUrl: 'https://www.wri.org/aqueduct'
  },

  // Context layers
  'Urban population': {
    description: 'Agglomerations with over 10,000 people.',
    source: 'Africapolis',
    sourceUrl: 'https://africapolis.org/'
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
