<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { leafletMap, datalaag, opacityMap, time, scenario } from "$lib/stores.js"
  import MapPopup from "./MapPopup.svelte"

  let map
  let esri
  let wmsLayers = {}
  let L

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

// Layer code lookup
const baseLayerCodes = {
  "Maximum temperature": "tmax",
  "Minimum temperature": "tmin",
  "Average temperature": "tavg",
  "Total rainfall": "precip_total",
  "Days above 20 mm": "daysabove20",
  "Dry spells": "drydays"
}

// Legend title mapping for custom display names
const legendTitles = {
  "Maximum temperature": "Maximum temp.",
  "Minimum temperature": "Minimum temp.",
  "Average temperature": "Average temp.",
  "Total rainfall": "Total rainfall",
  "Days above 20 mm": "Days above 20mm",
  "Dry spells": "Dry spells"
};

// Format legend title using mapping or fallback to default formatting
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

// Create the actual layer name dynamically
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

  // Function to safely get the legend unit based on the data layer
  function getLegendUnit(dataLayer) {
    const units = {
      "Maximum temperature": "°C",
      "Minimum temperature": "°C",
      "Average temperature": "°C",
      "Total rainfall": "mm/year",
      "Days above 20 mm": "days/year",
      "Dry spells": "spells/year"
    };
    
    return units[dataLayer] || '';
  }

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
    // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
    L = await import("leaflet")
    await import("leaflet/dist/leaflet.css")
    esri = await import("esri-leaflet")
    
    // Return cleanup function
    return cleanupMap;
  })

  $: if (esri && L && !map) {
    // Initialize the Leaflet map only if it doesn't already exist
    const mapElement = document.getElementById("map");
    if (mapElement) {
      map = L.map("map", {
        zoomControl: false, // Disable default zoom control
      }).setView([-19, 27], 6); // Center on Zimbabwe with zoom level 6

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

      variableNames.forEach((layer) => {
        wmsLayers[layer] = L.tileLayer.wms("https://dev.cas-zimbabwe.predictia.es/wms", {
          layers: layer, // Ensure this is the correct layer name
          format: "image/png",
          transparent: true,
          attribution: "WMS Layer",
          version: "1.1.1", // Ensure version matches your WMS service
          styles: "dynamic",
          srs: "EPSG:3857", // Use the CRS compatible with Leaflet (usually EPSG:3857)
          mask: "zimbabwe",
        });
      });
    }
  }

  $: if (map && $datalaag && $time && wmsLayers) {
    // Clear existing layers
    Object.values(wmsLayers).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    const layerId = getLayerId($datalaag, $time, $scenario);
    //console.log('BackgroundMap DEBUG:', { $datalaag, $time, $scenario, layerId });
    if (layerId && wmsLayers[layerId]) {
      wmsLayers[layerId].addTo(map);
      wmsLayers[layerId].setOpacity($opacityMap);
    }
  }

</script>

<div class="backgroundmap">
  <!-- Map container -->
  <div class="map" id="map" bind:this={$leafletMap}></div>
  
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
        <div class="legend-header">
          <p class="legend-title">
            {#if isShowingChange}
              Change in {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
            {:else}
              {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
            {/if}
          </p>
        </div>
        {#if legendLayerId}
          <img
            class="legend-image"
            alt="Legend for {$datalaag}"
            src={`https://dev.cas-zimbabwe.predictia.es/wms?VERSION=1.1.1&height=300&request=GetLegendGraphic&layer=${legendLayerId}&style=${legendLayerId}&service=WMS&width=50&format=png`} />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Map controls styling */
  .map-controls {
    margin-bottom: 10px;
  }

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
  
  /* Map popup styling moved to the MapPopup component */
</style>
