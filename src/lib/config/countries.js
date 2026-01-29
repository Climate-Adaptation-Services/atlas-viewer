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
 * @property {Record<string, LayerAvailability>} [layerAvailability] - Data availability per layer
 */

/**
 * @type {Record<string, CountryConfig>}
 */
export const countryConfigs = {
  zimbabwe: {
    name: "Zimbabwe",
    center: [-19, 27],
    zoom: 6,
    dataType: "wms",
    wmsEndpoint: "https://dev.cas-zimbabwe.predictia.es/wms",
    mask: "zimbabwe",
    layerAvailability: {
      // Climate layers - all have Past, 2050, 2080 with low/high scenarios
      "Average temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Minimum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Maximum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Total rainfall": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Days above 20 mm": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Dry spells": { times: ["Past", "2050", "2080"], hasScenarios: true },
      // Context layers
      "River Flood": { times: ["Past"], hasScenarios: false }
    }
  },
  kenya: {
    name: "Kenya",
    center: [0.0236, 37.9062], // Kenya's geographic center
    zoom: 6,
    dataType: "geojson",
    geojsonBaseUrl: "https://kenyaciaviewer.s3.eu-north-1.amazonaws.com/", // AWS S3 bucket with GeoJSON files
    // Keep WMS settings as fallback
    wmsEndpoint: "https://dev.cas-zimbabwe.predictia.es/wms",
    mask: "kenya",
    layerAvailability: {
      // Climate layers - all have Past, 2050, 2080 with low/high scenarios
      "Average temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Minimum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Maximum temperature": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Total rainfall": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Days above 20 mm": { times: ["Past", "2050", "2080"], hasScenarios: true },
      "Dry spells": { times: ["Past", "2050", "2080"], hasScenarios: true },
      // Regular map layers
      "Water Stress": { times: ["Past", "2050", "2080"], hasScenarios: true },
      // Context layers - Population only has Past (2025) and 2050, no scenarios
      "Population": { times: ["Past", "2050"], hasScenarios: false },
      "River Flood": { times: ["Past"], hasScenarios: false },
      "Agroclimatic zones": { times: ["Past"], hasScenarios: false }
    }
  },
  ghana: {
    name: "Ghana",
    center: [7.9465, -1.0232], // Ghana's geographic center
    zoom: 7,
    dataType: "geojson",
    geojsonBaseUrl: "/", // Local files
    layerAvailability: {
      // Only River Flood for now
      "River Flood": { times: ["Past"], hasScenarios: false }
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
