/**
 * Utility functions for chart rendering in the atlas viewer
 */
import Chart from 'chart.js/auto';

/**
 * Bar chart for crop yield change at a clicked admin2 polygon.
 * Four bars per popup — 2050 Low, 2050 High, 2080 Low, 2080 High — grouped
 * by period. Each bar shows the ensemble median, with an I-beam whisker
 * overlay marking the p10–p90 model range. Bar colour encodes scenario
 * (petrol = SSP1-2.6, warm red = SSP5-8.5).
 *
 * @typedef {{median: number|null, p10: number|null, p90: number|null}} CropStat
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ low_2050: CropStat, high_2050: CropStat, low_2080: CropStat, high_2080: CropStat }} data
 */
export function renderCropYieldChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Match the tool's typography and base text colour (see static/global.css).
  Chart.defaults.font.family = "Silka, Belanosima, Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";
  Chart.defaults.color = '#333';

  /** @param {any} v */
  const num = (v) => (v == null || isNaN(Number(v)) ? null : Number(v));
  /** @param {CropStat} s @param {'median'|'p10'|'p90'} k */
  const stat = (s, k) => num(s?.[k]);

  // Two datasets (Low, High); each has values for the two periods (2050, 2080).
  const lowMedians  = [stat(data.low_2050,  'median'), stat(data.low_2080,  'median')];
  const highMedians = [stat(data.high_2050, 'median'), stat(data.high_2080, 'median')];
  const lowP10s     = [stat(data.low_2050,  'p10'),    stat(data.low_2080,  'p10')];
  const lowP90s     = [stat(data.low_2050,  'p90'),    stat(data.low_2080,  'p90')];
  const highP10s    = [stat(data.high_2050, 'p10'),    stat(data.high_2080, 'p10')];
  const highP90s    = [stat(data.high_2050, 'p90'),    stat(data.high_2080, 'p90')];

  const COLOR_LOW  = '#017e9f'; // petrol (tool brand colour) for SSP1-2.6
  const COLOR_HIGH = '#d8392c'; // warm red for SSP5-8.5

  // Y-axis range driven by the data and anchored at 0 — no symmetric padding,
  // so an all-positive (or all-negative) series doesn't waste half the plot and
  // the x-axis sits on 0. Step = 5 by default, 10 once the span crosses 25
  // (otherwise ticks get too dense for the popup size).
  const allValues = [
    ...lowMedians, ...highMedians,
    ...lowP10s, ...lowP90s, ...highP10s, ...highP90s
  ].filter(/** @returns {v is number} */ (v) => typeof v === 'number');
  const dataMax = allValues.length ? Math.max(...allValues) : 10;
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const step = Math.max(Math.abs(dataMax), Math.abs(dataMin)) >= 25 ? 10 : 5;
  let yMax = dataMax > 0 ? Math.ceil(dataMax / step) * step : 0;
  let yMin = dataMin < 0 ? Math.floor(dataMin / step) * step : 0;
  if (yMax === yMin) yMax = step; // guard against a degenerate all-zero range

  // I-beam whiskers drawn over each bar via canvas after Chart.js renders.
  const errorBarPlugin = {
    id: 'cropErrorBars',
    /** @param {any} chart */
    afterDatasetsDraw(chart) {
      const ctx2 = chart.ctx;
      ctx2.save();
      ctx2.strokeStyle = '#333';
      ctx2.lineWidth = 1.4;
      const cap = 5;
      /** @param {any[]} barMetas @param {(number|null)[]} los @param {(number|null)[]} his */
      const drawSet = (barMetas, los, his) => {
        barMetas.forEach((bar, i) => {
          const lo = los[i], hi = his[i];
          if (lo == null || hi == null) return;
          const x = bar.x;
          const yLo = chart.scales.y.getPixelForValue(lo);
          const yHi = chart.scales.y.getPixelForValue(hi);
          ctx2.beginPath();
          ctx2.moveTo(x, yLo); ctx2.lineTo(x, yHi);
          ctx2.moveTo(x - cap, yHi); ctx2.lineTo(x + cap, yHi);
          ctx2.moveTo(x - cap, yLo); ctx2.lineTo(x + cap, yLo);
          ctx2.stroke();
        });
      };
      drawSet(chart.getDatasetMeta(0).data, lowP10s,  lowP90s);
      drawSet(chart.getDatasetMeta(1).data, highP10s, highP90s);
      ctx2.restore();
    }
  };

  /** @param {(number|null)[]} medians @param {(number|null)[]} p10s @param {(number|null)[]} p90s */
  const tooltipLabel = (medians, p10s, p90s) =>
    /** @param {any} tctx */ (tctx) => {
      const i = tctx.dataIndex;
      const m = medians[i], lo = p10s[i], hi = p90s[i];
      /** @param {number|null} v */
      const fmt = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
      if (m == null) return 'No data';
      return [`Median: ${fmt(m)}`, `p10–p90: ${fmt(lo)} to ${fmt(hi)}`];
    };

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['2050', '2080'],
      datasets: [
        {
          label: 'Low (SSP1-2.6)',
          data: lowMedians,
          backgroundColor: COLOR_LOW,
          borderColor: '#015c75',
          borderWidth: 1,
          borderRadius: 3,
          categoryPercentage: 0.7,
          barPercentage: 0.85
        },
        {
          label: 'High (SSP5-8.5)',
          data: highMedians,
          backgroundColor: COLOR_HIGH,
          borderColor: '#7a201a',
          borderWidth: 1,
          borderRadius: 3,
          categoryPercentage: 0.7,
          barPercentage: 0.85
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 12, boxHeight: 12, padding: 8, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            title: /** @param {any[]} items */ (items) => `${items[0].label} · ${items[0].dataset.label}`,
            label: /** @param {any} tctx */ (tctx) => {
              const isLow = tctx.datasetIndex === 0;
              return (isLow
                ? tooltipLabel(lowMedians, lowP10s, lowP90s)
                : tooltipLabel(highMedians, highP10s, highP90s))(tctx);
            }
          }
        }
      },
      scales: {
        y: {
          min: yMin,
          max: yMax,
          title: { display: true, text: 'Yield change (%)', font: { size: 11 } },
          grid: {
            color: /** @param {any} c */ (c) => c.tick.value === 0 ? '#666' : '#e0e0e0',
            lineWidth: /** @param {any} c */ (c) => c.tick.value === 0 ? 1.5 : 1
          },
          ticks: {
            stepSize: step,
            callback: /** @param {any} v */ (v) => {
              const r = Math.round(Number(v));
              return r > 0 ? `+${r}` : `${r}`;
            }
          }
        },
        x: {
          position: { y: 0 }, // keep the x-axis (and year labels) pinned to the zero line
          grid: { display: false }
        }
      }
    },
    plugins: [errorBarPlugin]
  });
}

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
