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
  'Desertification risk': {
    description: 'Desertification Vulnerability is assessed using a relative vulnerability index that combines 11 environmental and human-pressure variables within a Multi-Criteria Evaluation (MCE) framework, implemented on a 10-metre analysis grid. The variables include Aridity Index, Vegetation Health (NDVI), Land Use/Land Cover (LULC), Livestock Density, Population Density, Soil Quality (TGSI), Temperature, Soil Moisture, Slope, Settlement Proximity, and Road Proximity.',
    source: 'Kenya Desertification Vulnerability Model, developed by Mohammed Hamed Hassan Abubakr (August 2026)',
    resolution: '10 m'
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
  'Livestock density': {
    description: 'Total Livestock Units (TLU) per km² by county. Livestock numbers are expressed in Tropical Livestock Units (TLU), a standardised measure that allows different animal species to be compared and aggregated. Conversion factors follow Jahnke (1982), the standard reference for sub-Saharan Africa. The following species are included: cattle (dairy and beef), camels, donkeys, horses, goats (dairy and meat), sheep (hair and wool), pigs, rabbits, ostriches, and all poultry (chickens, turkeys, geese, ducks, guinea fowl, pigeons, doves, and quails). Beehives and crocodiles are excluded.',
    source: 'Ministry of Agriculture and Livestock Development, State Department for Livestock Development',
    sourceUrl: null,
    baseline: '2024',
    projectionResolution: 'County (GADM admin1)'
  },

  // Gridded indicator layers (0.5° impact data delivery)
  // NOTE: source/sourceUrl are deliberately absent — the delivery ships no
  // provenance metadata and the exact model chain is unconfirmed. Fill them in
  // once known, like the units in gridIndicatorLayers.js.
  'Wind speed': {
    description: 'Average wind speed at 100 m above the ground — the hub height of a utility-scale turbine, so this reads as a wind-energy resource rather than as wind at the surface.',
    projectionDescription: 'Projected change in average wind speed at 100 m, as a percentage of the 1985-2014 baseline.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Heat stress': {
    description: 'Wet Bulb Globe Temperature (WBGT), a heat-stress index that combines temperature, humidity, wind and solar radiation into the heat load a working body actually experiences. Higher values mean less of the day can be worked safely.',
    projectionDescription: 'Projected change in Wet Bulb Globe Temperature (WBGT) compared to the baseline period (1985–2014). WBGT combines temperature, humidity, wind and solar radiation into the heat load a working body actually experiences.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Tropical nights': {
    description: 'Nights per year that stay warm — conventionally a night whose minimum temperature does not fall below 20 °C, giving the body no chance to cool down after a hot day. Southern Ghana already sits close to every night of the year, so the room to rise is mostly in the north.',
    projectionDescription: 'Projected change in the number of warm nights per year compared to the baseline period (1985–2014). Cells already near 365 nights cannot rise further, so the increase concentrates in the north.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Potential evapotranspiration': {
    description: 'How much water the atmosphere could draw from a well-watered surface — a measure of atmospheric demand for water, not of the evaporation that actually happens. Higher values mean soils and crops lose more water for the same rainfall.',
    projectionDescription: 'Projected change in potential evapotranspiration compared to the baseline period (1985–2014).',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Soil moisture': {
    description: 'Water held in the soil and available to plants.',
    projectionDescription: 'Projected change in soil moisture compared to the baseline period (1985–2014).',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Runoff': {
    description: 'The share of rainfall that flows off the land into streams and rivers instead of soaking into the soil or evaporating. Both flood peaks and dry-season river levels depend on it.',
    projectionDescription: 'Projected change in runoff compared to the baseline period (1985–2014), as a percentage of that baseline.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Tree cover': {
    description: 'Modelled share of the area covered by tree canopy.',
    projectionDescription: 'Projected change in tree cover compared to the baseline period (1985–2014), in percentage points.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
  },
  'Solar PV potential': {
    description: 'Electricity a photovoltaic installation yields per year per square metre of panel. It falls when it gets hotter, because panels lose efficiency, and when it gets cloudier.',
    projectionDescription: 'Projected change in photovoltaic yield compared to the baseline period (1985–2014), as a percentage of that baseline.',
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
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
// embedded metadata of the per-country admin2 deltas file (kenya_/ghana_).
// Crops with two entries (long rains / short rains) reflect Kenya's bimodal
// rainfall regime — two distinct growing seasons per year, modelled separately.
// Ghana crops are single-season (no suffix) and get no season clause.
const SEASON_INFO = {
  'long rains': 'long rains growing season',
  'short rains': 'short rains growing season'
};
// Shared model/methodology tail, identical for every crop+season.
const CROP_MODEL_NOTE = 'Future window (2036–2065 or 2066–2095) vs. 1981–2010 reference, CMIP6 multi-model ensemble median (10 GCMs), LPJmL crop model. Projected gains may be overstated because LPJmL includes CO2 fertilization and assumes unlimited nitrogen, while real-world nutrient limitations may constrain these benefits.';
const cropLayerNames = [
  // Kenya (bimodal)
  'Maize (long rains)',
  'Maize (short rains)',
  'Beans (long rains)',
  'Beans (short rains)',
  'Sorghum (long rains)',
  'Sorghum (short rains)',
  'Millet',
  'Pigeon peas',
  'Potatoes',
  // Ghana (single season); 'Millet' already defined above (shared cropKey)
  'Maize',
  'Rice',
  'Sorghum',
  'Beans',
  'Pulses',
  'Groundnuts',
  'Soybean',
  'Cassava',
  'Taro',
  'Yams'
];
for (const name of cropLayerNames) {
  const cropLabel = name.replace(/\s*\(.*\)/i, '').toLowerCase();
  const seasonMatch = name.match(/\((long rains|short rains)\)/);
  const seasonClause = seasonMatch ? ` for the ${SEASON_INFO[seasonMatch[1]]}` : '';
  const fullText = `Projected change in ${cropLabel} yield${seasonClause}. ${CROP_MODEL_NOTE}`;
  layerInfo[name] = {
    description: fullText,
    projectionDescription: fullText,
    projectionSource: 'Ignacio Saldivia Gonzatti; LPJmL crop model',
    projectionSourceUrl: null,
    baseline: '1981–2010',
    projectionResolution: 'GADM admin2'
  };
}

// Labour productivity: one layer per work intensity, identical wording apart
// from the intensity itself. Same 0.5° delivery as the other gridded indicators.
/** @type {Record<string, string>} */
const WORK_INTENSITIES = {
  'Labour productivity (light work)': 'light',
  'Labour productivity (moderate work)': 'moderate',
  'Labour productivity (heavy work)': 'heavy',
  'Labour productivity (very heavy work)': 'very heavy'
};
for (const [name, intensity] of Object.entries(WORK_INTENSITIES)) {
  layerInfo[name] = {
    description: `The share of the working day that can still be worked at ${intensity} physical intensity before heat forces rest. It follows from heat stress: as Wet Bulb Globe Temperature rises, more of the day has to be spent recovering. Each intensity is drawn on its own colour scale, so shades are not comparable between the four layers.`,
    projectionDescription: `Projected change in the share of the working day that can be worked at ${intensity} physical intensity, in percentage points compared to the baseline period (1985–2014).`,
    baseline: '1985–2014',
    historicalResolution: '0.5°',
    projectionResolution: '0.5°'
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
