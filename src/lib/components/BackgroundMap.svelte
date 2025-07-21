<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { datalaag, opacityMap, time, scenario } from "$lib/stores.js"
  import MapPopup from "./MapPopup.svelte"
  import Legend from "./Legend.svelte"
  import { getCountryConfig } from "$lib/config/countries.js"
  import { styleGeoJsonFeature, getLegendItems } from "$lib/utils/geojsonStyles.js"

  /** @type {any} */
  let map
  /** @type {any} */
  let esri
  /** @type {Record<string, any>} */
  let wmsLayers = {}
  /** @type {Record<string, any>} */
  let geojsonLayers = {}
  /** @type {any} */
  let L
  /** @type {any} */
  let countryConfig

const variableBases = ["tmax", "tmin", "tavg", "precip_total", "daysabove20", "drydays"];
const scenarios = ["low", "high"];

const variableNames = [
  ...variableBases.map(v => `${v}_hist`),
  ...variableBases.flatMap(v =>
    ["2050", "2080"].flatMap(year =>
      scenarios.map(scenario => `${v}_${year}_${scenario}`)
    )
  )
];

/** @type {Record<string, string>} */
const baseLayerCodes = {
  "Maximum temperature": "tmax",
  "Minimum temperature": "tmin",
  "Average temperature": "tavg",
  "Total rainfall": "precip_total",
  "Days above 20 mm": "daysabove20",
  "Dry spells": "drydays"
}



// Format legend title using mapping or fallback to default formatting
/**
 * Format legend title using mapping or fallback to default formatting
 * @param {string} title - The legend title to format
 * @returns {string} Formatted legend title
 */
 const formatLegendTitle = (title) => {
  const titleMap = {
    "temperature": "Temperature",
    "rainfall": "Rainfall",
    "total_rainfall": "Total Rainfall",
    "annual_rainfall": "Annual Rainfall",
    "dryspell": "Dry Spell",
    "dry_spell": "Dry Spell",
    "days_above_20mm": "Days Above 20mm"
  }
  
  // Try to find a match in the titleMap
  for (const [key, value] of Object.entries(titleMap)) {
    if (title.toLowerCase().includes(key)) {
      return value
    }
  }
  
  // If no match found, return the original with first letter capitalized
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/**
 * Create the actual layer name dynamically
 * @param {string} datalaag - Selected data layer
 * @param {string} time - Selected time period
 * @param {string} scenario - Selected scenario
 * @returns {string|null} Layer ID or null if invalid parameters
 */
function getLayerId(datalaag, time, scenario) {
  // Check if datalaag is a valid key in our lookup object
  if (!datalaag || typeof datalaag !== 'string') {
    return null;
  }
  
  const base = baseLayerCodes[datalaag];
  if (!base) return null;

  // Accept both "hist", "Now", and "Current" for historical
  if (time === "hist" || time === "Past" || time === "Current") {
    return `${base}_hist`;
  } else if (time === "2050" || time === "2080") {
    // Accept both "Low"/"low" and "High"/"high"
    const scenarioCode = (scenario || "high").toLowerCase();
    return `${base}_${time}_${scenarioCode}`;
  }
  return null;
}

  /**
   * Function to safely get the legend unit based on the data layer
   * @param {string} dataLayer - The data layer name
   * @returns {string} The unit for the data layer or empty string if not found
   */
  function getLegendUnit(dataLayer) {
    /** @type {Record<string, string>} */
    const units = {
      "Maximum temperature": "°C",
      "Minimum temperature": "°C",
      "Average temperature": "°C",
      "Total rainfall": "mm/year",
      "Days above 20 mm": "days/year",
      "Dry spells": "spells/year"
    };
    
    return dataLayer && typeof dataLayer === 'string' && dataLayer in units ? 
      units[dataLayer] : '';
  }

  // Get country code from URL parameters
  $: countryCode = $page.url.searchParams.get('country') || 'zimbabwe';
  $: countryConfig = getCountryConfig(countryCode);

  // Reactive legend layer name
  $: legendLayerId = getLayerId($datalaag, $time, $scenario);
  
  // Determine if we're showing a change from historical data
  $: isShowingChange = $time === "2050" || $time === "2080";

  // Cleanup function to remove existing map when component is destroyed
  function cleanupMap() {
    if (map) {
      map.remove();
      map = null;
    }
  }
  
  onMount(async () => {
    try {
      // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
      L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      esri = await import("esri-leaflet")
    } catch (error) {
      console.error("Error loading map libraries:", error);
    }
  })

  /**
   * Function to get a GeoJSON URL for a specific layer, time and scenario
   * @param {string} baseCode - Base variable code (e.g. 'tmax')
   * @param {string} time - Time period ('Current', '2050', '2080')
   * @param {string} scenario - Scenario ('low', 'high')
   * @returns {string|null} GeoJSON URL or null if invalid time
   */
  function getGeoJsonUrl(baseCode, time, scenario) {
    let filename;
    
    // Convert time to filename format
    if (time === "hist") {
      filename = `${baseCode}_hist.geojson`;
    } else if (time === "2050" || time === "2080") {
      const scenarioCode = (scenario || "high").toLowerCase();
      filename = `${baseCode}_${time}_${scenarioCode}.geojson`;
    } else {
      return null;
    }
    
    return `${countryConfig.geojsonBaseUrl}${filename}`;
  }

  /**
   * Wrapper function for styling GeoJSON features using the imported utility
   * @param {any} feature - GeoJSON feature with properties
   * @returns {Object} Leaflet path style object
   */
  function styleGeoJson(feature) {
    return styleGeoJsonFeature(feature, $datalaag, $opacityMap, $time);
  }

  /**
   * Function to create and load GeoJSON layers for current parameters
   * @param {string} layerId - Layer ID to load
   * @returns {Promise<any|null>} The loaded GeoJSON layer or null if there was an error
   */
  async function loadGeoJsonLayer(layerId) {
    if (!layerId) return null;
    
    // Get base code from layerId
    const parts = layerId.split('_');
    const baseCode = parts[0];
    //const scenario = parts.length > 2 ? parts[2] : 'high';
    //console.log('scenario', scenario, parts, layerId)

    const url = getGeoJsonUrl(baseCode, $time, $scenario);

    if (!url) return null;
    
    try {
      // Check if we already have this layer cached
      if (!geojsonLayers[layerId]) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch GeoJSON: ${response.status}`);
        
        const data = await response.json();
        
        geojsonLayers[layerId] = L.geoJSON(data, {
          style: styleGeoJson,
          onEachFeature: (/**@type {any}*/ feature, /**@type {any}*/ layer) => {
            if (feature?.properties?.value !== undefined) {
              const unit = getLegendUnit($datalaag);
              layer.bindPopup(`<b>${$datalaag}</b>: ${feature.properties.value} ${unit}`);
            }
          }
});

      }
      
      return geojsonLayers[layerId];
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      return null;
    }
  }
  
  // Update GeoJSON layers when opacity, datalaag, or time changes
  $: {
    if (map && countryConfig && countryConfig.dataType === "geojson" && 
        (Object.keys(geojsonLayers).length > 0)) {
      console.log("Updating layer opacity to:", $opacityMap);
      Object.values(geojsonLayers).forEach(/**@type {any}*/ layer => {
        if (layer && map.hasLayer(layer)) {
          layer.setStyle(styleGeoJson);
        }
      });
    }
  }

  $: if (esri && L && !map) {
    // Initialize the Leaflet map only if it doesn't already exist
    const mapElement = document.getElementById("map");
    if (mapElement) {
      map = L.map("map", {
        zoomControl: false, // Disable default zoom control
      }).setView(countryConfig.center, countryConfig.zoom); // Center on the selected country

      // Add a custom zoom control at the bottom-right
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(map);
      
      // Map popup will be handled by the MapPopup component

      //Add a basic OpenStreetMap tile layer as the base layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Initialize layers based on country data type
      if (countryConfig.dataType === "wms") {
        // Create WMS layers for WMS-based countries like Zimbabwe
        variableNames.forEach((layer) => {
          wmsLayers[layer] = L.tileLayer.wms(countryConfig.wmsEndpoint, {
            layers: layer,
            format: "image/png",
            transparent: true,
            attribution: "WMS Layer",
            version: "1.1.1",
            styles: "dynamic",
            srs: "EPSG:3857",
            mask: countryConfig.mask,
          });
        });
      }
    }
  }

  $: if (map && $datalaag && $time && $scenario) {
    // Clear all existing layers
    Object.values(wmsLayers).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    
    Object.values(geojsonLayers).forEach((layer) => {
      if (map && layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    const layerId = getLayerId($datalaag, $time, $scenario);
    
    if (!layerId) { /* Skip if no valid layer ID */ }
    else if (countryConfig.dataType === "wms" && wmsLayers[layerId]) {
      // Add WMS layer for WMS-based countries
      wmsLayers[layerId].addTo(map);
      wmsLayers[layerId].setOpacity($opacityMap);
    } 
    else if (countryConfig.dataType === "geojson") {
      // Load and add GeoJSON layer for GeoJSON-based countries
      loadGeoJsonLayer(layerId).then(layer => {
        if (layer && map) {
          layer.addTo(map);
        }
      }).catch(err => console.error('Error adding GeoJSON layer:', err));
    }
  }
  
</script>

<div class="backgroundmap">
  <!-- Map container -->
  <div class="map" id="map"></div>
  
  {#if map && L}
    <MapPopup 
      {map} 
      {L} 
      {wmsLayers} 
      {getLayerId} 
      {getLegendUnit}
    />
  {/if}
  
  <!-- Legend -->
  {#if browser && $datalaag}
    <Legend
      dataType={countryConfig?.dataType}
      {legendLayerId}
      wmsEndpoint={countryConfig?.wmsEndpoint}
      {formatLegendTitle}
      {getLegendUnit}
    />
  {/if}
</div>

<style>
  /* Map container styling */

  .backgroundmap {
    height: 100%;
    width: 100%;
  }

  .map {
    height: 100%;
    width: 100%;
  }
    
  /* Map popup styling moved to the MapPopup component */
</style>
