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
    description: 'Yearly mean of daily maximum temperatures.',
    historicalSource: 'ERA5',
    historicalSourceUrl: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.25°',
    projectionResolution: '0.5°'
  },
  'Minimum temperature': {
    description: 'Yearly mean of daily minimum temperatures.',
    historicalSource: 'ERA5',
    historicalSourceUrl: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.25°',
    projectionResolution: '0.5°'
  },
  'Average temperature': {
    description: 'Yearly average temperature.',
    historicalSource: 'ERA5',
    historicalSourceUrl: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.25°',
    projectionResolution: '0.5°'
  },
  'Total rainfall': {
    description: 'Cumulative precipitation over the selected period.',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },
  'Days above 20 mm': {
    description: 'Number of days with more than 20mm rainfall (heavy rain days).',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },
  'Dry spells': {
    description: 'Number of periods with 5+ consecutive days without significant rainfall.',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },
  'Days above 35°C': {
    description: 'Number of days per year where the maximum temperature exceeds 35°C.',
    source: 'Critical Threshold Explorer',
    sourceUrl: 'https://cte-zeta.vercel.app/?t1=35&years=2036-2065&scenario=ssp585&months=1-12',
    baseline: '1981–2010',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
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
