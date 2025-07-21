<script>
  import { browser } from "$app/environment"
  import { datalaag, time} from "$lib/stores.js"
  import { getLegendItems } from "$lib/utils/geojsonStyles.js"
  
  // Props
  /** @type {string} */
  export let dataType = "geojson"
  /** @type {string|null} */
  export let legendLayerId = null
  /** @type {string|null} */
  export let wmsEndpoint = null
  
  // Internal functions for legend formatting
  /**
   * Format the legend title for display
   * @param {string} title - The data layer title to format
   * @returns {string} - The formatted title
   */
  const formatLegendTitle = (title) => {
    const titleMap = {
      "temperature": "Temperature",
      "rainfall": "Rainfall",
      "total_rainfall": "Total Rainfall",
      "annual_rainfall": "Annual Rainfall",
      "dryspell": "Dry Spell",
      "dry_spell": "Dry Spell",
      "days_above_20mm": "Days Above 20mm"
    }
    
    // Try to find a match in the titleMap
    for (const [key, value] of Object.entries(titleMap)) {
      if (title.toLowerCase().includes(key)) {
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
      "temperature": "°C",
      "rainfall": "mm",
      "total_rainfall": "mm",
      "annual_rainfall": "mm",
      "dry_spell": "days",
      "dryspell": "days",
      "days_above_20mm": "days"
    }
    
    // Try to find a match in the unitMap
    for (const [key, value] of Object.entries(unitMap)) {
      if (dataLayer.toLowerCase().includes(key)) {
        return value
      }
    }
    
    // Default unit
    return ""
  }
  
  // Derived state
  $: isShowingChange = $time === "2050" || $time === "2080"
</script>

<div class="legend">
  <div class="legend-content">
    {#if dataType !== "geojson"}
      <div class="legend-header">
        <p class="legend-title">
          {#if isShowingChange}
            Change in {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
          {:else}
            {formatLegendTitle($datalaag)} ({getLegendUnit($datalaag)})
          {/if}
        </p>
      </div>
    {/if}
    
    {#if legendLayerId && dataType === "wms" && wmsEndpoint}
      <!-- WMS Legend Image -->
      <img
        class="legend-image"
        alt="Legend for {$datalaag}"
        src={`${wmsEndpoint}?VERSION=1.1.1&height=300&request=GetLegendGraphic&layer=${legendLayerId}&style=${legendLayerId}&service=WMS&width=50&format=png`} />
    {/if}
    
    {#if dataType === "geojson" && browser}
      <!-- GeoJSON Custom Legend -->
      {#key $datalaag}
        {#if $datalaag && ($datalaag.toLowerCase().includes('temperature') || 
            $datalaag.toLowerCase().includes('rainfall') || 
            $datalaag.toLowerCase().includes('total rain') || 
            $datalaag.toLowerCase().includes('annual rain') || 
            $datalaag.toLowerCase().includes('dry spell') || 
            $datalaag.toLowerCase().includes('dryspell') ||
            $datalaag.toLowerCase().includes('days above 20mm') ||
            $datalaag.toLowerCase().includes('days above 20') ||
            $datalaag.toLowerCase().includes('days_above_20'))}
          {#each [getLegendItems($datalaag, $time)] as legendData}
            {#if legendData && typeof legendData === 'object' && 'type' in legendData && legendData.type === "scalebar"}
              <!-- Vertical Scalebar Legend -->
              <div class="legend-header">
                <p class="legend-title">
                  {#if isShowingChange}
                    Change in {formatLegendTitle($datalaag)}
                  {:else}
                    {formatLegendTitle($datalaag)}
                  {/if}
                </p>
              </div>
              <div class="scalebar-legend">
                {#if 'colors' in legendData && Array.isArray(legendData.colors)}
                  <!-- Type assertion for colors array -->
                  {@const colors = /** @type {string[]} */ (legendData.colors)}
                  <!-- Gradient bar -->
                  {#each [colors.map((color, i) => 
                    `${color} ${Math.round(i / (colors.length - 1) * 100)}%`).join(', ')] as gradientStops}
                    <div class="gradient-bar" style="background: linear-gradient(to top, {gradientStops});"></div>
                  {/each}
                {/if}
                
                <!-- Labels on the right side -->
                {#if 'labels' in legendData && Array.isArray(legendData.labels) && 'min' in legendData && 'max' in legendData}
                  <!-- Type assertions for min and max values -->
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
                
                <!-- Unit label -->
                {#if 'unit' in legendData}
                  <div class="unit-label">{legendData.unit}</div>
                {/if}
              </div>
            {:else}
              <!-- Standard Legend (Fallback) -->
              <div class="custom-legend">
                {#if Array.isArray(legendData)}
                  {#each legendData as item}
                    {#if item && typeof item === 'object' && 'color' in item && 'label' in item}
                      {@const typedItem = /** @type {{color: string, label: string}} */ (item)}
                      <div class="legend-item">
                        <span class="color-box" style="background-color: {typedItem.color};"></span> {typedItem.label}
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            {/if}
          {/each}
        {/if}
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

  .gradient-bar {
    width: 30px;
    height: 100%;
    border-radius: 3px;
    border: 1px solid #ccc;
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
</style>
