/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */

const cache = new Map<string, { lat: number; lng: number }>();
let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildGeocodeQuery(parts: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}): string | null {
  const country = parts.country?.trim() || 'Latvija';
  const segments = [
    parts.address?.trim(),
    parts.name?.trim(),
    parts.city?.trim(),
    parts.postal_code?.trim(),
    country,
  ].filter(Boolean);
  return segments.length > 0 ? segments.join(', ') : null;
}

export async function geocodeAddress(
  query: string
): Promise<{ lat: number; lng: number } | null> {
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
      headers: { 'User-Agent': 'TRIO-SERV/1.0 (serv.trioit.lv; field service map)' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;

    const coords = { lat: Number(first.lat), lng: Number(first.lon) };
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

    cache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}
