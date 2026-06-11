/** Nominatim ģeokodēšana — kešatmiņa + 1 req/s (OSM politika) */
export type GeocodeParts = {
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
};
export declare function buildGeocodeQueries(parts: GeocodeParts): string[];
export declare function formatResolvedAddress(parts: GeocodeParts): string | null;
export declare function geocodeAddress(query: string): Promise<{
    lat: number;
    lng: number;
} | null>;
/** Mēģina vairākus vaicājumus + strukturētu meklēšanu */
export declare function geocodeLocation(parts: GeocodeParts): Promise<{
    lat: number;
    lng: number;
} | null>;
/** Neliels novirzījums, ja vairāki objekti ar vienu pilsētas punktu */
export declare function jitterCoords(lat: number, lng: number, seed: string): {
    lat: number;
    lng: number;
};
//# sourceMappingURL=geocode.d.ts.map