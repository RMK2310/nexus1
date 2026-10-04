import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Layers, Navigation, Compass, RefreshCw } from "lucide-react";

export interface RoadQualityInfo {
  qualityRating: number;
  gqPercent: number;
  highwayNames: string[];
  isGoldenQuadrilateral: boolean;
  qualityDescription: string;
  hasOffRoadWarning: boolean;
}

export interface GoogleMapViewProps {
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  startLabel?: string;
  destLabel?: string;
  mode?: "PLANNING" | "IN_TRIP" | "FOOD_DELIVERY";
  vehicleType?: "BIKE" | "AUTO" | "CAB_PRIME";
  tripProgressPercent?: number; // 0 to 100
  onMapClick?: (lat: number, lng: number) => void;
  pinMode?: "START" | "DEST";
  etaText?: string;
  distanceKm?: number;
  onAcquireGPS?: () => void;
  isLocatingGPS?: boolean;
  height?: string;
  onRouteChange?: (distanceKm: number, durationMin: number, qualityInfo?: RoadQualityInfo) => void;
  routePreference?: "HIGHWAY_GQ" | "OFF_ROAD";
  onToggleRoutePreference?: (pref: "HIGHWAY_GQ" | "OFF_ROAD") => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  startLat,
  startLng,
  destLat,
  destLng,
  startLabel = "Starting Point",
  destLabel = "Destination",
  mode = "PLANNING",
  vehicleType = "CAB_PRIME",
  tripProgressPercent = 0,
  onMapClick,
  pinMode = "DEST",
  etaText,
  distanceKm,
  onAcquireGPS,
  isLocatingGPS = false,
  height = "260px",
  onRouteChange,
  routePreference = "HIGHWAY_GQ",
  onToggleRoutePreference,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineCasingRef = useRef<L.Polyline | null>(null);
  const roadCoordsRef = useRef<[number, number][]>([]);
  const altPolylinesRef = useRef<L.Polyline[]>([]);
  const [routeSavingsKm, setRouteSavingsKm] = useState<number | null>(null);
  const [roadQuality, setRoadQuality] = useState<RoadQualityInfo | null>(null);
  const [mapStyle, setMapStyle] = useState<"VOYAGER" | "STREET" | "DARK">("VOYAGER");
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const initialLat = startLat || 12.9716;
    const initialLng = startLng || 77.5946;

    // Reset marker and route refs so they are recreated on the new map
    startMarkerRef.current = null;
    destMarkerRef.current = null;
    vehicleMarkerRef.current = null;
    polylineRef.current = null;
    polylineCasingRef.current = null;
    roadCoordsRef.current = [];
    altPolylinesRef.current = [];

    const map = L.map(container, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // Add Zoom Control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add Initial Tile Layer (OpenStreetMap - 100% Free, Reliable, No API Key Required)
    tileLayerRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
        attribution: '&copy; OpenStreetMap contributors',
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    // Handle map clicks to place pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Guarantee full tile layout rendering across all devices & modals
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      altPolylinesRef.current.forEach((pl) => {
        try { map.removeLayer(pl); } catch (e) {}
      });
      altPolylinesRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
      startMarkerRef.current = null;
      destMarkerRef.current = null;
      vehicleMarkerRef.current = null;
      polylineRef.current = null;
      polylineCasingRef.current = null;
      roadCoordsRef.current = [];
      tileLayerRef.current = null;
    };
  }, []);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    if (mapStyle === "STREET") {
      url = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"; // Vibrant road map
    } else if (mapStyle === "VOYAGER") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    } else if (mapStyle === "DARK") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
      subdomains: ["a", "b", "c"],
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    // Apply dark filter to tile container if DARK mode
    const container = mapContainerRef.current;
    if (container) {
      const tilePane = container.querySelector(".leaflet-tile-pane") as HTMLElement | null;
      if (tilePane) {
        if (mapStyle === "DARK") {
          tilePane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.15)";
        } else {
          tilePane.style.filter = "none";
        }
      }
    }
  }, [mapStyle]);

  // Observe container resize to auto-invalidate size
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update Markers, Real Road Route & Bounds when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let isCancelled = false;

    // 1. Start Marker (Blue glowing pin)
    const startIconHtml = `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(66, 133, 244, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #4285F4; border: 2.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
      </div>
    `;

    const startIcon = L.divIcon({
      html: startIconHtml,
      className: "custom-start-marker",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    if (startMarkerRef.current) {
      startMarkerRef.current.setLatLng([startLat, startLng]);
    } else {
      startMarkerRef.current = L.marker([startLat, startLng], { icon: startIcon }).addTo(map);
    }
    startMarkerRef.current.bindPopup(`<strong style="color: #4285F4;">🔵 Start:</strong> ${startLabel}`);

    // 2. Destination Marker (Red Google Maps Pin)
    const destIconHtml = `
      <div style="position: relative; width: 30px; height: 38px; display: flex; flex-direction: column; align-items: center;">
        <svg viewBox="0 0 24 32" width="28" height="36" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#EA4335" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
        </svg>
      </div>
    `;

    const destIcon = L.divIcon({
      html: destIconHtml,
      className: "custom-dest-marker",
      iconSize: [30, 38],
      iconAnchor: [15, 36],
    });

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destLat, destLng]);
    } else {
      destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
    }
    destMarkerRef.current.bindPopup(`<strong style="color: #EA4335;">📍 Destination:</strong> ${destLabel}`);

    // 3. Helper to render road route polylines
    const applyPolyline = (points: [number, number][]) => {
      if (!mapInstanceRef.current) return;
      roadCoordsRef.current = points;

      const isOffRoad = mode !== "FOOD_DELIVERY" && routePreference === "OFF_ROAD";
      const mainColor = mode === "FOOD_DELIVERY" ? "#10b981" : isOffRoad ? "#f97316" : "#3b82f6";
      const casingColor = mode === "FOOD_DELIVERY" ? "#047857" : isOffRoad ? "#c2410c" : "#1d4ed8";

      // Outer glow / casing for high visibility on roads
      if (polylineCasingRef.current) {
        polylineCasingRef.current.setLatLngs(points);
        polylineCasingRef.current.setStyle({ color: casingColor });
      } else {
        polylineCasingRef.current = L.polyline(points, {
          color: casingColor,
          weight: 7,
          opacity: 0.55,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapInstanceRef.current);
      }

      // Main vibrant road route line
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(points);
        polylineRef.current.setStyle({ color: mainColor });
      } else {
        polylineRef.current = L.polyline(points, {
          color: mainColor,
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapInstanceRef.current);
      }

      try {
        const bounds = L.latLngBounds(points);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (e) {}
    };

    // Immediate fallback points between Start and Dest while road network loads
    const latDiff = destLat - startLat;
    const lngDiff = destLng - startLng;
    const midLat = (startLat + destLat) / 2 + lngDiff * 0.12;
    const midLng = (startLng + destLng) / 2 - latDiff * 0.12;
    const initialFallback: [number, number][] = [
      [startLat, startLng],
      [(startLat * 2 + midLat) / 3, (startLng * 2 + midLng) / 3],
      [midLat, midLng],
      [(midLat + destLat * 2) / 3, (midLng + destLng * 2) / 3],
      [destLat, destLng],
    ];
    applyPolyline(initialFallback);

    // Fetch ALL available road network routes from OSRM with step details to inspect road quality
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=3`;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data && data.code === "Ok" && Array.isArray(data.routes) && data.routes.length > 0) {
          // Analyze road quality and highway composition for each route
          const gqPattern = /(NH\s*\d+|AH\s*\d+|NE\s*\d+|National\s*Highway|Expressway|Golden\s*Quadrilateral|Elevated|Bypass|Flyover|Ring\s*Road|Corridor|Hosur\s*Road|Tumkur\s*Road|Bellary\s*Road|Old\s*Madras\s*Road|Airport\s*Road|Mysore\s*Road|Bangalore\s*-\s*Chennai|NICE\s*Road|Kanyakumari|Varanasi|Salem|Krishnagiri)/i;
          const offRoadPattern = /(track|unpaved|off-road|dirt|gravel|mud|rough|rural\s*lane|cart\s*track|unclassified)/i;

          const analyzedRoutes = data.routes.map((route: any) => {
            const totalDist = route.distance || 1;
            let gqDist = 0;
            let offRoadDist = 0;
            const namesSet = new Set<string>();

            if (route.legs && Array.isArray(route.legs)) {
              for (const leg of route.legs) {
                if (leg.steps && Array.isArray(leg.steps)) {
                  for (const step of leg.steps) {
                    const combined = `${step.name || ""} ${step.ref || ""}`.trim();
                    if (gqPattern.test(combined)) {
                      gqDist += step.distance || 0;
                      if (step.ref) namesSet.add(step.ref);
                      else if (step.name && step.name.length > 2) namesSet.add(step.name);
                    }
                    if (offRoadPattern.test(combined)) {
                      offRoadDist += step.distance || 0;
                    }
                  }
                }
              }
            }

            const gqPercent = Math.min(100, Math.round((gqDist / totalDist) * 100));
            const offRoadPercent = Math.min(100, Math.round((offRoadDist / totalDist) * 100));
            const hasOffRoadWarning = offRoadPercent > 2;
            const isGQ = gqPercent >= 15 || Array.from(namesSet).some((n) => /NH|AH|NE|Expressway|Golden/i.test(n));

            // Quality score: Heavily penalizes off-road/broken tracks, strongly rewards Golden Quadrilateral & National Highways
            let qualityScore = (gqPercent * 15) - (offRoadPercent * 80);
            const avgSpeed = (totalDist / (route.duration || 1)) * 3.6;
            qualityScore += Math.min(40, avgSpeed);

            let qualityRating = 5;
            if (hasOffRoadWarning) qualityRating = 2;
            else if (gqPercent >= 35) qualityRating = 5;
            else if (gqPercent >= 15) qualityRating = 4;
            else qualityRating = 4;

            return {
              route,
              gqPercent,
              offRoadPercent,
              hasOffRoadWarning,
              isGQ,
              qualityScore,
              qualityInfo: {
                qualityRating,
                gqPercent,
                highwayNames: Array.from(namesSet).slice(0, 4),
                isGoldenQuadrilateral: isGQ,
                qualityDescription: isGQ
                  ? `Golden Quadrilateral & NH Priority (${gqPercent}% High-Grade Highway)`
                  : hasOffRoadWarning
                  ? `Caution: Off-road segments detected (${offRoadPercent}%)`
                  : `Paved City & Connecting Arterials`,
                hasOffRoadWarning,
              },
            };
          });

          const effectivePref = mode === "FOOD_DELIVERY" ? "HIGHWAY_GQ" : routePreference;
          if (effectivePref === "OFF_ROAD") {
            // PREVIOUS VERSION ALGORITHM:
            // Pure shortest path across available roads, prioritizing shortest distance cuts including off-road tracks
            analyzedRoutes.sort((a: any, b: any) => a.route.distance - b.route.distance);
          } else {
            // GOLDEN QUADRILATERAL & NATIONAL HIGHWAY PRIORITY:
            // 1. Strict avoidance: routes with off-road warnings are pushed to the back
            // 2. Strict Golden Quadrilateral & National Highway preference (best quality maintenance)
            // 3. Among high-quality highway routes, choose the shortest distance
            analyzedRoutes.sort((a: any, b: any) => {
              if (a.hasOffRoadWarning !== b.hasOffRoadWarning) {
                return a.hasOffRoadWarning ? 1 : -1;
              }
              if (a.isGQ !== b.isGQ) {
                return a.isGQ ? -1 : 1;
              }
              if (Math.abs(a.gqPercent - b.gqPercent) > 8) {
                return b.gqPercent - a.gqPercent;
              }
              return a.route.distance - b.route.distance;
            });
          }

          const selectedAnalyzed = analyzedRoutes[0];
          if (effectivePref === "OFF_ROAD") {
            selectedAnalyzed.qualityInfo.isOffRoadMode = true;
            selectedAnalyzed.qualityInfo.qualityDescription = "🚜 Off-Road Feature Active • Shortest Path Engine (Previous Version)";
          } else if (mode === "FOOD_DELIVERY") {
            selectedAnalyzed.qualityInfo.isOffRoadMode = false;
            selectedAnalyzed.qualityInfo.qualityDescription = "🛵 100% Paved Courier Road Route (0% Off-Road)";
          }
          const bestRoute = selectedAnalyzed.route;
          setRoadQuality(selectedAnalyzed.qualityInfo);

          // Clear previous alternative polylines
          altPolylinesRef.current.forEach((pl) => {
            if (mapInstanceRef.current) {
              try { mapInstanceRef.current.removeLayer(pl); } catch (e) {}
            }
          });
          altPolylinesRef.current = [];

          // Draw alternative longer routes as subtle dashed grey lines with distance & quality tooltips
          if (mapInstanceRef.current) {
            for (let i = 1; i < analyzedRoutes.length; i++) {
              const altItem = analyzedRoutes[i];
              const alt = altItem.route;
              if (alt.geometry && Array.isArray(alt.geometry.coordinates) && alt.geometry.coordinates.length > 0) {
                const altPoints: [number, number][] = alt.geometry.coordinates.map(
                  ([lng, lat]: [number, number]) => [lat, lng]
                );
                const altDistKm = (alt.distance / 1000).toFixed(1);
                const altLine = L.polyline(altPoints, {
                  color: altItem.hasOffRoadWarning ? "#ef4444" : "#94a3b8",
                  weight: 3.5,
                  opacity: 0.6,
                  dashArray: "6, 6",
                  lineCap: "round",
                  lineJoin: "round",
                }).addTo(mapInstanceRef.current);
                altLine.bindTooltip(
                  altItem.hasOffRoadWarning
                    ? `⚠️ Off-Road Alternative: ${altDistKm} km`
                    : `🛣️ Alternative: ${altDistKm} km (${altItem.gqPercent}% Highway)`,
                  { sticky: true }
                );
                altPolylinesRef.current.push(altLine);
              }
            }
          }

          // Calculate saved distance vs next available route if applicable
          if (analyzedRoutes.length > 1) {
            const diffKm = Number(((analyzedRoutes[1].route.distance - bestRoute.distance) / 1000).toFixed(1));
            setRouteSavingsKm(diffKm > 0.05 ? diffKm : null);
          } else {
            setRouteSavingsKm(null);
          }

          // Apply the HIGHEST-QUALITY / GOLDEN QUADRILATERAL ROAD PATH on the map
          if (bestRoute.geometry && Array.isArray(bestRoute.geometry.coordinates) && bestRoute.geometry.coordinates.length > 0) {
            const bestRoadPoints: [number, number][] = bestRoute.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            );
            applyPolyline(bestRoadPoints);

            // Notify parent with the optimal highway distance, duration, and road quality info
            if (onRouteChange && bestRoute.distance) {
              const roadDistKm = Number((bestRoute.distance / 1000).toFixed(1));
              const roadDurationMin = Math.max(1, Math.round(bestRoute.duration / 60));
              onRouteChange(roadDistKm, roadDurationMin, selectedAnalyzed.qualityInfo);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("OSRM road routing fallback active:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [startLat, startLng, destLat, destLng, startLabel, destLabel, routePreference]);

  // 4. Moving Vehicle / Courier Marker (if in trip or food delivery)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mode === "IN_TRIP" || mode === "FOOD_DELIVERY") {
      const progress = Math.min(1, Math.max(0, tripProgressPercent / 100));
      let vehLat = startLat + (destLat - startLat) * progress;
      let vehLng = startLng + (destLng - startLng) * progress;

      // Follow exact road geometry when available
      if (roadCoordsRef.current.length > 1) {
        const coords = roadCoordsRef.current;
        const exactIndex = (coords.length - 1) * progress;
        const lower = Math.floor(exactIndex);
        const upper = Math.min(coords.length - 1, lower + 1);
        const ratio = exactIndex - lower;
        vehLat = coords[lower][0] + (coords[upper][0] - coords[lower][0]) * ratio;
        vehLng = coords[lower][1] + (coords[upper][1] - coords[lower][1]) * ratio;
      }

      const vehicleEmoji =
        mode === "FOOD_DELIVERY"
          ? "🛵"
          : vehicleType === "BIKE"
          ? "🛵"
          : vehicleType === "AUTO"
          ? "🛺"
          : "🚗";

      const vehicleIconHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #10B981; border: 2.5px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 16px;">
            ${vehicleEmoji}
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        html: vehicleIconHtml,
        className: "custom-vehicle-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([vehLat, vehLng]);
      } else {
        vehicleMarkerRef.current = L.marker([vehLat, vehLng], { icon: vehicleIcon }).addTo(map);
      }
      vehicleMarkerRef.current.bindPopup(`<strong>Live Tracking:</strong> En Route on Road (${Math.round(tripProgressPercent)}%)`);
    } else {
      if (vehicleMarkerRef.current) {
        map.removeLayer(vehicleMarkerRef.current);
        vehicleMarkerRef.current = null;
      }
    }
  }, [mode, tripProgressPercent, vehicleType, startLat, startLng, destLat, destLng]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
      }}
    >
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

      {/* Floating Top Left: Mode & Road Quality Status */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 10,
          background: routePreference === "OFF_ROAD"
            ? "linear-gradient(135deg, rgba(30, 20, 10, 0.96), rgba(15, 23, 42, 0.94))"
            : roadQuality?.isGoldenQuadrilateral
            ? "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 27, 75, 0.94))"
            : "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(6px)",
          border: routePreference === "OFF_ROAD"
            ? "1.5px solid rgba(249, 115, 22, 0.7)"
            : roadQuality?.isGoldenQuadrilateral
            ? "1.5px solid rgba(245, 158, 11, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "10px",
          padding: "5px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: routePreference === "OFF_ROAD"
            ? "0 4px 14px rgba(249, 115, 22, 0.25)"
            : roadQuality?.isGoldenQuadrilateral
            ? "0 4px 14px rgba(245, 158, 11, 0.25)"
            : "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: routePreference === "OFF_ROAD"
              ? "#F97316"
              : roadQuality?.isGoldenQuadrilateral
              ? "#F59E0B"
              : mode === "FOOD_DELIVERY"
              ? "#F97316"
              : mode === "IN_TRIP"
              ? "#10B981"
              : "#3B82F6",
            boxShadow: `0 0 8px ${
              routePreference === "OFF_ROAD"
                ? "#F97316"
                : roadQuality?.isGoldenQuadrilateral
                ? "#F59E0B"
                : mode === "FOOD_DELIVERY"
                ? "#F97316"
                : mode === "IN_TRIP"
                ? "#10B981"
                : "#3B82F6"
            }`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#F8FAFC" }}>
            {mode === "FOOD_DELIVERY"
              ? "🛵 Live Food Delivery Route"
              : routePreference === "OFF_ROAD"
              ? "🚜 Off-Road Feature Active (Shortest Cut)"
              : roadQuality?.isGoldenQuadrilateral
              ? "🛡️ Golden Quadrilateral (GQ) Priority"
              : mode === "IN_TRIP"
              ? "🚘 En Route • Live Ride Navigation"
              : "🗺️ 100% Paved Road Navigation"}
          </span>
          <span
            style={{
              fontSize: "9px",
              color: mode === "FOOD_DELIVERY"
                ? "#34D399"
                : routePreference === "OFF_ROAD"
                ? "#FB923C"
                : roadQuality?.isGoldenQuadrilateral
                ? "#FCD34D"
                : "#34D399",
              fontWeight: "600",
            }}
          >
            {mode === "FOOD_DELIVERY"
              ? (roadQuality?.highwayNames && roadQuality.highwayNames.length > 0
                  ? `Via ${roadQuality.highwayNames.join(" / ")} • 100% Paved (0% Off-Road)`
                  : "100% Paved Road Network • 0% Off-Road")
              : routePreference === "OFF_ROAD"
              ? "Previous Version Engine • Raw Rural & Off-Road Cuts Allowed"
              : roadQuality?.highwayNames && roadQuality.highwayNames.length > 0
              ? `Via ${roadQuality.highwayNames.join(" / ")} • 0% Off-Road`
              : "100% Paved Highway • 0% Off-Road"}
          </span>
        </div>
      </div>

      {/* Floating Top Right Controls: GPS Crosshair, Route Mode Toggle & Map Style */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {onToggleRoutePreference && mode !== "FOOD_DELIVERY" && (
          <button
            type="button"
            onClick={() => onToggleRoutePreference(routePreference === "OFF_ROAD" ? "HIGHWAY_GQ" : "OFF_ROAD")}
            title={`Active: ${routePreference === "OFF_ROAD" ? "Off-Road Shortest Cut" : "Golden Quadrilateral (GQ)"} (Click to switch)`}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: routePreference === "OFF_ROAD" ? "rgba(249, 115, 22, 0.95)" : "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(6px)",
              border: routePreference === "OFF_ROAD" ? "1.5px solid #F97316" : "1.5px solid #F59E0B",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              fontSize: "15px",
            }}
          >
            {routePreference === "OFF_ROAD" ? "🚜" : "🛡️"}
          </button>
        )}

        {onAcquireGPS && (
          <button
            type="button"
            onClick={onAcquireGPS}
            disabled={isLocatingGPS}
            title="Snap map to live device GPS location"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(6px)",
              border: "1.5px solid #4285F4",
              color: "#4285F4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              transition: "transform 0.15s ease",
            }}
          >
            {isLocatingGPS ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Crosshair size={18} />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMapStyle((prev) => (prev === "VOYAGER" ? "STREET" : prev === "STREET" ? "DARK" : "VOYAGER"));
          }}
          title={`Switch map layer (Current: ${mapStyle})`}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <Layers size={16} />
        </button>
      </div>

      {/* Floating Bottom Center: Shortest Route Distance & ETA Badge */}
      {(etaText || distanceKm !== undefined) && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(8px)",
            border: routePreference === "OFF_ROAD"
              ? "1.5px solid #F97316"
              : roadQuality?.isGoldenQuadrilateral
              ? "1.5px solid #F59E0B"
              : "1.5px solid #10B981",
            borderRadius: "20px",
            padding: "5px 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          <Navigation
            size={13}
            color={
              routePreference === "OFF_ROAD"
                ? "#F97316"
                : roadQuality?.isGoldenQuadrilateral
                ? "#F59E0B"
                : "#10B981"
            }
          />
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#fff" }}>
            {distanceKm ? `${distanceKm} km` : ""} {etaText ? `• ~${etaText}` : ""}
          </span>
          <span
            style={{
              fontSize: "8px",
              background: routePreference === "OFF_ROAD"
                ? "linear-gradient(135deg, #F97316, #EA580C)"
                : roadQuality?.isGoldenQuadrilateral
                ? "linear-gradient(135deg, #F59E0B, #D97706)"
                : "#10B981",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: "800",
              letterSpacing: "0.3px",
            }}
          >
            {mode === "FOOD_DELIVERY"
              ? "🛵 LIVE COURIER ROAD PATH"
              : routePreference === "OFF_ROAD"
              ? "🚜 OFF-ROAD SHORTEST CUT"
              : roadQuality?.isGoldenQuadrilateral
              ? "🛡️ GOLDEN QUADRILATERAL"
              : "SHORTEST ROAD PATH"}
          </span>
          <span
            style={{
              fontSize: "8px",
              background: mode === "FOOD_DELIVERY" || routePreference !== "OFF_ROAD"
                ? "rgba(16, 185, 129, 0.25)"
                : "rgba(249, 115, 22, 0.25)",
              color: mode === "FOOD_DELIVERY" || routePreference !== "OFF_ROAD" ? "#34D399" : "#FB923C",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: "700",
            }}
          >
            {mode === "FOOD_DELIVERY" ? "0% Off-Road" : routePreference === "OFF_ROAD" ? "Rustic Cut" : "0% Off-Road"}
          </span>
          {routeSavingsKm && routeSavingsKm > 0 && (
            <span
              style={{
                fontSize: "8px",
                background: "rgba(59, 130, 246, 0.25)",
                color: "#60A5FA",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "700",
              }}
            >
              Saved {routeSavingsKm} km
            </span>
          )}
        </div>
      )}

      {/* Floating Bottom Left: 100% Free Map Badge */}
      <div
        style={{
          position: "absolute",
          bottom: "6px",
          left: "8px",
          zIndex: 9,
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          padding: "2px 8px",
          borderRadius: "6px",
          fontSize: "9px",
          color: "#34D399",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
        <span>Open Street Map • 100% Free (No API Key Required)</span>
      </div>
    </div>
  );
};
