import { Redis } from '@upstash/redis'

// uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env
export const kv = Redis.fromEnv()

export async function hasClaimed(address: string) {
  const key = `claim:${address.toLowerCase()}`
  return Boolean(await kv.get(key))
}

export async function markClaimed(address: string, sessionId: string) {
  const key = `claim:${address.toLowerCase()}`
  // no TTL (permanent). If you want 1 year, use: await kv.set(key, sessionId, { ex: 60*60*24*365 })
  await kv.set(key, sessionId)
}