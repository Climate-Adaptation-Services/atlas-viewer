<script>
  import { browser } from '$app/environment'
  import { LeafletMap, TileLayer  } from 'svelte-leafletjs?client';
  import { onMount } from 'svelte'
  import { tileLayer, leafletMap } from '$lib/stores.js';
  import {scenario, datalaag} from "$lib/stores.js";
  
  
                               
  export let datajson
 

  let map;
  let esri;
  let tiledLayer
  let wmsLayers = {}


  let L;

  $:console.log($datalaag)

  const variableNames = ["tmax", "tmin", "tavg", "precip_total", "daysabove20", "drydays"]


  onMount(async () => {  
    // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
    L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    esri = await import("esri-leaflet");
  });

  $: if(esri && L){
    
    // Initialize the Leaflet map
    map = L.map("map").setView([-19, 27], 7); // Center on Zimbabwe with zoom level 6

    //Add a basic OpenStreetMap tile layer as the base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    //Add the ArcGIS Max Temp Yearly Layer using L.esri.tiledMapLayer
    //tiledLayer = new esri.tiledMapLayer({url: "https://tiles.arcgis.com/tiles/7SEV6TvwRD5jzR74/arcgis/rest/services/Zimbabwe_Max_Temp_Yearly/MapServer"})  

    

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
    // Add WMS layer

  
  const getDataLayerName = {
    'Maximum temperature': 'tmax',
    'Minimum temperature': 'tmin',
    'Average temperature': 'tavg',
    'Total precipitation': 'precip_total', 
    'Days above 20 mm': 'daysabove20',
    'Dry days': 'drydays',
  }

  $: console.log(wmsLayers)

  
    
  //$: if(tiledLayer !== null & $datalaag === 'Maximum temperature' ){tiledLayer.addTo(map)} // Add the tiled layer to the map
  $: if ($datalaag && Object.keys(wmsLayers).length !== 0){
    variableNames.forEach(variableName => {
      map.removeLayer(wmsLayers[variableName])
    });

    wmsLayers[getDataLayerName[$datalaag]].addTo(map); // Add WMS layer to the map if the condition matches
  }



  
</script>

<div class="backgroundMap">
  {#if browser}
    <div id="map" bind:this={$leafletMap}></div>    
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

	div{
		height:100%;
    width:100%;
	}

</style>
