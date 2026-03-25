<script>
  import { datalaag, scenario, time, theme, opacityMap, selectedLayer } from "$lib/stores.js"
  import { page } from "$app/stores"
  import { getCountryConfig } from "$lib/config/countries.js"
  import { getContextLayerNames } from "$lib/config/contextLayers.js"
  import { createEventDispatcher } from "svelte"

  const dispatch = createEventDispatcher()

  const themeLayerMap = {
    heat: ["Average temperature", "Minimum temperature", "Maximum temperature", "Days above 35°C"],
    drought: ["Dry spells", "Water Stress"],
    rain: ["Total rainfall", "Days above 20 mm", "River Flood"]
  }

  const allContextLayerOptions = getContextLayerNames()

  const options2 = [
    { id: 0, name: "Past" },
    { id: 1, name: "2050" },
    { id: 2, name: "2080" },
  ]
  const options3 = [
    { id: 0, name: "Low" },
    { id: 1, name: "High" },
  ]

  // Get country configuration
  $: countryCode = $page.url.searchParams.get('country') || 'zimbabwe'
  $: countryConfig = getCountryConfig(countryCode)

  // Filter theme options by country availability
  $: options = (themeLayerMap[$theme] || []).filter(
    layer => countryConfig?.layerAvailability?.[layer] !== undefined
  )

  // Filter context layers to only show those available for this country
  $: contextLayerOptions = allContextLayerOptions.filter(layer =>
    countryConfig?.layerAvailability?.[layer] !== undefined
  )

  // Get availability for current layer
  $: layerAvailability = countryConfig?.layerAvailability?.[$selectedLayer] || {
    times: ["Past", "2050", "2080"],
    hasScenarios: true
  }

  // Check if a time period is available for current layer
  $: isTimeAvailable = (/** @type {string} */ timeName) => {
    return layerAvailability.times.includes(timeName)
  }

  // Check if scenarios should be shown for current layer
  $: showScenarios = layerAvailability.hasScenarios && ($time === "2050" || $time === "2080")

  // Filter options2 to only show available time periods
  $: availableTimeOptions = options2.filter(opt => isTimeAvailable(opt.name))

  // Auto-adjust time if current selection is not available
  $: if ($selectedLayer && !isTimeAvailable($time)) {
    // Set to first available time
    const firstAvailable = layerAvailability.times[0]
    const timeOption = options2.find(opt => opt.name === firstAvailable)
    if (timeOption) {
      selectedTime = timeOption.id
      time.set(firstAvailable)
    }
  }

  // Sync datalaag with selectedLayer for backward compatibility
  $: if ($selectedLayer && !contextLayerOptions.includes($selectedLayer)) {
    datalaag.set($selectedLayer)
  }

  $: if ($theme) {
    selectedLayer.set(options[0])
  }

  export let selectedTime = 0
  export let selectedScenario = 1

  // Collapsible state for context layers
  let contextLayersExpanded = false

  /**
   * @param {MouseEvent} event
   * @param {string} tooltipId
   */
  function showTooltip(event, tooltipId) {
    hideTooltip() // Remove any existing tooltip first

    const wrapper = /** @type {HTMLElement} */ (event.currentTarget)
    const icon = wrapper.querySelector('.layer-info-hint')
    const rect = icon ? icon.getBoundingClientRect() : wrapper.getBoundingClientRect()

    // Create tooltip and append to body to escape all overflow containers
    const tooltip = document.createElement('div')
    tooltip.id = 'sidepanel-floating-tooltip'
    tooltip.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.bottom + 4}px;
      transform: translateX(-50%);
      background-color: rgba(255, 255, 255, 0.98);
      color: #555;
      font-size: 10px;
      padding: 6px 10px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.08);
      z-index: 999999999;
      pointer-events: none;
    `

    if (tooltipId === 'time') {
      tooltip.innerHTML = `
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="padding: 2px 0;"><strong style="color: #017e9f;">Past:</strong> observed data for 1981–2010</li>
          <li style="padding: 2px 0;"><strong style="color: #017e9f;">2050:</strong> projected data for 2036–2065</li>
          <li style="padding: 2px 0;"><strong style="color: #017e9f;">2080:</strong> projected data for 2066–2095</li>
        </ul>
      `
    } else if (tooltipId === 'scenario') {
      tooltip.innerHTML = `
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="padding: 2px 0;"><strong style="color: #017e9f;">Low:</strong> SSP1-2.6, low greenhouse gas emissions</li>
          <li style="padding: 2px 0;"><strong style="color: #017e9f;">High:</strong> SSP5-8.5, high greenhouse gas emissions</li>
        </ul>
      `
    }

    document.body.appendChild(tooltip)
  }

  function hideTooltip() {
    const existing = document.getElementById('sidepanel-floating-tooltip')
    if (existing) existing.remove()
  }

  /** @param {number} index */
  function selectTime(index) {
    if (!isTimeAvailable(options2[index].name)) return
    selectedTime = index
    dispatch("change", { value: index })
    const found = options2.find((x) => x.id === index)
    if (found) $time = found.name
  }

  /** @param {Event} e */
  function setSelectedScenario(e) {
    const target = /** @type {HTMLButtonElement} */ (e.target)
    const newValue = Number(target.value)
    selectedScenario = newValue
    dispatch("change", { value: newValue })
    const found = options3.find((x) => x.id === selectedScenario)
    if (found) $scenario = found.name
  }

</script>

<section>
  <h2 class="first">Choose a climate theme</h2>
  <div class="theme-buttons">
    <button
      class="theme-btn"
      class:active={$theme === 'heat'}
      on:click={() => theme.set('heat')}>
      <img
        class="themelogo"
        src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/heat.svg"
        alt="Heat" />
      <span class="caption">Heat</span>
    </button>
    <button
      class="theme-btn"
      class:active={$theme === 'drought'}
      on:click={() => theme.set('drought')}>
      <img
        class="themelogo"
        src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/drought.svg"
        alt="Drought" />
      <span class="caption">Drought</span>
    </button>
    <button
      class="theme-btn"
      class:active={$theme === 'rain'}
      on:click={() => theme.set('rain')}>
      <img
        class="themelogo"
        src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/rain.svg"
        alt="Extreme rain" />
      <span class="caption">Rain</span>
    </button>
  </div>
  
  <h2>Select a map layer</h2>
  {#each options as option}
    <label class="keuzes" class:selected={$selectedLayer === option}>
      <input class="option" type="radio" name="laag" value={option} bind:group={$selectedLayer} />
      {option}
    </label>
  {/each}

  {#if contextLayerOptions.length > 0}
    <button
      class="collapsible-header"
      on:click={() => contextLayersExpanded = !contextLayersExpanded}
      aria-expanded={contextLayersExpanded}
    >
      <span class="collapse-icon" class:expanded={contextLayersExpanded}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <h2 class="collapsible-title">Context layers</h2>
    </button>
    {#if contextLayersExpanded}
      <div class="collapsible-content">
        {#each contextLayerOptions as option}
          <label class="keuzes" class:selected={$selectedLayer === option}>
            <input class="option" type="radio" name="laag" value={option} bind:group={$selectedLayer} />
            {option}
          </label>
        {/each}
      </div>
    {/if}
  {/if}

  {#if availableTimeOptions.length > 1}
    <h2 style="display: inline-flex; align-items: center; gap: 0.5em; margin-top: 2vh;">
      Select time period
      <span
        class="info-icon-wrapper"
        on:mouseenter={(e) => showTooltip(e, 'time')}
        on:mouseleave={hideTooltip}
        role="button"
        tabindex="0"
      >
        <span class="layer-info-hint">i</span>
      </span>
    </h2>
    <div class="timeline-wrapper">
      <div class="timeline">
        {#each availableTimeOptions as option, index}
          <!-- Line segment before marker (except for first) -->
          {#if index > 0}
            <div class="timeline-line available"></div>
          {/if}
          <!-- Marker -->
          <button
            class="timeline-marker available"
            class:selected={selectedTime === option.id}
            on:click={() => selectTime(option.id)}
          >
            <span class="marker-dot"></span>
            <span class="marker-label">{option.name}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else if availableTimeOptions.length === 1}
    <div class="time-period-label">
      <span class="time-period-text">Time period:</span>
      <span class="time-period-value">{availableTimeOptions[0].name}</span>
    </div>
  {/if}
  {#if showScenarios}
    <h2 style="display: inline-flex; align-items: center; gap: 0.5em;">
      Emissions scenario
      <span
        class="info-icon-wrapper"
        on:mouseenter={(e) => showTooltip(e, 'scenario')}
        on:mouseleave={hideTooltip}
        role="button"
        tabindex="0"
      >
        <span class="layer-info-hint">i</span>
      </span>
    </h2>
    <div class="scenario-toggle">
      <button
        class="scenario-option"
        class:active={selectedScenario === 0}
        on:click={() => { selectedScenario = 0; scenario.set('Low'); }}
      >Low</button>
      <button
        class="scenario-option"
        class:active={selectedScenario === 1}
        on:click={() => { selectedScenario = 1; scenario.set('High'); }}
      >High</button>
    </div>
  {/if}
  <h2 class="opacity-header">
    <svg class="opacity-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
    </svg>
    Layer visibility
    <span class="opacity-value">{Math.round($opacityMap * 100)}%</span>
  </h2>
  <div class="opacity-slider">
    <input
      type="range"
      id="opacity"
      min="0"
      max="1"
      step="0.1"
      bind:value={$opacityMap}
      style="background: linear-gradient(to right, #017E9F 0%, #017E9F {$opacityMap * 100}%, #ddd {$opacityMap * 100}%);" />
  </div>
</section>

<style>
  /* Mobile responsive styles */
  @media (max-width: 768px) {
    section {
      padding-bottom: 2vh;
    }

    h2 {
      font-size: 2.4vh !important;
      margin-top: 1.5vh !important;
      margin-bottom: 1vh !important;
    }

    h2.first {
      margin-top: 1.5vh !important;
    }

    .keuzes {
      font-size: 2.2vh !important;
      gap: 2.5vw !important;
      margin-bottom: 0.2vh !important;
      padding: 0.9vh 2.5vw !important;
      margin-left: -2.5vw !important;
      border-radius: 8px !important;
    }

    .option {
      width: 2.8vh !important;
      height: 2.8vh !important;
      flex-shrink: 0;
    }

    .option:checked::after {
      font-size: 1.8vh !important;
    }

    .collapse-icon {
      width: 2vh !important;
      height: 2vh !important;
    }

    .buttons button {
      height: 5.5vh !important;
      width: 20vw !important;
      font-size: 2.2vh !important;
      margin-right: 2vw !important;
      border-radius: 20px !important;
    }

    .info-icon {
      width: 3vh !important;
      height: 3vh !important;
    }

    .opacity-slider input {
      height: 2vh !important;
    }

    .opacity-slider input::-webkit-slider-thumb {
      width: 3.5vh !important;
      height: 3.5vh !important;
    }
  }
  
  .info-icon-wrapper {
    position: relative;
    display: inline-block;
  }

  .info-hint {
    color: #999;
    font-size: 0.85em;
    font-weight: 400;
    cursor: help;
  }
  
  /* Font size for the 'i' character */
  .info-icon text {
    /* Increased size for better visibility on normal screens with a max height */
    font-size: max(16px, 1.3vh);
    font-weight: bold;
    font-family: serif;
    transform: translateY(1px); /* Fine-tune vertical alignment */
    max-height: 20px; /* Maximum height to prevent excessive sizing */
  }
  
  /* Font size adjustments for different screen sizes */
  @media (min-width: 1200px) {
    .tooltip {
      font-size: 0.8em;
    }
  }
  
  /* Additional size guarantee for very small screens */
  @media (max-height: 500px) {
    .info-icon {
      width: 24px;
      height: 24px;
    }
    
    .info-icon text {
      font-size: 16px;
    }
  }
  .tooltip {
    visibility: hidden;
    width: max-content;
    max-width: 200px;
    background-color: rgba(255, 255, 255, 0.98);
    color: #555;
    text-align: left;
    border-radius: 4px;
    padding: 6px 10px;
    position: absolute;
    z-index: 10000000;
    top: calc(100% + 6px);
    left: -80px;
    opacity: 0;
    transition: opacity 0.2s, visibility 0.2s;
    font-size: 10px;
    font-weight: 400;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .tooltip-list {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  .tooltip-list li {
    padding: 2px 0;
    line-height: 1.4;
  }

  .tooltip-list li strong {
    color: #017e9f;
  }
  .info-icon-wrapper:hover .tooltip {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }

  /* Fixed position tooltip that escapes overflow containers */
  .fixed-tooltip {
    position: fixed;
    transform: translateX(-50%);
    width: max-content;
    max-width: 220px;
    background-color: rgba(255, 255, 255, 0.98);
    color: #555;
    text-align: left;
    border-radius: 4px;
    padding: 6px 10px;
    z-index: 10000000;
    font-size: 10px;
    font-weight: 400;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(0, 0, 0, 0.08);
    pointer-events: none;
  }

  /* Collapsible section styles */
  .collapsible-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    margin-top: 1vh;
    margin-bottom: 0.5vh;
    cursor: pointer;
    text-align: left;
  }

  .collapsible-header:hover .collapsible-title {
    color: #017e9f;
  }

  .collapsible-title {
    margin: 0;
    transition: color 0.2s ease;
  }

  .collapse-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.8vh;
    height: 1.8vh;
    min-width: 14px;
    min-height: 14px;
    color: #666;
    transition: transform 0.2s ease;
  }

  .collapse-icon svg {
    width: 100%;
    height: 100%;
  }

  .collapse-icon.expanded {
    transform: rotate(90deg);
  }

  .collapsible-content {
    animation: slideDown 0.2s ease-out;
    padding-bottom: 0.5vh;
  }

  /* Single time period label */
  .time-period-label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-top: 2vh;
    font-size: 1.8vh;
  }

  .time-period-text {
    color: #555;
  }

  .time-period-value {
    font-weight: 500;
    color: #017e9f;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .keuzes {
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-size: 1.8vh;
    padding: 0.6vh 1vw;
    margin: 0.2vh 0;
    border-radius: 8px;
    margin-left: -1vw;
  }

  .keuzes:hover {
    background-color: rgba(1, 126, 159, 0.1);
  }

  /* Info icon for headers */
  .layer-info-hint {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    font-family: Georgia, serif;
    font-size: 10px;
    font-weight: 500;
    color: #888;
    cursor: help;
    transition: all 0.2s;
  }

  .layer-info-hint:hover {
    background-color: #017e9f;
    color: white;
  }

  .keuzes.selected {
    background-color: rgba(1, 126, 159, 0.15);
    border-left: 3px solid #017e9f;
    font-weight: 500;
  }

  /* Hide the radio input - row highlight is enough */
  .option {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .buttons button {
    margin-right: 0.5vw;
    height: 6vh;
    width: 4.5vw;
    border-radius: 30px;
    border-width: 0.3vh;
    font-size: 1.9vh;
    background-color: lightgrey;
    margin-bottom: 1vh;
    cursor: pointer;
    transition:
      background-color 0.3s,
      color 0.3s;
  }

  .buttons button:hover {
    background-color: #017e9f;
    color: white;
  }

  .buttons button.selected {
    background-color: #017e9f;
    color: white;
  }

  .buttons button:disabled,
  .buttons button.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    background-color: #e0e0e0;
  }

  .buttons button:disabled:hover,
  .buttons button.disabled:hover {
    background-color: #e0e0e0;
    color: initial;
  }

  /* Timeline styles */
  .timeline-wrapper {
    padding: 0.5vh 0 1.5vh 0;
  }

  .timeline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
    width: 100%;
  }

  .timeline-line {
    flex: 1;
    height: 2px;
    margin-top: calc(0.8vh + 1px);
    background-image: repeating-linear-gradient(
      to right,
      #ddd,
      #ddd 4px,
      transparent 4px,
      transparent 8px
    );
  }

  .timeline-line.available {
    background-image: none;
    background-color: #017e9f;
  }

  .timeline-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .timeline-marker:disabled {
    cursor: not-allowed;
  }

  .marker-dot {
    width: 1.6vh;
    height: 1.6vh;
    border-radius: 50%;
    background: #ddd;
    border: 2px solid #ddd;
    transition: all 0.2s ease;
  }

  .timeline-marker.available .marker-dot {
    background: white;
    border-color: #017e9f;
  }

  .timeline-marker.available:hover .marker-dot {
    background: rgba(1, 126, 159, 0.15);
  }

  .timeline-marker.selected .marker-dot {
    background: #017e9f;
    border-color: #017e9f;
    transform: scale(1.15);
  }

  .marker-label {
    margin-top: 0.5vh;
    font-size: 1.8vh;
    color: #aaa;
    font-weight: 400;
    transition: all 0.2s ease;
  }

  .timeline-marker.available .marker-label {
    color: #555;
  }

  .timeline-marker.selected .marker-label {
    color: #017e9f;
    font-weight: 500;
  }

  .disabled-tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    background: white;
    color: #666;
    font-size: 0.75em;
    padding: 6px 10px;
    border-radius: 6px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    border: 1px solid #e0e0e0;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 10;
  }

  .timeline-marker:disabled:hover .disabled-tooltip {
    opacity: 1;
    visibility: visible;
  }

  /* Mobile timeline styles */
  @media (max-width: 768px) {
    .timeline-wrapper {
      padding: 1vh 0 1.5vh 0;
    }

    .timeline-marker {
      min-width: auto;
    }

    .marker-dot {
      width: 2.5vh;
      height: 2.5vh;
      border-width: 2px;
    }

    .marker-label {
      font-size: 1.8vh;
      margin-top: 0.6vh;
    }

    .timeline-line {
      margin-top: calc(1.25vh + 1px);
      height: 2px;
    }
  }

  .first {
    margin-top: 4vh;
  }

  h2 {
    margin-top: 1vh;
    margin-bottom: 0.5vh;
    font-size: 2vh;
  }

  .theme-buttons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1vh;
  }

  .theme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.8vh 0.8vw;
    border: 2px solid transparent;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    opacity: 0.5;
    flex: 1;
    max-width: 30%;
  }

  .theme-btn:hover {
    background: rgba(1, 126, 159, 0.1);
    opacity: 0.8;
  }

  .theme-btn.active {
    background: rgba(1, 126, 159, 0.15);
    border-color: #017e9f;
    opacity: 1;
  }

  .themelogo {
    width: 2.2vw;
    min-width: 24px;
    height: auto;
  }

  .caption {
    font-size: 1.8vh;
    margin-top: 0.5vh;
    font-weight: 500;
    color: #333;
  }

  /* Mobile styles for theme buttons */
  @media (max-width: 768px) {
    .theme-buttons {
      gap: 2vw;
      margin-bottom: 1.5vh;
    }

    .theme-btn {
      padding: 1.2vh 1.5vw;
      border-radius: 10px;
      max-width: none;
    }

    .themelogo {
      width: 6vw;
      min-width: 24px;
    }

    .caption {
      font-size: 1.9vh;
      margin-top: 0.5vh;
    }
  }

  /* Scenario toggle styles */
  .scenario-section {
    display: flex;
    flex-direction: column;
    gap: 0.8vh;
    margin: 1.5vh 0 2vh 0;
  }

  .scenario-label {
    font-size: 1.8vh;
    font-weight: 500;
    color: #333;
  }

  .scenario-toggle {
    display: flex;
    align-items: stretch;
    background: #e8e8e8;
    border-radius: 8px;
    padding: 5px;
    width: 100%;
    margin-top: 0.5vh;
    gap: 5px;
  }

  .scenario-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6vh 0;
    margin: 0;
    border: none;
    border-radius: 5px;
    font-size: 1.8vh;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    background: transparent;
    color: #666;
  }

  .scenario-option:hover {
    background: rgba(255, 255, 255, 0.5);
    color: #333;
  }

  .scenario-option.active {
    background: #017e9f;
    color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  /* Mobile scenario styles */
  @media (max-width: 768px) {
    .scenario-label {
      font-size: 2.2vh;
    }

    .scenario-option {
      padding: 1.2vh 3vw;
      font-size: 2vh;
    }
  }

  .opacity-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-top: 2vh;
  }

  .opacity-icon {
    width: 2vh;
    height: 2vh;
    min-width: 16px;
    min-height: 16px;
    color: #555;
  }

  .opacity-value {
    margin-left: auto;
    font-size: 1.6vh;
    font-weight: 400;
    color: #017e9f;
    background: rgba(1, 126, 159, 0.1);
    padding: 0.2em 0.6em;
    border-radius: 4px;
  }

  .opacity-slider {
    padding-top: 0.5vh;
  }

  .opacity-slider input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    padding: 0px;
    border-radius: 9999px;
    height: 4px;
    background: #ddd;
    cursor: pointer;
  }

  .opacity-slider input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 2vh;
    height: 2vh;
    min-width: 16px;
    min-height: 16px;
    background-color: #017e9f;
    border-radius: 50%;
    border: 2px solid white;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.2s ease;
  }

  .opacity-slider input::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .opacity-slider input::-moz-range-thumb {
    width: 2vh;
    height: 2vh;
    min-width: 16px;
    min-height: 16px;
    background-color: #017e9f;
    border-radius: 50%;
    border: 2px solid white;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* Mobile opacity slider */
  @media (max-width: 768px) {
    .opacity-icon {
      width: 2.5vh;
      height: 2.5vh;
    }

    .opacity-value {
      font-size: 1.8vh;
    }

    .opacity-slider input {
      height: 6px;
    }

    .opacity-slider input::-webkit-slider-thumb {
      width: 3vh;
      height: 3vh;
    }

    .opacity-slider input::-moz-range-thumb {
      width: 3vh;
      height: 3vh;
    }
  }

</style>
