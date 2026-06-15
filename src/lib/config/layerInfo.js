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
  // Impact theme — per-crop+season entries are added dynamically below the
  // layerInfo object via the for-loop. See cropLayerNames.

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
  },

  // Solution layers (Justdiggit suitability rasters)
  'Bund suitability': {
    description: 'Areas suitable for constructing water-retention bunds — earthen structures that capture rainwater and reduce runoff to restore degraded land.',
    source: 'Justdiggit',
    sourceUrl: 'https://justdiggit.org/'
  },
  'Tree cover (FMNR) suitability': {
    description: 'Areas suitable for Farmer Managed Natural Regeneration (FMNR), a low-cost restoration technique that regrows trees and shrubs from existing rootstock and seeds.',
    source: 'Justdiggit',
    sourceUrl: 'https://justdiggit.org/'
  }
};

// Populate Impact theme crop metadata. Baseline and source come from the
// embedded metadata of kenya_admin2_deltas.geojson. Crops with two entries
// (long rains / short rains) reflect Kenya's bimodal rainfall regime — two
// distinct growing seasons per year, modelled separately.
const SEASON_INFO = {
  'long rains': 'long rains growing season',
  'short rains': 'short rains growing season'
};
// Shared model/methodology tail, identical for every crop+season.
const CROP_MODEL_NOTE = 'Future window (2036–2065 or 2066–2095) vs. 1981–2010 reference, CMIP6 multi-model ensemble median (10 GCMs), LPJmL crop model with FAO-scaled yields and unlimited nitrogen — note that projected gains may be overstated under real-world nutrient limits. Low scenario = SSP1-2.6, high scenario = SSP5-8.5.';
const cropLayerNames = [
  'Maize (long rains)',
  'Maize (short rains)',
  'Beans (long rains)',
  'Beans (short rains)',
  'Sorghum (long rains)',
  'Sorghum (short rains)',
  'Millet',
  'Pigeon peas',
  'Potatoes'
];
for (const name of cropLayerNames) {
  const cropLabel = name.replace(/\s*\(.*\)/i, '').toLowerCase();
  const seasonMatch = name.match(/\((long rains|short rains)\)/);
  const seasonClause = seasonMatch ? ` for the ${SEASON_INFO[seasonMatch[1]]}` : '';
  const fullText = `Projected change in ${cropLabel} yield${seasonClause}. ${CROP_MODEL_NOTE}`;
  layerInfo[name] = {
    description: fullText,
    projectionDescription: fullText,
    projectionSource: 'Ignacio Saldivia Gonzatti; LPJmL (CMIP6 forcing, FAO-scaled), ISIMIP3b',
    projectionSourceUrl: 'https://www.isimip.org/',
    baseline: '1981–2010',
    projectionResolution: 'GADM admin2'
  };
}

/**
 * Get information for a specific layer
 * @param {string} layerName - Name of the layer
 * @returns {LayerInfo|null}
 */
export function getLayerInfo(layerName) {
  return layerInfo[layerName] || null;
}
