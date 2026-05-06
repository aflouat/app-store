// Edge-compatible — no Node.js APIs

export interface RouteRule {
  prefix: string
  roles: string[]
}

export interface RateEntry {
  count: number
  resetAt: number
}

export interface RateLimitRule {
  pattern: RegExp
  limit: number
  windowMs: number
}

export function checkRateLimit(
  map: Map<string, RateEntry>,
  rules: RateLimitRule[],
  ip: string,
  pathname: string
): boolean {
  const rule = rules.find(r => r.pattern.test(pathname))
  if (!rule) return false

  const key = `${ip}:${pathname.replace(/\/[0-9a-f-]{36}/g, '/:id')}`
  const now  = Date.now()
  const entry = map.get(key)

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + rule.windowMs })
    return false
  }

  entry.count++
  return entry.count > rule.limit
}

export function maybeCleanMap(map: Map<string, RateEntry>): void {
  if (map.size > 500) {
    const now = Date.now()
    for (const [k, v] of map) {
      if (now > v.resetAt) map.delete(k)
    }
  }
}

export function matchRouteRule(
  pathname: string,
  rules: RouteRule[]
): RouteRule | undefined {
  return rules.find(r => pathname.startsWith(r.prefix))
}
