/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */
export declare function buildGeocodeQuery(parts: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
}): string | null;
export declare function geocodeAddress(query: string): Promise<{
    lat: number;
    lng: number;
} | null>;
//# sourceMappingURL=geocode.d.ts.map