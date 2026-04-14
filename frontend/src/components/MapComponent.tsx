"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface MapAsset {
  id: string;
  type: string;
  highway: string;
  chainage: string;
  lat: number;
  lng: number;
  currentRL: number;
  ircMin: number;
  status: "compliant" | "warning" | "critical";
  lastMeasured: string;
}

function SetViewOnLoad() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

const statusColors = {
  compliant: "#3FA364",   // warm go
  warning:   "#D98B14",   // warm caution
  critical:  "#D54230",   // warm alarm
};

const statusLabels = {
  compliant: "Compliant",
  warning: "Warning",
  critical: "Critical",
};

interface MapComponentProps {
  assets: MapAsset[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function MapComponent({
  assets,
  center = [22.5, 78.5],
  zoom = 5,
  height = "100%",
}: MapComponentProps) {
  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={true}
      >
        <SetViewOnLoad />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {assets.map((asset) => (
          <CircleMarker
            key={asset.id}
            center={[asset.lat, asset.lng]}
            radius={8}
            pathOptions={{
              color: statusColors[asset.status],
              fillColor: statusColors[asset.status],
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#0f172a" }}>
                  {asset.type}
                </div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>Highway</td>
                      <td style={{ padding: "3px 0", fontWeight: 600, textAlign: "right" }}>{asset.highway}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>Chainage</td>
                      <td style={{ padding: "3px 0", fontWeight: 600, textAlign: "right" }}>{asset.chainage}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>Current RL</td>
                      <td style={{ padding: "3px 0", fontWeight: 600, textAlign: "right" }}>
                        {asset.currentRL} mcd/lx/m&sup2;
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>IRC Minimum</td>
                      <td style={{ padding: "3px 0", fontWeight: 600, textAlign: "right" }}>
                        {asset.ircMin} mcd/lx/m&sup2;
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>Status</td>
                      <td style={{ padding: "3px 0", textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "white",
                            backgroundColor: statusColors[asset.status],
                          }}
                        >
                          {statusLabels[asset.status]}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 0", color: "#64748b" }}>Last Measured</td>
                      <td style={{ padding: "3px 0", fontWeight: 600, textAlign: "right" }}>{asset.lastMeasured}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          zIndex: 1000,
          background: "rgba(251, 247, 236, 0.94)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: 14,
          padding: "12px 14px",
          boxShadow: "0 10px 28px -12px rgba(28,27,25,0.25)",
          border: "1px solid rgba(28,27,25,0.06)",
          fontFamily: "var(--font-geist-sans), sans-serif",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,27,25,0.45)", marginBottom: 8, fontWeight: 500 }}>
          Asset status
        </div>
        {(["compliant", "warning", "critical"] as const).map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: statusColors[s],
                boxShadow: `0 0 0 3px ${statusColors[s]}22`,
              }}
            />
            <span style={{ fontSize: 12, color: "rgba(28,27,25,0.72)", fontWeight: 500 }}>{statusLabels[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
