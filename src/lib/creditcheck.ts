import { createPublicClient, fallback, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

const CREDIT_CONTRACT = "0x97630aa70ab14ed9883b41dafccbc11349723043";
const client = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum-rpc.publicnode.com", { retryCount: 2 }),
    http("https://eth.llamarpc.com", { retryCount: 2 }),
    http("https://cloudflare-eth.com", { retryCount: 2 }),
  ]),
});
const creditAbi = parseAbi(["function tokenURI(uint256 tokenId) view returns (string)"]);

function decodeDataUri(uri: string) {
  const comma = uri.indexOf(",");
  if (comma === -1) throw new Error("Invalid data URI");
  const header = uri.slice(0, comma);
  const payload = uri.slice(comma + 1);
  return header.includes(";base64")
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload);
}

export async function getCreditSvg(id: number) {
  const tokenUri = await client.readContract({
    address: CREDIT_CONTRACT,
    abi: creditAbi,
    functionName: "tokenURI",
    args: [BigInt(id)],
  });
  const metadata = JSON.parse(decodeDataUri(tokenUri)) as { image?: string };
  if (!metadata.image?.startsWith("data:image/svg+xml")) {
    throw new Error("Credit artwork not found");
  }
  return decodeDataUri(metadata.image);
}
