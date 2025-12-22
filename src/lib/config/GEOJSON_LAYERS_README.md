# Adding GeoJSON Map Layers

This guide explains how to add new GeoJSON-based map layers to the climate atlas viewer.

## Overview

GeoJSON layers are data layers stored as static GeoJSON files (either locally or on AWS S3) rather than being served via WMS or generated from CSV data. Examples include River Flood, Landslide Risk, etc.

## Step 1: Add Layer Configuration

Edit `/src/lib/config/geojsonLayers.js` and add your layer to the `geojsonLayerConfigs` object:

```javascript
export const geojsonLayerConfigs = {
  'Your Layer Name': {
    filename: 'your_layer_data.geojson',
    baseUrl: '', // Empty for local static folder, or 'https://bucket.s3.region.amazonaws.com/'
    propertyName: 'value_field', // The GeoJSON property containing the data value
    getStyle: (feature) => {
      // Define how features should be styled
      const value = feature.properties?.value_field ?? 0;
      return {
        fillColor: getYourColorFunction(value),
        weight: 0.5,
        opacity: 0.3,
        color: '#333333',
        fillOpacity: 0.7
      };
    },
    interactive: true, // Set to false if you don't want click interactions
    legendItems: [
      { color: '#color1', label: 'Label 1' },
      { color: '#color2', label: 'Label 2' },
      // ... more legend items
    ]
  }
};
```

### Configuration Fields:

- **filename**: Name of the GeoJSON file
- **baseUrl**:
  - Use empty string `''` for local files in `/static/` folder (development)
  - Use AWS S3 URL like `'https://yourbucket.s3.region.amazonaws.com/'` for production
- **propertyName**: The property in the GeoJSON features that contains the data value
- **getStyle**: Function that returns Leaflet style options based on feature properties
- **interactive**: Boolean - whether users can click/interact with the layer
- **legendItems**: Array of legend items with `color` and `label` properties

## Step 2: Add Color Scale Function (if needed)

If your layer needs a color scale, add it before the `geojsonLayerConfigs` object:

```javascript
function getYourLayerColor(value) {
  if (value < 10) return '#color1';
  if (value < 20) return '#color2';
  if (value < 50) return '#color3';
  return '#color4';
}
```

## Step 3: Add Layer to Sidepanel Menu

Edit `/src/lib/components/Sidepanel.svelte` and add your layer to the appropriate theme:

```javascript
const optionsTemperature = ["Average temperature", "Minimum temperature", "Maximum temperature"]
const optionsDrought = ["Dry spells"]
const optionsPrecipitation = ["Total rainfall", "Days above 20 mm", "River Flood", "Your Layer Name"]
```

## Step 4: Update Country Configuration

Edit `/src/lib/config/countries.js` and add layer availability for each country:

```javascript
kenya: {
  name: "Kenya",
  // ... other config
  layerAvailability: {
    // ... other layers
    "Your Layer Name": { times: ["Past"], hasScenarios: false }
  }
}
```

## Step 5: Add Unit Label (Optional)

If you want a custom unit label in the legend, edit `/src/lib/components/Legend.svelte`:

```javascript
const getLegendUnit = (dataLayer) => {
  const unitMap = {
    // ... existing units
    "Your Layer Name": "your unit"
  }
  // ...
}
```

## Step 6: Place Your Data File

### For Development (Local):
Place your GeoJSON file in `/static/your_layer_data.geojson`

### For Production (AWS S3):
1. Upload your GeoJSON file to your S3 bucket
2. Update the `baseUrl` in the layer configuration to point to your S3 bucket
3. Ensure the file has public read permissions or proper CORS configuration

## Example: River Flood Layer

Here's the complete River Flood implementation as an example:

```javascript
// In geojsonLayers.js
function getRiverFloodColor(depth) {
  if (depth < 0.5) return '#e0f3ff';
  if (depth < 1) return '#a6d8ff';
  if (depth < 2) return '#4db8ff';
  if (depth < 5) return '#0080ff';
  return '#0040a0';
}

export const geojsonLayerConfigs = {
  'River Flood': {
    filename: 'kenya_river_flood.geojson',
    baseUrl: '',
    propertyName: 'DN',
    getStyle: (feature) => {
      const depth = feature.properties?.DN ?? 0;
      return {
        fillColor: getRiverFloodColor(depth),
        weight: 0.3,
        opacity: 0.2,
        color: '#0066cc',
        fillOpacity: 0.6
      };
    },
    interactive: true,
    legendItems: [
      { color: '#0040a0', label: '≥5 m' },
      { color: '#0080ff', label: '2-5 m' },
      { color: '#4db8ff', label: '1-2 m' },
      { color: '#a6d8ff', label: '0.5-1 m' },
      { color: '#e0f3ff', label: '<0.5 m' }
    ]
  }
};
```

## Migration from Local to AWS

When moving from development to production:

1. Upload your GeoJSON file to AWS S3
2. Update only the `baseUrl` in `geojsonLayers.js`:
   ```javascript
   baseUrl: 'https://yourbucket.s3.eu-north-1.amazonaws.com/'
   ```
3. No other code changes needed!

## Tips

- Use discrete color scales for better visualization
- Keep GeoJSON files optimized (simplified geometries, removed unnecessary properties)
- For large files, consider serving from AWS S3 for better performance
- Test locally first with files in `/static/` before moving to AWS
- Use meaningful property names in your GeoJSON data
