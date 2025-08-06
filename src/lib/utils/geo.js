// src/lib/utils/geo.js
import zimbabweGeoJSON from '$lib/data/zimbabwe.json';
import kenyaGeoJSON from '$lib/data/kenya.json';

/**
 * Store country GeoJSONs
 */
const COUNTRY_POLYGONS = {
  zimbabwe: zimbabweGeoJSON,
  kenya: kenyaGeoJSON
};

/**
 * Check if a point is inside a given country's polygon
 * @param {{lat:number, lng:number}} point
 * @param {string} country - 'zimbabwe' or 'kenya'
 */
export function isPointInCountry(point, country) {
  const geo = COUNTRY_POLYGONS[country];
  if (!geo) {
    console.warn(`Country ${country} not supported in geo.js`);
    return false;
  }

  const feature = geo.features[0];
  console.log('Geometry type:', feature.geometry.type);
  
  // Handle different geometry types
  if (feature.geometry.type === 'MultiPolygon') {
    // For MultiPolygon, check if point is in any of the polygons
    const multiPolygon = feature.geometry.coordinates;
    
    // Check each polygon in the MultiPolygon
    for (let i = 0; i < multiPolygon.length; i++) {
      const polygonCoordinates = multiPolygon[i][0]; // Get the exterior ring of this polygon
      
      // Quick bounding box check for this polygon
      const [west, south, east, north] = getBoundingBox(polygonCoordinates);
      if (point.lat >= south && point.lat <= north && point.lng >= west && point.lng <= east) {
        // If in bounding box, check precise polygon
        if (isPointInPolygon(point, polygonCoordinates)) {
          return true;
        }
      }
    }
    
    return false; // Not in any polygon
  } 
  else {
    // Original logic for Polygon type
    const coordinates = feature.geometry.coordinates[0];

    // Quick bounding box (performance)
    const [west, south, east, north] = feature.bbox || getBoundingBox(coordinates);
    if (!(point.lat >= south && point.lat <= north && point.lng >= west && point.lng <= east)) {
      return false;
    }

    // Ray casting polygon check
    return isPointInPolygon(point, coordinates);
  }
}

/** Ray casting algorithm */
function isPointInPolygon(point, polygon) {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/** Get bounding box from polygon coordinates */
function getBoundingBox(coords) {
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
