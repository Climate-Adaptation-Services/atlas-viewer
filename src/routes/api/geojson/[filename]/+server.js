import { getObject } from '$lib/server/s3.js';

/** @type {Record<string, string>} */
const buckets = {
  kenya: 'kenyaciaviewer',
  zimbabwe: 'zimciaviewer',
};

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
  const { filename } = params;
  const country = url.searchParams.get('country')?.toLowerCase() || 'kenya';

  if (!filename.endsWith('.geojson')) {
    return new Response('Invalid file type', { status: 400 });
  }

  const bucket = buckets[country] || buckets.kenya;

  try {
    const body = await getObject(bucket, filename);

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error(`Error fetching ${filename} from ${bucket}:`, error?.message);

    if (error?.name === 'NoSuchKey') {
      return new Response('File not found', { status: 404 });
    }

    return new Response('Server error fetching geojson data', { status: 500 });
  }
}
