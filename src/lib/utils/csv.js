import { csvData } from '$lib/stores.js';

/**
 * Maps user-facing layer names to CSV file codes
 */
const dataLayerMap = {
  "Maximum temperature": "tasmax_mean",
  "Minimum temperature": "tasmin_mean",
  "Average temperature": "tas_mean",
  "Total rainfall": "pr_sum",
  "Days above 20 mm": "pr_a20mm",
  "Dry spells": "pr_cdd5",
  "Dry Spells": "pr_cdd5", // for backwards compatibility
  "Days above 35°C": "daysabove_35"
};

/**
 * Layers that use a fixed CSV filename (not constructed from scenario)
 * @type {Record<string, string>}
 */
const fixedCsvFiles = {
  "Days above 35°C": "daysabove_35_kenya.csv"
};

/**
 * Maps user-facing scenario names to SSP codes
 */
const scenarioMap = {
  "Low": "ssp126",
  "High": "ssp585"
};

/**
 * Loads CSV data for a given layer and scenario, parses it, and updates csvData store
 * @param {string} layerName - e.g. "Maximum temperature"
 * @param {string} scenarioName - e.g. "Low" or "High"
 * @param {string} countryCode - Country code (e.g. "kenya", "zimbabwe")
 * @returns {Promise<Array<Record<string, string|number>>>}
 */
export async function loadCsvData(layerName, scenarioName, countryCode) {
  try {
    // Map display names to codes
    const layerCode = dataLayerMap[layerName] || 'pr_a20mm';
    const sspCode = scenarioMap[scenarioName] || 'ssp126';
    const country = countryCode?.toLowerCase() || 'zimbabwe';

    console.log(`Loading data for layer: ${layerCode}, scenario: ${sspCode}, country: ${country}`);

    // Build CSV filename (use fixed filename if defined, otherwise standard pattern)
    const csvFile = fixedCsvFiles[layerName] || `${layerCode}_${sspCode}_90-10.csv`;

    // Fetch CSV via API route (proxy to S3) with country parameter
    const response = await fetch(`/api/csv/${csvFile}?country=${country}`);
    if (!response.ok) throw new Error('Failed to fetch CSV data');

    const text = await response.text();

    // Parse CSV manually
    const rows = text.split('\r\n').filter(row => row.trim() !== '');
    const headers = rows[0].split(',');

    const parsedData = rows.slice(1).map(row => {
      const values = row.split(',');
      const obj = {};
      headers.forEach((header, i) => {
        const value = values[i] || '';
        obj[header] =
          !isNaN(Number(value)) && header !== 'year'
            ? parseFloat(value)
            : value;
      });
      return obj;
    });

    // Filter by layer code (name field must match)
    // For fixed CSV files, use all data if no name field matches
    let filteredData = parsedData.filter(row => row.name === layerCode);
    if (filteredData.length === 0 && fixedCsvFiles[layerName]) {
      filteredData = parsedData;
    }

    // Update the Svelte store
    csvData.set(filteredData);

    console.log(
      `CSV data loaded: ${filteredData.length} rows for layer ${layerCode} and scenario ${sspCode}`
    );

    return filteredData;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    csvData.set([]);
    return [];
  }
}
