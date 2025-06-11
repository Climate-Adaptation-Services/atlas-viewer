<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { datalaag, time, scenario, csvData } from '$lib/stores.js';
  import { renderClimateChart } from '$lib/utils/chart.js';
  import Chart from 'chart.js/auto';
  
  // Track the current map parameters to detect changes
  let currentDataLayer;
  let currentTime;
  let currentScenario;
  
  // Props
  export let map; // The Leaflet map instance
  /** @type {any} */
  export let L; // The Leaflet library
  export let wmsLayers; // The WMS layers
  export let getLayerId; // Function to get layer ID
  export let getLegendUnit; // Function to get legend unit
  
  /** @type {any} */
  let popup = null;
  
  // Function to load the CSV data
  async function loadCsvData() {
    try {
      /** @type {Record<string, string>} */
      const dataLayerMap = {
        "Maximum temperature": "tasmax_mean",
        "Minimum temperature": "tasmin_mean",
        "Average temperature": "tas_mean",
        "Total rainfall": "pr_sum",
        "Days above 20 mm": "pr_a20mm",
        "Dry spells": "pr_cdd5",
        "Dry Spells": "pr_cdd5" // Adding capitalized version to ensure matching
      };
      
      /** @type {Record<string, string>} */
      const scenarioMap = {
        "Low": "ssp126",
        "High": "ssp585"
      };
      
      // Get the current data layer code
      const currentDataLayer = $datalaag || '';
      const layerCode = dataLayerMap[currentDataLayer] || 'pr_a20mm';
      
      // Get the current scenario SSP code
      const currentScenarioKey = $scenario || '';
      const sspCode = scenarioMap[currentScenarioKey] || 'ssp126';
      
      console.log(`Loading data for layer: ${layerCode}, scenario: ${sspCode}`);
      
      // Dynamically construct the CSV file name
      const csvFile = `${layerCode}_${sspCode}.csv`;
      
      // Use our proxy endpoint to avoid CORS issues
      const response = await fetch(`/api/csv/${csvFile}`);
      if (!response.ok) throw new Error('Failed to fetch CSV data');
      
      const text = await response.text();
      const rows = text.split('\r\n').filter(row => row.trim() !== '');
      const headers = rows[0].split(',');
      
      const parsedData = rows.slice(1).map(row => {
        const values = row.split(',');
        /** @type {Record<string, string|number>} */
        const obj = {};
        headers.forEach((header, index) => {
          // Ensure we have a value, default to empty string
          const value = values[index] || '';
          // Convert numeric values to numbers
          if (!isNaN(Number(value)) && header !== 'year') {
            obj[header] = parseFloat(value);
          } else {
            obj[header] = value;
          }
        });
        return obj;
      });
            
      // Filter the data by layer only (not scenario)
      const filteredData = parsedData.filter(row => {
        return row.name === layerCode;
      });
      
      // Update the store
      csvData.set(filteredData);
      console.log(`CSV data loaded and filtered: ${filteredData.length} rows for layer ${layerCode} and scenario ${sspCode}`);
    } catch (error) {
      console.error('Error loading CSV data:', error);
    }
  }

  // Previous values to track changes
  let previousDatalaag = '';
  let previousScenario = '';
  let previousTime = '';
  
  // Reactive statement to reload data when datalaag, time, or scenario changes
  $: if ($datalaag !== previousDatalaag || $scenario !== previousScenario || $time !== previousTime) {
    console.log(`Change detected: datalaag ${previousDatalaag} -> ${$datalaag}, scenario ${previousScenario} -> ${$scenario}, time ${previousTime} -> ${$time}`);
    
    previousDatalaag = $datalaag;
    previousScenario = $scenario;
    previousTime = $time;
    
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      // Clear existing CSV data before loading new data
      csvData.set([]);
      loadCsvData();
      console.log('Reloading CSV data due to parameter change');
      
      // If popup is open, update it with the new data layer information
      if (popup && popup.isOpen()) {
        const latlng = popup.getLatLng();
        if (latlng) {
          // Simulate a click at the same location to refresh the popup with new data
          map.fire('click', { latlng: latlng });
        }
      }
    }
  }

  onMount(() => {
    // Create a popup but don't add it to the map yet
    /** @type {any} */ // Add type annotation for L
    const leaflet = L;
    if (leaflet && map) {
      setupPopup();
    }
    
    // Load the CSV data
    loadCsvData();
    
    return () => {
      if (popup) {
        popup.remove();
      }
    };
  });
  
  $: if (L && map && !popup) {
    setupPopup();
  }
  
  // Close popup when any map parameters change (data layer, time period, or scenario)
  $: if (popup && ($datalaag !== currentDataLayer || $time !== currentTime || $scenario !== currentScenario)) {
    // Update current parameter trackers
    currentDataLayer = $datalaag;
    currentTime = $time;
    currentScenario = $scenario;
    // Close the popup
    popup.close();
  }
  
  /**
   * Function to render the line chart
   * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
   * @param {Array<{name: string, year: string|number, delta_value_mean: number, sceno: string, delta_value_run_min?: number, delta_value_run_max?: number}>} dataPoints - Array of data points
   */
  function renderLineChart(canvas, dataPoints) {
    if (!canvas || !dataPoints || dataPoints.length === 0) return;
      
    // Call our chart utility to render the chart without a title
    renderClimateChart(canvas, dataPoints, {});
  }
  
  function setupPopup() {
    if (!map) return;

    // Create a responsive popup object with larger size
    popup = L.popup({
      maxWidth: 450, // Wider maximum width
      autoPan: true, // Ensure popup is visible
      className: 'atlas-popup' // Custom class for styling
    });
    
    // Add click event to show lat/lon coordinates and WMS value
    map.on('click', function(e) {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      
      // Set initial content with loading state
      popup
        .setLatLng(e.latlng)
        .setContent(`<div class="popup-content">Loading value...</div>`)
        .openOn(map);
      
      // Get the current active layer ID
      const layerId = getLayerId($datalaag, $time, $scenario);
      
      // Find nearby CSV data points
      let csvContent = '';
      let csvDataLoaded = false;
      /** @type {string} */
      let chartId = 'chart-' + Date.now();
      /** @type {Array<{name: string, year: string|number, delta_value_mean: number, sceno: string, delta_value_run_min?: number, delta_value_run_max?: number}>} */
      let sameScenarioPoints = [];
      
      // Access the CSV data from the store
      const csvPoints = $csvData;
      
      if (csvPoints && csvPoints.length > 0) {
        csvDataLoaded = true;
        // Find the closest point in the CSV data
        // We'll consider points within 0.5 degrees (rough approximation)
        const threshold = 0.5;
        const nearbyPoints = csvPoints.filter(point => {
          // Make sure we're dealing with string values for comparison
          const pointLat = typeof point.lat === 'string' ? point.lat : String(point.lat);
          const pointLon = typeof point.lon === 'string' ? point.lon : String(point.lon);
          return Math.abs(parseFloat(pointLat) - parseFloat(lat)) < threshold &&
                 Math.abs(parseFloat(pointLon) - parseFloat(lng)) < threshold;
        });
        
        // If we found nearby points, add them to the popup content
        if (nearbyPoints.length > 0) {
          // Sort by distance (simple Euclidean distance approximation)
          nearbyPoints.sort((a, b) => {
            const aLat = typeof a.lat === 'string' ? a.lat : String(a.lat);
            const aLon = typeof a.lon === 'string' ? a.lon : String(a.lon);
            const bLat = typeof b.lat === 'string' ? b.lat : String(b.lat);
            const bLon = typeof b.lon === 'string' ? b.lon : String(b.lon);
            
            const distA = Math.sqrt(
              Math.pow(parseFloat(aLat) - parseFloat(lat), 2) + 
              Math.pow(parseFloat(aLon) - parseFloat(lng), 2)
            );
            const distB = Math.sqrt(
              Math.pow(parseFloat(bLat) - parseFloat(lat), 2) + 
              Math.pow(parseFloat(bLon) - parseFloat(lng), 2)
            );
            return distA - distB;
          });
          
          // Take the closest point
          const closestPoint = nearbyPoints[0];
          
          // Log the full data from the closest point
          console.log('Nearest CSV data point:', closestPoint);
          console.log('Distance (degrees):', Math.sqrt(
            Math.pow(parseFloat(typeof closestPoint.lat === 'string' ? closestPoint.lat : String(closestPoint.lat)) - parseFloat(lat), 2) + 
            Math.pow(parseFloat(typeof closestPoint.lon === 'string' ? closestPoint.lon : String(closestPoint.lon)) - parseFloat(lng), 2)
          ));
          
          // Filter all data points at the same location (same lat/lon) as the closest point
          const closestLat = typeof closestPoint.lat === 'string' ? closestPoint.lat : String(closestPoint.lat);
          const closestLon = typeof closestPoint.lon === 'string' ? closestPoint.lon : String(closestPoint.lon);
          
          const sameLocationPoints = csvPoints.filter(point => {
            const pointLat = typeof point.lat === 'string' ? point.lat : String(point.lat);
            const pointLon = typeof point.lon === 'string' ? point.lon : String(point.lon);
            return pointLat === closestLat && pointLon === closestLon;
          });
          
          console.log('All data points at this location:', sameLocationPoints);
          console.log('Number of data points at this location:', sameLocationPoints.length);
          
          // Debug the structure of the first point to identify available fields
          if (sameLocationPoints.length > 0) {
            console.log('CSV data point structure:', sameLocationPoints[0]);
          }
          
          // Get points with the same scenario for the line graph and ensure they have the expected type structure
          const typedPoints = sameLocationPoints.map(point => {
            // For debugging
            const fieldNames = Object.keys(point);
            const pointName = String(point.name || '');
            
            // Look for min/max fields which may have different naming patterns
            const minField = fieldNames.find(f => 
              f.includes('min') || f.includes('_min') || f.includes('low') || f.includes('_low')
            );
            const maxField = fieldNames.find(f => 
              f.includes('max') || f.includes('_max') || f.includes('high') || f.includes('_high')
            );
            
            console.log(`Point name: ${pointName}, found min field: ${minField}, max field: ${maxField}`);
            
            // Extract min/max values if available
            const minValue = minField && point[minField] !== undefined ? 
              (typeof point[minField] === 'number' ? point[minField] : parseFloat(String(point[minField] || 0))) : 
              undefined;
              
            const maxValue = maxField && point[maxField] !== undefined ? 
              (typeof point[maxField] === 'number' ? point[maxField] : parseFloat(String(point[maxField] || 0))) : 
              undefined;
            
            return {
              name: String(point.name || ''),
              year: point.year || '',
              delta_value_mean: typeof point.delta_value_mean === 'number' ? point.delta_value_mean : parseFloat(String(point.delta_value_mean || 0)),
              sceno: typeof point.sceno === 'string' ? point.sceno : String(point.sceno || ''),
              delta_value_run_min: minValue !== undefined ? minValue : 
                (typeof point.delta_value_run_min === 'number' ? point.delta_value_run_min : undefined),
              delta_value_run_max: maxValue !== undefined ? maxValue :
                (typeof point.delta_value_run_max === 'number' ? point.delta_value_run_max : undefined)
            };
          });
          
          console.log('Processed points with min/max values:', typedPoints);
          
          sameScenarioPoints = typedPoints.filter(point => {
            const pointScenario = point.sceno;
            return pointScenario ;
          });
          
          console.log('Filtered scenario points:', sameScenarioPoints);
          
          // Set a unique chart ID
          chartId = 'chart-' + Date.now();
          console.log('Generated chart ID:', chartId);
          
          const sceno = typeof closestPoint.sceno === 'string' ? closestPoint.sceno : String(closestPoint.sceno);
          const year = typeof closestPoint.year === 'string' ? closestPoint.year : String(closestPoint.year);
          const deltaValue = typeof closestPoint.delta_value_mean === 'number' 
            ? closestPoint.delta_value_mean 
            : parseFloat(String(closestPoint.delta_value_mean));
          
          // Get dynamic data layer name based on the current data layer
          /** @type {Record<string, string>} */
          const dataLayerDisplayNames = {
            "tasmax_mean": "Maximum Temperature",
            "tasmin_mean": "Minimum Temperature",
            "tas_mean": "Average Temperature",
            "pr_sum": "Total Rainfall",
            "pr_a20mm": "Days above 20mm Rainfall",
            "pr_cdd5": "Dry Spell Duration" // Fixed to match the correct CSV file name
          };
          
          const pointName = closestPoint.name;
          const pointNameStr = typeof pointName === 'string' ? pointName : String(pointName || '');
          const dataLayerName = dataLayerDisplayNames[pointNameStr] || 'Climate Data';
          
          // Only show the chart for time periods 2050 or 2080
          const currentTime = $time || '';
          const showChart = ['2050', '2080'].includes(currentTime);
          
          if (showChart) {
            console.log('Showing chart for time period:', currentTime);
            csvContent = `<div class="csv-data">
              <div class="chart-title">${dataLayerName} Projection</div>
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
            // For other time periods, just show a message
            console.log('Not showing chart for time period:', currentTime);
            csvContent = `<div class="csv-data">
              <div style="padding: 10px; font-style: italic;">Explore the data for 2050 and 2080 to find out more about projected changes.</div>
            </div>`;
          }
        }
      }
      
      if (layerId && wmsLayers[layerId]) {
        // Using direct longitude and latitude for GetFeatureInfo
        // Construct the URL for GetFeatureInfo request
        const url = `https://dev.cas-zimbabwe.predictia.es/wms?REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.1.1&lon=${lng}&lat=${lat}&layer=${layerId}`;
        
        // Fetch the data value
        fetch(url)
          .then(response => response.json())
          .then(data => {
            let valueText = 'No data available';
            
            // Extract the value from the response
            const value = data[layerId];
            if (value !== undefined) {
              // Check if it's historical or projected data
              const currentTime = $time || '';
              const isHistorical = !['2050', '2080'].includes(currentTime);
              
              // Format the value with a plus sign for positive values in projections
              const formattedValue = value > 0 && !isHistorical 
                ? `+${Math.round(value*10)/10}` 
                : `${Math.round(value*10)/10}`;
              
              if (isHistorical) {
                // For historical time periods, include "historical" prefix
                valueText = `Historical: ${formattedValue} ${getLegendUnit($datalaag)}`;
              } else {
                // For projection time periods (2050 or 2080)
                valueText = `Change: ${formattedValue} ${getLegendUnit($datalaag)}`;
              }
            }
            
            // Update popup content with both WMS value and CSV data
            popup.setContent(
              `<div class="popup-content">
                <div class="value-text"><strong>${valueText}</strong></div>
                ${csvContent}
              </div>`
            );
            
            // Now that the popup content is set, render the chart with a delay to ensure DOM is ready
            const currentTime = $time || '';
            const showChart = ['2050', '2080'].includes(currentTime);
            
            if (showChart && csvContent && chartId) {
              setTimeout(() => {
                const chartElement = document.getElementById(chartId);
                if (chartElement) {
                  console.log('Rendering chart with data for ' + sameScenarioPoints.length + ' points');
                  try {
                    renderLineChart(
                      /** @type {HTMLCanvasElement} */ (chartElement), 
                      sameScenarioPoints
                    );
                  } catch (error) {
                    console.error('Error rendering chart:', error);
                  }
                } else {
                  console.error('Chart element not found with ID:', chartId);
                }
              }, 200);
            }
          })
          .catch(error => {
            console.error('Error fetching WMS value:', error);
            popup.setContent(
              `<div class="popup-content">
                Error loading value
                ${csvContent}
              </div>`
            );
            
            // Also render chart in case of error
            const currentTime = $time || '';
            const showChart = ['2050', '2080'].includes(currentTime);
            
            if (showChart && csvContent && chartId) {
              setTimeout(() => {
                const chartElement = document.getElementById(chartId);
                if (chartElement) {
                  try {
                    renderLineChart(
                      /** @type {HTMLCanvasElement} */ (chartElement), 
                      sameScenarioPoints
                    );
                  } catch (error) {
                    console.error('Error rendering chart in error handler:', error);
                  }
                }
              }, 200);
            }
          });
      } else {
        // No active layer, but still show CSV data if available
        popup.setContent(
          `<div class="popup-content">
            No active layer
            ${csvContent}
          </div>`
        );
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
    width: 370px !important; /* Fixed width to prevent expansion, increased to match wider popup */
  }
  
  :global(.atlas-popup) {
    font-size: 14px;
    color: #333;
  }
  
  :global(.chart-container) {
    margin: 10px auto;
    width: 300px !important; /* Fixed width */
    height: 250px !important; /* Fixed height */
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
  
  :global(.csv-data h4) {
    margin: 5px 0;
    font-weight: 500;
  }
  
  :global(.csv-data p) {
    margin: 3px 0;
  }
</style>
