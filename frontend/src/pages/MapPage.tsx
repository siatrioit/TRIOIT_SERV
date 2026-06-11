import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/** Karte ar klientu atrašanās vietām — Leaflet */
export function MapPage() {
  const defaultCenter: [number, number] = [56.9496, 24.1052]; // Rīga

  // TODO: ielādēt klientus ar GPS no API
  const clients: Array<{ id: string; name: string; lat: number; lng: number }> = [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Karte</h2>
      <div className="rounded-2xl overflow-hidden h-[60vh] border border-gray-200">
        <MapContainer center={defaultCenter} zoom={11} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {clients.map((c) => (
            <Marker key={c.id} position={[c.lat, c.lng]}>
              <Popup>{c.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
