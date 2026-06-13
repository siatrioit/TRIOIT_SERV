export type MapOpenIncident = {
    id: string;
    incident_number: string;
    title: string;
    priority: string;
    status: string;
};
export type MapMarker = {
    object_id: string;
    client_id: string;
    client_name: string;
    object_name: string;
    address: string | null;
    city: string | null;
    resolved_address: string | null;
    latitude: number | null;
    longitude: number | null;
    geocoded: boolean;
    open_incident_count: number;
    open_incidents: MapOpenIncident[];
};
export declare function saveMapMarkerCoords(objectId: string, latitude: number, longitude: number): Promise<void>;
export declare function listMapMarkers(): Promise<MapMarker[]>;
//# sourceMappingURL=mapMarkers.d.ts.map