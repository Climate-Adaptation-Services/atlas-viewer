import { gridIndicatorAvailability } from "$lib/config/gridIndicatorLayers.js"

/**
 * Layer availability configuration type
 * @typedef {Object} LayerAvailability
 * @property {string[]} times - Available time periods for this layer
 * @property {boolean} hasScenarios - Whether this layer has scenario variations (low/high)
 */

/**
 * Country configuration type definition
 * @typedef {Object} CountryConfig
 * @property {string} name - Display name of the country
 * @property {number[]} center - [latitude, longitude] coordinates for map center
 * @property {number} zoom - Default zoom level
 * @property {string} dataType - Data source type ('wms' or 'geojson')
 * @property {string} wmsEndpoint - URL for the WMS service (when dataType is 'wms')
 * @property {string} mask - Country mask parameter for WMS (when dataType is 'wms')
 * @property {string} [geojsonBaseUrl] - Base URL for GeoJSON data files (when dataType is 'geojson')
 * @property {string} [cropDeltasFilename] - Filename of the admin2 crop-yield deltas GeoJSON for this country (crop impact layers all read this one file)
 * @property {string} [africapolisCode] - Lowercase country code used in the Africapolis population filenames (e.g. 'ken', 'gha')
 * @property {string} [agroZonesFilename] - Filename of the agro-ecological zones GeoJSON for this country (Agroclimatic zones layer)
 * @property {Record<string, LayerAvailability>} [layerAvailability] - Data availability per layer
 * @property {{ url: string, source: string }} [hazardExternalLink] - External source for hazard data when this country has no in-tool hazard layers. Shown as a link-out card under the Hazards category.
 */

/**
 * @type {Record<string, CountryConfig>}
 */
export const countryConfigs = {
  zimbabwe: {
    name: "Zimbabwe",
    center: [-19, 27],
    zoom: 6,
    dataType: "geojson",
    geojsonBaseUrl: "https://fsn1.your-objectstorage.com/zimciaviewer/",
    mask: "zimbabwe",
    layerAvailability: {
      // Climate layers - all have Past, 2050, 2080 with low/high scenarios
      "Average temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Minimum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Maximum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Total rainfall": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Days above 20 mm": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Dry spells": { times: ["Past", "2050", "2080"], hasScenarios: true }
    }
  },
  kenya: {
    name: "Kenya",
    center: [0.0236, 37.9062], // Kenya's geographic center
    zoom: 6,
    dataType: "geojson",
    geojsonBaseUrl: "https://fsn1.your-objectstorage.com/kenyaciaviewer/",
    cropDeltasFilename: "kenya_admin2_deltas.geojson",
    africapolisCode: "ken",
    agroZonesFilename: "kenya_dissolved.geojson",
    mask: "kenya",
    layerAvailability: {
      // Climate layers - all have Past, 2050, 2080 with low/high scenarios
      "Average temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Minimum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Maximum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Total rainfall": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Days above 20 mm": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Dry spells": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Days above 35°C": { times: ["Past", "2050", "2080"], hasScenarios: true },
      // Regular map layers
      "Water Stress": { times: ["Past", "2050", "2080"], hasScenarios: true },
      // WMS raster from the cia_kenya GeoServer workspace (drought hazard theme)
      "Desertification risk": { times: ["Past"], hasScenarios: false },
      // Impact theme — crop yield change layers (all share kenya_admin2_deltas.geojson).
      // Kenya bimodal rainy seasons: long rains (Mar–May plant, Jul–Aug harvest, main)
      // and short rains (Oct–Nov plant, Jan–Feb harvest, secondary ~5% of area).
      "Maize (long rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Maize (short rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Beans (long rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Beans (short rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Sorghum (long rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Sorghum (short rains)": { times: ["2050", "2080"], hasScenarios: true },
      "Millet": { times: ["2050", "2080"], hasScenarios: true },
      "Pigeon peas": { times: ["2050", "2080"], hasScenarios: true },
      "Potatoes": { times: ["2050", "2080"], hasScenarios: true },
      // Context layers - Population only has Past (2025) and 2050, no scenarios
      "Urban population": { times: ["Past", "2050"], hasScenarios: false },
      "River Flood": { times: ["Past"], hasScenarios: false },
      "Agroclimatic zones": { times: ["Past"], hasScenarios: false },
      "Livestock density": { times: ["Past"], hasScenarios: false },
      "Bund suitability": { times: ["Past"], hasScenarios: false },
      "Tree cover (FMNR) suitability": { times: ["Past"], hasScenarios: false }
    }
  },
  ghana: {
    name: "Ghana",
    center: [7.9465, -1.0232], // Ghana's geographic center
    zoom: 7,
    dataType: "geojson",
    geojsonBaseUrl: "https://fsn1.your-objectstorage.com/ghanaciaviewer/",
    cropDeltasFilename: "ghana_admin2_deltas.geojson",
    africapolisCode: "gha",
    agroZonesFilename: "ghana_agro.geojson",
    // Ghana has no temperature/rainfall hazard layers of its own; those maps are
    // published by the national met service. The Hazards category shows this
    // link-out card only while no in-tool hazard layer is available — the
    // gridded WBGT/evapotranspiration/runoff layers below now take precedence
    // (see Sidepanel: showHazardExternal).
    hazardExternalLink: {
      url: "https://www.meteo.gov.gh/climate-atlas/climate-change/",
      source: "Ghana Meteorological Agency (GMet)"
    },
    layerAvailability: {
      // Gridded 0.5° indicators from the PIK/ISIMIP delivery (12 layers, built by
      // scripts/build_ghana_grid_indicators.py). Past = absolute value,
      // 2050/2080 = change vs 1985-2014, both SSPs.
      ...gridIndicatorAvailability(),
      // Context — urban population (Africapolis agglomerations, 2025 + 2050).
      "Urban population": { times: ["Past", "2050"], hasScenarios: false },
      // Context — agro-ecological zones (8 zones, colored on the `Name` property).
      "Agroclimatic zones": { times: ["Past"], hasScenarios: false },
      // Impact theme — crop yield change layers (share ghana_admin2_deltas.geojson).
      // Ghana has a single growing season (not bimodal like Kenya), so crops have
      // no long/short rains suffix. The source file carries 11 crops; per-feature
      // properties are sparse, so districts lacking a crop render as "no data".
      "Maize": { times: ["2050", "2080"], hasScenarios: true },
      "Rice": { times: ["2050", "2080"], hasScenarios: true },
      "Sorghum": { times: ["2050", "2080"], hasScenarios: true },
      "Millet": { times: ["2050", "2080"], hasScenarios: true },
      "Beans": { times: ["2050", "2080"], hasScenarios: true },
      "Pulses": { times: ["2050", "2080"], hasScenarios: true },
      "Groundnuts": { times: ["2050", "2080"], hasScenarios: true },
      "Soybean": { times: ["2050", "2080"], hasScenarios: true },
      "Cassava": { times: ["2050", "2080"], hasScenarios: true },
      "Taro": { times: ["2050", "2080"], hasScenarios: true },
      "Yams": { times: ["2050", "2080"], hasScenarios: true }
    }
  }
};

// Default country if none specified
export const defaultCountry = "zimbabwe";

/**
 * Get country configuration from a country code
 * @param {string} countryCode - The country code to look up
 * @returns {CountryConfig} The country configuration object
 */
export function getCountryConfig(countryCode) {
  const normalizedCode = ((countryCode || defaultCountry) + '').toLowerCase();
  return countryConfigs[normalizedCode] || countryConfigs[defaultCountry];
}
