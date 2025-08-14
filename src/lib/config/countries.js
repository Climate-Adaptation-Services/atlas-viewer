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
    mask: "zimbabwe"
  },
  kenya: {
    name: "Kenya",
    center: [0.0236, 37.9062], // Kenya's geographic center
    zoom: 6,
    dataType: "geojson",
    geojsonBaseUrl: "https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/kenya/", // GitHub repo with GeoJSON files
    // Keep WMS settings as fallback
    wmsEndpoint: "https://dev.cas-zimbabwe.predictia.es/wms",
    mask: "kenya"
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
