"use strict";
/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGeocodeQueries = buildGeocodeQueries;
exports.formatResolvedAddress = formatResolvedAddress;
exports.geocodeAddress = geocodeAddress;
exports.geocodeLocation = geocodeLocation;
exports.jitterCoords = jitterCoords;
const cache = new Map();
let lastRequestAt = 0;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function normalizeCountry(country) {
    const raw = (country || 'LV').trim();
    if (/^(lv|latvija)$/i.test(raw))
        return 'Latvia';
    return raw || 'Latvia';
}
/** Ja pilsēta nav norādīta, mēģina izvilkt no adreses ("…, Liepāja") */
function extractCity(address, city) {
    const trimmed = city?.trim();
    if (trimmed)
        return trimmed;
    const match = address.match(/,\s*([^,]+)\s*$/);
    return match?.[1]?.trim() || null;
}
function buildGeocodeQueries(parts) {
    const address = parts.address?.trim() || null;
    const city = address ? extractCity(address, parts.city) : parts.city?.trim() || null;
    const postal = parts.postal_code?.trim() || null;
    const country = normalizeCountry(parts.country);
    const queries = [];
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
function formatResolvedAddress(parts) {
    const address = parts.address?.trim() || null;
    const city = address ? extractCity(address, parts.city) : parts.city?.trim() || null;
    const postal = parts.postal_code?.trim() || null;
    const segments = [address, city, postal].filter(Boolean);
    return segments.length > 0 ? segments.join(', ') : null;
}
async function nominatimFetch(url) {
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - lastRequestAt));
    if (wait > 0)
        await sleep(wait);
    lastRequestAt = Date.now();
    try {
        const res = await fetch(url.toString(), {
            headers: { 'User-Agent': 'TRIO-SERV/1.0 (serv.trioit.lv; field service map)' },
        });
        if (!res.ok) {
            console.warn('[geocode] Nominatim HTTP', res.status, url.pathname + url.search);
            return null;
        }
        const data = (await res.json());
        const first = data[0];
        if (!first)
            return null;
        const coords = { lat: Number(first.lat), lng: Number(first.lon) };
        if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng))
            return null;
        return coords;
    }
    catch (err) {
        console.warn('[geocode] Nominatim fetch failed:', err instanceof Error ? err.message : err);
        return null;
    }
}
async function geocodeStructured(street, city, country) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'lv');
    url.searchParams.set('street', street);
    url.searchParams.set('city', city);
    url.searchParams.set('country', country);
    return nominatimFetch(url);
}
async function geocodeAddress(query) {
    const key = query.trim().toLowerCase();
    if (!key)
        return null;
    const hit = cache.get(key);
    if (hit)
        return hit;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'lv');
    url.searchParams.set('q', query);
    const coords = await nominatimFetch(url);
    if (coords)
        cache.set(key, coords);
    return coords;
}
/** Mēģina vairākus vaicājumus + strukturētu meklēšanu */
async function geocodeLocation(parts) {
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
        if (hit)
            return hit;
        const coords = await geocodeAddress(q);
        if (coords)
            return coords;
    }
    return null;
}
/** Neliels novirzījums, ja vairāki objekti ar vienu pilsētas punktu */
function jitterCoords(lat, lng, seed) {
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
//# sourceMappingURL=geocode.js.map