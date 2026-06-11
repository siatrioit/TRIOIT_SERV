/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */

const cache = new Map<string, { lat: number; lng: number }>();
let lastRequestAt = 0;

export type GeocodeParts = {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCountry(country?: string | null): string {
  const raw = (country || 'LV').trim();
  if (/^(lv|latvija)$/i.test(raw)) return 'Latvia';
  return raw || 'Latvia';
}

/** Ja pilsēta nav norādīta, mēģina izvilkt no adreses ("…, Liepāja") */
function extractCity(address: string, city?: string | null): string | null {
  const trimmed = city?.trim();
  if (trimmed) return trimmed;
  const match = address.match(/,\s*([^,]+)\s*$/);
  return match?.[1]?.trim() || null;
}

export function buildGeocodeQueries(parts: GeocodeParts): string[] {
  const address = parts.address?.trim() || null;
  const city = address ? extractCity(address, parts.city) : parts.city?.trim() || null;
  const postal = parts.postal_code?.trim() || null;
  const country = normalizeCountry(parts.country);

  const queries: string[] = [];

  if (address && city) {
    queries.push(`${address}, ${city}, ${country}`);
    if (!address.toLowerCase().includes(city.toLowerCase())) {
      queries.push(`${city}, ${address}, ${country}`);
    }
  }
  if (address) {
    queries.push(`${address}, ${country}`);
  }
  if (postal && city) {
    queries.push(`${postal}, ${city}, ${country}`);
  }
  if (city) {
    queries.push(`${city}, ${country}`);
  }

  return [...new Set(queries.filter(Boolean))];
}

export function formatResolvedAddress(parts: GeocodeParts): string | null {
  const address = parts.address?.trim() || null;
  const city = address ? extractCity(address, parts.city) : parts.city?.trim() || null;
  const postal = parts.postal_code?.trim() || null;
  const segments = [address, city, postal].filter(Boolean);
  return segments.length > 0 ? segments.join(', ') : null;
}

async function nominatimFetch(url: URL): Promise<{ lat: number; lng: number } | null> {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TRIO-SERV/1.0 (serv.trioit.lv; field service map)' },
    });
    if (!res.ok) {
      console.warn('[geocode] Nominatim HTTP', res.status, url.pathname + url.search);
      return null;
    }

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;

    const coords = { lat: Number(first.lat), lng: Number(first.lon) };
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;
    return coords;
  } catch (err) {
    console.warn('[geocode] Nominatim fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function geocodeStructured(
  street: string,
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'lv');
  url.searchParams.set('street', street);
  url.searchParams.set('city', city);
  url.searchParams.set('country', country);
  return nominatimFetch(url);
}

export async function geocodeAddress(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const hit = cache.get(key);
  if (hit) return hit;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'lv');
  url.searchParams.set('q', query);

  const coords = await nominatimFetch(url);
  if (coords) cache.set(key, coords);
  return coords;
}

/** Mēģina vairākus vaicājumus + strukturētu meklēšanu */
export async function geocodeLocation(
  parts: GeocodeParts
): Promise<{ lat: number; lng: number } | null> {
  const address = parts.address?.trim() || null;
  const city = address ? extractCity(address, parts.city) : parts.city?.trim() || null;
  const country = normalizeCountry(parts.country);

  if (address && city) {
    const structured = await geocodeStructured(address, city, country);
    if (structured) {
      cache.set(formatResolvedAddress(parts)?.toLowerCase() || '', structured);
      return structured;
    }
  }

  for (const q of buildGeocodeQueries(parts)) {
    const hit = cache.get(q.toLowerCase());
    if (hit) return hit;

    const coords = await geocodeAddress(q);
    if (coords) return coords;
  }

  return null;
}

/** Neliels novirzījums, ja vairāki objekti ar vienu pilsētas punktu */
export function jitterCoords(
  lat: number,
  lng: number,
  seed: string
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const angle = ((hash & 0xffff) / 0xffff) * Math.PI * 2;
  const dist = 0.001 + ((hash >>> 16) & 0xff) / 0xff * 0.002;
  return {
    lat: lat + Math.sin(angle) * dist,
    lng: lng + Math.cos(angle) * dist,
  };
}
