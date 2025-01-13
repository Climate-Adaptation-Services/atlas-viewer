<script>
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import {leafletMap, datalaag, opacityMap} from "$lib/stores.js";
                                 
  export let datajson
 
  let map;
  let esri;
  let wmsLayers = {}
  let L;

  console.log('hoi')

  const variableNames = ["tmax", "tmin", "tavg", "precip_total", "daysabove20", "drydays"]

  const getDataLayerName = {
    'Maximum temperature': 'tmax',
    'Minimum temperature': 'tmin',
    'Average temperature': 'tavg',
    'Total precipitation': 'precip_total', 
    'Days above 20 mm': 'daysabove20',
    'Dry days': 'drydays',
  }

  const getLegendTitle = {
    'Maximum temperature': 'Temp. (°C)',
    'Minimum temperature': 'tmin',
    'Average temperature': 'tavg',
    'Total precipitation': 'precip_total', 
    'Days above 20 mm': 'daysabove20',
    'Dry days': 'drydays',
  }

  onMount(async () => {  
    // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    esri = await import("esri-leaflet");
  });

  $: if(esri && L){
    
    // Initialize the Leaflet map
    map = L.map("map").setView([-19, 27], 6); // Center on Zimbabwe with zoom level 6

    //Add a basic OpenStreetMap tile layer as the base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    variableNames.forEach(layer=> {    
      wmsLayers[layer] = L.tileLayer.wms("https://dev.cas-zimbabwe.predictia.es/wms", {
      layers: layer, // Ensure this is the correct layer name
      format: 'image/png',
      transparent: true,
      attribution: "WMS Layer",
      version: '1.1.1', // Ensure version matches your WMS service
      styles: 'dynamic',
      srs: 'EPSG:3857', // Use the CRS compatible with Leaflet (usually EPSG:3857)
      mask: 'zimbabwe'
    });
  })
  }
  
  $: if ($datalaag && Object.keys(wmsLayers).length !== 0){
    variableNames.forEach(variableName => {
      map.removeLayer(wmsLayers[variableName])
    });

    wmsLayers[getDataLayerName[$datalaag]].addTo(map); // Add WMS layer to the map if the condition matches
    wmsLayers[getDataLayerName[$datalaag]].setOpacity($opacityMap)
  }


  
</script>

<div class="backgroundmap">
  {#if browser && $datalaag}
    <div class="map" id = "map" bind:this={$leafletMap}></div>    
    <div class = 'legend'>
      <p class = 'legend-title'> {[getLegendTitle[$datalaag]]}</p>
      <img src="https://dev.cas-zimbabwe.predictia.es/wms?VERSION=1.1.1&height=400&request=GetLegendGraphic&layer={getDataLayerName[$datalaag]}&style={getDataLayerName[$datalaag]}&service=WMS&width=60&format=png">
    </div>
    <div class="opacity-slider">
      <label for="opacity">Map transparency</label>
      <input
        type="range"
        id="opacity"
        min="0"
        max="1"
        step="0.1"
        bind:value={$opacityMap}
      />
    </div>
  {/if}
</div>

<style>
  input[type=range]{
    /* fix for FF unable to apply focus style bug  */
    border: 0.5px solid black; 
  }
  label{
    font-size:14px; 
  }

  .backgroundmap{
    height:100%;
    width:100%;
  }

  .map{
    height:100%;
    width:100%;
  }

  .legend{
    position:fixed;
    bottom: 30px;
    right: 10px;
    z-index: 1000000;
    display: inline-block;
    background-color: rgba(255,255,255,0.5);
    padding: 10px;
    border-radius: 25px;
  }

  .legend-title{
    font-size: 2vh;
  }

  .opacity-slider {
    position:fixed;
    top:10px;
    right:10px;
    z-index: 1000000;
    background-color: rgba(255,255,255,0.5);
    border-radius: 20px;
    padding-top: 2vh;
    padding-left: 2vh;
    padding-right: 2vh;
  }

  .opacity-slider label {
    display: block;
    margin-bottom: 5px;
    font-size: 2.4vh;
  }

  .opacity-slider input {
    width: 100%;
  }

</style>
