/**
 * Upload the built indicator grid to Hetzner Object Storage.
 *
 * Uploads each .geojson gzipped under its plain key with Content-Encoding: gzip,
 * so the viewer keeps requesting `ghana_grid_wbgt.geojson` while ~71 KB goes over
 * the wire as ~20 KB. Object storage does not compress on the fly, and the bucket
 * currently serves everything as application/octet-stream with no Cache-Control,
 * so both are set here too.
 *
 * Dry run by default — nothing is written without --yes.
 *
 *   node scripts/upload_grid_to_hetzner.mjs                     # show the plan
 *   node scripts/upload_grid_to_hetzner.mjs --yes                # upload
 *   node scripts/upload_grid_to_hetzner.mjs --yes --bucket other
 *
 * Credentials come from .env (HETZNER_ACCESS_KEY / HETZNER_SECRET_KEY), the same
 * pair src/lib/server/s3.js uses.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { basename, join } from "node:path"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const ENDPOINT = "https://fsn1.your-objectstorage.com"
const REGION = "eu-central-1"
const CACHE_CONTROL = "public, max-age=86400"

/** @param {string[]} argv */
function parseArgs(argv) {
  const args = { dir: "build/ghana_grid", bucket: "ghanaciaviewer", yes: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--yes") args.yes = true
    else if (argv[i] === "--dir") args.dir = argv[++i]
    else if (argv[i] === "--bucket") args.bucket = argv[++i]
    else {
      console.error(`Unknown argument: ${argv[i]}`)
      process.exit(1)
    }
  }
  return args
}

/** Read KEY=value pairs out of .env without adding a dotenv dependency. */
function readEnvFile(path = ".env") {
  if (!existsSync(path)) return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const env = { ...readEnvFile(), ...process.env }
const accessKeyId = env.HETZNER_ACCESS_KEY
const secretAccessKey = env.HETZNER_SECRET_KEY

if (!accessKeyId || !secretAccessKey) {
  console.error("Missing HETZNER_ACCESS_KEY / HETZNER_SECRET_KEY (.env or environment)")
  process.exit(1)
}
if (!existsSync(args.dir)) {
  console.error(`No such folder: ${args.dir} — run scripts/build_ghana_grid_indicators.py first`)
  process.exit(1)
}

// Only the plain .geojson files and the manifest; the .geojson.gz copies the
// build script can write are for size inspection, not for upload (the gzipping
// happens here so the object keeps its plain key).
const files = readdirSync(args.dir)
  .filter((f) => f.endsWith(".geojson") || f.endsWith("manifest.json"))
  .sort()

if (!files.length) {
  console.error(`No .geojson files in ${args.dir}`)
  process.exit(1)
}

const client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
})

console.log(`${args.yes ? "Uploading" : "DRY RUN — would upload"} ${files.length} file(s)`)
console.log(`  to ${ENDPOINT}/${args.bucket}/\n`)

let rawTotal = 0
let sentTotal = 0
/** @type {string[]} */
const uploaded = []

for (const file of files) {
  const key = basename(file)
  const body = readFileSync(join(args.dir, file))
  const gz = gzipSync(body, { level: 9 })
  rawTotal += body.length
  sentTotal += gz.length

  const label =
    `  ${key.padEnd(44)} ${(body.length / 1024).toFixed(1).padStart(7)} KB ` +
    `-> ${(gz.length / 1024).toFixed(1).padStart(6)} KB gz`

  if (!args.yes) {
    console.log(label)
    continue
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: args.bucket,
        Key: key,
        Body: gz,
        ContentEncoding: "gzip",
        ContentType: key.endsWith(".json") ? "application/json" : "application/geo+json",
        CacheControl: CACHE_CONTROL,
      })
    )
    console.log(`${label}  ok`)
    uploaded.push(key)
  } catch (error) {
    console.log(`${label}  FAILED: ${error?.message}`)
  }
}

console.log(
  `\n${(rawTotal / 1024).toFixed(1)} KB raw -> ${(sentTotal / 1024).toFixed(1)} KB over the wire`
)

if (!args.yes) {
  console.log("\nNothing was written. Re-run with --yes to upload.")
  process.exit(0)
}

// The bucket does not allow listing, so verify by fetching the objects back —
// this also catches the case where they upload fine but are not publicly
// readable (the viewer fetches them straight from the browser, unauthenticated).
console.log("\nVerifying public readability:")
let unreadable = 0
for (const key of uploaded) {
  const url = `${ENDPOINT}/${args.bucket}/${key}`
  try {
    const response = await fetch(url, { method: "GET", headers: { "Accept-Encoding": "gzip" } })
    if (!response.ok) {
      console.log(`  ${key.padEnd(44)} HTTP ${response.status}`)
      unreadable++
      continue
    }
    const text = await response.text()
    const parsed = JSON.parse(text)
    const count = parsed.features ? `${parsed.features.length} features` : "manifest"
    console.log(
      `  ${key.padEnd(44)} ok, ${count}, ` +
        `encoding=${response.headers.get("content-encoding") || "none"}`
    )
  } catch (error) {
    console.log(`  ${key.padEnd(44)} FAILED: ${error?.message}`)
    unreadable++
  }
}

if (unreadable) {
  console.log(
    `\n${unreadable} object(s) not publicly readable. The other files in this bucket are, ` +
      `so check whether this bucket grants public read via bucket policy (nothing to do) ` +
      `or per-object ACL (then the objects need acl=public-read).`
  )
  process.exit(1)
}

console.log("\nDone. The layers are live for Ghana in the viewer.")
