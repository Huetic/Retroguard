"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

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

/** Imperative controller exposed to the parent page so dock-tool buttons
    (Layers / Center / Fullscreen) can reach into the Leaflet instance. */
export interface MapController {
  recenter: () => void;
  setBasemap: (b: Basemap) => void;
  toggleFullscreen: () => void;
}

export type Basemap = "street" | "satellite" | "terrain";

const BASEMAPS: Record<
  Basemap,
  { url: string; attribution: string; maxZoom?: number }
> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      "Map data: &copy; OpenTopoMap (CC-BY-SA) · &copy; OpenStreetMap contributors",
    maxZoom: 17,
  },
};

function SetViewOnLoad() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

/** Bridge component — lives inside MapContainer so useMap() works,
    writes the Leaflet map instance into the parent's controller ref. */
function ControllerBridge({
  controllerRef,
  defaultCenter,
  defaultZoom,
  setBasemapState,
}: {
  controllerRef: React.MutableRefObject<MapController | null> | undefined;
  defaultCenter: [number, number];
  defaultZoom: number;
  setBasemapState: (b: Basemap) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      recenter: () => {
        map.flyTo(defaultCenter, defaultZoom, { duration: 0.8 });
      },
      setBasemap: (b) => {
        setBasemapState(b);
      },
      toggleFullscreen: () => {
        const el = map.getContainer();
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };
        const elAny = el as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        } else {
          if (el.requestFullscreen) el.requestFullscreen();
          else if (elAny.webkitRequestFullscreen)
            elAny.webkitRequestFullscreen();
        }
        setTimeout(() => map.invalidateSize(), 100);
      },
    };
    return () => {
      if (controllerRef) controllerRef.current = null;
    };
  }, [map, controllerRef, defaultCenter, defaultZoom, setBasemapState]);
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
  controllerRef?: React.MutableRefObject<MapController | null>;
  initialBasemap?: Basemap;
}

export default function MapComponent({
  assets,
  center = [22.5, 78.5],
  zoom = 5,
  height = "100%",
  controllerRef,
  initialBasemap = "street",
}: MapComponentProps) {
  const [basemap, setBasemap] = useState<Basemap>(initialBasemap);
  const basemapCfg = BASEMAPS[basemap];

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <SetViewOnLoad />
        <ControllerBridge
          controllerRef={controllerRef}
          defaultCenter={center}
          defaultZoom={zoom}
          setBasemapState={setBasemap}
        />
        <TileLayer
          key={basemap}
          attribution={basemapCfg.attribution}
          url={basemapCfg.url}
          maxZoom={basemapCfg.maxZoom}
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
