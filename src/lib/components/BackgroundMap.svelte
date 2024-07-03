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

let L;
onMount(async () => {
  if (typeof window !== 'undefined') {
    L = await import('leaflet');
  }

  // Initialize the map
  map = L.map($leafletMap, {
      zoomControl: false  
    }).setView([-19, 27], 7);

  // Add a base layer (optional)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add the WMS layer
  L.tileLayer.wms('https://apps.geodan.nl/public/data/org/gws/YWFMLMWERURF/kea_public/wms?', {
      layers: 'ghg_huidig',
      format: 'image/png',
      transparent: true,
      attribution: '&copy; terrestris'
    }).addTo(map);
  

  L.tileLayer.wms('http://185.62.58.53:8082/geoserver/zim/ows?SERVICE=WMS', {
      layers: 'zim_shp',
      format: 'image/png',
      transparent: true,
      attribution: '&copy; terrestris'
    }).addTo(map);
  });
  
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
