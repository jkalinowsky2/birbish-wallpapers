// scripts/upload-r2.mjs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fg from "fast-glob";
import fs from "fs";
import path from "path";
import mime from "mime";
import pLimit from "p-limit";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET");
  process.exit(1);
}

const [srcDirArg, destPrefixArg] = process.argv.slice(2);
if (!srcDirArg) {
  console.error("Usage: node scripts/upload-r2.mjs <sourceDir> [destPrefix]");
  process.exit(1);
}

const SRC_DIR = path.resolve(srcDirArg);
const DEST_PREFIX = destPrefixArg ? destPrefixArg.replace(/^\/+/, "").replace(/\/+$/, "") + "/" : "";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const CONCURRENCY = 16; // tune up/down depending on your connection
const limit = pLimit(CONCURRENCY);

function relKey(fp) {
  const rel = path.relative(SRC_DIR, fp).split(path.sep).join("/");
  return DEST_PREFIX + rel;
}

async function putOne(filePath) {
  const key = relKey(filePath);
  const ct = mime.getType(filePath) || "application/octet-stream";
  const Body = fs.createReadStream(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body,
    ContentType: ct,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return key;
}

(async () => {
  // adjust the glob patterns if you need more than PNGs
  const files = await fg(["**/*.png"], { cwd: SRC_DIR, absolute: true, dot: false });
  if (files.length === 0) {
    console.error("No files found in", SRC_DIR);
    process.exit(1);
  }

  console.log(`Uploading ${files.length} files from ${SRC_DIR} -> r2://${R2_BUCKET}/${DEST_PREFIX || ""}`);
  let done = 0;

  const tasks = files.map((f) => limit(async () => {
    const key = await putOne(f);
    done++;
    if (done % 50 === 0 || done === files.length) {
      process.stdout.write(`\r${done}/${files.length} done`);
    }
    return key;
  }));

  const keys = await Promise.allSettled(tasks);
  console.log("\nDone.");

  const failed = keys.filter(x => x.status === "rejected");
  if (failed.length) {
    console.error(`Failed uploads: ${failed.length}`);
    process.exit(1);
  }
})();