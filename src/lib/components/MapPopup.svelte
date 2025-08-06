<script>
  import { onMount } from 'svelte';
  import { datalaag, time, scenario, csvData } from '$lib/stores.js';
  import { loadCsvData } from '$lib/utils/csv.js';
  import { isPointInCountry } from '$lib/utils/geo.js';
  import { prepareChartData, renderPopupChart } from '$lib/utils/popupChart.js';

  // Track map parameter changes
  let currentDataLayer;
  let currentTime;
  let currentScenario;

  // Props
  export let map;        // Leaflet map instance
  export let L;          // Leaflet library
  export let wmsLayers;  // WMS layers
  export let getLayerId; // Function to get layer ID
  export let getLegendUnit; // Function to get legend unit
  export let countryCode = 'zimbabwe' // default country

  let popup = null;

  // Track previous store values
  let previousDatalaag = '';
  let previousScenario = '';
  let previousTime = '';

  // Watch for store changes to reload CSV
  $: if ($datalaag !== previousDatalaag || $scenario !== previousScenario || $time !== previousTime) {
    previousDatalaag = $datalaag;
    previousScenario = $scenario;
    previousTime = $time;

    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      csvData.set([]);
      loadCsvData($datalaag, $scenario, countryCode);
      if (popup && popup.isOpen()) {
        const latlng = popup.getLatLng();
        if (latlng) map.fire('click', { latlng });
      }
    }
  }

  // Initialize popup on mount
  onMount(() => {
    if (L && map) setupPopup();
    loadCsvData($datalaag, $scenario, countryCode);

    return () => {
      if (popup) popup.remove();
    };
  });

  // Setup popup only once
  $: if (L && map && !popup) setupPopup();

  // Close popup on parameter changes
  $: if (popup && ($datalaag !== currentDataLayer || $time !== currentTime || $scenario !== currentScenario)) {
    currentDataLayer = $datalaag;
    currentTime = $time;
    currentScenario = $scenario;
    popup.close();
  }

  /** Setup Leaflet popup and click handler */
  function setupPopup() {
    if (!map) return;
    
    popup = L.popup({
      maxWidth: 1000,
      autoPan: true,
      className: 'atlas-popup'
    });

    map.on('click', async function (e) {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      console.log('check')
      // Validate point inside selected country
      const isInside = isPointInCountry(e.latlng, countryCode);
      console.log(isInside, 'check')
      if (!isInside) {
        if (map.hasLayer(popup)) popup.closePopup(popup);
        return;
      }

      // Show loading popup
      popup
        .setLatLng(e.latlng)
        .setContent(`<div class="popup-content">Loading data...</div>`)
        .openOn(map);

      // Active layer ID for WMS request
      const layerId = getLayerId($datalaag, $time, $scenario);
      
      // Check if we're using a country with WMS or CSV only
      const isWmsCountry = countryCode.toLowerCase() === 'zimbabwe';

      // Prepare CSV data
      const csvPoints = $csvData;
      let csvContent = '';
      let chartId = 'chart-' + Date.now();
      let sameScenarioPoints = [];

      if (csvPoints && csvPoints.length > 0) {
        
        // Find closest CSV point
        const threshold = 0.5; // degrees
        const nearbyPoints = csvPoints
          .filter(point =>
            Math.abs(parseFloat(point.lat) - parseFloat(lat)) < threshold &&
            Math.abs(parseFloat(point.lon) - parseFloat(lng)) < threshold
          )
          .sort((a, b) => {
            const distA = Math.hypot(parseFloat(a.lat) - lat, parseFloat(a.lon) - lng);
            const distB = Math.hypot(parseFloat(b.lat) - lat, parseFloat(b.lon) - lng);
            return distA - distB;
          });

        if (nearbyPoints.length > 0) {
          const closestPoint = nearbyPoints[0];
          const sameLocationPoints = csvPoints.filter(
            point => point.lat === closestPoint.lat && point.lon === closestPoint.lon
          );

          sameScenarioPoints = prepareChartData(sameLocationPoints);

          const currentTime = $time || '';
          const showChart = ['2050', '2080'].includes(currentTime);

          if (showChart) {
            csvContent = `
              <div class="csv-data">
                <div class="chart-title">${$datalaag} projection</div>
                <div class="chart-subtitle">${$scenario} emissions scenario</div>
                <div class="chart-container" style="width: 380px; height: 250px; margin: 10px auto 5px; position: relative;">
                  <canvas id="${chartId}" style="display: block;"></canvas>
                </div>
                <div class="chart-legend">
                  <span class="legend-item"><span class="legend-line"></span> Model average</span>
                  <span class="legend-item"><span class="legend-shade"></span> Model range</span>
                </div>
              </div>`;
          } else {
            csvContent = `
              <div class="csv-data">
                <div style="padding: 10px; font-style: italic;">
                  Explore the data for 2050 and 2080 to find out more about projected changes.
                </div>
              </div>`;
          }
        }
      }

      // For countries with WMS (Zimbabwe), fetch WMS value
      if (isWmsCountry && layerId && wmsLayers[layerId]) {
        const url = `https://dev.cas-zimbabwe.predictia.es/wms?REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.1.1&lon=${lng}&lat=${lat}&layer=${layerId}`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          let valueText = 'No data available';
          const value = data[layerId];
          if (value !== undefined) {
            const isHistorical = !['2050', '2080'].includes($time || '');
            const formattedValue = value > 0 && !isHistorical
              ? `+${Math.round(value * 10) / 10}`
              : `${Math.round(value * 10) / 10}`;

            valueText = isHistorical
              ? `Historical: ${formattedValue} ${getLegendUnit($datalaag)}`
              : `Change: ${formattedValue} ${getLegendUnit($datalaag)}`;
          }

          // Render popup content
          popup.setContent(`
            <div class="popup-content">
              <div class="value-text"><strong>${valueText}</strong></div>
              ${csvContent}
            </div>`);

          // Render chart after DOM updates
          if (['2050', '2080'].includes($time || '') && csvContent && chartId) {
            setTimeout(() => {
              const chartElement = document.getElementById(chartId);
              if (chartElement) renderPopupChart(chartElement, sameScenarioPoints);
            }, 200);
          }
        } catch (error) {
          console.error('Error fetching WMS value:', error);
          popup.setContent(`
            <div class="popup-content">
              Error loading value
              ${csvContent}
            </div>`);
        }
      } else {
        // For Kenya or if no WMS layer is available - extract value from GeoJSON or CSV
        let valueText = 'No data available';
        let value;
        
        // First try to get value from GeoJSON layer at this point
        try {
          // Find all GeoJSON layers
          let geojsonLayers = [];
          map.eachLayer(layer => {
            if (layer.feature) {
              geojsonLayers.push(layer);
            }
          });
          
          if (geojsonLayers.length > 0) {
            const point = e.latlng;
            
            // Loop through GeoJSON layers to find the one containing the clicked point
            for (const layer of geojsonLayers) {
              // Method 1: Using getBounds if available
              try {
                if (layer.getBounds && layer.getBounds().contains(point)) {
                  if (layer.feature?._value !== undefined) {
                    value = layer.feature._value;
                  } else if (layer.feature?.properties?.value !== undefined) {
                    value = layer.feature.properties.value;
                  }
                }
              } catch (err) { /* ignore errors */ }
              
              // We can only use getBounds method for checking if point is in polygon
              // since isPointInPolygon is not available outside geo.js
              
              // If we found a value, no need to check other layers
              if (value !== undefined) break;
            }
          }
        } catch (err) {
          console.log('Error accessing GeoJSON value:', err);
        }
        
        // Fallback to nearest CSV point if GeoJSON value not found
        if (value === undefined && csvPoints && csvPoints.length > 0) {
          const threshold = 0.05; // Smaller threshold for more accurate point matching
          const nearestPoint = csvPoints
            .filter(point => 
              Math.abs(parseFloat(point.lat) - parseFloat(String(lat))) < threshold &&
              Math.abs(parseFloat(point.lon) - parseFloat(String(lng))) < threshold
            )
            .sort((a, b) => {
              const distA = Math.hypot(parseFloat(a.lat) - parseFloat(String(lat)), parseFloat(a.lon) - parseFloat(String(lng)));
              const distB = Math.hypot(parseFloat(b.lat) - parseFloat(String(lat)), parseFloat(b.lon) - parseFloat(String(lng)));
              return distA - distB;
            })[0];
            
          if (nearestPoint && nearestPoint.value !== undefined) {
            value = parseFloat(nearestPoint.value);
            console.log('Using CSV value:', value);
          }
        }
        
        // Format the value if found
        if (value !== undefined) {
          const isHistorical = !['2050', '2080'].includes($time || '');
          // Round to whole numbers if showing total precipitation, otherwise use 1 decimal place
          const isPrecipitation = $datalaag.toLowerCase().includes('total');
          const roundedValue = isPrecipitation ? Math.round(value) : Math.round(value * 10) / 10;
          
          const formattedValue = value > 0 && !isHistorical
            ? `+${roundedValue}`
            : `${roundedValue}`;

          valueText = isHistorical
            ? `Historical: ${formattedValue} ${getLegendUnit($datalaag)}`
            : `Change: ${formattedValue} ${getLegendUnit($datalaag)}`;
        }
        
        // Render popup content with same format as Zimbabwe
        popup.setContent(`
          <div class="popup-content">
            <div class="value-text"><strong>${valueText}</strong></div>
            ${csvContent}
          </div>`);
        
        // Render chart after DOM updates - exactly like in the Zimbabwe case
        if (['2050', '2080'].includes($time || '') && csvContent && chartId) {
          setTimeout(() => {
            const chartElement = document.getElementById(chartId);
            if (chartElement) renderPopupChart(chartElement, sameScenarioPoints);
          }, 200);
        }
      }
    });
  }
</script>

<style>
  :global(.leaflet-popup-content) {
    padding: 5px 10px;
    margin: 5px 0;
  }

  :global(.atlas-popup .leaflet-popup-content) {
    margin: 8px 0;
    width: 370px !important;
  }

  :global(.atlas-popup) {
    font-size: 14px;
    color: #333;
  }

  :global(.chart-container) {
    margin: 10px auto;
    width: 300px !important;
    height: 250px !important;
  }

  :global(.popup-content) {
    padding: 5px;
    font-size: 14px;
  }

  :global(.value-text) {
    margin-bottom: 8px;
    font-size: 15px;
    text-align: center;
  }

  :global(.chart-title) {
    font-weight: bold;
    text-align: center;
    margin-bottom: 2px;
    font-size: 15px;
  }

  :global(.chart-subtitle) {
    text-align: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: #333;
    font-style: italic;
  }

  :global(.chart-legend) {
    display: flex;
    justify-content: center;
    gap: 15px;
    font-size: 12px;
    color: #333;
    margin-bottom: 8px;
  }

  :global(.legend-item) {
    display: flex;
    align-items: center;
  }

  :global(.legend-line) {
    display: inline-block;
    width: 20px;
    height: 3px;
    background-color: rgb(75, 192, 192);
    margin-right: 5px;
  }

  :global(.legend-shade) {
    display: inline-block;
    width: 20px;
    height: 10px;
    background-color: rgba(75, 192, 192, 0.2);
    margin-right: 5px;
  }

  :global(.csv-data) {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 13px;
  }

  :global(.chart-container) {
    margin-top: 15px;
    width: 250px;
    height: 200px;
  }
</style>
