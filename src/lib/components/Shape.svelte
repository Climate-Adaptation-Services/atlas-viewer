<script>
  import { Polygon } from 'svelte-leafletjs?client';
  import flip from "@turf/flip";
  import { scaleLinear } from "d3-scale";
  import * as d3 from 'd3';

  export let feature;

  $: colorScale = d3.scaleSequential([25, 40], d3.interpolateYlOrRd)

  $: console.log(colorScale)
</script>
  <Polygon
    latLngs={flip(feature).geometry.coordinates}
    fillOpacity={1}
    fillColor={colorScale(feature.properties.VALUE)}
    weight={0}
  />

<style></style>
