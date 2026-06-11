import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapApi, type MapMarker } from '../api/map';
import { geocodeResolvedAddress } from '../utils/geocode';

/** Liepāja */
const DEFAULT_CENTER: [number, number] = [56.5047, 21.0109];
const DEFAULT_ZOOM = 12;

type PositionedMarker = MapMarker & { latitude: number; longitude: number };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Gaida',
  in_progress: 'Procesā',
  paused: 'Apturēts',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Zema',
  medium: 'Vidēja',
  high: 'Augsta',
  critical: 'Kritiska',
};

function markerColor(marker: MapMarker): string {
  if (marker.open_incident_count === 0) return '#2563eb';
  const top = marker.open_incidents[0];
  if (top?.priority === 'critical') return '#dc2626';
  if (top?.priority === 'high') return '#ea580c';
  return '#f59e0b';
}

function formatAddress(marker: MapMarker): string {
  return marker.resolved_address || [marker.address, marker.city].filter(Boolean).join(', ') || 'Adrese nav norādīta';
}

function FitMapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 15 });
  }, [map, positions]);

  return null;
}

function MapLegend({
  total,
  onMap,
  withIncidents,
  missing,
  geocoding,
}: {
  total: number;
  onMap: number;
  withIncidents: number;
  missing: number;
  geocoding: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
      <span>{total} objekti</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
        {onMap - withIncidents} bez atgadījuma
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
        {withIncidents} ar atvērtu atgadījumu
      </span>
      {geocoding && <span className="text-gray-500">Meklē adreses kartē...</span>}
      {missing > 0 && !geocoding && (
        <span className="text-amber-700">{missing} bez koordinātām kartē</span>
      )}
    </div>
  );
}

function ObjectPopup({ marker }: { marker: MapMarker }) {
  return (
    <div className="min-w-[200px] space-y-2 text-sm">
      <div>
        <p className="font-semibold text-gray-900">{marker.object_name}</p>
        <p className="text-gray-600">{marker.client_name}</p>
        <p className="text-gray-500 text-xs mt-1">{formatAddress(marker)}</p>
      </div>

      {marker.open_incident_count > 0 ? (
        <div className="rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-2 space-y-1.5">
          <p className="font-medium text-orange-900">
            {marker.open_incident_count === 1
              ? '1 atvērts atgadījums'
              : `${marker.open_incident_count} atvērti atgadījumi`}
          </p>
          {marker.open_incidents.slice(0, 4).map((inc) => (
            <Link
              key={inc.id}
              to={`/incidents/${inc.id}`}
              className="block text-orange-900 hover:underline"
            >
              <span className="font-medium">{inc.incident_number}</span>
              {' · '}
              {inc.title}
              <span className="text-orange-700 text-xs block">
                {PRIORITY_LABELS[inc.priority] || inc.priority}
                {' · '}
                {STATUS_LABELS[inc.status] || inc.status}
              </span>
            </Link>
          ))}
          {marker.open_incidents.length > 4 && (
            <p className="text-xs text-orange-700">+ vēl {marker.open_incidents.length - 4}</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-xs">Nav atvērtu atgadījumu</p>
      )}

      <Link
        to={`/clients/${marker.client_id}`}
        className="inline-block text-blue-600 hover:underline text-xs"
      >
        Atvērt klienta karti →
      </Link>
    </div>
  );
}

export function MapPage() {
  const [clientCoords, setClientCoords] = useState<
    Record<string, { latitude: number; longitude: number }>
  >({});
  const [geocoding, setGeocoding] = useState(false);
  const geocodedIds = useRef<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['map', 'markers'],
    queryFn: () => mapApi.markers(),
    staleTime: 60_000,
  });

  const markers = data?.data ?? [];

  useEffect(() => {
    geocodedIds.current.clear();
    setClientCoords({});
  }, [data]);

  useEffect(() => {
    const pending = markers.filter(
      (m) =>
        (m.latitude == null || m.longitude == null) &&
        m.resolved_address &&
        !geocodedIds.current.has(m.object_id)
    );
    if (pending.length === 0) {
      setGeocoding(false);
      return;
    }

    let cancelled = false;
    setGeocoding(true);

    (async () => {
      for (const marker of pending) {
        if (cancelled || !marker.resolved_address) continue;
        geocodedIds.current.add(marker.object_id);

        const coords = await geocodeResolvedAddress(marker.resolved_address, marker.city);
        if (cancelled || !coords) continue;

        setClientCoords((prev) => ({
          ...prev,
          [marker.object_id]: { latitude: coords.lat, longitude: coords.lng },
        }));

        mapApi.saveCoordinates(marker.object_id, coords.lat, coords.lng).catch(() => {
          /* koordinātas joprojām redzamas kartē */
        });
      }

      if (!cancelled) setGeocoding(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [markers]);

  const positioned = useMemo((): PositionedMarker[] => {
    return markers
      .map((m) => {
        const extra = clientCoords[m.object_id];
        const latitude = m.latitude ?? extra?.latitude ?? null;
        const longitude = m.longitude ?? extra?.longitude ?? null;
        if (latitude == null || longitude == null) return null;
        return { ...m, latitude, longitude };
      })
      .filter((m): m is PositionedMarker => m != null);
  }, [markers, clientCoords]);

  const positions = useMemo(
    () => positioned.map((m) => [m.latitude, m.longitude] as [number, number]),
    [positioned]
  );

  const withIncidents = positioned.filter((m) => m.open_incident_count > 0).length;
  const missing = markers.length - positioned.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Karte</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Klientu objekti · oranžs = atvērts atgadījums
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50 shrink-0"
        >
          {isFetching ? 'Atjauno...' : 'Atjaunot'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Ielādē objektus un koordinātas...</p>
      ) : error ? (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          Neizdevās ielādēt karti
        </div>
      ) : (
        <>
          <MapLegend
            total={markers.length}
            onMap={positioned.length}
            withIncidents={withIncidents}
            missing={missing}
            geocoding={geocoding}
          />

          {markers.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-6 text-center">
              Nav reģistrētu aktīvu objektu.
            </p>
          ) : (
            <div className="rounded-2xl overflow-hidden h-[62vh] min-h-[320px] border border-gray-200">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitMapBounds positions={positions} />
                {positioned.map((marker) => (
                  <CircleMarker
                    key={marker.object_id}
                    center={[marker.latitude, marker.longitude]}
                    radius={marker.open_incident_count > 0 ? 11 : 8}
                    pathOptions={{
                      color: marker.open_incident_count > 0 ? '#9a3412' : '#1e40af',
                      fillColor: markerColor(marker),
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <ObjectPopup marker={marker} />
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}

          {missing > 0 && !geocoding && (
            <div className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">
              <p className="font-medium">Objekti bez atrašanās vietas kartē</p>
              <ul className="mt-2 space-y-1 text-xs">
                {markers
                  .filter((m) => {
                    const extra = clientCoords[m.object_id];
                    const lat = m.latitude ?? extra?.latitude;
                    const lng = m.longitude ?? extra?.longitude;
                    return lat == null || lng == null;
                  })
                  .slice(0, 8)
                  .map((m) => (
                    <li key={m.object_id}>
                      {m.client_name} — {m.object_name}
                      {m.resolved_address ? `: ${m.resolved_address}` : ''}
                    </li>
                  ))}
                {missing > 8 && <li>+ vēl {missing - 8} objekti</li>}
              </ul>
              <p className="text-xs mt-2 text-amber-700">
                Adrese tiek ņemta no objekta vai klienta kartes. Pārbaudiet, vai norādīta pilsēta
                (piem. Liepāja) un iela ar numuru.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
