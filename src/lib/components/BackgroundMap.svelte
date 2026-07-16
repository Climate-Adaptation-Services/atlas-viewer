<script>
  import { browser } from "$app/environment"
  import { onMount } from "svelte"
  import { get } from "svelte/store"
  import { page } from "$app/stores"
  import { selectedLayers, layerOpacity, layerTime, layerScenario } from "$lib/stores.js"
  import MapPopup from "./MapPopup.svelte"
  import Legend from "./Legend.svelte"
  import { getCountryConfig } from "$lib/config/countries.js"
  import { styleGeoJsonFeature, getLegendItems } from "$lib/utils/geojsonStyles.js"
  import { isContextLayer, getContextLayerConfig, getAezColor } from "$lib/config/contextLayers.js"
  import { isGeojsonLayer, getGeojsonLayerConfig, getGeojsonLayerUrl } from "$lib/config/geojsonLayers.js"

  /** @type {any} */
  let map
  /** @type {any} */
  let esri
  /** @type {Record<string, any>} */
  let wmsLayers = {}
  // Multi-layer render engine state:
  /** Cache of built layers keyed by signature. @type {Record<string, {layer:any, restyle:(op:number)=>void}>} */
  let layerCache = {}
  /** Currently-on-map layers keyed by layer name. @type {Record<string, {layer:any, restyle:(op:number)=>void}>} */
  let renderedLayers = {}
  /** Signature (name|time|scenario) of each rendered layer, to detect stale renders. @type {Record<string, string>} */
  let renderedSig = {}
  /** Names with an in-flight load, to avoid duplicate concurrent fetches. @type {Set<string>} */
  let loadingNames = new Set()
  /** @type {any} */
  let L
  /** @type {any} */
  let countryConfig
  /** @type {boolean} */
  let isLoading = false
  /** @type {{ layer: string } | null} Set when a layer load fails after all retries; drives the error banner. */
  let loadError = null
  // Monotonic counter bumped on every reactive (re)load; lets a late-resolving
  // stale fetch detect that a newer request has superseded it.
  let loadToken = 0
  // Bumped by the "Try again" button to re-trigger the load reactive block.
  let retryNonce = 0

const variableBases = ["tmax", "tmin", "tavg", "precip_total", "daysabove20", "drydays"];
const scenarios = ["low", "high"];

const variableNames = [
  ...variableBases.map(v => `${v}_hist`),
  ...variableBases.flatMap(v =>
    ["2050", "2080"].flatMap(year =>
      scenarios.map(scenario => `${v}_${year}_${scenario}`)
    )
  )
];

/** @type {Record<string, string>} */
const baseLayerCodes = {
  "Maximum temperature": "tmax",
  "Minimum temperature": "tmin",
  "Average temperature": "tavg",
  "Total rainfall": "precip",
  "Days above 20 mm": "daysabove20",
  "Dry spells": "drydays",
  "Days above 35°C": "daysabove35C"
}

/**
 * Create the actual layer name dynamically
 * @param {string} datalaag - Selected data layer
 * @param {string} time - Selected time period
 * @param {string} scenario - Selected scenario
 * @returns {string|null} Layer ID or null if invalid parameters
 */
function getLayerId(datalaag, time, scenario) {
  // Check if datalaag is a valid key in our lookup object
  if (!datalaag || typeof datalaag !== 'string') {
    return null;
  }
  
  const base = baseLayerCodes[datalaag];
  if (!base) return null;

  // Normalize time value for consistent handling
  const timeNormalized = time ? time.toLowerCase() : '';
  
  // Accept various terms for historical data
  if (timeNormalized === "hist" || timeNormalized === "past" || timeNormalized === "current") {
    return `${base}_hist`;
  } else if (timeNormalized === "2050" || timeNormalized === "2080") {
    // Accept both "Low"/"low" and "High"/"high"
    const scenarioCode = (scenario || "high").toLowerCase();
    return `${base}_${timeNormalized}_${scenarioCode}`;
  }
  return null;
}

  /**
   * Function to safely get the legend unit based on the data layer
   * @param {string} dataLayer - The data layer name
   * @returns {string} The unit for the data layer or empty string if not found
   */
  function getLegendUnit(dataLayer) {
    /** @type {Record<string, string>} */
    const units = {
      "Maximum temperature": "°C",
      "Minimum temperature": "°C",
      "Average temperature": "°C",
      "Total rainfall": "mm/year",
      "Days above 20 mm": "days/year",
      "Dry spells": "spells/year",
      "Days above 35°C": "days/year"
    };
    
    return dataLayer && typeof dataLayer === 'string' && dataLayer in units ? 
      units[dataLayer] : '';
  }

  // Get country code from URL parameters
  $: countryCode = $page.url.searchParams.get('country') || 'zimbabwe';
  $: countryConfig = getCountryConfig(countryCode);

  // One legend descriptor per active layer (top layer first), for the stacked Legend.
  // Each carries the layer's own time/scenario so its legend matches what's drawn.
  $: legendDescriptors = $selectedLayers
    .filter(l => countryConfig?.layerAvailability?.[l] !== undefined)
    .map(name => {
      const lTime = timeOf($layerTime, name);
      const lScenario = scenOf($layerScenario, name);
      return {
        name,
        dataType: isContextLayer(name) ? 'context' : countryConfig?.dataType,
        legendLayerId: getLayerId(name, lTime, lScenario),
        legendUrl: getContextLayerConfig(name)?.legendUrl ?? null,
        time: lTime,
        scenario: lScenario,
      };
    })
    .reverse();
  

  
  onMount(async () => {
    try {
      // Load Leaflet and Esri-Leaflet dynamically to avoid SSR issues
      L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      esri = await import("esri-leaflet")
    } catch (error) {
      console.error("Error loading map libraries:", error);
    }
  })

  /**
   * Function to get a GeoJSON URL for a specific layer, time and scenario
   * @param {string} baseCode - Base variable code (e.g. 'tmax')
   * @param {string} time - Time period ('Current', '2050', '2080')
   * @param {string} scenario - Scenario ('low', 'high')
   * @returns {string|null} GeoJSON URL or null if invalid time
   */
  function getGeoJsonUrl(baseCode, time, scenario) {
    let filename;
    
    // Convert time to filename format
    if (time === "hist" || time === "Past" || time === "Current") {
      filename = `${baseCode}_hist.geojson`;
    } else if (time === "2050" || time === "2080") {
      const scenarioCode = (scenario || "high").toLowerCase();
      filename = `${baseCode}_${time}_${scenarioCode}.geojson`;
    } else {
      return null;
    }
    
    return `${countryConfig.geojsonBaseUrl}${filename}`;
  }

  /** Per-layer opacity (defaults to 1). @param {string} name */
  function getOpacity(name) {
    const o = $layerOpacity[name];
    return (o === undefined || o === null) ? 1 : o;
  }

  /** A point-type context layer (circle markers — kept on top of the stack). @param {string} name */
  function isPointLayer(name) {
    return isContextLayer(name) && getContextLayerConfig(name)?.type === 'point';
  }

  /** Whether a layer's data/style depends on the global time/scenario. @param {string} name */
  function isTimeSensitive(name) {
    if (isContextLayer(name)) return name.toLowerCase() === 'urban population';
    if (isGeojsonLayer(name)) return !!(/** @type {any} */ (getGeojsonLayerConfig(name))?.supportsTimeScenario);
    return baseLayerCodes[name] !== undefined; // climate layers
  }

  /** Cache/identity key for a layer at a given time/scenario. @param {string} name @param {string} time @param {string} scenario */
  function layerSignature(name, time, scenario) {
    return isTimeSensitive(name) ? `${name}|${time}|${scenario}` : name;
  }

  /**
   * Fetch JSON with a couple of retries and short linear backoff. Accepts one
   * URL or an ordered list of fallback URLs (each tried in turn per round).
   * Throws once every URL has failed on every attempt — callers surface that as
   * a visible error instead of a silently blank map.
   * @param {string|string[]} urls
   * @param {{retries?: number, backoffMs?: number}} [opts]
   * @returns {Promise<any>}
   */
  async function fetchJsonWithRetry(urls, { retries = 2, backoffMs = 400 } = {}) {
    const candidates = Array.isArray(urls) ? urls : [urls];
    /** @type {any} */
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { cache: 'no-store' });
          if (response.ok) return await response.json();
          lastError = new Error(`HTTP ${response.status} for ${candidate}`);
        } catch (err) {
          lastError = err;
        }
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
    throw lastError ?? new Error('Fetch failed');
  }

  /**
   * Load a climate or configured-GeoJSON layer by name, styled for the given
   * time/scenario and the layer's own opacity.
   * @param {string} layerName
   * @param {string} time
   * @param {string} scenario
   * @returns {Promise<{layer:any, restyle:(op:number)=>void}|null>}
   */
  async function loadGeoJsonLayer(layerName, time, scenario) {
    const normalizedTime = time ? time.toLowerCase() : 'past';

    // Configured GeoJSON layer (River Flood, Water Stress, Crop yield change)
    if (isGeojsonLayer(layerName)) {
      const config = getGeojsonLayerConfig(layerName);
      if (!config) return null;
      const baseUrl = getGeojsonLayerUrl(layerName, time, scenario, countryConfig);
      if (!baseUrl) throw new Error(`No URL configured for ${layerName}`);
      const data = await fetchJsonWithRetry(baseUrl);
      /** @param {number} op */
      const styleFor = (op) => (/** @type {any} */ feature) => {
        const base = config.getStyle(feature, time, scenario);
        return { ...base, opacity: (base.opacity ?? 1) * op, fillOpacity: op };
      };
      const layer = L.geoJSON(data, { style: styleFor(getOpacity(layerName)), interactive: config.interactive });
      return { layer, restyle: (op) => layer.setStyle(styleFor(op)) };
    }

    // Standard climate layer
    const baseCode = baseLayerCodes[layerName];
    if (!baseCode) return null;
    const url = getGeoJsonUrl(baseCode, time, scenario);
    if (!url) return null;
    const data = await fetchJsonWithRetry(url);
    /** @param {number} op */
    const styleFor = (op) => (/** @type {any} */ feature) =>
      styleGeoJsonFeature(feature, layerName, op, normalizedTime);
    const layer = L.geoJSON(data, {
      style: styleFor(getOpacity(layerName)),
      interactive: false, // clicks pass through; MapPopup handles them
      onEachFeature: (/**@type {any}*/ feature) => {
        if (feature?.properties?.value !== undefined) feature._value = feature.properties.value;
      }
    });
    return { layer, restyle: (op) => layer.setStyle(styleFor(op)) };
  }

  /**
   * Function to get the appropriate context layer filename based on time period
   * @param {string} layerName - Base name of the context layer
   * @param {string} time - Current time period
   * @param {string} scenario - Scenario (low/high)
   * @returns {string} Full filename for the context layer
   */
  function getContextLayerFilename(layerName, time, scenario) {
    if (layerName.toLowerCase() === 'urban population') {
      // Map time periods to population data years. The country code in the
      // filename varies per country (ken/gha/…); default to 'ken'.
      const code = countryConfig?.africapolisCode || 'ken';
      const timeNormalized = time ? time.toLowerCase() : 'past';
      const year = (timeNormalized === '2050' || timeNormalized === '2080') ? '2050' : '2025';
      return `africapolis_agglomerations_${code}_${year}.geojson`;
    }
    if (layerName.toLowerCase() === 'livestock density') {
      return 'kenya_livestock_tlu.geojson';
    }
    if (layerName.toLowerCase() === 'agroclimatic zones') {
      // Per-country file, resolved against the country's bucket by the loader.
      return countryConfig?.agroZonesFilename || 'kenya_dissolved.geojson';
    }
    // For other context layers in the future
    return `${layerName}.geojson`;
  }

  /**
   * Get population circle style based on population value
   * @param {number} population - Population value
   * @returns {{color: string, radius: number}} Style object with color and radius
   */
  function getPopulationStyle(population) {
    // Population ranges and colors matching Africapolis
    // Based on the legend in the screenshot
    if (population >= 10000000) {
      return { color: '#FFF4CC', radius: 30 }; // Above 10M - lightest yellow
    } else if (population >= 3000000) {
      return { color: '#FFE699', radius: 26 }; // 3-10M
    } else if (population >= 1000000) {
      return { color: '#FFD966', radius: 22 }; // 1-3M
    } else if (population >= 300000) {
      return { color: '#F4B183', radius: 18 }; // 300K-1M - light orange
    } else if (population >= 100000) {
      return { color: '#E07C7C', radius: 14 }; // 100K-300K - salmon
    } else if (population >= 30000) {
      return { color: '#C55A5A', radius: 10 }; // 30K-100K - medium red
    } else {
      return { color: '#8B3A3A', radius: 6 }; // 10K-30K - dark red
    }
  }

  /**
   * Get water stress style based on stress category
   * @param {number} bws_cat - Water stress category (0-4)
   * @returns {string} Color for the stress level
   */
  function getWaterStressColor(bws_cat) {
    // Aqueduct color scheme: yellow (low stress) to red (high stress)
    const colors = {
      '-1': '#d1d1d1', // Arid and low water use - light gray
      0: '#ffffbe', // Low - pale yellow
      1: '#fed976', // Low-Medium - darker yellow
      2: '#f47b50', // Medium-High - orange
      3: '#d8392c', // High - red
      4: '#a41f35' // Extremely High - dark red
    };
    return colors[bws_cat] !== undefined ? colors[bws_cat] : '#d1d1d1';
  }

  /**
   * Get AEZ (Agro-Ecological Zone) color for the active country. Palettes live
   * in contextLayers.js so the map fill and the legend share one source.
   * @param {string} aezName - AEZ zone name
   * @returns {string} Color for the zone
   */
  function getAEZColor(aezName) {
    return getAezColor(countryCode, aezName);
  }

  /**
   * Get livestock-density choropleth color (TLU per km²). Sequential purple
   * scale, quantile-aligned class breaks; null/no-data -> light gray.
   * @param {number|null|undefined} density - Total Livestock Units per km²
   * @returns {string} Hex color
   */
  function getLivestockColor(density) {
    if (density === null || density === undefined || isNaN(density)) return '#d1d1d1';
    if (density < 25) return '#f2f0f7';
    if (density < 50) return '#dadaeb';
    if (density < 75) return '#bcbddc';
    if (density < 100) return '#9e9ac8';
    if (density < 125) return '#756bb1';
    return '#54278f';
  }

  /**
   * Load a context layer (population, agroclimatic zones, WMS overlays) styled
   * for the given time and the layer's own opacity.
   * @param {string} layerName
   * @param {string} time
   * @param {string} scenario
   * @returns {Promise<{layer:any, restyle:(op:number)=>void}|null>}
   */
  async function loadContextLayer(layerName, time, scenario) {
    if (!layerName || !countryConfig) return null;
    const layerConfig = getContextLayerConfig(layerName);

    // WMS context overlays (e.g. Bunds, Tree cover) — raster tiles.
    if (layerConfig?.type === "wms") {
      const layer = L.tileLayer.wms(layerConfig.wmsEndpoint, {
        layers: layerConfig.wmsLayer,
        styles: layerConfig.wmsStyle || "",
        format: "image/png",
        transparent: true,
        version: layerConfig.wmsVersion || "1.3.0",
        opacity: getOpacity(layerName),
        attribution: layerConfig.attribution || "WMS Layer",
      });
      return { layer, restyle: (op) => layer.setOpacity(op) };
    }

    /** @type {string[]} */
    let candidateUrls;
    if (layerConfig?.url) {
      candidateUrls = [layerConfig.url];
    } else {
      const filename = getContextLayerFilename(layerName, time, scenario);
      candidateUrls = [`/${filename}`];
      if (countryConfig.geojsonBaseUrl) candidateUrls.push(`${countryConfig.geojsonBaseUrl}${filename}`);
    }
    const data = await fetchJsonWithRetry(candidateUrls);

    if (layerName.toLowerCase() === 'urban population') {
      const timeNormalized = time ? time.toLowerCase() : 'past';
      const popProperty = (timeNormalized === '2050' || timeNormalized === '2080') ? 'Population_2050' : 'Population_2025';
      const layer = L.geoJSON(data, {
        pointToLayer: (/** @type {any} */ feature, /** @type {any} */ latlng) => {
          const pop = feature.properties?.[popProperty] || 0;
          const style = getPopulationStyle(pop);
          const op = getOpacity(layerName);
          return L.circleMarker(latlng, {
            radius: style.radius, fillColor: style.color, color: '#333333',
            weight: 0.5, opacity: 0.8 * op, fillOpacity: 0.7 * op
          });
        },
        interactive: false
      });
      return { layer, restyle: (op) => layer.setStyle({ opacity: 0.8 * op, fillOpacity: 0.7 * op }) };
    }

    if (layerName.toLowerCase() === 'agroclimatic zones') {
      /** @param {number} op */
      const styleFor = (op) => (/** @type {any} */ feature) => ({
        // Kenya's file keys zones on AEZ_Name, Ghana's on Name.
        fillColor: getAEZColor(feature.properties?.AEZ_Name ?? feature.properties?.Name ?? ''),
        weight: 1, opacity: 1, color: '#333333', fillOpacity: 0.7 * op
      });
      const layer = L.geoJSON(data, { style: styleFor(getOpacity(layerName)), interactive: false });
      return { layer, restyle: (op) => layer.setStyle(styleFor(op)) };
    }

    if (layerName.toLowerCase() === 'livestock density') {
      // County choropleth painted on admin2 polygons: every constituency in a
      // county shares one density value, so internal borders are hidden (weight 0)
      // to read as solid county blocks.
      /** @param {number} op */
      const styleFor = (op) => (/** @type {any} */ feature) => ({
        fillColor: getLivestockColor(feature.properties?.tlu_density),
        weight: 0, opacity: 0, color: 'transparent', fillOpacity: op
      });
      const layer = L.geoJSON(data, { style: styleFor(getOpacity(layerName)), interactive: false });
      return { layer, restyle: (op) => layer.setStyle(styleFor(op)) };
    }

    /** @param {number} op */
    const styleFor = (op) => ({ fillColor: "#888888", weight: 1, opacity: 1, color: '#666666', fillOpacity: 0.3 * op });
    const layer = L.geoJSON(data, { style: styleFor(getOpacity(layerName)), interactive: false });
    return { layer, restyle: (op) => layer.setStyle(styleFor(op)) };
  }

  /**
   * Dispatch to the right loader for any layer name, with a signature-keyed cache.
   * @param {string} name @param {string} time @param {string} scenario
   * @returns {Promise<{layer:any, restyle:(op:number)=>void}|null>}
   */
  async function loadAnyLayer(name, time, scenario) {
    const sig = layerSignature(name, time, scenario);
    if (layerCache[sig]) { layerCache[sig].restyle(getOpacity(name)); return layerCache[sig]; }

    /** @type {{layer:any, restyle:(op:number)=>void}|null} */
    let result = null;
    if (isContextLayer(name)) {
      result = await loadContextLayer(name, time, scenario);
    } else if (isGeojsonLayer(name)) {
      result = await loadGeoJsonLayer(name, time, scenario);
    } else if (countryConfig?.dataType === "wms") {
      // Pre-created WMS climate layer (e.g. Zimbabwe)
      const layerId = getLayerId(name, time, scenario);
      const layer = layerId ? wmsLayers[layerId] : null;
      if (layer) { layer.setOpacity(getOpacity(name)); result = { layer, restyle: (op) => layer.setOpacity(op) }; }
    } else {
      result = await loadGeoJsonLayer(name, time, scenario);
    }
    if (result) layerCache[sig] = result;
    return result;
  }

  /**
   * Reconcile the rendered layers with the current selection / time / scenario.
   * Adds new layers, removes deselected/stale ones, applies per-layer opacity and stacking order.
   */
  /** Per-layer time, falling back to the layer's first available period. @param {Record<string,string>} lt @param {string} n */
  function timeOf(lt, n) {
    return lt[n] ?? countryConfig?.layerAvailability?.[n]?.times?.[0] ?? "Past";
  }
  /** Per-layer scenario. @param {Record<string,string>} lsc @param {string} n */
  function scenOf(lsc, n) {
    return lsc[n] ?? "High";
  }

  /** @param {string[]} snapLayers @param {Record<string,string>} snapLT @param {Record<string,string>} snapLSC */
  async function syncLayers(snapLayers, snapLT, snapLSC) {
    if (!map || !L || !countryConfig) return;
    const desired = snapLayers.filter(l => countryConfig.layerAvailability?.[l] !== undefined);
    /** @param {string} n */
    const sigOf = (n) => layerSignature(n, timeOf(snapLT, n), scenOf(snapLSC, n));

    // Remove layers no longer wanted, or whose time/scenario signature changed.
    for (const name of Object.keys(renderedLayers)) {
      if (!desired.includes(name) || renderedSig[name] !== sigOf(name)) {
        const e = renderedLayers[name];
        if (e?.layer && map.hasLayer(e.layer)) map.removeLayer(e.layer);
        delete renderedLayers[name];
        delete renderedSig[name];
      }
    }

    // Add desired layers that aren't on the map yet, each at its own time/scenario.
    for (const name of desired) {
      if (renderedLayers[name] || loadingNames.has(name)) continue;
      const sig = sigOf(name);
      loadingNames.add(name);
      isLoading = true;
      try {
        const entry = await loadAnyLayer(name, timeOf(snapLT, name), scenOf(snapLSC, name));
        // Re-validate against the latest state (selection/settings may have changed during the await).
        // Use get() rather than $-syntax: auto-subscription isn't allowed after an await.
        const liveLT = get(layerTime), liveLSC = get(layerScenario);
        const stillWanted = get(selectedLayers).includes(name)
          && layerSignature(name, timeOf(liveLT, name), scenOf(liveLSC, name)) === sig;
        if (entry?.layer && map && stillWanted && !renderedLayers[name]) {
          entry.layer.addTo(map);
          renderedLayers[name] = entry;
          renderedSig[name] = sig;
          entry.restyle(getOpacity(name));
        }
      } catch (err) {
        console.error(`Error loading layer ${name}:`, err);
        loadError = { layer: name };
      } finally {
        loadingNames.delete(name);
      }
    }
    isLoading = loadingNames.size > 0;
    reorderLayers(desired);
  }

  /**
   * Stack layers in selection order (later = on top); point layers always on top.
   * @param {string[]} desired
   */
  function reorderLayers(desired) {
    for (const name of desired) renderedLayers[name]?.layer?.bringToFront?.();
    for (const name of desired) if (isPointLayer(name)) renderedLayers[name]?.layer?.bringToFront?.();
  }
  
  // Apply per-layer opacity whenever any layer's opacity changes.
  $: if (map && $layerOpacity) {
    for (const name of Object.keys(renderedLayers)) {
      renderedLayers[name]?.restyle(getOpacity(name));
    }
  }

  $: if (esri && L && !map) {
    // Initialize the Leaflet map only if it doesn't already exist
    const mapElement = document.getElementById("map");
    if (mapElement) {
      map = L.map("map", {
        zoomControl: false, // Disable default zoom control
      }).setView(countryConfig.center, countryConfig.zoom); // Center on the selected country

      // Add a custom zoom control at the bottom-right
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(map);
      
      // Map popup will be handled by the MapPopup component

      //Add a basic OpenStreetMap tile layer as the base layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Initialize layers based on country data type
      if (countryConfig.dataType === "wms") {
        // Create WMS layers for WMS-based countries like Zimbabwe
        variableNames.forEach((layer) => {
          wmsLayers[layer] = L.tileLayer.wms(countryConfig.wmsEndpoint, {
            layers: layer,
            format: "image/png",
            transparent: true,
            attribution: "WMS Layer",
            version: "1.1.1",
            styles: "dynamic",
            srs: "EPSG:3857",
            mask: countryConfig.mask,
          });
        });
      }
    }
  }

  // Render engine: reconcile the map's layers with the current selection,
  // time and scenario. Re-runs whenever any of those change.
  $: if (map && L && countryConfig) {
    retryNonce; // referenced so the "Try again" button can re-run this block
    loadError = null;
    syncLayers($selectedLayers, $layerTime, $layerScenario);
  }

</script>

<div class="backgroundmap">
  <!-- Map container -->
  <div class="map" id="map"></div>

  <!-- Loading indicator -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
    </div>
  {/if}

  <!-- Load failure banner (after retries) -->
  {#if loadError && !isLoading}
    <div class="load-error" role="alert">
      <span class="load-error-text">Couldn't load “{loadError.layer}”. Check your connection.</span>
      <button class="load-error-retry" on:click={() => { loadError = null; retryNonce++; }}>Try again</button>
    </div>
  {/if}

  {#if map && L}
    <MapPopup 
      {map} 
      {L} 
      {wmsLayers} 
      {getLayerId} 
      {getLegendUnit}
      {countryCode}
    />
  {/if}
  
  <!-- Legend — one card per active layer, stacked -->
  {#if browser && legendDescriptors.length}
    <Legend layers={legendDescriptors} wmsEndpoint={countryConfig?.wmsEndpoint} />
  {/if}
</div>

<style>
  /* Map container styling */

  .backgroundmap {
    height: 100%;
    width: 100%;
  }

  .map {
    height: 100%;
    width: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .load-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 280px;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    text-align: center;
  }

  .load-error-text {
    font-size: 13px;
    color: #333;
  }

  .load-error-retry {
    padding: 6px 16px;
    background: #017e9f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  .load-error-retry:hover {
    background: #016580;
  }
</style>
