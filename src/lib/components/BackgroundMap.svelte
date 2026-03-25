<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { datalaag, opacityMap, time, scenario, selectedLayer } from "$lib/stores.js"
  import MapPopup from "./MapPopup.svelte"
  import Legend from "./Legend.svelte"
  import { getCountryConfig } from "$lib/config/countries.js"
  import { styleGeoJsonFeature, getLegendItems } from "$lib/utils/geojsonStyles.js"
  import { isContextLayer, getContextLayerConfig } from "$lib/config/contextLayers.js"
  import { isGeojsonLayer, getGeojsonLayerConfig, getGeojsonLayerUrl } from "$lib/config/geojsonLayers.js"

  /** @type {any} */
  let map
  /** @type {any} */
  let esri
  /** @type {Record<string, any>} */
  let wmsLayers = {}
  /** @type {Record<string, any>} */
  let geojsonLayers = {}
  /** @type {Record<string, any>} */
  let contextLayerInstances = {}
  /** @type {any} */
  let activeContextLayer = null
  /** @type {any} */
  let L
  /** @type {any} */
  let countryConfig
  /** @type {boolean} */
  let isLoading = false

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

  // Normalize time value for consistent handling
  const timeNormalized = time ? time.toLowerCase() : '';
  
  // Accept various terms for historical data
  if (timeNormalized === "hist" || timeNormalized === "past" || timeNormalized === "current") {
    return `${base}_hist`;
  } else if (timeNormalized === "2050" || timeNormalized === "2080") {
    // Accept both "Low"/"low" and "High"/"high"
    const scenarioCode = (scenario || "high").toLowerCase();
    return `${base}_${timeNormalized}_${scenarioCode}`;
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
    if (time === "hist" || time === "Past" || time === "Current") {
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
    // Normalize time parameter to lowercase for consistent handling
    const normalizedTime = $time ? $time.toLowerCase() : 'past';
    return styleGeoJsonFeature(feature, $datalaag, $opacityMap, normalizedTime);
  }

  /**
   * Function to create and load GeoJSON layers for current parameters
   * @param {string} layerId - Layer ID to load
   * @returns {Promise<any|null>} The loaded GeoJSON layer or null if there was an error
   */
  async function loadGeoJsonLayer(layerId) {
    // Check if this is a configured GeoJSON layer (like River Flood, Water Stress)
    if (isGeojsonLayer($datalaag)) {
      const config = getGeojsonLayerConfig($datalaag);
      // Include time and scenario in cache key for layers that support it
      const cacheKey = config?.supportsTimeScenario
        ? `${$datalaag.toLowerCase().replace(/\s+/g, '_')}_${$time}_${$scenario}`
        : $datalaag.toLowerCase().replace(/\s+/g, '_');

      if (!geojsonLayers[cacheKey] && config) {
        try {
          const url = getGeojsonLayerUrl($datalaag, $time, $scenario);
          if (!url) throw new Error(`No URL configured for ${$datalaag}`);

          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${$datalaag}: ${response.status}`);
          const data = await response.json();

          geojsonLayers[cacheKey] = L.geoJSON(data, {
            style: (feature) => config.getStyle(feature, $time, $scenario),
            interactive: config.interactive
          });
        } catch (error) {
          console.error(`Error loading ${$datalaag}:`, error);
          return null;
        }
      }
      return geojsonLayers[cacheKey];
    }

    // Standard climate layer handling
    if (!layerId) return null;

    // Get base code from layerId
    const parts = layerId.split('_');
    const baseCode = parts[0];
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
          interactive: false, // Make layer non-interactive to allow clicks to pass through
          onEachFeature: (/**@type {any}*/ feature, /**@type {any}*/ layer) => {
            if (feature?.properties?.value !== undefined) {
              const unit = getLegendUnit($datalaag);
              // Don't use bindPopup since we want MapPopup to handle clicks
              // instead, store the value in the feature properties
              feature._value = feature.properties.value;
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

  /**
   * Function to get the appropriate context layer filename based on time period
   * @param {string} layerName - Base name of the context layer
   * @param {string} time - Current time period
   * @param {string} scenario - Scenario (low/high)
   * @returns {string} Full filename for the context layer
   */
  function getContextLayerFilename(layerName, time, scenario) {
    if (layerName.toLowerCase() === 'urban population') {
      // Map time periods to population data years
      const timeNormalized = time ? time.toLowerCase() : 'past';
      if (timeNormalized === 'past' || timeNormalized === 'hist') {
        return 'africapolis_agglomerations_ken_2025.geojson';
      } else if (timeNormalized === '2050' || timeNormalized === '2080') {
        return 'africapolis_agglomerations_ken_2050.geojson';
      }
      return 'africapolis_agglomerations_ken_2025.geojson'; // default
    }
    // For other context layers in the future
    return `${layerName}.geojson`;
  }

  /**
   * Get population circle style based on population value
   * @param {number} population - Population value
   * @returns {{color: string, radius: number}} Style object with color and radius
   */
  function getPopulationStyle(population) {
    // Population ranges and colors matching Africapolis
    // Based on the legend in the screenshot
    if (population >= 10000000) {
      return { color: '#FFF4CC', radius: 30 }; // Above 10M - lightest yellow
    } else if (population >= 3000000) {
      return { color: '#FFE699', radius: 26 }; // 3-10M
    } else if (population >= 1000000) {
      return { color: '#FFD966', radius: 22 }; // 1-3M
    } else if (population >= 300000) {
      return { color: '#F4B183', radius: 18 }; // 300K-1M - light orange
    } else if (population >= 100000) {
      return { color: '#E07C7C', radius: 14 }; // 100K-300K - salmon
    } else if (population >= 30000) {
      return { color: '#C55A5A', radius: 10 }; // 30K-100K - medium red
    } else {
      return { color: '#8B3A3A', radius: 6 }; // 10K-30K - dark red
    }
  }

  /**
   * Get water stress style based on stress category
   * @param {number} bws_cat - Water stress category (0-4)
   * @returns {string} Color for the stress level
   */
  function getWaterStressColor(bws_cat) {
    // Aqueduct color scheme: yellow (low stress) to red (high stress)
    const colors = {
      '-1': '#d1d1d1', // Arid and low water use - light gray
      0: '#ffffbe', // Low - pale yellow
      1: '#fed976', // Low-Medium - darker yellow
      2: '#f47b50', // Medium-High - orange
      3: '#d8392c', // High - red
      4: '#a41f35' // Extremely High - dark red
    };
    return colors[bws_cat] !== undefined ? colors[bws_cat] : '#d1d1d1';
  }

  /**
   * Get AEZ (Agro-Ecological Zone) color based on zone name
   * @param {string} aezName - AEZ zone name
   * @returns {string} Color for the zone
   */
  function getAEZColor(aezName) {
    const colors = {
      'Coastal Lowland': '#2E86AB',    // Blue
      'Inner Lowland': '#F6AE2D',      // Orange/Yellow
      'Lower Highland': '#4A7C59',     // Forest green
      'Lower Midland': '#86BA90',      // Light green
      'Nairobi City': '#E84855',       // Red
      'Tropical Alpine': '#9B5DE5',    // Purple
      'Upper Highland': '#1B4332',     // Dark green
      'Upper Midland': '#95D5B2',      // Mint green
      'Waterbody': '#48CAE4'           // Light blue
    };
    return colors[aezName] || '#888888';
  }

  /**
   * Function to load a context layer (e.g., population)
   * @param {string} layerName - Name of the context layer
   * @param {string} time - Current time period
   * @param {string} scenario - Current scenario (low/high)
   * @returns {Promise<any|null>} The loaded GeoJSON layer or null if there was an error
   */
  async function loadContextLayer(layerName, time, scenario) {
    if (!layerName || !countryConfig) return null;

    const cacheKey = `${layerName}_${time}_${scenario || 'none'}`;

    try {
      // Check if we already have this layer cached
      if (!contextLayerInstances[cacheKey]) {
        // Check if the layer config has a direct URL
        const layerConfig = getContextLayerConfig(layerName);
        let url;
        let response;

        if (layerConfig?.url) {
          // Use the direct URL from config
          url = layerConfig.url;
          response = await fetch(url);
        } else {
          // Use filename-based lookup
          const filename = getContextLayerFilename(layerName, time, scenario);
          // Try local static folder first, then S3
          url = `/${filename}`;
          response = await fetch(url);

          // If local fetch fails, try S3
          if (!response.ok && countryConfig.geojsonBaseUrl) {
            url = `${countryConfig.geojsonBaseUrl}${filename}`;
            response = await fetch(url);
          }
        }

        if (!response.ok) throw new Error(`Failed to fetch context layer: ${response.status}`);
        const data = await response.json();

        if (layerName.toLowerCase() === 'urban population') {
          // Use point-to-layer for population circles
          contextLayerInstances[cacheKey] = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
              // Get population based on time period
              let popProperty = 'Population_2025'; // default
              const timeNormalized = time ? time.toLowerCase() : 'past';

              if (timeNormalized === '2050' || timeNormalized === '2080') {
                popProperty = 'Population_2050';
              } else if (timeNormalized === 'past' || timeNormalized === 'hist') {
                popProperty = 'Population_2025';
              }

              const pop = feature.properties?.[popProperty] || 0;
              const style = getPopulationStyle(pop);

              return L.circleMarker(latlng, {
                radius: style.radius,
                fillColor: style.color,
                color: '#333333',
                weight: 0.5,
                opacity: 0.8,
                fillOpacity: 0.7
              });
            },
            interactive: false
          });
        } else if (layerName.toLowerCase() === 'agroclimatic zones') {
          // Style Agroclimatic zones by AEZ_Name
          contextLayerInstances[cacheKey] = L.geoJSON(data, {
            style: (feature) => {
              const aezName = feature.properties?.AEZ_Name || '';
              return {
                fillColor: getAEZColor(aezName),
                weight: 1,
                opacity: 1,
                color: '#333333',
                fillOpacity: 0.7
              };
            },
            interactive: false
          });
        } else {
          // Default styling for other context layers
          contextLayerInstances[cacheKey] = L.geoJSON(data, {
            style: {
              fillColor: "#888888",
              weight: 1,
              opacity: 1,
              color: '#666666',
              fillOpacity: 0.3
            },
            interactive: false
          });
        }
      }

      return contextLayerInstances[cacheKey];
    } catch (error) {
      console.error(`Error loading context layer ${layerName}:`, error);
      return null;
    }
  }
  
  // Update GeoJSON layers when opacity, datalaag, or time changes
  $: {
    if (map && countryConfig && countryConfig.dataType === "geojson" &&
        (Object.keys(geojsonLayers).length > 0)) {
      // Force style update when time, datalaag, or opacity changes
      const normalizedTime = $time ? $time.toLowerCase() : 'past';

      // Update all visible GeoJSON layers
      Object.values(geojsonLayers).forEach(/**@type {any}*/ layer => {
        if (layer && map.hasLayer(layer)) {
          // Use setStyle with a new function instance to ensure re-evaluation
          layer.setStyle((feature) => {
            return styleGeoJsonFeature(feature, $datalaag, $opacityMap, normalizedTime);
          });
        }
      });
    }
  }

  // Update context layers (like Agroclimatic zones) when opacity changes
  $: if (map && activeContextLayer && $selectedLayer?.toLowerCase() === 'agroclimatic zones') {
    activeContextLayer.setStyle((/** @type {any} */ feature) => {
      const aezName = feature?.properties?.AEZ_Name || '';
      return {
        fillColor: getAEZColor(aezName),
        weight: 1,
        opacity: 1,
        color: '#333333',
        fillOpacity: $opacityMap
      };
    });
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

  // Check if selected layer is a context layer
  $: isCurrentLayerContext = isContextLayer($selectedLayer);

  $: if (map && $selectedLayer && $time && $scenario && countryConfig) {
    const normalizedTime = $time ? $time.toLowerCase() : 'past';

    // Clear all existing layers (both climate and context)
    Object.values(wmsLayers).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    // Remove all GeoJSON layers
    if (map) {
      map.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });
    }

    // Clear references
    activeContextLayer = null;
    geojsonLayers = {};

    if (isCurrentLayerContext) {
      // Load context layer (e.g., Population, Agroclimatic zones)
      isLoading = true;
      loadContextLayer($selectedLayer, $time, $scenario).then(layer => {
        if (layer && map) {
          if (!map.hasLayer(layer)) {
            layer.addTo(map);
          }
          activeContextLayer = layer;
        }
      }).catch(err => console.error(`Error adding context layer ${$selectedLayer}:`, err))
        .finally(() => isLoading = false);
    } else if (isGeojsonLayer($datalaag)) {
      // Load GeoJSON-based map layer (e.g., River Flood)
      isLoading = true;
      loadGeoJsonLayer(null).then(layer => {
        if (layer && map) {
          layer.addTo(map);
        }
      }).catch(err => console.error(`Error adding GeoJSON layer ${$datalaag}:`, err))
        .finally(() => isLoading = false);
    } else {
      // Load standard climate layer
      const layerId = getLayerId($selectedLayer, $time, $scenario);

      if (!layerId) { /* Skip if no valid layer ID */ }
      else if (countryConfig.dataType === "wms" && wmsLayers[layerId]) {
        // Add WMS layer for WMS-based countries
        wmsLayers[layerId].addTo(map);
        wmsLayers[layerId].setOpacity($opacityMap);
      }
      else if (countryConfig.dataType === "geojson") {
        // Load and add GeoJSON layer for GeoJSON-based countries
        isLoading = true;
        loadGeoJsonLayer(layerId).then(layer => {
          if (layer && map) {
            layer.addTo(map);
          }
        }).catch(err => console.error('Error adding GeoJSON layer:', err))
          .finally(() => isLoading = false);
      }
    }
  }
  
</script>

<div class="backgroundmap">
  <!-- Map container -->
  <div class="map" id="map"></div>

  <!-- Loading indicator -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
    </div>
  {/if}

  {#if map && L}
    <MapPopup 
      {map} 
      {L} 
      {wmsLayers} 
      {getLayerId} 
      {getLegendUnit}
      {countryCode}
    />
  {/if}
  
  <!-- Legend -->
  {#if browser && $selectedLayer}
    <Legend
      dataType={isCurrentLayerContext ? 'context' : countryConfig?.dataType}
      {legendLayerId}
      wmsEndpoint={countryConfig?.wmsEndpoint}
      layerName={$selectedLayer}
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

  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
