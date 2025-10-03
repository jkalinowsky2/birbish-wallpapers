// scripts/download-glyders.ts
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

//const BASE_URL = "https://ipfs.io/ipfs/bafybeih7cmapl2jiop7slb5l762dzpqnfbggokovhc65zegql5hkr5xthe";  //pixel URL
const BASE_URL = "https://ipfs.io/ipfs/bafybeiarws7dnd4vzeczia6tlmmhinamfwjfdjzsnotkbmq27gbqg3q7lu";  //illustrated URL
const OUT_DIR = path.resolve("downloads/glyders-illustrated");

// Adjust these for your token range
const START_ID = 1;
const END_ID = 3333; // <-- change to however many tokens you want to fetch

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  for (let id = START_ID; id <= END_ID; id++) {
    const url = `${BASE_URL}/${id}.png`;
    const outPath = path.join(OUT_DIR, `${id}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`Skip ${id} (already exists)`);
      continue;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outPath, buffer);
      console.log(`OK   ${id}.png (${buffer.length} bytes)`);
    } catch (err: any) {
      console.error(`FAIL ${id}: ${err.message}`);
    }
  }
}

main();