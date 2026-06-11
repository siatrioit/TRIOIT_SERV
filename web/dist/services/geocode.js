"use strict";
/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGeocodeQuery = buildGeocodeQuery;
exports.geocodeAddress = geocodeAddress;
const cache = new Map();
let lastRequestAt = 0;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildGeocodeQuery(parts) {
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
async function geocodeAddress(query) {
    const key = query.trim().toLowerCase();
    if (!key)
        return null;
    const hit = cache.get(key);
    if (hit)
        return hit;
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - lastRequestAt));
    if (wait > 0)
        await sleep(wait);
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
        if (!res.ok)
            return null;
        const data = (await res.json());
        const first = data[0];
        if (!first)
            return null;
        const coords = { lat: Number(first.lat), lng: Number(first.lon) };
        if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng))
            return null;
        cache.set(key, coords);
        return coords;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=geocode.js.map