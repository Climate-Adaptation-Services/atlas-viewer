<script>
  import { browser } from "$app/environment"
  import { datalaag, time, scenario } from "$lib/stores.js"
  import { getLegendItems } from "$lib/utils/geojsonStyles.js"
  import { isGeojsonLayer, getGeojsonLayerLegend } from "$lib/config/geojsonLayers.js"
  import { getLayerInfo } from "$lib/config/layerInfo.js"

  // Props
  /** @type {string} */
  export let dataType = "geojson"
  /** @type {string|null} */
  export let legendLayerId = null
  /** @type {string|null} */
  export let wmsEndpoint = null
  /** @type {string} */
  export let layerName = ""

  // State for info panel
  let showInfo = false

  // Derived state
  $: isShowingChange = $time === "2050" || $time === "2080"
  $: currentLayerName = dataType === 'context' ? layerName : $datalaag
  $: layerInfoData = getLayerInfo(currentLayerName)

  // Get scenario label for display
  $: scenarioLabel = $scenario === 'Low' ? 'SSP1-2.6' : 'SSP5-8.5'
  
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
      "Population": "people",
      "River Flood": "Inundation depth"
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

  /**
   * Get water stress legend items
   * @returns {Array<{color: string, label: string, subtitle: string}>}
   */
  const getWaterStressLegendItems = () => {
    return [
      { color: '#a41f35', label: 'Extremely high', subtitle: '(>80%)' },
      { color: '#d8392c', label: 'High', subtitle: '(40-80%)' },
      { color: '#f47b50', label: 'Medium-high', subtitle: '(20-40%)' },
      { color: '#fed976', label: 'Low-medium', subtitle: '(10-20%)' },
      { color: '#ffffbe', label: 'Low', subtitle: '(<10%)' },
      { color: '#d1d1d1', label: 'Arid and low water use', subtitle: '' }
    ];
  }

  /**
   * Get AEZ (Agro-Ecological Zone) legend items
   * @returns {Array<{color: string, label: string}>}
   */
  const getAEZLegendItems = () => {
    return [
      { color: '#2E86AB', label: 'Coastal Lowland' },
      { color: '#F6AE2D', label: 'Inner Lowland' },
      { color: '#4A7C59', label: 'Lower Highland' },
      { color: '#86BA90', label: 'Lower Midland' },
      { color: '#E84855', label: 'Nairobi City' },
      { color: '#9B5DE5', label: 'Tropical Alpine' },
      { color: '#1B4332', label: 'Upper Highland' },
      { color: '#95D5B2', label: 'Upper Midland' },
      { color: '#48CAE4', label: 'Waterbody' }
    ];
  }


</script>

<div class="legend">
  <div class="legend-content">
    <!-- Legend Header (Common for all legend types) -->
    <div class="legend-header">
      <p class="legend-title">
        {#if dataType === 'context'}
          {#if getLegendUnit(layerName)}
            {layerName} ({getLegendUnit(layerName)})
          {:else}
            {layerName}
          {/if}
        {:else if isGeojsonLayer($datalaag)}
          {#if getLegendUnit($datalaag)}
            {$datalaag} ({getLegendUnit($datalaag)})
          {:else}
            {$datalaag}
          {/if}
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

    <!-- Water Stress Context Layer Legend -->
    {#if dataType === 'context' && layerName === 'Water Stress'}
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 4px 0;">
        {#each getWaterStressLegendItems() as item}
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="color-box" style="background-color: {item.color}; flex-shrink: 0;"></div>
            <span style="font-size: 13px; line-height: 1.2;">
              {item.label}
              {#if item.subtitle}
                <span style="color: #666; margin-left: 4px;">{item.subtitle}</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Agroclimatic zones Context Layer Legend -->
    {#if dataType === 'context' && layerName === 'Agroclimatic zones'}
      <div style="display: flex; flex-direction: column; gap: 4px; padding: 4px 0;">
        {#each getAEZLegendItems() as item}
          <div style="display: flex; align-items: center; gap: 6px;">
            <div class="color-box" style="background-color: {item.color}; flex-shrink: 0;"></div>
            <span style="font-size: 11px; line-height: 1.2;">{item.label}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- GeoJSON Layer Legends (generic handling for all configured GeoJSON layers) -->
    {#if dataType !== 'context' && isGeojsonLayer($datalaag)}
      {@const legendItems = getGeojsonLayerLegend($datalaag)}
      {#if legendItems}
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 4px 0;">
          {#each legendItems as item}
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="color-box" style="background-color: {item.color}; flex-shrink: 0;"></div>
              <span style="font-size: 13px; line-height: 1.2;">
                {item.label}
                {#if item.subtitle}
                  <span style="color: #666; margin-left: 4px;">{item.subtitle}</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      {/if}
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

    <!-- About this layer -->
    {#if layerInfoData}
      <button
        class="info-toggle"
        on:click={() => showInfo = !showInfo}
      >
        <span class="info-icon">i</span>
        About this layer
      </button>
    {/if}
  </div>

  <!-- Info Popup -->
  {#if showInfo && layerInfoData}
    <div class="info-popup">
      <button class="popup-close" on:click={() => showInfo = false}>×</button>
      <p class="popup-title">{currentLayerName}</p>
      <p class="info-description">{layerInfoData.description}</p>
      <div class="info-details">
        <div class="info-row">
          <span class="info-label">Source:</span>
          <span class="info-value">{layerInfoData.source}</span>
        </div>
        {#if layerInfoData.baseline}
          <div class="info-row">
            <span class="info-label">Baseline:</span>
            <span class="info-value">{layerInfoData.baseline}</span>
          </div>
        {/if}
        {#if layerInfoData.resolution}
          <div class="info-row">
            <span class="info-label">Resolution:</span>
            <span class="info-value">{layerInfoData.resolution}</span>
          </div>
        {/if}
        {#if isShowingChange}
          <div class="info-row">
            <span class="info-label">Scenario:</span>
            <span class="info-value">{scenarioLabel}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
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
    min-width: 120px;
    max-width: 220px;
  }

  .legend-content {
    position: relative;
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

  .info-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 0;
    border: none;
    background: none;
    color: #666;
    font-size: 11px;
    cursor: pointer;
    transition: color 0.2s;
  }

  .info-toggle:hover {
    color: #017e9f;
  }

  .info-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    font-family: Georgia, serif;
    font-size: 10px;
    font-weight: 500;
  }

  .info-popup {
    position: absolute;
    bottom: 0;
    right: calc(100% + 10px);
    background: white;
    border-radius: 12px;
    padding: 14px;
    min-width: 200px;
    max-width: 260px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid #e0e0e0;
    z-index: 10;
  }

  .popup-close {
    position: absolute;
    top: 8px;
    right: 10px;
    background: none;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .popup-close:hover {
    color: #333;
  }

  .popup-title {
    font-size: 12px;
    font-weight: 600;
    color: #017e9f;
    margin: 0 0 8px 0;
    padding-right: 20px;
  }

  .info-description {
    font-size: 11px;
    color: #333;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }

  .info-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-row {
    display: flex;
    gap: 6px;
    font-size: 10px;
  }

  .info-label {
    color: #888;
    flex-shrink: 0;
  }

  .info-value {
    color: #333;
  }
</style>
