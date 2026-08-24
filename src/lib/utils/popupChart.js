import { renderClimateChart } from '$lib/utils/chart.js';

/**
 * Prepare chart data from CSV points for popup rendering
 * - Normalizes min/max fields
 * - Ensures numeric conversion
 * @param {Array<Object>} points
 * @returns {Array<Object>}
 */
export function prepareChartData(points) {
  return points.map(point => {
    const fieldNames = Object.keys(point);

    // Identify possible min/max fields dynamically (fields containing 10/90)
    const minField = fieldNames.find(f => f.includes('10'));
    const maxField = fieldNames.find(f => f.includes('90'));

    // Parse min/max if found, fallback to existing fields if defined
    const minValue =
      minField && point[minField] !== undefined
        ? parseFloat(point[minField])
        : typeof point.delta_value_run_min === 'number'
        ? point.delta_value_run_min
        : undefined;

    const maxValue =
      maxField && point[maxField] !== undefined
        ? parseFloat(point[maxField])
        : typeof point.delta_value_run_max === 'number'
        ? point.delta_value_run_max
        : undefined;

    return {
      name: String(point.name || ''),
      year: point.year || '',
      delta_value_mean: parseFloat(point.delta_value_mean) || 0,
      sceno: String(point.sceno || ''),
      delta_value_run_min: minValue,
      delta_value_run_max: maxValue
    };
  });
}

/**
 * Render popup chart using prepared data
 * @param {HTMLCanvasElement} canvas
 * @param {Array<Object>} dataPoints
 */
export function renderPopupChart(canvas, dataPoints) {
  if (!canvas || !dataPoints || dataPoints.length === 0) return;
  renderClimateChart(canvas, dataPoints, {});
}
