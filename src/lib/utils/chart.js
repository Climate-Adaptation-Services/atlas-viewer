/**
 * Utility functions for chart rendering in the atlas viewer
 */
import Chart from 'chart.js/auto';

/**
 * Renders a line chart with min-max range shading
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
 * @param {Array<{name: string, year: string|number, delta_value_mean: number, sceno: string, delta_value_run_min?: number, delta_value_run_max?: number}>} dataPoints - Array of data points
 * @param {{title?: string}} [options={}] - Additional options for chart customization
 */
export function renderClimateChart(canvas, dataPoints, options = {}) {
  if (!canvas || !dataPoints || dataPoints.length === 0) return;
  
  // Sort data points by year
  const sortedData = [...dataPoints].sort((a, b) => {
    const yearA = typeof a.year === 'string' ? parseInt(a.year) : Number(a.year);
    const yearB = typeof b.year === 'string' ? parseInt(b.year) : Number(b.year);
    return yearA - yearB;
  });
  
  // Extract years and delta values
  const years = sortedData.map(point => point.year);
  const deltaValues = sortedData.map(point => {
    return typeof point.delta_value_mean === 'number' ? point.delta_value_mean : Number(point.delta_value_mean);
  });
  
  // Extract min and max values for the range shading
  const minValues = sortedData.map(point => {
    // Use delta_value_run_min if available, otherwise fall back to a value below the mean
    const meanValue = typeof point.delta_value_mean === 'number' ? point.delta_value_mean : Number(point.delta_value_mean || 0);
    return point.delta_value_run_min !== undefined ? 
            (typeof point.delta_value_run_min === 'number' ? 
             point.delta_value_run_min : Number(point.delta_value_run_min)) : 
            (meanValue - 0.5); // Fallback if no min exists
  });
  
  const maxValues = sortedData.map(point => {
    // Use delta_value_run_max if available, otherwise fall back to a value above the mean
    const meanValue = typeof point.delta_value_mean === 'number' ? point.delta_value_mean : Number(point.delta_value_mean || 0);
    return point.delta_value_run_max !== undefined ? 
            (typeof point.delta_value_run_max === 'number' ? 
             point.delta_value_run_max : Number(point.delta_value_run_max)) : 
            (meanValue + 0.5); // Fallback if no max exists
  });
  
  // Get the scenario name for the chart title
  const scenario = sortedData.length > 0 ? 
    (typeof sortedData[0].sceno === 'string' ? sortedData[0].sceno : String(sortedData[0].sceno)) : 
    'Unknown';
  
  // Get the climate variable name
  /** @type {Record<string, string>} */
  const dataLayerDisplayNames = {
    "tasmax_mean": "Maximum Temperature",
    "tasmin_mean": "Minimum Temperature",
    "tas_mean": "Average Temperature",
    "pr_sum": "Total Rainfall",
    "pr_a20mm": "Days above 20mm",
    "pr_cdd5": "Dry Spell Duration"
  };
  
  /** @type {Record<string, string>} */
  const dataLayerUnits = {
    "tasmax_mean": "°C",
    "tasmin_mean": "°C",
    "tas_mean": "°C",
    "pr_sum": "mm",
    "pr_a20mm": "days",
    "pr_cdd5": "days"
  };
  
  /**
   * Custom y-axis titles for each data layer - you can manually edit these
   * If an entry exists here, it will override the automatically generated title
   * @type {Record<string, string>} 
   */
  const customYAxisTitles = {
    "tasmax_mean": "Change in max. temp. (°C)",
    "tasmin_mean": "Change in min. temp. (°C)",
    "tas_mean": "Change in av. temp. (°C)",
    "pr_sum": "Change in total rainfall (mm)",
    "pr_a20mm": "Change in days >20mm (days/year)",
    "pr_cdd5": "Change in dry spells (spells/year)"
  };
  
  const varName = sortedData[0]?.name;
  const varNameStr = typeof varName === 'string' ? varName : String(varName || '');
  const dataLabel = dataLayerDisplayNames[varNameStr] || 'Climate Value';
  const dataUnit = dataLayerUnits[varNameStr] || '';
  
  // Get custom y-axis title if available, or create a default one
  const yAxisLabel = customYAxisTitles[varNameStr] || `Change in ${dataLabel} (${dataUnit})`;
  
  // Create the chart
  const ctx = canvas.getContext('2d');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          // Range area (min-max)
          {
            label: 'Range',
            data: maxValues,
            borderColor: 'transparent',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: '+1',  // Fill to the dataset below (min values)
            tension: 0.2
          },
          // Min values line (invisible, just for filling)
          {
            label: 'Min',
            data: minValues,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0.2
          },
          // Mean line
          {
            label: dataLabel,
            data: deltaValues,
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 2,
            tension: 0.2,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: yAxisLabel,
              font: {
                size: 12
              }
            },
            ticks: {
              precision: 0, // Force integers only
              stepSize: 1, // Step by whole numbers
              callback: function(value) {
                // Format as integer and add unit
                // Convert value to number before rounding (fixes TypeScript error)
                const numValue = Number(value);
                return Math.round(numValue) + (dataUnit ? ` ${dataUnit}` : '');
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Year',
              font: {
                size: 12
              }
            },
            type: 'linear',
            min: 1995,
            max: 2085, // Ending at 2085 to include data up to 2080
            ticks: {
              stepSize: 20, // Show ticks every 20 years
              autoSkip: false,
              maxRotation: 0,
              color: '#333',
              callback: function(value) {
                // Starting at 1995 and going up by increments of 20 years
                // Should show: 1995, 2015, 2035, 2055, 2075
                return value;
              }
            }
          }
        },
        plugins: {
          title: {
            display: false // Hide the chart title as requested
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              /**
               * @param {{text: string}} item - Legend item
               */
              filter: function(item) {
                // Only show the mean value in the legend, hide min/max
                return item.text === dataLabel;
              },
              /**
               * @param {any} chart - Chart instance
               */
              generateLabels: function(chart) {
                const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                // Customize the legend label for the mean line to indicate it includes the range
                /**
                 * @type {{text: string} | undefined}
                 */
                const meanLabel = labels.find(/** @param {any} label */ (label) => label.text === dataLabel);
                if (meanLabel) {
                  meanLabel.text = `${dataLabel} (with range)`;
                }
                return labels;
              }
            }
          },
          tooltip: {
            enabled: false // Disable tooltips as requested
          }
        }
      }
    });
  }
}
