<script>
  import { scenario, time, category, selectedLayers, layerOpacity, layerTime, layerScenario, focusedLayer } from "$lib/stores.js"
  import { page } from "$app/stores"
  import { getCountryConfig } from "$lib/config/countries.js"
  import {
    hazardThemeLayerMap,
    hazardThemes,
    categories,
    impactLayers,
    solutionLayers,
    contextLayers,
    getCategoryLayers,
  } from "$lib/config/categories.js"
  import { createEventDispatcher } from "svelte"

  const dispatch = createEventDispatcher()

  // --- Selection helpers (selectedLayers = the layers shown/stacked on the map) ---
  /** @param {string} layer */
  function ensureOpacity(layer) {
    layerOpacity.update(o => (layer in o ? o : { ...o, [layer]: 1 }))
  }

  /** First available time period for a layer (fallback "Past"). @param {string} layer */
  function defaultTimeFor(layer) {
    const a = countryConfig?.layerAvailability?.[layer]
    return (a?.times && a.times[0]) || "Past"
  }

  /** Clamp a time to what the layer supports. @param {string} layer @param {string} t */
  function clampTime(layer, t) {
    const a = countryConfig?.layerAvailability?.[layer]
    return a?.times?.includes(t) ? t : defaultTimeFor(layer)
  }

  // Freeze the currently chosen year/scenario onto a layer when it is first shown/added.
  /** @param {string} layer */
  function freezeSettings(layer) {
    layerTime.update(m => (layer in m ? m : { ...m, [layer]: clampTime(layer, $time) }))
    layerScenario.update(m => (layer in m ? m : { ...m, [layer]: $scenario }))
  }

  // Click a layer name → show ONLY that layer (replaces the current view; clean browsing).
  /** @param {string} layer */
  function showLayer(layer) {
    ensureOpacity(layer)
    freezeSettings(layer)
    selectedLayers.set([layer])
    focusedLayer.set(layer)
  }

  // "+" → add/remove this layer to the comparison stack (keeps the others).
  /** @param {string} layer */
  function toggleCompare(layer) {
    if ($selectedLayers.includes(layer)) {
      selectedLayers.update(l => l.filter(x => x !== layer))
    } else {
      ensureOpacity(layer)
      freezeSettings(layer)
      selectedLayers.update(l => [...l, layer])
      focusedLayer.set(layer)
    }
  }

  /** @param {string} layer */
  function removeLayer(layer) {
    selectedLayers.update(l => l.filter(x => x !== layer))
  }

  /** @param {string} layer @param {number} v */
  function setLayerOpacity(layer, v) {
    layerOpacity.update(o => ({ ...o, [layer]: v }))
  }

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

  // Whether a layer is available for the current country
  $: isLayerAvailable = (/** @type {string} */ layer) =>
    countryConfig?.layerAvailability?.[layer] !== undefined

  // Top-level categories that have at least one available layer for this country
  $: availableCategories = categories.filter(cat =>
    getCategoryLayers(cat.id).some(isLayerAvailable)
  )

  // Hazard sub-themes (heat/drought/rain) with their available layers — drives the accordions.
  // Themes without any available layer for this country are dropped.
  $: hazardThemeOptions = hazardThemes
    .map(t => ({ ...t, iconSvg: /** @type {string|null} */ (null), layers: (hazardThemeLayerMap[t.id] || []).filter(isLayerAvailable) }))
    .filter(t => t.layers.length > 0)

  // All available hazard layers (flattened) — used for the valid-selection guard
  $: hazardLayers = hazardThemeOptions.flatMap(t => t.layers)

  // Context layers (Solution-category layers are shown separately below)
  $: contextLayerOptions = contextLayers.filter(isLayerAvailable)

  // Solution layers available for this country
  $: solutionLayerOptions = solutionLayers.filter(isLayerAvailable)

  // The layer the bottom time/scenario controls edit: the explicit focus if it's
  // still shown, otherwise the top (last) layer of the stack.
  $: focused = ($focusedLayer && $selectedLayers.includes($focusedLayer))
    ? $focusedLayer
    : ($selectedLayers[$selectedLayers.length - 1] || "")

  // Availability of the FOCUSED layer (drives the timeline + scenario controls)
  $: focusedAvail = countryConfig?.layerAvailability?.[focused] || { times: ["Past", "2050", "2080"], hasScenarios: true }

  $: isTimeAvailable = (/** @type {string} */ timeName) => focusedAvail.times.includes(timeName)

  // The focused layer's own time. Read from layerTime (set synchronously when the
  // layer is shown) rather than the global $time store, which lags by one cycle on
  // first focus because the sync block writes it via time.set() — a call Svelte's
  // compiler can't order ahead of this reactive, so $time would be stale here.
  $: focusedTime = focused ? ($layerTime[focused] ?? defaultTimeFor(focused)) : $time

  // Show scenarios if the focused layer has scenarios and we're on a future period
  $: showScenarios = focusedAvail.hasScenarios && (focusedTime === "2050" || focusedTime === "2080")

  // Filter impact (crop yield change) layers to those available for this country
  $: impactLayerOptions = impactLayers.filter(isLayerAvailable)

  // Layers visible in the list for the currently selected category
  $: visibleLayers =
    $category === "hazard" ? hazardLayers :
    $category === "impact" ? impactLayerOptions :
    $category === "solution" ? solutionLayerOptions :
    $category === "context" ? contextLayerOptions : []

  // Time periods offered in the timeline (for the focused layer)
  $: availableTimeOptions = options2.filter(opt => isTimeAvailable(opt.name))

  // Sync the global time/scenario controls to the focused layer's frozen settings
  // whenever the focus changes (so the bottom controls reflect that layer).
  let syncedFocus = /** @type {string|null} */ (null)
  $: if (focused && focused !== syncedFocus) {
    syncedFocus = focused
    const t = $layerTime[focused] ?? defaultTimeFor(focused)
    const sc = $layerScenario[focused] ?? "High"
    if ($time !== t) time.set(t)
    if ($scenario !== sc) scenario.set(sc)
    const ti = options2.find(o => o.name === t); if (ti) selectedTime = ti.id
    const si = options3.find(o => o.name === sc); if (si) selectedScenario = si.id
  }

  // If the focused layer doesn't support the current time, fall back to its first available
  $: if (focused && !isTimeAvailable($time)) {
    const first = availableTimeOptions[0]
    if (first) { selectedTime = first.id; time.set(first.name); layerTime.update(m => ({ ...m, [focused]: first.name })) }
  }

  // Keep the selected category valid for this country
  $: if (availableCategories.length && !availableCategories.some(c => c.id === $category)) {
    category.set(availableCategories[0].id)
  }

  // Inline icon for the Impact "Crop yield changes" accordion (a leaf/plant glyph)
  const cropIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z"/></svg>`

  // Accordion groups for the current category: Hazard → heat/drought/rain;
  // Impact → a single "Crop yield changes" group. Other categories have none (flat list).
  $: accordionGroups =
    $category === "hazard"
      ? hazardThemeOptions
      : $category === "impact" && impactLayerOptions.length
        ? [{ id: "cropyield", name: "Crop yield changes", icon: null, iconSvg: cropIconSvg, layers: impactLayerOptions }]
        : []

  // --- Accordion state (multiple groups may be open at once) ---
  let expandedThemes = /** @type {Record<string, boolean>} */ ({})
  let autoOpenedCategory = /** @type {string|null} */ (null)

  /** @param {string} id */
  function toggleTheme(id) {
    expandedThemes = { ...expandedThemes, [id]: !expandedThemes[id] }
  }

  // On entering a category, reveal its layers: open accordion groups that contain a
  // selected layer, or — if none are selected — the first group, so its options show.
  // (Once per category switch, so the user can still close them afterwards.)
  $: if ($category !== autoOpenedCategory) {
    autoOpenedCategory = $category
    const toOpen = /** @type {Record<string, boolean>} */ ({})
    for (const g of accordionGroups) {
      if (g.layers.some(l => $selectedLayers.includes(l))) toOpen[g.id] = true
    }
    if (Object.keys(toOpen).length === 0 && accordionGroups.length) {
      toOpen[accordionGroups[0].id] = true
    }
    if (Object.keys(toOpen).length) expandedThemes = { ...expandedThemes, ...toOpen }
  }

  export let selectedTime = 0
  export let selectedScenario = 1

  // "About this tool" overlay
  let showAbout = false

  // Move a node to <body> so a position:fixed overlay isn't trapped inside the
  // sidepanel wrapper (which uses a CSS transform → becomes the fixed containing block).
  /** @param {HTMLElement} node */
  function portal(node) {
    document.body.appendChild(node)
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node)
      },
    }
  }

  /**
   * @param {MouseEvent} event
   * @param {string} tooltipId - 'time' | 'scenario', or any id when `html` is given
   * @param {string|null} [html] - optional custom tooltip HTML (overrides the built-in content)
   */
  function showTooltip(event, tooltipId, html = null) {
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
      max-width: 220px;
      background-color: rgba(255, 255, 255, 0.98);
      color: #555;
      font-size: 10px;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.08);
      z-index: 999999999;
      pointer-events: none;
    `

    if (html) {
      tooltip.innerHTML = html
    } else if (tooltipId === 'time') {
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

    // Keep the tooltip inside the viewport: the buttons sit near the panel's
    // left edge, so a centered tooltip would otherwise spill off-screen. Drop
    // the centering transform and clamp left/top to the visible area; flip
    // above the trigger if there isn't room below.
    const margin = 8
    const ttRect = tooltip.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    let left = centerX - ttRect.width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - ttRect.width - margin))
    let top = rect.bottom + 4
    if (top + ttRect.height > window.innerHeight - margin) {
      top = rect.top - ttRect.height - 4
    }
    top = Math.max(margin, top)
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.transform = 'none'
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
    if (found) {
      $time = found.name
      if (focused) layerTime.update(m => ({ ...m, [focused]: found.name }))
    }
  }

  /** @param {Event} e */
  function setSelectedScenario(e) {
    const target = /** @type {HTMLButtonElement} */ (e.target)
    const newValue = Number(target.value)
    selectedScenario = newValue
    dispatch("change", { value: newValue })
    const found = options3.find((x) => x.id === selectedScenario)
    if (found) {
      $scenario = found.name
      if (focused) layerScenario.update(m => ({ ...m, [focused]: found.name }))
    }
  }

</script>

<section>
  <div class="app-header">
    <h1 class="app-title">Climate Impact Atlas</h1>
    <button
      class="about-btn"
      on:click={() => showAbout = true}
      aria-label="About this tool"
      title="About this tool"
    >i</button>
  </div>
  <p class="app-tagline">
    Explore climate hazards, impacts and adaptation solutions{countryConfig?.name ? ` for ${countryConfig.name}` : ""}.
  </p>

  <div class="theme-buttons category-buttons">
    {#each availableCategories as cat}
      <button
        class="theme-btn category-btn"
        class:active={$category === cat.id}
        on:click={() => category.set(cat.id)}
        on:mouseenter={(e) => showTooltip(e, cat.id, cat.description)}
        on:mouseleave={hideTooltip}>
        <span class="caption">{cat.name}</span>
      </button>
    {/each}
  </div>

  {#if accordionGroups.length}
    {#each accordionGroups as t}
      {@const groupSelected = t.layers.filter(l => $selectedLayers.includes(l))}
      <button
        class="accordion-header"
        on:click={() => toggleTheme(t.id)}
        aria-expanded={expandedThemes[t.id] === true}
      >
        <span class="collapse-icon" class:expanded={expandedThemes[t.id]}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        {#if t.icon}
          <img class="accordion-icon" src={t.icon} alt="" />
        {:else if t.iconSvg}
          <span class="accordion-icon accordion-icon-svg">{@html t.iconSvg}</span>
        {/if}
        <span class="accordion-title" class:active={groupSelected.length > 0}>{t.name}</span>
        {#if !expandedThemes[t.id] && groupSelected.length}
          <span class="accordion-selected">{groupSelected.join(', ')}</span>
        {/if}
      </button>
      {#if expandedThemes[t.id]}
        <div class="accordion-content">
          {#each t.layers as option}
            <div class="keuzes" class:selected={$selectedLayers.includes(option)}>
              <button class="layer-name-btn" on:click={() => showLayer(option)}>{option}</button>
              <button
                class="layer-add-btn"
                class:added={$selectedLayers.includes(option)}
                on:click|stopPropagation={() => toggleCompare(option)}
                title={$selectedLayers.includes(option) ? "In comparison — click to remove" : "Add to comparison"}
                aria-label={$selectedLayers.includes(option) ? `Remove ${option} from comparison` : `Add ${option} to comparison`}
              >{$selectedLayers.includes(option) ? "✓" : "+"}</button>
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  {:else}
    {#each visibleLayers as option}
      <div class="keuzes" class:selected={$selectedLayers.includes(option)}>
        <button class="layer-name-btn" on:click={() => showLayer(option)}>{option}</button>
        <button
          class="layer-add-btn"
          class:added={$selectedLayers.includes(option)}
          on:click|stopPropagation={() => toggleCompare(option)}
          title={$selectedLayers.includes(option) ? "In comparison — click to remove" : "Add to comparison"}
          aria-label={$selectedLayers.includes(option) ? `Remove ${option} from comparison` : `Add ${option} to comparison`}
        >{$selectedLayers.includes(option) ? "✓" : "+"}</button>
      </div>
    {/each}
  {/if}

  {#if availableTimeOptions.length > 1}
    <h2 style="display: inline-flex; align-items: center; gap: 0.5em; margin-top: 2vh;">
      Time period
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
        on:click={() => { selectedScenario = 0; scenario.set('Low'); if (focused) layerScenario.update(m => ({ ...m, [focused]: 'Low' })); }}
      >Low</button>
      <button
        class="scenario-option"
        class:active={selectedScenario === 1}
        on:click={() => { selectedScenario = 1; scenario.set('High'); if (focused) layerScenario.update(m => ({ ...m, [focused]: 'High' })); }}
      >High</button>
    </div>
  {/if}
  {#if $selectedLayers.length}
    <div class="active-layers-panel">
    <h2 class="opacity-header">Active layers</h2>
    <div class="active-layers">
      {#each $selectedLayers.slice().reverse() as layer (layer)}
        {@const op = $layerOpacity[layer] ?? 1}
        {@const lt = $layerTime[layer] ?? defaultTimeFor(layer)}
        {@const lsc = $layerScenario[layer] ?? 'High'}
        {@const lAvail = countryConfig?.layerAvailability?.[layer]}
        {@const lShowSc = lAvail?.hasScenarios && (lt === '2050' || lt === '2080')}
        <div class="active-layer" class:focused={focused === layer}>
          <div class="active-layer-row">
            <button
              class="active-layer-name"
              title="Edit year / scenario for {layer}"
              on:click={() => focusedLayer.set(layer)}
            >{layer}</button>
            <button
              class="active-layer-remove"
              on:click={() => removeLayer(layer)}
              aria-label="Remove {layer}"
              title="Remove layer"
            >×</button>
          </div>
          <div class="active-layer-meta">
            {lt}{#if lShowSc} · {lsc}{/if}
          </div>
          <div class="active-layer-opacity">
            <svg class="transparency-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </svg>
            <span class="transparency-label">Transparency</span>
            <div class="opacity-slider transparency-slider-wrap">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={op}
                on:input={(e) => setLayerOpacity(layer, +e.currentTarget.value)}
                aria-label="Transparency for {layer}"
                style="background: linear-gradient(to right, #017E9F 0%, #017E9F {op * 100}%, #ddd {op * 100}%);" />
            </div>
            <span class="opacity-value transparency-value">{Math.round(op * 100)}%</span>
          </div>
        </div>
      {/each}
    </div>
    </div>
  {/if}
</section>

{#if showAbout}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="about-overlay" use:portal on:click={() => showAbout = false}>
    <div class="about-card" on:click|stopPropagation role="dialog" tabindex="-1" aria-label="About this tool">
      <button class="about-close" on:click={() => showAbout = false} aria-label="Close">×</button>
      <h2 class="about-heading">Climate Impact Atlas</h2>
      <p>
        This atlas shows how climate change affects{countryConfig?.name ? ` ${countryConfig.name}` : " the region"},
        and what can be done about it. Explore the data through four lenses:
      </p>
      <ul class="about-list">
        <li><strong>Hazard</strong> — climate threats such as heat, drought and extreme rainfall.</li>
        <li><strong>Impact</strong> — consequences of these hazards, e.g. changes in crop yields.</li>
        <li><strong>Solution</strong> — adaptation measures and where they are suitable.</li>
        <li><strong>Context</strong> — background data that helps interpret the maps.</li>
      </ul>
      <p class="about-note">
        Use the <strong>time period</strong> and <strong>emissions scenario</strong> controls to
        compare observed data with future projections under low and high emissions.
      </p>
    </div>
  </div>
{/if}

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

    .keuzes {
      font-size: 2.2vh !important;
      gap: 2.5vw !important;
      margin-bottom: 0.2vh !important;
      padding: 0.9vh 2.5vw !important;
      margin-left: -2.5vw !important;
      border-radius: 8px !important;
    }

    .layer-add-btn {
      width: 3vh !important;
      height: 3vh !important;
      min-width: 24px !important;
      min-height: 24px !important;
      font-size: 2vh !important;
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

  .keuzes {
    display: flex;
    align-items: center;
    gap: 0.4em;
    transition: all 0.2s ease-in-out;
    font-size: 1.8vh;
    padding: 0.3vh 1vw;
    margin: 0.2vh 0;
    border-radius: 8px;
    margin-left: -1vw;
  }

  .keuzes:hover {
    background-color: rgba(1, 126, 159, 0.1);
  }

  /* Layer name — click to show only this layer */
  .layer-name-btn {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: none;
    padding: 0.3vh 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  /* "+" / "✓" — add this layer to the comparison (keeps the others) */
  .layer-add-btn {
    flex-shrink: 0;
    width: 1.9vh;
    height: 1.9vh;
    min-width: 17px;
    min-height: 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 50%;
    background: transparent;
    color: #888;
    font-size: 1.5vh;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s;
  }

  .layer-add-btn:hover {
    border-color: #017e9f;
    color: #017e9f;
    background: rgba(1, 126, 159, 0.08);
  }

  .layer-add-btn.added {
    background: #017e9f;
    border-color: #017e9f;
    color: #fff;
  }

  /* Info icon for headers */
  .layer-info-hint {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* Scale with the h2 headings (2vh) on large screens; px floor keeps small
       screens unchanged. */
    width: max(14px, 1.6vh);
    height: max(14px, 1.6vh);
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    font-family: Georgia, serif;
    font-size: max(10px, 1.1vh);
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

  /* App title + tagline */
  .app-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-top: 4vh;
  }

  .app-title {
    margin: 0;
    font-size: 2.6vh;
    font-weight: 700;
    color: #017e9f;
  }

  .app-tagline {
    margin: 0.4vh 0 0 0;
    font-size: 1.6vh;
    line-height: 1.4;
    color: #666;
  }

  .about-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    /* Scale with the title (2.6vh) on large screens; px floor keeps small
       screens unchanged. */
    width: max(18px, 2vh);
    height: max(18px, 2vh);
    background-color: rgba(0, 0, 0, 0.08);
    border: none;
    border-radius: 50%;
    font-family: Georgia, serif;
    font-size: max(12px, 1.3vh);
    font-weight: 500;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }

  .about-btn:hover {
    background-color: #017e9f;
    color: white;
  }

  /* About overlay */
  .about-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000000000;
    padding: 5vw;
  }

  .about-card {
    position: relative;
    max-width: 420px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    background: #fff;
    border-radius: 12px;
    padding: 24px 26px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    font-size: 14px;
    line-height: 1.5;
    color: #333;
  }

  .about-card p {
    margin: 0 0 12px 0;
  }

  .about-close {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    color: #999;
    cursor: pointer;
  }

  .about-close:hover {
    color: #333;
  }

  .about-heading {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: #017e9f;
  }

  .about-list {
    margin: 0 0 12px 0;
    padding-left: 1.1em;
  }

  .about-list li {
    margin-bottom: 6px;
  }

  .about-list strong {
    color: #017e9f;
  }

  .about-note {
    font-size: 13px;
    color: #666;
  }

  /* Top-level category buttons (4 across, text only) */
  .category-buttons {
    gap: 0.5vw;
    margin-top: 1.5vh;
    margin-bottom: 2vh;
  }

  .category-btn {
    max-width: none;
    padding: 0.9vh 0.4vw;
    min-height: 4.5vh;
  }

  .category-btn .caption {
    margin-top: 0;
  }

  /* Hazard theme accordions */
  .accordion-header {
    display: flex;
    align-items: center;
    gap: 0.45em;
    width: 100%;
    background: none;
    border: none;
    padding: 0.6vh 0;
    margin-top: 0.6vh;
    cursor: pointer;
    text-align: left;
  }

  .accordion-header:hover .accordion-title {
    color: #017e9f;
  }

  /* Title of the theme that holds the currently selected layer */
  .accordion-title.active {
    color: #017e9f;
  }

  /* Selected layer shown in a collapsed accordion header */
  .accordion-selected {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 1.5vh;
    font-weight: 500;
    color: #017e9f;
    opacity: 0.85;
  }

  .accordion-selected::before {
    content: "·";
    margin: 0 0.4em 0 0.1em;
    color: #aaa;
  }

  .accordion-icon {
    width: 1.25vw;
    min-width: 15px;
    height: auto;
    /* Muted/monochrome so the icons read as subtle cues, not eye-catchers */
    filter: grayscale(1);
    opacity: 0.45;
    transition: opacity 0.2s ease;
  }

  .accordion-header:hover .accordion-icon {
    opacity: 0.7;
  }

  /* Inline-SVG variant (e.g. Crop yield changes) — matches the muted icon look */
  .accordion-icon-svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    min-width: 13px;
    color: #555;
  }

  .accordion-icon-svg :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .accordion-title {
    font-size: 1.9vh;
    font-weight: 600;
    color: #333;
    transition: color 0.2s ease;
  }

  .collapse-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.6vh;
    height: 1.6vh;
    min-width: 13px;
    min-height: 13px;
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

  .accordion-content {
    padding: 0.2vh 0 0.4vh 1.6vw;
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

    .accordion-icon {
      width: 5.5vw;
      min-width: 20px;
    }

    .accordion-title {
      font-size: 2.2vh;
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

  /* Shaded card that groups the active layers + their transparency controls */
  .active-layers-panel {
    margin-top: 2vh;
    padding: 1vh 1vw 1.2vh 1vw;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 10px;
  }

  .active-layers-panel .opacity-header {
    margin-top: 0;
    margin-bottom: 0.5vh;
  }

  /* Active layers list (per-layer opacity + remove) */
  .active-layers {
    display: flex;
    flex-direction: column;
    gap: 0.8vh;
    padding-top: 0.5vh;
  }

  .active-layer {
    border-left: 3px solid rgba(1, 126, 159, 0.35);
    padding-left: 0.6vw;
    transition: border-color 0.15s;
  }

  /* The layer whose year/scenario the bottom controls currently edit */
  .active-layer.focused {
    border-left-color: #017e9f;
  }

  .active-layer-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  .active-layer-name {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    font-size: 1.6vh;
    color: #333;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .active-layer-name:hover {
    color: #017e9f;
  }

  /* Per-layer year · scenario line */
  .active-layer-meta {
    font-size: 1.3vh;
    color: #017e9f;
    font-weight: 500;
    margin: 0.1vh 0 0.2vh 0;
  }

  .active-layer-remove {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #b3b3b3;
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s;
  }

  .active-layer-remove:hover {
    background: rgba(217, 83, 79, 0.12);
    color: #d9534f;
  }

  /* Per-layer transparency control: icon + label + slider + value on one row */
  .active-layer-opacity {
    display: flex;
    align-items: center;
    gap: 0.45em;
    margin-top: 0.4vh;
  }

  .transparency-icon {
    width: 14px;
    height: 14px;
    min-width: 14px;
    color: #aaa;
    flex-shrink: 0;
  }

  .transparency-label {
    font-size: 1.3vh;
    color: #777;
    flex-shrink: 0;
  }

  .transparency-slider-wrap {
    flex: 1;
    min-width: 0;
    padding-top: 0 !important;
  }

  .transparency-value {
    margin-left: 0;
    flex-shrink: 0;
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
