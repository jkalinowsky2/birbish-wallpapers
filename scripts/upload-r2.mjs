// scripts/upload-r2.mjs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
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
  console.error("❌ Missing required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET");
  process.exit(1);
}

const [srcDirArg, destPrefixArg, ...extraArgs] = process.argv.slice(2);
if (!srcDirArg) {
  console.error("Usage: node scripts/upload-r2.mjs <sourceDir> [destPrefix] [--start N] [--end M] [--concurrency K]");
  process.exit(1);
}

// --- parse optional flags ---
const args = Object.fromEntries(extraArgs.map((a, i, arr) => {
  if (!a.startsWith("--")) return [];
  const key = a.replace(/^--/, "");
  const val = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true;
  return [key, val];
}));
const START = parseInt(args.start || "0", 10);
const END = args.end ? parseInt(args.end, 10) : null;
const CONCURRENCY = parseInt(args.concurrency || "16", 10);

const SRC_DIR = path.resolve(srcDirArg);
const DEST_PREFIX = destPrefixArg ? destPrefixArg.replace(/^\/+/, "").replace(/\/+$/, "") + "/" : "";

// --- force correct SigV4 signer for Cloudflare R2 ---
const creds = {
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
};

const signer = new SignatureV4({
  credentials: creds,
  region: "auto",
  service: "s3",
  sha256: Sha256,
});

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: creds,
  forcePathStyle: true,
  signer, // 🔥 this fixes the SigV4 credential error
});

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
  const allFiles = await fg(["**/*.png"], { cwd: SRC_DIR, absolute: true, dot: false });
  if (allFiles.length === 0) {
    console.error("❌ No files found in", SRC_DIR);
    process.exit(1);
  }

  const files = allFiles.slice(START, END ? END + 1 : undefined);
  console.log(`Uploading ${files.length} file(s) from ${SRC_DIR} -> r2://${R2_BUCKET}/${DEST_PREFIX}`);
  console.log(`Concurrency = ${CONCURRENCY}`);

  let done = 0;
  const tasks = files.map((f) => limit(async () => {
    try {
      await putOne(f);
      done++;
      if (done % 50 === 0 || done === files.length) {
        process.stdout.write(`\r${done}/${files.length} done`);
      }
      return { status: "fulfilled", f };
    } catch (err) {
      console.error(`\nFAIL: ${path.basename(f)} — ${err.message}`);
      return { status: "rejected", f, err };
    }
  }));

  const results = await Promise.all(tasks);
  const failed = results.filter(r => r.status === "rejected");
  console.log(`\nDone. Success: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length) process.exit(1);
})();