<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { datalaag, opacityMap, time, scenario } from "$lib/stores.js"
  import MapPopup from "./MapPopup.svelte"
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

/** @type {Record<string, string>} */
const legendTitles = {
  "Maximum temperature": "Maximum temp.",
  "Minimum temperature": "Minimum temp.",
  "Average temperature": "Average temp.",
  "Total rainfall": "Total rainfall",
  "Days above 20 mm": "Days above 20mm",
  "Dry spells": "Dry spells"
};

// Format legend title using mapping or fallback to default formatting
/**
 * Format legend title using mapping or fallback to default formatting
 * @param {string} title - The legend title to format
 * @returns {string} Formatted legend title
 */
function formatLegendTitle(title) {
  if (!title) return '';
  
  // Convert to string to ensure we can work with it
  const titleStr = String(title);
  
  // Check if we have a custom mapping for this title
  if (titleStr in legendTitles) {
    return legendTitles[titleStr];
  }
  
  // Fallback to default formatting
  // First replace 'temperature' with 'temp'
  let formattedTitle = String(title).replace('temperature', 'temp');
  // Convert everything to lowercase
  formattedTitle = formattedTitle.toLowerCase();
  // Capitalize only the very first letter of the entire string
  return formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
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
    
    console.log('check', filename, baseCode, time)
    // Convert time to filename format
    if (time === "hist" || time === "Past" || time === "Current") {
      filename = `${baseCode}_hist.geojson`;
      console.log('check2', countryConfig.geojsonBaseUrl + filename)
    } else if (time === "2050" || time === "2080") {
      const scenarioCode = (scenario || "high").toLowerCase();
      filename = `${baseCode}_${time}_${scenarioCode}.geojson`;
      console.log('what', filename, scenarioCode, scenario)
      console.log('check3', countryConfig.geojsonBaseUrl + filename)
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
            // Add popup with value information
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
  
  // Update GeoJSON styling when opacity changes
  $: if (map && countryConfig && countryConfig.dataType === "geojson" && $opacityMap !== undefined) {
    Object.values(geojsonLayers).forEach(/**@type {any}*/ layer => {
      if (layer && map && map.hasLayer && map.hasLayer(layer)) {
        layer.setStyle(styleGeoJson);
      }
    });
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
    <div class="legend">
      <div class="legend-content">
        {#if countryConfig.dataType !== "geojson"}
          <div class="legend-header">
            <p class="legend-title">
              {#if isShowingChange}
                Change in {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
              {:else}
                {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
              {/if}
            </p>
          </div>
        {/if}
        {#if legendLayerId && countryConfig.dataType === "wms"}
          <!-- WMS Legend Image -->
          <img
            class="legend-image"
            alt="Legend for {$datalaag}"
            src={`${countryConfig.wmsEndpoint}?VERSION=1.1.1&height=300&request=GetLegendGraphic&layer=${legendLayerId}&style=${legendLayerId}&service=WMS&width=50&format=png`} />
        {/if}
        
        {#if countryConfig.dataType === "geojson"}
          <!-- GeoJSON Custom Legend -->
          {#key $datalaag}
            {#if $datalaag && ($datalaag.toLowerCase().includes('temperature') || 
                $datalaag.toLowerCase().includes('rainfall') || 
                $datalaag.toLowerCase().includes('total rain') || 
                $datalaag.toLowerCase().includes('annual rain') || 
                $datalaag.toLowerCase().includes('dry spell') || 
                $datalaag.toLowerCase().includes('dryspell') ||
                $datalaag.toLowerCase().includes('days above 20mm') ||
                $datalaag.toLowerCase().includes('days above 20') ||
                $datalaag.toLowerCase().includes('days_above_20'))}
              {#each [getLegendItems($datalaag, $time)] as legendData}
                {#if legendData && typeof legendData === 'object' && 'type' in legendData && legendData.type === "scalebar"}
                  <!-- Vertical Scalebar Legend -->
                  <div class="scalebar-legend">
                    {#if 'colors' in legendData && Array.isArray(legendData.colors)}
                      <!-- Type assertion for colors array -->
                      {@const colors = /** @type {string[]} */ (legendData.colors)}
                      <!-- Gradient bar -->
                      {#each [colors.map((color, i) => 
                        `${color} ${Math.round(i / (colors.length - 1) * 100)}%`).join(', ')] as gradientStops}
                        <div class="gradient-bar" style="background: linear-gradient(to top, {gradientStops});"></div>
                      {/each}
                    {/if}
                    
                    <!-- Labels on the right side -->
                    {#if 'labels' in legendData && Array.isArray(legendData.labels) && 'min' in legendData && 'max' in legendData}
                      <!-- Type assertions for min and max values -->
                      {@const min = /** @type {number} */ (legendData.min)}
                      {@const max = /** @type {number} */ (legendData.max)}
                      <div class="scalebar-labels">
                        {#each legendData.labels as labelItem}
                          {#if 'value' in labelItem && 'label' in labelItem}
                            <div class="scalebar-label" style="bottom: {((labelItem.value - min) / (max - min)) * 100}%">
                              {labelItem.label}
                            </div>
                          {/if}
                        {/each}
                      </div>
                    {/if}
                    
                    <!-- Unit label -->
                    {#if 'unit' in legendData}
                      <div class="unit-label">{legendData.unit}</div>
                    {/if}
                  </div>
                {:else}
                  <!-- Standard Legend (Fallback) -->
                  <div class="custom-legend">
                    {#if Array.isArray(legendData)}
                      {#each legendData as item}
                        {#if item && typeof item === 'object' && 'color' in item && 'label' in item}
                          {@const typedItem = /** @type {{color: string, label: string}} */ (item)}
                          <div class="legend-item">
                            <span class="color-box" style="background-color: {typedItem.color};"></span> {typedItem.label}
                          </div>
                        {/if}
                      {/each}
                    {/if}
                  </div>
                {/if}
              {/each}
            {:else}
              <!-- Standard Legend for non-temperature data -->
              {#each [getLegendItems($datalaag, $time)] as legendItems}
                <div class="custom-legend">
                  {#if Array.isArray(legendItems)}
                    {#each legendItems as item}
                      {#if item && typeof item === 'object' && 'color' in item && 'label' in item}
                        {@const typedItem = /** @type {{color: string, label: string}} */ (item)}
                        <div class="legend-item">
                          <span class="color-box" style="background-color: {typedItem.color};"></span> {typedItem.label}
                        </div>
                      {/if}
                    {/each}
                  {/if}
                </div>
              {/each}
            {/if}
          {/key}

          <style>
            .scalebar-legend {
              position: relative;
              display: flex;
              height: 200px;
              margin: 10px 0;
              padding: 0 15px;
            }

            .gradient-bar {
              width: 30px;
              height: 100%;
              border-radius: 3px;
              border: 1px solid #ccc;
            }

            .scalebar-labels {
              position: relative;
              margin-left: 5px;
              height: 100%;
              width: 40px;
            }

            .scalebar-label {
              position: absolute;
              left: 5px;
              transform: translateY(50%);
              font-size: 12px;
              white-space: nowrap;
            }

            .unit-label {
              position: absolute;
              top: -20px;
              left: 0;
              right: 0;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
          </style>
        {/if}
      </div>
    </div>
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

  .legend {
    position: fixed;
    bottom: 4vh;
    right: 4vw;
    z-index: 1000000;
    display: inline-block;
    background-color: rgba(255, 255, 255, 0.5);
    padding-left: 10px;
    padding-bottom: 10px;
    padding-right: 10px;
    border-radius: 25px;
    width: 3vw;
    min-width: 80px;
    max-width: 180px;
  }

  .legend-title {
    font-size: max(12px, 1.3vh);
    font-weight: 500;
  }

  .legend-image {
    object-fit: contain; /* Maintains aspect ratio */
    height: 60vh;
    max-height: 250px;
    width: auto;
  }
  
  .custom-legend {
    margin-top: 8px;
    font-size: 0.75rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
  }
  
  .color-box {
    display: inline-block;
    width: 15px;
    height: 15px;
    margin-right: 5px;
    border: 1px solid #ccc;
  }
  
  /* Map popup styling moved to the MapPopup component */
</style>
