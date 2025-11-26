<script>
  import { browser } from "$app/environment"
  import { datalaag, time } from "$lib/stores.js"
  import { getLegendItems } from "$lib/utils/geojsonStyles.js"

  // Props
  /** @type {string} */
  export let dataType = "geojson"
  /** @type {string|null} */
  export let legendLayerId = null
  /** @type {string|null} */
  export let wmsEndpoint = null
  /** @type {string} */
  export let layerName = ""
  
  // Derived state
  $: isShowingChange = $time === "2050" || $time === "2080"
  
  /**
   * Format the legend title for display
   * @param {string} title - The data layer title to format
   * @returns {string} - The formatted title
   */
  const formatLegendTitle = (title) => {
    const titleMap = {
      "Maximum temperature": "Maximum temp.",
      "Minimum temperature": "Minimum temp.",
      "Average temperature": "Average temp.",
      "Total rainfall": "Total rainfall",
      "Days above 20 mm": "Days above 20mm",
      "Dry spells": "Dry spells"
    }

    // Try to find a match in the titleMap
    for (const [key, value] of Object.entries(titleMap)) {
      if (title.toLowerCase().includes(key.toLowerCase())) {
        return value
      }
    }
    
    // If no match found, return the original with first letter capitalized
    return title.charAt(0).toUpperCase() + title.slice(1)
  }
  
  /**
   * Get the unit for the legend based on data layer
   * @param {string} dataLayer - The data layer
   * @returns {string} - The unit
   */
  const getLegendUnit = (dataLayer) => {
    const unitMap = {
      "Maximum temperature": "°C",
      "Minimum temperature": "°C",
      "Average temperature": "°C",
      "Total rainfall": "mm",
      "Days above 20 mm": "days",
      "Dry spells": "5 dry days in a row",
      "Population": "people"
    }

    // Try to find a match in the unitMap
    for (const [key, value] of Object.entries(unitMap)) {
      if (dataLayer && dataLayer.toLowerCase().includes(key.toLowerCase())) {
        return value
      }
    }

    // Default unit
    return ""
  }

  /**
   * Get population legend items
   * @returns {Array<{color: string, label: string, range: string}>}
   */
  const getPopulationLegendItems = () => {
    return [
      { color: '#FFF4CC', label: 'Above 10M', range: '>10M' },
      { color: '#FFE699', label: '3-10M', range: '3-10M' },
      { color: '#FFD966', label: '1-3M', range: '1-3M' },
      { color: '#F4B183', label: '300K-1M', range: '300K-1M' },
      { color: '#E07C7C', label: '100K-300K', range: '100K-300K' },
      { color: '#C55A5A', label: '30K-100K', range: '30K-100K' },
      { color: '#8B3A3A', label: '10K-30K', range: '10K-30K' }
    ];
  }

</script>

<div class="legend">
  <div class="legend-content">
    <!-- Legend Header (Common for all legend types) -->
    <div class="legend-header">
      <p class="legend-title">
        {#if dataType === 'context'}
          {layerName} ({getLegendUnit(layerName)})
        {:else if isShowingChange}
          Change in {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
        {:else}
          {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
        {/if}
      </p>
    </div>

    <!-- Population Context Layer Legend -->
    {#if dataType === 'context' && layerName === 'Population'}
      <div class="categorical-legend">
        {#each getPopulationLegendItems() as item}
          <div class="legend-item">
            <div class="circle-symbol" style="background-color: {item.color};"></div>
            <span class="legend-label">{item.range}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- WMS Legend Image -->
    {#if legendLayerId && dataType === "wms" && wmsEndpoint}
      <img
        class="legend-image"
        alt="Legend for {$datalaag}"
        src={`${wmsEndpoint}?VERSION=1.1.1&height=300&request=GetLegendGraphic&layer=${legendLayerId}&style=${legendLayerId}&service=WMS&width=50&format=png`} />
    {/if}

    <!-- GeoJSON Custom Legend -->
    {#if typeof dataType === "string" && dataType === "geojson" && browser === true}
      {#key $datalaag}

        {#each [getLegendItems($datalaag, $time)] as legendData}
        {#if legendData && typeof legendData === 'object' && 'type' in legendData && legendData.type === "scalebar"}
            <!-- Vertical Scalebar Legend -->
            <div class="scalebar-legend">
            <!-- Gradient Bar -->
            {#if 'colors' in legendData && Array.isArray(legendData.colors)}
                {@const colors = /** @type {string[]} */ (legendData.colors)}
                <div class="sequential-bars">
                    {#each [...colors].reverse() as color, i}
                        <div class="color-block" style="background-color: {color};"></div>
                    {/each}
                </div>
            {/if}

            <!-- Labels on the right side -->
            {#if 'labels' in legendData && Array.isArray(legendData.labels) && 'min' in legendData && 'max' in legendData}
                {@const min = /** @type {number} */ (legendData.min)}
                {@const max = /** @type {number} */ (legendData.max)}
                <div class="scalebar-labels">
                {#each legendData.labels as labelItem}
                    {#if 'value' in labelItem && 'label' in labelItem}
                    <div class="scalebar-label" style="bottom: {((labelItem.value - min) / (max - min)) * 100}%">
                        {labelItem.label}
                    </div>
                    {/if}
                {/each}
                </div>
            {/if}
            </div>
        {/if}
        {/each}

      {/key}
    {/if}
  </div>
</div>

<style>
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
    width: 3vw;
    min-width: 80px;
    max-width: 180px;
  }

  .legend-title {
    font-size: max(12px, 1.3vh);
    font-weight: 500;
  }

  .legend-image {
    object-fit: contain; /* Maintains aspect ratio */
    height: 60vh;
    max-height: 250px;
    width: auto;
  }
  
  .custom-legend {
    margin-top: 8px;
    font-size: 0.75rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
  }
  
  .color-box {
    display: inline-block;
    width: 15px;
    height: 15px;
    margin-right: 5px;
    border: 1px solid #ccc;
  }
  
  .scalebar-legend {
    position: relative;
    display: flex;
    height: 200px;
    margin: 10px 0;
    padding: 0 15px;
  }

  .sequential-bars {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 20px;
    border: 1px solid #ccc;
    border-radius: 3px;
    overflow: hidden;
  }

  .color-block {
    flex: 1;
    width: 100%;
  }

  .scalebar-labels {
    position: relative;
    margin-left: 5px;
    height: 100%;
    width: 40px;
  }

  .scalebar-label {
    position: absolute;
    left: 5px;
    transform: translateY(50%);
    font-size: 12px;
    white-space: nowrap;
  }

  .unit-label {
    position: absolute;
    top: -20px;
    left: 0;
    right: 0;
    text-align: center;
    font-weight: bold;
    font-size: 14px;
  }

  .categorical-legend {
    margin-top: 10px;
    padding: 5px 0;
  }

  .circle-symbol {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 8px;
    border: 1px solid #333;
    flex-shrink: 0;
  }

  .legend-label {
    font-size: 11px;
    white-space: nowrap;
  }
</style>
