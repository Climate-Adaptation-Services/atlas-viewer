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
  map = L.map($leafletMap).setView([52.3702157, 4.895167899999933], 8);

  // Add a base layer (optional)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

    // Add the WMS layer
  L.tileLayer.wms('https://apps.geodan.nl/public/data/org/gws/YWFMLMWERURF/kea_public/wms?', {
      layers: 'ghg_huidig',
      format: 'image/png',
      transparent: true,
      attribution: '&copy; terrestris'
    }).addTo(map);
  });
 
  
  $: featureLayer = $datalaag === 'Empty' ? '0' :
    $scenario === 'Current' && $datalaag === 'Maximum temperature' ? datajson[0].features :
    $scenario === '2050 high' && $datalaag === 'Maximum temperature' ? datajson[1].features :
    $scenario === '2050 low' && $datalaag === 'Maximum temperature' ? datajson[2].features :
    $scenario === 'Current' && $datalaag === 'Minimum temperature' ? datajson[3].features :
    $scenario === '2050 high' && $datalaag === 'Minimum temperature' ? datajson[4].features :
    $scenario === '2050 low' && $datalaag === 'Minimum temperature' ? datajson[5].features :
    $scenario === 'Current' && $datalaag === 'Annual precipitation' ? datajson[6].features :
    $scenario === '2050 high' && $datalaag === 'Annual precipitation' ? datajson[7].features :
    $scenario === '2050 low' && $datalaag === 'Annual precipitation' ? datajson[8].features :
    datajson[8].features

  $: colorScale = d3.scaleSequential([25, 40], d3.interpolateYlOrRd)
  
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
