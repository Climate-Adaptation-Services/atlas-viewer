/**
 * Climate layer configuration
 * Defines popup options for climate layers
 */

/**
 * @typedef {Object} ClimateLayerConfig
 * @property {Object} popupOptions - Leaflet popup options for this layer
 */

/**
 * Default popup options for climate layers (with charts)
 * @type {ClimateLayerConfig}
 */
export const defaultClimateLayerConfig = {
  popupOptions: {
    maxWidth: 400,
    minWidth: 350,
    className: 'wide-popup' // CSS class for styling
  }
};

/**
 * Get popup configuration for a climate layer
 * @param {string} layerName - Name of the climate layer
 * @returns {ClimateLayerConfig}
 */
export function getClimateLayerConfig(layerName) {
  // In the future, you can customize per layer here
  // For now, all climate layers use the default config
  return defaultClimateLayerConfig;
}
