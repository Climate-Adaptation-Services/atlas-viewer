import { writable, derived } from "svelte/store"

export const buurtGrenzen = writable(0)
export const leafletMap = writable(null)
export const tileLayer = writable(null)
export const tilelayerOpacity = writable(100)
export const time = writable("hist")
// Top-level sidepanel category: "hazard" | "impact" | "solution" | "context"
export const category = writable("hazard")
export const scenario = writable("High")
// Global opacity (legacy). Per-layer opacity lives in `layerOpacity`.
export const opacityMap = writable(1)

export const panelOpen = writable(true)

// Store for CSV data from Zimbabwe climate data
// Initialize with proper type definition to avoid errors
export const csvData = writable(/** @type {Array<Record<string, string|number>>} */ ([]))

// Selected map layers, stacked in array order (later = added later = on top).
// This is the source of truth for selection (multi-select).
export const selectedLayers = writable(/** @type {string[]} */ (["Average temperature"]))

// Per-layer opacity: { [layerName]: number 0..1 }. Missing entries default to 1.
export const layerOpacity = writable(/** @type {Record<string, number>} */ ({}))

// Per-layer time period & emissions scenario, frozen when the layer is added/shown.
// { [layerName]: "Past"|"2050"|"2080" } / { [layerName]: "Low"|"High" }.
export const layerTime = writable(/** @type {Record<string, string>} */ ({}))
export const layerScenario = writable(/** @type {Record<string, string>} */ ({}))

// The layer the global time/scenario controls currently edit ("" = fall back to top).
export const focusedLayer = writable(/** @type {string} */ (""))

// Topmost selected layer — used by single-layer consumers during/after the
// multi-layer migration (Legend/MapPopup focus, fallbacks).
export const selectedLayer = derived(selectedLayers, ($l) => $l[$l.length - 1] || "")

// Backward-compatible alias for the topmost layer (was a separate writable).
export const datalaag = derived(selectedLayers, ($l) => $l[$l.length - 1] || "")
