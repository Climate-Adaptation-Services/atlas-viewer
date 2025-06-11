import { writable, derived } from "svelte/store"

export const buurtGrenzen = writable(0)
export const leafletMap = writable(null)
export const tileLayer = writable(null)
export const tilelayerOpacity = writable(100)
export const datalaag = writable("Maximum temperature")
export const time = writable("hist")
export const theme = writable("heter")
export const scenario = writable("Low")
export const opacityMap = writable(1)

export const panelOpen = writable(true)

// Store for CSV data from Zimbabwe climate data
// Initialize with proper type definition to avoid errors
export const csvData = writable(/** @type {Array<Record<string, string|number>>} */ ([]))
