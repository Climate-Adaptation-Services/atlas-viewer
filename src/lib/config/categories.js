/**
 * Sidepanel category configuration
 *
 * Defines the four top-level categories that organise the side panel
 * (Hazard / Impact / Solution / Context) and which layers belong to each.
 *
 * NOTE: This is purely a UI grouping. The layer data itself carries no
 * category field, and the loading/rendering pipeline (e.g. contextLayerConfigs,
 * isContextLayer) is unaffected — Solution layers still live in
 * contextLayerConfigs even though they are shown under "Solution" here.
 */

import { cropImpactLayerNames } from "$lib/config/geojsonLayers.js"
import { gridHazardLayersByTheme, gridImpactLayerNames } from "$lib/config/gridIndicatorLayers.js"

// Hazard sub-themes (heat / drought / rain) — the layer list shown within Hazard.
// The gridded indicator layers are appended per theme, after the climate layers.
/** @type {Record<string, string[]>} */
export const hazardThemeLayerMap = {
  heat: [
    "Average temperature",
    "Minimum temperature",
    "Maximum temperature",
    "Days above 35°C",
    ...(gridHazardLayersByTheme.heat || []),
  ],
  drought: [
    "Dry spells",
    "Water Stress",
    "Desertification risk",
    ...(gridHazardLayersByTheme.drought || []),
  ],
  rain: [
    "Total rainfall",
    "Days above 20 mm",
    "River Flood",
    ...(gridHazardLayersByTheme.rain || []),
  ],
}

// Layer lists per category (UI grouping only). Crop yield layers first, then the
// gridded impact indicators (labour productivity, tree cover, PV, wind).
export const impactLayers = [...cropImpactLayerNames, ...gridImpactLayerNames]
export const solutionLayers = ["Bund suitability", "Tree cover (FMNR) suitability"]
export const contextLayers = ["Urban population", "Agroclimatic zones", "Livestock density"]

// Hazard sub-theme buttons (id, label, icon)
export const hazardThemes = [
  {
    id: "heat",
    name: "Heat",
    icon: "https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/heat.svg",
  },
  {
    id: "drought",
    name: "Drought",
    icon: "https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/drought.svg",
  },
  {
    id: "rain",
    name: "Rain",
    icon: "https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/rain.svg",
  },
]

// Top-level category buttons (description shown as a hover tooltip on each pill)
export const categories = [
  { id: "hazard", name: "Hazards", description: "Climate threats: heat, drought and extreme rainfall." },
  { id: "impact", name: "Impacts", description: "Consequences of climate change, e.g. changes in crop yields." },
  { id: "solution", name: "Solutions", description: "Adaptation measures and where they are suitable." },
  { id: "context", name: "Context", description: "Background data to help interpret the maps." },
]

/**
 * Get the flat list of all layers belonging to a category, for availability
 * checks (used to decide whether a category button should be shown for a country).
 * @param {string} categoryId
 * @returns {string[]}
 */
export function getCategoryLayers(categoryId) {
  switch (categoryId) {
    case "hazard":
      return Object.values(hazardThemeLayerMap).flat()
    case "impact":
      return impactLayers
    case "solution":
      return solutionLayers
    case "context":
      return contextLayers
    default:
      return []
  }
}
