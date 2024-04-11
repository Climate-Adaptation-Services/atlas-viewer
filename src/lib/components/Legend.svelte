<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte'

 
  onMount(() => {
  // Create a sequential color scale using YlOrRd color scheme
  const colorScale = d3.scaleSequential([25, 40], d3.interpolateYlOrRd);

  // Set the number of legend elements
  const numLegendElements = 15;

  const formatLegendTick = d3.format('.0f');

  // Calculate the range of values for the legend
  const legendValues = d3.range(25, 41, 1);

  $: console.log(colorScale)

  // Create an SVG container for the legend
  const legendSvg = d3.select('.legend')
      .attr('width', numLegendElements * 25) // Adjust width based on your preference
      .attr('height', 20);

  // Append legend elements
  const legend = legendSvg.selectAll('g')
      .data(legendValues)
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(${(i * 21)+20}, 0)`);

  // Append rectangles with color from the color scale
  legend.append('rect')
      .attr('width', 20)
      .attr('height', 10)
      .attr('margin-right', 1)
      .style('fill', d => colorScale(d));

  // Append text displaying the legend values
  legend.append('text')
      .attr('x', -5)
      .attr('y', 20)
      .text(d => formatLegendTick(d))
  })
    
</script>

<style>
  .legend-container {
    position: absolute;
    z-index: 999;
    background: white;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px; 
    bottom:3px;
  }

  .legend {
          font-size: 10px;
      }

  

  
</style>

<div class="legend-container">
  <svg class="legend"></svg>

</div>