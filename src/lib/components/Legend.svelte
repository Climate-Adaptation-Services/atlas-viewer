<script>
  import LegendCard from "./LegendCard.svelte"

  /**
   * One descriptor per active layer.
   * @type {Array<{name: string, dataType: string, legendLayerId: string|null, legendUrl: string|null, time: string, scenario: string}>}
   */
  export let layers = []
  /** Shared WMS endpoint for the current country (for GetLegendGraphic images). @type {string|null} */
  export let wmsEndpoint = null
</script>

{#if layers.length}
  <div class="legend-stack">
    {#each layers as layer (layer.name)}
      <LegendCard
        layerName={layer.name}
        dataType={layer.dataType}
        legendLayerId={layer.legendLayerId}
        legendUrl={layer.legendUrl}
        time={layer.time}
        scenario={layer.scenario}
        {wmsEndpoint}
      />
    {/each}
  </div>
{/if}

<style>
  .legend-stack {
    position: fixed;
    bottom: 4vh;
    right: 4vw;
    z-index: 1000000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 2px;
    /* let the map receive clicks between/around cards */
    pointer-events: none;
  }

  /* re-enable interaction on the cards themselves */
  .legend-stack > :global(.legend-card) {
    pointer-events: auto;
  }
</style>
