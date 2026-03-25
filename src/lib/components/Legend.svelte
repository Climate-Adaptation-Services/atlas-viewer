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
  $: currentLayerName = dataType === "context" ? layerName : $datalaag
  $: layerInfoData = getLayerInfo(currentLayerName)

  // Get scenario label for display
  $: scenarioLabel = $scenario === "Low" ? "SSP1-2.6" : "SSP5-8.5"

  // Determine displayed resolution and source based on time period
  $: displayedResolution = layerInfoData
    ? isShowingChange
      ? layerInfoData.projectionResolution || layerInfoData.resolution || null
      : layerInfoData.historicalResolution || layerInfoData.resolution || null
    : null
  $: displayedSource = layerInfoData
    ? isShowingChange
      ? layerInfoData.projectionSource || layerInfoData.source || null
      : layerInfoData.historicalSource || layerInfoData.source || null
    : null
  $: displayedSourceUrl = layerInfoData
    ? isShowingChange
      ? layerInfoData.projectionSourceUrl || layerInfoData.sourceUrl || null
      : layerInfoData.historicalSourceUrl || layerInfoData.sourceUrl || null
    : null

  /** @type {string[]} */
  const climateLayerNames = ["Maximum temperature", "Minimum temperature", "Average temperature", "Total rainfall", "Days above 20 mm", "Dry spells", "Days above 35°C"]

  /**
   * Check if a layer is one of the climate layers that show change for projections
   * @param {string} layer
   * @returns {boolean}
   */
  const isClimateLayer = (layer) => {
    if (!layer) return false
    return climateLayerNames.some((cl) => layer.toLowerCase().includes(cl.toLowerCase()))
  }

  const formatLegendTitle = (title) => {
    const titleMap = {
      "Maximum temperature": "Maximum temp.",
      "Minimum temperature": "Minimum temp.",
      "Average temperature": "Average temp.",
      "Total rainfall": "Total rainfall",
      "Days above 20 mm": "Days above 20mm",
      "Dry spells": "Dry spells",
      "Days above 35°C": "Days above 35°C",
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
   * Get the legend title for projection mode (Change in ...)
   * @param {string} title - The data layer title
   * @returns {string} - The formatted change title with unit
   */
  const getChangeLegendTitle = (title) => {
    const changeUnitMap = {
      "Maximum temperature": "°C",
      "Minimum temperature": "°C",
      "Average temperature": "°C",
      "Total rainfall": "mm",
      "Days above 20 mm": "Days",
      "Days above 35°C": "Days",
      "Dry spells": "dry spells",
    }

    for (const [key, unit] of Object.entries(changeUnitMap)) {
      if (title && title.toLowerCase().includes(key.toLowerCase())) {
        return `Change (${unit})`
      }
    }
    return "Change"
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
      "Days above 20 mm": "Days",
      "Days above 35°C": "Days",
      "Dry spells": "Dry spells",
      "Urban population": "People",
      "River Flood": "Inundation depth",
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
      { color: "#FFF4CC", label: "Above 10M", range: ">10M" },
      { color: "#FFE699", label: "3-10M", range: "3-10M" },
      { color: "#FFD966", label: "1-3M", range: "1-3M" },
      { color: "#F4B183", label: "300K-1M", range: "300K-1M" },
      { color: "#E07C7C", label: "100K-300K", range: "100K-300K" },
      { color: "#C55A5A", label: "30K-100K", range: "30K-100K" },
      { color: "#8B3A3A", label: "10K-30K", range: "10K-30K" },
    ]
  }

  /**
   * Get water stress legend items
   * @returns {Array<{color: string, label: string, subtitle: string}>}
   */
  const getWaterStressLegendItems = () => {
    return [
      { color: "#a41f35", label: "Extremely high", subtitle: "(>80%)" },
      { color: "#d8392c", label: "High", subtitle: "(40-80%)" },
      { color: "#f47b50", label: "Medium-high", subtitle: "(20-40%)" },
      { color: "#fed976", label: "Low-medium", subtitle: "(10-20%)" },
      { color: "#ffffbe", label: "Low", subtitle: "(<10%)" },
      { color: "#d1d1d1", label: "Arid and low water use", subtitle: "" },
    ]
  }

  /**
   * Get AEZ (Agro-Ecological Zone) legend items
   * @returns {Array<{color: string, label: string}>}
   */
  const getAEZLegendItems = () => {
    return [
      { color: "#2E86AB", label: "Coastal Lowland" },
      { color: "#F6AE2D", label: "Inner Lowland" },
      { color: "#4A7C59", label: "Lower Highland" },
      { color: "#86BA90", label: "Lower Midland" },
      { color: "#E84855", label: "Nairobi City" },
      { color: "#9B5DE5", label: "Tropical Alpine" },
      { color: "#1B4332", label: "Upper Highland" },
      { color: "#95D5B2", label: "Upper Midland" },
      { color: "#48CAE4", label: "Waterbody" },
    ]
  }
</script>

<div class="legend">
  <div class="legend-content">
    <!-- Legend Header (Common for all legend types) -->
    <div class="legend-header">
      <span class="legend-title">
        {#if dataType === "context"}
          {getLegendUnit(layerName) || layerName}
        {:else if isGeojsonLayer($datalaag)}
          {getLegendUnit($datalaag) || $datalaag}
        {:else if isShowingChange && isClimateLayer($datalaag)}
          {getChangeLegendTitle($datalaag)}
        {:else}
          {getLegendUnit($datalaag) || formatLegendTitle($datalaag)}
        {/if}
      </span>
      {#if layerInfoData}
        <button class="info-icon-inline" on:click={() => (showInfo = !showInfo)}>
          i
          <span class="info-tooltip">About this layer</span>
        </button>
      {/if}
    </div>

    <!-- Population Context Layer Legend -->
    {#if dataType === "context" && layerName === "Urban population"}
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
    {#if dataType === "context" && layerName === "Water Stress"}
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
    {#if dataType === "context" && layerName === "Agroclimatic zones"}
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
    {#if dataType !== "context" && isGeojsonLayer($datalaag)}
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
          {#if legendData && typeof legendData === "object" && "type" in legendData && legendData.type === "scalebar"}
            <!-- Vertical Scalebar Legend -->
            <div class="scalebar-legend">
              <!-- Gradient Bar -->
              {#if "colors" in legendData && Array.isArray(legendData.colors)}
                {@const colors = /** @type {string[]} */ (legendData.colors)}
                <div class="sequential-bars">
                  {#each [...colors].reverse() as color, i}
                    <div class="color-block" style="background-color: {color};"></div>
                  {/each}
                </div>
              {/if}

              <!-- Labels on the right side -->
              {#if "labels" in legendData && Array.isArray(legendData.labels) && "min" in legendData && "max" in legendData}
                {@const min = /** @type {number} */ (legendData.min)}
                {@const max = /** @type {number} */ (legendData.max)}
                <div class="scalebar-labels">
                  {#each legendData.labels as labelItem}
                    {#if "value" in labelItem && "label" in labelItem}
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

  <!-- Info Popup -->
  {#if showInfo && layerInfoData}
    <div class="info-popup">
      <button class="popup-close" on:click={() => (showInfo = false)}>×</button>
      <p class="popup-title">{currentLayerName}</p>
      {#if isShowingChange && layerInfoData.projectionDescription}
        <p class="info-description">
          {layerInfoData.projectionDescription}
        </p>
      {:else}
        <p class="info-description">{layerInfoData.description}</p>
      {/if}
      <div class="info-details">
        <div class="info-row">
          <span class="info-label">Source:</span>
          {#if displayedSourceUrl}
            <a class="info-link" href={displayedSourceUrl} target="_blank" rel="noopener noreferrer">{displayedSource}</a>
          {:else}
            <span class="info-value">{displayedSource}</span>
          {/if}
        </div>
        {#if displayedResolution}
          <div class="info-row">
            <span class="info-label">Resolution:</span>
            <span class="info-value">{displayedResolution}</span>
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
    background-color: rgba(250, 250, 250, 0.95);
    padding: 12px 14px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    width: fit-content;
  }

  .legend-content {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .legend-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 8px 0;
  }

  .legend-title {
    font-size: 12px;
    font-weight: 600;
    color: #333;
    line-height: 1.3;
  }

  .info-icon-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    border: none;
    font-family: Georgia, serif;
    font-size: 10px;
    font-weight: 500;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .info-icon-inline:hover {
    background-color: #017e9f;
    color: white;
  }

  .info-tooltip {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 255, 255, 0.95);
    color: #555;
    font-size: 10px;
    font-weight: 400;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition:
      opacity 0.2s,
      visibility 0.2s;
  }

  .info-icon-inline:hover .info-tooltip {
    visibility: visible;
    opacity: 1;
  }

  .legend-image {
    object-fit: contain; /* Maintains aspect ratio */
    height: 60vh;
    max-height: 250px;
    width: auto;
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
    height: 150px;
    margin: 0;
    padding: 0;
  }

  .sequential-bars {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 14px;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .color-block {
    flex: 1;
    width: 100%;
  }

  .scalebar-labels {
    position: relative;
    margin-left: 6px;
    height: 100%;
  }

  .scalebar-label {
    position: absolute;
    left: 0;
    transform: translateY(50%);
    font-size: 11px;
    color: #555;
    white-space: nowrap;
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

  .info-popup {
    position: absolute;
    bottom: 0;
    right: calc(100% + 12px);
    background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
    border-radius: 14px;
    padding: 16px 18px;
    min-width: 220px;
    max-width: 280px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(1, 126, 159, 0.15);
    z-index: 10;
  }

  .popup-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    font-size: 14px;
    color: #888;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .popup-close:hover {
    background: rgba(1, 126, 159, 0.1);
    color: #017e9f;
  }

  .popup-title {
    font-size: 13px;
    font-weight: 600;
    color: #017e9f;
    margin: 0 0 10px 0;
    padding-right: 24px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(1, 126, 159, 0.15);
  }

  .info-description {
    font-size: 12px;
    color: #444;
    margin: 0 0 14px 0;
    line-height: 1.5;
  }

  .info-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .info-row {
    display: flex;
    gap: 8px;
    font-size: 11px;
  }

  .info-label {
    color: #777;
    flex-shrink: 0;
    font-weight: 500;
  }

  .info-value {
    color: #333;
  }

  .info-link {
    color: #017e9f;
    text-decoration: none;
    transition: color 0.2s;
  }

  .info-link:hover {
    color: #015a73;
    text-decoration: underline;
  }

  /* Mobile font size adjustments */
  @media (max-width: 768px) {
    .legend-title {
      font-size: 14px;
    }

    .info-icon-inline {
      width: 18px;
      height: 18px;
      font-size: 12px;
    }

    .info-tooltip {
      font-size: 12px;
    }

    .info-popup {
      min-width: 200px;
      max-width: 260px;
      padding: 14px 16px;
    }

    .popup-title {
      font-size: 15px;
    }

    .info-description {
      font-size: 14px;
    }

    .info-row {
      font-size: 13px;
    }

    .info-link {
      font-size: 13px;
    }
  }
</style>
