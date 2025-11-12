import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function App() {
  const [data, setData] = useState({ data: [] });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  async function fetchCombined() {
    try {
      const res = await fetch("/api/combined");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load combined:", err);
    }
  }

  useEffect(() => {
    fetchCombined();
    
    timerRef.current = setInterval(fetchCombined, 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  
  const byId = {};
  (data.data || []).forEach((p) => {
    const id = p.id || `${p.lat},${p.lon}`;
    if (!byId[id]) byId[id] = [];
    byId[id].push(p);
  });


  const first = Object.values(byId)[0]?.[0];
  const center = first ? [first.lat, first.lon] : [20, 0];

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <div style={{ position: "absolute", zIndex: 4000, padding: 8, background: "white" }}>
        <strong>WindBorne — Live Constellation</strong>
        <div>Points: {(data.count ?? 0)}</div>
        <div>{loading ? "Loading..." : `Updated ${new Date(data.timestamp).toLocaleTimeString()}`}</div>
      </div>

      <MapContainer center={center} zoom={3} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {Object.entries(byId).map(([id, pts]) => {
          const coords = pts
            .map(p => [p.lat, p.lon])
            .filter(c => isFinite(c[0]) && isFinite(c[1]));
          const latest = pts[pts.length - 1];
          return (
            <React.Fragment key={id}>
              <Polyline positions={coords} />
              {latest && isFinite(latest.lat) && isFinite(latest.lon) && (
                <Marker position={[latest.lat, latest.lon]}>
                  <Popup>
                    <div>
                      <div><strong>{id}</strong></div>
                      <div>Lat: {latest.lat.toFixed(4)}</div>
                      <div>Lon: {latest.lon.toFixed(4)}</div>
                      <div>Alt: {latest.alt ?? 'n/a'}</div>
                      <div>Weather: {latest.weather ? `${latest.weather.temperature}°C, wind ${latest.weather.windspeed} m/s` : 'n/a'}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
