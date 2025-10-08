import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// 1) RPC endpoint
const RPC = "https://apechain-mainnet.g.alchemy.com/v2/uDdmzCa4w1IkWt8fF433V5agMCHZtRm2";

// 2) Contract + function selector (from your network log)
const CONTRACT = "0x06420C064D5fA1768ce2C8dCe3ef2C4BF601F274";
const SELECTOR = "0x3efabdf4"; // function selector (4 bytes)

// 3) Range + out dir from CLI (defaults)
const start = Number(process.argv[2] ?? 1);
const end   = Number(process.argv[3] ?? 10);
const OUT   = process.argv[4] ?? "./gobs-svg";

fs.mkdirSync(OUT, { recursive: true });

// helper: left-pad uint256 as 32-byte hex
function hexPad32(n) {
  const hex = BigInt(n).toString(16);
  return hex.length >= 64 ? hex : "0".repeat(64 - hex.length) + hex;
}

// minimal ABI decoder for a single string return
function decodeSingleString(retHex) {
  // retHex is the raw ABI-encoded return data, e.g. 0x + <offset><len><data...>
  // We parse per Solidity ABI for a single dynamic string.
  if (!retHex || !retHex.startsWith("0x")) throw new Error("Bad return hex");
  const hex = retHex.slice(2);

  const u256 = (off) => BigInt("0x" + hex.slice(off, off + 64));
  const slice = (off, len) => "0x" + hex.slice(off, off + len);

  // first 32 bytes: offset to data (usually 0x20)
  const offset = Number(u256(0));
  // length starts at offset + 32 bytes
  const lenPos = offset * 2; // hex chars
  const length = Number(u256(lenPos));
  const dataStart = (offset + 32) * 2;
  const dataHex = hex.slice(dataStart, dataStart + length * 2);

  // UTF-8 decode
  const buf = Buffer.from(dataHex, "hex");
  return buf.toString("utf8");
}

async function fetchOne(id) {
  // calldata = selector + 32-byte tokenId
  const calldata = SELECTOR + hexPad32(id);

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      { to: CONTRACT, data: calldata },
      "latest",
    ],
  };

  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  }

  const ret = json.result; // ABI-encoded return
  if (!ret || ret === "0x") {
    throw new Error("Empty result (maybe wrong selector or tokenId)");
  }

  const svgText = decodeSingleString(ret);

  // Some contracts return data URLs like "data:image/svg+xml;base64,..." or "...,<svg...>"
  let finalSvg;
  if (svgText.startsWith("data:")) {
    const [meta, payload] = svgText.split(",", 2);
    if (/;base64/i.test(meta)) {
      finalSvg = Buffer.from(payload, "base64").toString("utf8");
    } else {
      finalSvg = decodeURIComponent(payload);
    }
  } else {
    finalSvg = svgText;
  }

  const outPath = path.join(OUT, `${id}.svg`);
  fs.writeFileSync(outPath, finalSvg, "utf8");
  return outPath;
}

(async () => {
  console.log(`Downloading SVGs ${start}..${end} → ${OUT}`);
  let ok = 0, fail = 0;
  for (let id = start; id <= end; id++) {
    try {
      const fp = await fetchOne(id);
      ok++;
      if (ok % 25 === 0) process.stdout.write(`\rOK ${ok}, Fail ${fail}`);
    } catch (e) {
      fail++;
      console.error(`\nFAIL ${id}: ${e.message}`);
    }
  }
  console.log(`\nDone. Success: ${ok}, Failed: ${fail}`);
})();