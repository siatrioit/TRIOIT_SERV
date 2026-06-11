/** Pārlūka ģeokodēšana (rezerve, ja serveris nevar sasniegt Nominatim) */

const CACHE_KEY = 'trio-serv-geocode-v1';
const cache = new Map<string, { lat: number; lng: number }>();
let lastRequestAt = 0;

function loadCache(): void {
  if (cache.size > 0) return;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, { lat: number; lng: number }>;
    for (const [k, v] of Object.entries(parsed)) {
      cache.set(k, v);
    }
  } catch {
    /* ignore */
  }
}

function saveCache(): void {
  try {
    const obj = Object.fromEntries(cache.entries());
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeInBrowser(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  loadCache();
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const hit = cache.get(key);
  if (hit) return hit;

  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'lv');
  url.searchParams.set('q', query);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;

    const coords = { lat: Number(first.lat), lng: Number(first.lon) };
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

    cache.set(key, coords);
    saveCache();
    return coords;
  } catch {
    return null;
  }
}

export async function geocodeResolvedAddress(
  resolvedAddress: string,
  fallbackCity?: string | null
): Promise<{ lat: number; lng: number } | null> {
  const queries = [resolvedAddress];
  if (fallbackCity && !resolvedAddress.toLowerCase().includes(fallbackCity.toLowerCase())) {
    queries.push(`${resolvedAddress}, ${fallbackCity}, Latvia`);
  }

  for (const q of queries) {
    const hit = await geocodeInBrowser(q);
    if (hit) return hit;
  }
  return null;
}
