/**
 * Context layer configuration
 * Defines all available context layers and their behavior
 */

/**
 * @typedef {Object} ContextLayerConfig
 * @property {string} name - Display name of the layer
 * @property {string} type - Type of layer ('point', 'polygon', etc.)
 * @property {Function} getPopupContent - Function to generate popup content for this layer
 * @property {number} clickThreshold - Distance threshold for click detection (in meters)
 * @property {Object} popupOptions - Leaflet popup options for this layer
 */

/**
 * Get popup content for population layer
 * @param {Object} feature - GeoJSON feature
 * @param {string} time - Current time period ('Past' or '2050')
 * @returns {string|null} HTML content for popup
 */
function getPopulationPopupContent(feature, time) {
  const props = feature.properties;

  // Map time period to population property - only 2025 and 2050 available
  const is2050 = time === '2050';
  const popProperty = is2050 ? 'Population_2050' : 'Population_2025';
  const displayYear = is2050 ? '2050' : '2025';

  const population = props[popProperty];
  const name = props.Agglomeration_Name || 'Unknown';

  if (population) {
    const formattedPop = population.toLocaleString();

    return `
      <div class="popup-content">
        <div class="value-text"><strong>${name}</strong></div>
        <div style="text-align: center; margin-top: 5px;">
          Population (${displayYear}): ${formattedPop}
        </div>
      </div>
    `;
  }

  return null;
}

/**
 * @type {Record<string, ContextLayerConfig>}
 */
export const contextLayerConfigs = {
  Population: {
    name: 'Population',
    type: 'point',
    getPopupContent: getPopulationPopupContent,
    // Distance threshold for click detection (in meters)
    clickThreshold: 20000,
    // Popup display options
    popupOptions: {
      maxWidth: 350,
      minWidth: 200,
      className: 'compact-popup' // CSS class for styling
    }
  }
};

/**
 * Get list of all context layer names
 * @returns {string[]}
 */
export function getContextLayerNames() {
  return Object.keys(contextLayerConfigs);
}

/**
 * Check if a layer is a context layer
 * @param {string} layerName - Name of the layer
 * @returns {boolean}
 */
export function isContextLayer(layerName) {
  return layerName in contextLayerConfigs;
}

/**
 * Get configuration for a context layer
 * @param {string} layerName - Name of the layer
 * @returns {ContextLayerConfig|null}
 */
export function getContextLayerConfig(layerName) {
  return contextLayerConfigs[layerName] || null;
}
