/**
 * Layer information configuration
 * Contains metadata about each layer: description, source, baseline, resolution, etc.
 */

/**
 * @typedef {Object} LayerInfo
 * @property {string} description - Description shown for historical data
 * @property {string} [projectionDescription] - Description shown for projection data
 * @property {string} [historicalSource] - Data source for historical/observational data
 * @property {string} [historicalSourceUrl] - URL for the historical data source
 * @property {string} [projectionSource] - Data source for projection data
 * @property {string} [projectionSourceUrl] - URL for the projection data source
 * @property {string} [source] - Fallback source (used when same for both periods)
 * @property {string} [sourceUrl] - Fallback source URL
 * @property {string} [baseline] - Baseline period
 * @property {string} [historicalResolution] - Spatial resolution for historical data
 * @property {string} [projectionResolution] - Spatial resolution for projection data
 */

/**
 * Information for all map layers
 * @type {Record<string, LayerInfo>}
 */
export const layerInfo = {
  // Climate layers - Temperature
  'Maximum temperature': {
    description: 'Yearly mean of daily maximum temperatures.',
    projectionDescription: 'Projected change in average maximum temperature compared to the baseline period (1981–2010).',
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
    projectionDescription: 'Projected change in average minimum temperature compared to the baseline period (1981–2010).',
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
    projectionDescription: 'Projected change in average temperature compared to the baseline period (1981–2010).',
    historicalSource: 'ERA5',
    historicalSourceUrl: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.25°',
    projectionResolution: '0.5°'
  },

  // Climate layers - Precipitation
  'Total rainfall': {
    description: 'Yearly rainfall.',
    projectionDescription: 'Projected change in yearly rainfall compared to the baseline period (1981–2010).',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },
  'Days above 20 mm': {
    description: 'Number of days per year with more than 20mm rainfall (heavy rain days).',
    projectionDescription: 'Projected change in the number of days per year with more than 20mm rainfall compared to the baseline period (1981–2010).',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },
  'Dry spells': {
    description: 'Number of periods per year with 5 consecutive days without significant rainfall.',
    projectionDescription: 'Projected change in the number of periods per year with 5 consecutive days without significant rainfall compared to the baseline period (1981–2010).',
    historicalSource: 'CHIRPSv2',
    historicalSourceUrl: 'https://www.chc.ucsb.edu/data/chirps',
    projectionSource: 'ISIMIP3B',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    historicalResolution: '0.05°',
    projectionResolution: '0.5°'
  },

  // Climate layers - Threshold
  'Days above 35°C': {
    description: 'Number of days per year where the maximum temperature exceeds 35°C.',
    historicalSource: 'Critical Threshold Explorer',
    historicalSourceUrl: 'https://cte-zeta.vercel.app/?t1=35&years=2036-2065&scenario=ssp585&months=1-12',
    projectionSource: 'Critical Threshold Explorer',
    projectionSourceUrl: 'https://cte-zeta.vercel.app/?t1=35&years=2036-2065&scenario=ssp585&months=1-12',
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
    source: 'RCMRD',
    sourceUrl: 'https://opendata.rcmrd.org/datasets/kenya-agro-ecological-zones/about'
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
