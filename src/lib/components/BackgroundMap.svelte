<script>
  import { browser } from '$app/environment'
  import { LeafletMap, TileLayer  } from 'svelte-leafletjs?client';
  import Shape from '$lib/components/Shape.svelte'
  import { onMount } from 'svelte'
  import { tileLayer, leafletMap } from '$lib/stores.js';
  import {scenario, datalaag} from "$lib/stores.js";
  import * as d3 from 'd3';
  import Legend from '$lib/components/Legend.svelte'
  
                               
  export let datajson
 

let map;
let esri;

let L;
// onMount(async () => {
//   if (typeof window !== 'undefined') {
//     L = await import('leaflet');
//     await import("leaflet/dist/leaflet.css");
//     esri = await import("esri-leaflet");
//   }  

//   // Initialize the map
//   map = L.map($leafletMap, {
//       zoomControl: false  
//     }).setView([-19, 27], 7);

//   //Add a base layer (optional)
//   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
//       attribution: '&copy; OpenStreetMap contributors'
//   }).addTo(map);

//   L.control.zoom({
//       position: 'topright'
//     }).addTo(map);

//     // Add the WMS layer
//   L.tileLayer.wms('https://apps.geodan.nl/public/data/org/gws/YWFMLMWERURF/kea_public/wms?', {
//       layers: 'ghg_huidig',
//       format: 'image/png',
//       transparent: true,
//       attribution: '&copy; terrestris'
//     }).addTo(map);
  


//   // var wmtsUrl = 'https://tiles.arcgis.com/tiles/7SEV6TvwRD5jzR74/arcgis/rest/services/Zimbabwe_Max_Temp_Yearly/MapServer?f=jsapi';

//   // L.tileLayer(wmtsUrl, {
//   //   layer: '0', // Usually, this is the layer identifier. Check in WMTSCapabilities.xml.
//   //   matrixSet: 'EPSG:4326',
//   //   style: 'default',
//   //   TileMatrixSet: 'default028mm', // Specific TileMatrixSet name from WMTSCapabilities.xml
//   //   format: 'image/png',
//   //   attribution: '&copy; terrestris',
//   //   minZoom: 0,
//   //   maxZoom: 19,
//   // }).addTo(map)

//   // Add ArcGIS Max Temp Yearly Layer
//   esri.default.tiledMapLayer({
//       url: "https://tiles.arcgis.com/tiles/7SEV6TvwRD5jzR74/arcgis/rest/services/Zimbabwe_Max_Temp_Yearly/MapServer"
//     }).addTo(map);



//   });

onMount(async () => {
    try {
      // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
      L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      esri = await import("esri-leaflet");

      console.log(esri)

      // Initialize the Leaflet map
      map = L.map("map").setView([-19, 27], 7); // Center on Zimbabwe with zoom level 6

      


      //Add a basic OpenStreetMap tile layer as the base layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      L.tileLayer.wms('https://apps.geodan.nl/public/data/org/gws/YWFMLMWERURF/kea_public/wms?', {
        layers: 'ghg_huidig',
        format: 'image/png',
        transparent: true,
        attribution: '&copy; terrestris'
      }).addTo(map);

      // Log to verify if the layer was added successfully
      console.log("Esri layer added:" );
    } catch (error) {
      console.error("Error initializing the map:", error);
    }
  });

   //Add the ArcGIS Max Temp Yearly Layer using L.esri.tiledMapLayer
   $: tiledLayer = (esri)
    ? new esri.tiledMapLayer({url: "https://tiles.arcgis.com/tiles/7SEV6TvwRD5jzR74/arcgis/rest/services/Zimbabwe_Max_Temp_Yearly/MapServer"})
    : null
    
  $: if(tiledLayer !== null){tiledLayer.addTo(map)} // Add the tiled layer to the map
  
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
