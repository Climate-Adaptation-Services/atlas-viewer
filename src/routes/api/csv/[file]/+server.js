import { getObject } from '$lib/server/s3.js';

/** @type {Record<string, string>} */
const buckets = {
  kenya: 'kenya-csv-data',
  zimbabwe: 'zimbabwe-csv-data',
};

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
  const { file } = params;
  const country = url.searchParams.get('country')?.toLowerCase() || 'zimbabwe';

  if (!file.endsWith('.csv')) {
    return new Response('Invalid file type', { status: 400 });
  }

  const bucket = buckets[country] || buckets.zimbabwe;

  try {
    const body = await getObject(bucket, file);

    return new Response(body, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'max-age=3600',
      },
    });
  } catch (error) {
    console.error(`Error fetching ${file} from ${bucket}:`, error?.message);

    if (error?.name === 'NoSuchKey') {
      return new Response('File not found', { status: 404 });
    }

    return new Response('Server error fetching CSV data', { status: 500 });
  }
}
