<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { leafletMap, datalaag, opacityMap, time, scenario } from "$lib/stores.js"

  export let datajson

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
</style>
