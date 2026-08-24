import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { HETZNER_ACCESS_KEY, HETZNER_SECRET_KEY } from '$env/static/private';

export const s3 = new S3Client({
  region: 'eu-central-1',
  endpoint: 'https://fsn1.your-objectstorage.com',
  forcePathStyle: true,
  credentials: {
    accessKeyId: HETZNER_ACCESS_KEY,
    secretAccessKey: HETZNER_SECRET_KEY,
  },
});

/**
 * Fetch a file from a Hetzner S3 bucket
 * @param {string} bucket - Bucket name
 * @param {string} key - File key/path
 * @returns {Promise<string>} File contents as string
 */
export async function getObject(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);
  return await response.Body?.transformToString();
}
