/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
  try {
    const { file } = params;
    
    // Safely check that we're only accessing CSV files - security measure
    if (!file.endsWith('.csv')) {
      return new Response('Invalid file type', { status: 400 });
    }
    
    // Fetch the CSV file from S3
    const response = await fetch(`https://zimbabwe-csv-data.s3.eu-north-1.amazonaws.com/${file}`);
    
    if (!response.ok) {
      return new Response(`Failed to fetch data: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    const csvData = await response.text();
    
    // Return the CSV data with the appropriate headers
    return new Response(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error proxying CSV data:', error);
    return new Response('Server error fetching CSV data', { status: 500 });
  }
}
