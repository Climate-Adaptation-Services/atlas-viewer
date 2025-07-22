/**
 * Utility functions for styling GeoJSON layers
 */

import { opacityMap } from '../stores.js';
import { get } from 'svelte/store';

/** @typedef {'temperature'|'temperatureProjection'|'drySpell'|'drySpellProjection'|'rainfall'|'rainfallProjection'|'daysAbove20mm'|'daysAbove20mmProjection'} ScaleType */

/** @type {Record<string, ScaleType>} */
const LAYER_TYPE_MAPPINGS = {
  'temperature': 'temperature',
  'dry spell': 'drySpell',
  'rainfall': 'rainfall',
  'days above 20': 'daysAbove20mm',
};
console.log(get(opacityMap))
/** @type {Record<ScaleType, {min: number, max: number, unit: string, colors: string[]}>} */
const SCALES = {
  temperature: {
    min: 10,
    max: 36,
    unit: "°C",
    colors: [
      "#ffffe0", "#fffedb", "#fffdd6", "#fffcd1", "#fffbcc", "#fffac7", "#fff9c2", "#fff8bd", 
      "#fff7b8", "#fff6b3", "#fef5ae", "#fef4a9", "#fef3a4", "#fef29f", "#fef19a", "#fdef95", 
      "#fdec90", "#fde98b", "#fce686", "#fce281", "#fcde7c", "#fbda77", "#fbd572", "#fad06d", 
      "#f9cb68", "#f9c563", "#f8bf5e", "#f7b859", "#f6b154", "#f5aa4f", "#f4a249", "#f39a44", 
      "#f2923f", "#f1893a", "#f08035", "#ef7630", "#ee6b2c", "#ed6028", "#eb5524", "#ea4921", 
      "#e93d1e", "#e8311c", "#e7261b", "#e61b1a", "#e51019", "#e40518", "#dc0419", "#d00319", 
      "#c4021c"
    ]
  },
  temperatureProjection: {
    min: 1,
    max: 5,
    unit: "°C",
    colors: [
      "#ffffe0", "#fff7b8", "#fef4a9", "#fef19a", "#fde98b", "#fcde7c", "#f9cb68", "#f7b859",
      "#f4a249", "#f1893a", "#ef7630", "#eb5524", "#e8311c", "#e61b1a", "#c4021c"
    ]
  },
  drySpell: {
    min: 0,
    max: 22,
    unit: "days",
    colors: [
      "#fbf6f2", "#f0e1d0", "#e6cbae", "#deb98f", "#d6ab80", "#ce9e6e", "#c9925c", 
      "#bf874e", "#b57d44", "#ab7239", "#a16930", "#96612b", "#8b5926", "#7e5221", "#784e1f"
    ]
  },
  drySpellProjection: {
    min: -2,
    max: 2,
    unit: "days",
    colors: [
      "#115338", "#14593c", "#19674e", "#1e735e", "#248071", "#308c7f", "#3a968b", "#46a198", 
      "#57aaa4", "#6cb3ab", "#81bab2", "#99c2bd", "#b5d2cc", "#d2e5e0", "#f1f7f5", "#fbf6f2", 
      "#f0e1d0", "#e6cbae", "#deb98f", "#d6ab80", "#ce9e6e", "#c9925c", "#bf874e", "#b57d44", 
      "#ab7239", "#a16930", "#96612b", "#8b5926", "#7e5221", "#784e1f"
    ]
  },
  rainfall: {
    min: 0,
    max: 2000,
    unit: "mm",
    colors: [
      "#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", 
      "#2171b5", "#08519c", "#08306b", "#4b0082", "#2e004f"
    ]
  },
  rainfallProjection: {
    min: -100,
    max: 400,
    unit: "mm",
    colors: [
     "#deb98f", "#e6cbae", "#f0e1d0", "#fbf6f2", "#f1f7f5", 
      "#d2e5e0", "#b5d2cc", "#99c2bd", "#81bab2", "#6cb3ab", "#57aaa4", "#46a198", "#3a968b", 
      "#308c7f", "#248071", "#1e735e", "#19674e", "#14593c", "#115338"
    ]
  },
  daysAbove20mm: {
    min: 0,
    max: 40,
    unit: "days",
    colors: [
      "#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", 
      "#2171b5", "#08519c", "#08306b", "#4b0082", "#2e004f"
    ]
  },
  daysAbove20mmProjection: {
    min: -2,
    max: 10,
    unit: "days",
    colors: [
      "#e6cbae", "#f0e1d0", "#fbf6f2", "#f1f7f5", 
      "#d2e5e0", "#b5d2cc", "#99c2bd", "#81bab2", "#6cb3ab", "#57aaa4", "#46a198", "#3a968b", 
      "#308c7f", "#248071", "#1e735e", "#19674e", "#14593c", "#115338"
    ]
  },
};

/**
 * Get color for a value using the specified scale
 * @param {number|string|null|undefined} value - Value to get color for
 * @param {ScaleType} scaleName - Name of the scale
 * @returns {string} Hex color code
 */
export function getColorForScale(value, scaleName) {
  if (!(scaleName in SCALES)) return "#ffffff";
  
  const scale = SCALES[scaleName];
  if (value === undefined || value === null || isNaN(Number(value))) return scale.colors[0];
  
  const numValue = Number(typeof value === 'string' ? parseFloat(value) : value);
  if (isNaN(numValue)) return scale.colors[0];
  
  const clampedValue = Math.max(scale.min, Math.min(numValue, scale.max));
  const normalizedValue = (clampedValue - scale.min) / (scale.max - scale.min);
  const colorIndex = Math.floor(normalizedValue * (scale.colors.length - 1));
  return scale.colors[colorIndex];
}

/**
 * Style a GeoJSON feature based on data value and layer type
 * @param {{properties?: Record<string, any>}} feature - GeoJSON feature
 * @param {string} layerType - Layer type identifier
 * @param {number} opacityValue - Opacity value (0-1)
 * @param {string} [time] - Time period ('past', '2050', or '2080')
 * @returns {Object} Leaflet style object
 */
export function styleGeoJsonFeature(feature, layerType, opacityValue = 1, time = 'Past') {
  // Extract value from properties using first matching property name
  const props = feature?.properties || {};
  const propertyNames = ['value'];
  const propName = propertyNames.find(prop => props[prop] !== undefined);
  const value = propName ? props[propName] : null;
  
  // Find matching color scale and get color
  let color = "#ffffff";
  const layerLower = layerType?.toLowerCase() || '';
  
  // Normalize time parameter for consistent handling
  const timeNormalized = time ? time.toLowerCase() : 'past';
  console.log(`styleGeoJsonFeature using normalized time: ${timeNormalized}`);
  
  // Check if this is a projection (2050 or 2080) or past/historical
  if (timeNormalized === '2050' || timeNormalized === '2080') {
    // Temperature projections
    if (layerLower.includes('temperature')) {
      color = getColorForScale(value, 'temperatureProjection');
    }
    // Dry spell projections
    else if (layerLower.includes('dry spell') || layerLower.includes('dryspell')) {
      color = getColorForScale(value, 'drySpellProjection');
    }
    // Rainfall projections
    else if (layerLower.includes('rainfall') || layerLower.includes('rain') || 
             layerLower.includes('total_rain') || layerLower.includes('annual_rain')) {
      color = getColorForScale(value, 'rainfallProjection');
    }
    // Days above 20mm projections
    else if (layerLower.includes('days above 20mm') || layerLower.includes('days_above_20') || 
             layerLower.includes('days above 20')) {
      color = getColorForScale(value, 'daysAbove20mmProjection');
    }
  } else {
    const matchingKeyword = Object.keys(LAYER_TYPE_MAPPINGS).find(keyword => layerLower.includes(keyword));
    if (matchingKeyword) {
      const scaleName = /** @type {ScaleType} */ (LAYER_TYPE_MAPPINGS[matchingKeyword]);
      color = getColorForScale(value, scaleName);
    }
  }
  
  return {
    fillColor: color,
    weight: 0.5,
    opacity: 1,
    color: 'transparent',
    fillOpacity: opacityValue
  };
}
/**
 * Create legend items for a scale
 * @param {ScaleType} scaleName - Scale name
 * @param {number} step - Step size for labels
 * @returns {{type: string, min: number, max: number, unit: string, colors: string[], labels: Array<{value: number, label: string}>}} Legend data
 */
function createScalebarLegendItems(scaleName, step) {
  if (!(scaleName in SCALES)) return { type: "scalebar", min: 0, max: 0, unit: "", colors: [], labels: [] };
  
  const scale = SCALES[scaleName];
  
  // Generate labels at specified intervals
  const labels = [];
  for (let value = scale.min; value <= scale.max; value += step) {
    labels.push({ value, label: value.toString() });
  }
  
  // Ensure max value is included
  if (scale.max % step !== 0 && !labels.some(item => item.value === scale.max)) {
    labels.push({ value: scale.max, label: scale.max.toString() });
  }

  return {
    type: "scalebar",
    min: scale.min,
    max: scale.max,
    unit: scale.unit,
    colors: scale.colors,
    labels
  };
}

/** @type {Record<ScaleType, number>} */
const SCALE_STEPS = {
  temperature: 3,
  temperatureProjection: 0.5,
  drySpell: 5,
  drySpellProjection: 0.5,
  rainfall: 200,
  rainfallProjection: 50,
  daysAbove20mm: 5,
  daysAbove20mmProjection: 1
};

/**
 * Get legend items based on layer name and time period
 * @param {string} layerName - Layer name
 * @param {string} [time='past'] - Time period ('past', '2050', or '2080')
 * @returns {{type: string, min: number, max: number, unit: string, colors: string[], labels: Array<{value: number, label: string}>}|[]} Legend items
 */
export function getLegendItems(layerName, time = 'past') {
  if (!layerName) return [];
  
  const layerNameLower = layerName.toLowerCase();
  
  // Check if this is a projection year (2050 or 2080)
  if (time === '2050' || time === '2080') {
    // Temperature projections
    if (layerNameLower.includes('temperature')) {
      const step = SCALE_STEPS['temperatureProjection'] || 0.5;
      return createScalebarLegendItems('temperatureProjection', step);
    }
    // Dry spell projections
    else if (layerNameLower.includes('dry spell') || layerNameLower.includes('dryspell')) {
      const step = SCALE_STEPS['drySpellProjection'] || 0.5;
      return createScalebarLegendItems('drySpellProjection', step);
    }
    // Rainfall projections
    else if (layerNameLower.includes('rainfall') || layerNameLower.includes('rain')) {
      const step = SCALE_STEPS['rainfallProjection'] || 50;
      return createScalebarLegendItems('rainfallProjection', step);
    }
    // Days above 20mm projections
    else if (layerNameLower.includes('days above 20mm') || layerNameLower.includes('days above 20') || 
             layerNameLower.includes('days_above_20')) {
      const step = SCALE_STEPS['daysAbove20mmProjection'] || 1;
      return createScalebarLegendItems('daysAbove20mmProjection', step);
    }
  }
  
  // Regular processing for other data types
  const matchingKeyword = Object.keys(LAYER_TYPE_MAPPINGS).find(keyword => layerNameLower.includes(keyword));
  
  if (matchingKeyword) {
    const scaleName = /** @type {ScaleType} */ (LAYER_TYPE_MAPPINGS[matchingKeyword]);
    const step = SCALE_STEPS[scaleName] || 5;
    return createScalebarLegendItems(scaleName, step);
  }
  
  return [];
}
