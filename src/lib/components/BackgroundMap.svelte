<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { leafletMap, datalaag, opacityMap, time, scenario } from "$lib/stores.js"

  export let datajson

  let map
  let esri
  let wmsLayers = {}
  let L
  let popup

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
  "Total precipitation": "precip_total",
  "Days above 20 mm": "daysabove20",
  "Dry days": "drydays"
}

// Create the actual layer name dynamically
function getLayerId(datalaag, time, scenario) {
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
      "Total precipitation": "mm/year",
      "Days above 20 mm": "days/year",
      "Dry days": "days/year"
    };
    
    return units[dataLayer] || '';
  }

  // Reactive legend layer name
  $: legendLayerId = getLayerId($datalaag, $time, $scenario);
  
  // Determine if we're showing a change from historical data
  $: isShowingChange = $time === "2050" || $time === "2080";

  onMount(async () => {
    // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
    L = await import("leaflet")
    await import("leaflet/dist/leaflet.css")
    esri = await import("esri-leaflet")
  })

  $: if (esri && L) {
    // Initialize the Leaflet map
    map = L.map("map", {
      zoomControl: false, // Disable default zoom control
    }).setView([-19, 27], 6) // Center on Zimbabwe with zoom level 6

    // Add a custom zoom control at the bottom-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map)
      
    // Create a popup but don't add it to the map yet
    popup = L.popup()

    //Add a basic OpenStreetMap tile layer as the base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

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
      })
    })
    
    // Set up click event to show coordinates and estimated value
    // map.on('click', function(e) {
    //   const activeLayerId = getLayerId($datalaag, $time, $scenario);
    //   if (!activeLayerId || !wmsLayers[activeLayerId]) return;
      
    //   // Get the coordinates
    //   const lat = e.latlng.lat.toFixed(4);
    //   const lng = e.latlng.lng.toFixed(4);
      
    //   // Generate a sample value based on the coordinates and layer type
    //   // This is a workaround since we can't use GetFeatureInfo due to CORS
    //   const layerBase = activeLayerId.split('_')[0];
    //   const isProjection = activeLayerId.includes('2050') || activeLayerId.includes('2080');
      
    //   // Generate a pseudo-random but consistent value based on coordinates
    //   // This is just for demonstration - not actual data
    //   const seed = Math.sin(e.latlng.lat * e.latlng.lng) * 10000;
    //   let baseValue = Math.abs(seed % 20); // Value between 0-20
      
    //   // Adjust value based on layer type
    //   let unit = '';
    //   if (['tmax', 'tmin', 'tavg'].includes(layerBase)) {
    //     // Temperature values
    //     if (layerBase === 'tmax') {
    //       baseValue += 15; // Max temps around 15-35°C
    //       if (isProjection) baseValue = (baseValue % 5) + 1; // Change of 1-5°C
    //     } else if (layerBase === 'tmin') {
    //       baseValue += 5; // Min temps around 5-25°C
    //       if (isProjection) baseValue = (baseValue % 4) + 0.5; // Change of 0.5-4.5°C
    //     } else {
    //       baseValue += 10; // Avg temps around 10-30°C
    //       if (isProjection) baseValue = (baseValue % 4) + 0.8; // Change of 0.8-4.8°C
    //     }
    //     unit = '°C';
    //   } else if (layerBase === 'precip_total') {
    //     // Precipitation values
    //     baseValue = baseValue * 40 + 200; // 200-1000mm
    //     if (isProjection) baseValue = (baseValue % 200) - 100; // Change of -100 to +100mm
    //     unit = 'mm/year';
    //   } else {
    //     // Days counts
    //     baseValue = Math.round(baseValue * 5); // 0-100 days
    //     if (isProjection) baseValue = (baseValue % 20) - 10; // Change of -10 to +10 days
    //     unit = 'days/year';
    //   }
      
    //   // Format the value
    //   const formattedValue = baseValue.toFixed(1) + unit;
      
    //   // Show the popup with the coordinates and estimated value
    //   let content = `<div class="popup-content">
    //     <strong>${$datalaag}</strong><br>
    //     ${isProjection ? 'Estimated change: ' : 'Estimated value: '} ${formattedValue}<br>
    //     <small>Coordinates: ${lat}, ${lng}</small><br>
    //     <small><em>Note: This is an approximation. Actual data retrieval is limited by CORS.</em></small>
    //   </div>`;
      
    //   popup
    //     .setLatLng(e.latlng)
    //     .setContent(content)
    //     .openOn(map);
    // });
  }

  $: {
  if ($datalaag && $time && wmsLayers) {
    // Clear existing layers
    Object.values(wmsLayers).forEach((layer) => map.removeLayer(layer))

    const layerId = getLayerId($datalaag, $time, $scenario)
    console.log('BackgroundMap DEBUG:', { $datalaag, $time, $scenario, layerId });
    if (layerId && wmsLayers[layerId]) {
      wmsLayers[layerId].addTo(map)
      wmsLayers[layerId].setOpacity($opacityMap)
    }
  }
}

</script>

<div class="backgroundmap">
  {#if browser && $datalaag}
    <div class="map" id="map" bind:this={$leafletMap}></div>
    <div class="legend">
      <div class="legend-content">
        <div class="legend-header">
          <p class="legend-title">
            {#if isShowingChange}
              Change in {$datalaag.toLowerCase()} ({getLegendUnit($datalaag)})
            {:else}
              {$datalaag} ({getLegendUnit($datalaag)})
            {/if}
          </p>
        </div>
        {#if legendLayerId}
          <img
            class="legend-image"
          src={`https://dev.cas-zimbabwe.predictia.es/wms?VERSION=1.1.1&height=200&request=GetLegendGraphic&layer=${legendLayerId}&style=${legendLayerId}&service=WMS&width=40&format=png`} />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  input[type="range"] {
    /* fix for FF unable to apply focus style bug  */
    border: 0.5px solid black;
  }
  label {
    font-size: 14px;
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
    width: 2vw;
  }

  .legend-title {
    font-size: 2vh;
  }

  .legend-image {
    object-fit: contain; /* Maintains aspect ratio */
    height: 40vh;
    max-height: 200px;
    width: auto;
  }
  
  .popup-content {
    padding: 5px;
    font-size: 14px;
    text-align: center;
  }
</style>
