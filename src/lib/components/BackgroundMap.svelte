<script>
  import { browser } from '$app/environment'
  import { LeafletMap, TileLayer } from 'svelte-leafletjs?client';
  import Shape from '$lib/components/Shape.svelte'
  import { onMount } from 'svelte'
  import { leafletMap } from '$lib/stores.js';
  import {scenario, datalaag} from "$lib/stores.js";
  import * as d3 from 'd3';
  import Legend from '$lib/components/Legend.svelte'
  
  export let datajson
  
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

  $: console.log($datalaag)

  const mapOptions = {
    center: [8, -1],
    zoom: 6.5,
  };

  const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const tileLayerOptions = {
      minZoom: 2,
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: "© OpenStreetMap contributors",
      maxBounds: [[51.263871, 3.892372],[52.263871, 4.892372]],
  };

  onMount(() => {

    leafletMap.set($leafletMap.getMap())

  })

  $: colorScale = d3.scaleSequential([25, 40], d3.interpolateYlOrRd)

  // $: var legend = d3.legendColor()
  //   .scale(colorScale);


</script>

<div class="backgroundMap">
    {#if browser}
    <LeafletMap bind:this={$leafletMap} options={mapOptions}>
      <TileLayer url={tileUrl} options={tileLayerOptions}/>
      {#each featureLayer as feature, i}
        <Shape {feature} />
      {/each}
      <Legend/>
    </LeafletMap>
    
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
