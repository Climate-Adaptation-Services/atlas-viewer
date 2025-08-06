/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
  try {
    const { file } = params;
    const country = url.searchParams.get('country')?.toLowerCase() || 'zimbabwe';
    
    // Safely check that we're only accessing CSV files - security measure
    if (!file.endsWith('.csv')) {
      return new Response('Invalid file type', { status: 400 });
    }
    
    // Get the appropriate S3 bucket URL based on country
    let bucketUrl;
    switch (country) {
      case 'kenya':
        bucketUrl = 'https://kenya-csv-data.s3.eu-north-1.amazonaws.com';
        break;
      case 'zimbabwe':
      default:
        bucketUrl = 'https://zimbabwe-csv-data.s3.eu-north-1.amazonaws.com';
        break;
    }
    
    console.log(`Fetching CSV from ${bucketUrl}/${file} for country: ${country}`);
    
    // Fetch the CSV file from the appropriate S3 bucket
    const response = await fetch(`${bucketUrl}/${file}`);
    
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
