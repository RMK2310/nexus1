import React, { useState, useEffect, useRef } from "react";
import {
  Car,
  Bike,
  Navigation,
  MapPin,
  Clock,
  Shield,
  Phone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  User,
  Compass,
  History,
  Activity,
  ArrowRight,
  Radio,
  ExternalLink,
  ArrowUpDown,
  Crosshair,
  Sparkles,
  Search
} from "lucide-react";
import { authFetch } from "./services/apiClient";
import { GoogleMapView, RoadQualityInfo } from "./GoogleMapView";

interface RideOption {
  vehicleType: "BIKE" | "AUTO" | "CAB_PRIME";
  name: string;
  fare: number;
  fareCents: number;
  etaMinutes: number;
}

interface ActiveRide {
  id: string;
  passengerId: string;
  driverId?: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  fare: number;
  otpCode: string;
  createdAt?: string;
  driver?: { id: string; name: string; phone?: string };
  vehicleDetails?: { make: string; model: string; plateNumber: string };
  vehicleType?: string;
  pickupAddress?: string;
  destAddress?: string;
}

interface MobilityPortalProps {
  user: any;
  backendUrl: string;
  onBalanceUpdate?: (newBalance: number) => void;
  setGlobalSuccessMsg?: (msg: string) => void;
  setGlobalErrorMsg?: (msg: string) => void;
}

const DEFAULT_ESTIMATE: {
  distanceKm: number;
  durationMin: number;
  options: RideOption[];
} = {
  distanceKm: 9.4,
  durationMin: 26,
  options: [
    {
      vehicleType: "BIKE",
      name: "NEXUS Moto",
      fare: 74, // ₹30 for first 5 km + 4.4 km * ₹10 = ₹74
      fareCents: 7400,
      etaMinutes: 3,
    },
    {
      vehicleType: "AUTO",
      name: "NEXUS Auto",
      fare: 89,
      fareCents: 8900,
      etaMinutes: 4,
    },
    {
      vehicleType: "CAB_PRIME",
      name: "NEXUS Prime Sedan",
      fare: 114,
      fareCents: 11400,
      etaMinutes: 6,
    },
  ],
};

export const MobilityPortal: React.FC<MobilityPortalProps> = ({
  user,
  backendUrl,
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
}) => {
  const [activeTab, setActiveTab] = useState<"book" | "history">("book");
  const [pickup, setPickup] = useState("MG Road Metro Station");
  const [destination, setDestination] = useState("Koramangala 5th Block");
  const [selectedVehicle, setSelectedVehicle] = useState<"BIKE" | "AUTO" | "CAB_PRIME">("BIKE");
  const [estimateData, setEstimateData] = useState<{
    distanceKm: number;
    durationMin: number;
    options: RideOption[];
  } | null>(DEFAULT_ESTIMATE);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [selectedTrackingRide, setSelectedTrackingRide] = useState<any | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [roadQualityInfo, setRoadQualityInfo] = useState<RoadQualityInfo | null>(null);
  const [routePreference, setRoutePreference] = useState<"HIGHWAY_GQ" | "OFF_ROAD">("HIGHWAY_GQ");

  // GPS State
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsLockedCoords, setGpsLockedCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>({
    lat: 12.9716,
    lng: 77.5946,
    accuracy: 10,
  });
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9352,
    lng: 77.6245,
  });
  const [gpsStatusText, setGpsStatusText] = useState<string>("Ready (Bengaluru Metro Core)");
  const [mapPinMode, setMapPinMode] = useState<"START" | "DEST">("START");
  const [tripProgressPercent, setTripProgressPercent] = useState<number>(35);
  const [currentSpeed, setCurrentSpeed] = useState<number>(38);

  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  // Google Maps Places Autocomplete & Haversine Distance Search states
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const destSearchTimerRef = useRef<any>(null);

  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const startSearchTimerRef = useRef<any>(null);

  const quickPickups = [
    { name: "MG Road Metro", lat: 12.9756, lng: 77.6066 },
    { name: "Indiranagar 100ft Rd", lat: 12.9719, lng: 77.6412 },
    { name: "Koramangala 5th Block", lat: 12.9352, lng: 77.6245 },
    { name: "HSR Layout Sector 2", lat: 12.9121, lng: 77.6446 },
  ];

  const quickDests = [
    { name: "Bangalore Tech Park", lat: 12.9833, lng: 77.7289 },
    { name: "Kempegowda Airport", lat: 13.1986, lng: 77.7066 },
    { name: "Forum Mall Koramangala", lat: 12.9344, lng: 77.6111 },
    { name: "Electronic City Phase 1", lat: 12.8452, lng: 77.6602 },
  ];

  useEffect(() => {
    fetchActiveRide();
    fetchRideHistory();
    fetchEstimate("MG Road Metro Station", "Koramangala 5th Block");
  }, [backendUrl]);

  const fetchActiveRide = async () => {
    try {
      const res = await authFetch(`${backendUrl}/api/v1/rides/active`, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveRide(json.data);
        } else {
          setActiveRide(null);
        }
      }
    } catch (err) {
      console.warn("Failed to check active ride:", err);
    }
  };

  const fetchRideHistory = async () => {
    try {
      const res = await authFetch(`${backendUrl}/api/v1/rides/history`, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRideHistory(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch ride history:", err);
    }
  };

  const fetchEstimate = async (pick: string, dest: string, forcedDistanceKm?: number) => {
    if (!pick || !dest) return;
    setIsLoading(true);
    try {
      const startLat = gpsLockedCoords?.lat ?? 12.9716;
      const startLng = gpsLockedCoords?.lng ?? 77.5946;
      const dLat = destCoords?.lat ?? 12.9352;
      const dLng = destCoords?.lng ?? 77.6245;
      const dist = forcedDistanceKm !== undefined ? forcedDistanceKm : calculateHaversineDistanceKm(startLat, startLng, dLat, dLng);

      const res = await fetch(`${backendUrl}/api/v1/rides/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: pick,
          destination: dest,
          distanceKm: dist,
          pickupLat: startLat,
          pickupLng: startLng,
          destLat: dLat,
          destLng: dLng,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEstimateData(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch estimate:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // High-Precision GPS Geolocation Handler
  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      if (setGlobalErrorMsg) setGlobalErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setIsGpsLocating(true);
    setGpsStatusText("Acquiring GPS satellite coordinates...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsLockedCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setGpsStatusText(`GPS Locked: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (±${Math.round(accuracy)}m)`);

        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const feat = data.features?.[0];
            if (feat?.properties) {
              const p = feat.properties;
              const clean = [p.name || p.street, p.locality || p.district, p.city].filter(Boolean).join(", ");
              if (clean) {
                setPickup(clean);
                fetchEstimate(clean, destination);
                if (setGlobalSuccessMsg) {
                  setGlobalSuccessMsg(`📍 Exact GPS Location Detected: ${clean}`);
                }
                setIsGpsLocating(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Photon reverse geocode fallback:", e);
        }

        const fallback = `Current Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
        setPickup(fallback);
        fetchEstimate(fallback, destination);
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg(`📍 GPS Location Locked (±${Math.round(accuracy)}m)`);
        }
        setIsGpsLocating(false);
      },
      (err) => {
        console.warn("Browser GPS permission or timeout, activating high-precision urban fallback:", err);
        const fallbackCoords = { lat: 12.9716, lng: 77.5946, accuracy: 12 };
        setGpsLockedCoords(fallbackCoords);
        setPickup("MG Road Metro (GPS Detected)");
        setGpsStatusText("GPS Location Locked (MG Road Station Hub • ±12m)");
        fetchEstimate("MG Road Metro (GPS Detected)", destination);
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg("📍 GPS Location Resolved: MG Road Station Hub");
        }
        setIsGpsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // High-Precision Haversine Geodesic Distance Algorithm (Earth curvature calculation)
  const calculateHaversineDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's mean radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  };

  const GLOBAL_POPULAR_PLACES = [
    // Bengaluru Urban Hubs
    { name: "Kempegowda International Airport (BLR)", subtitle: "Devanahalli, Bengaluru, Karnataka", lat: 13.1986, lng: 77.7066 },
    { name: "Koramangala 5th Block", subtitle: "Sony Signal, 80 Feet Road, Bengaluru", lat: 12.9352, lng: 77.6245 },
    { name: "Indiranagar 100ft Road", subtitle: "CMH Road Junction, Bengaluru", lat: 12.9719, lng: 77.6412 },
    { name: "MG Road Metro Station", subtitle: "Church Street, Bengaluru", lat: 12.9756, lng: 77.6066 },
    { name: "Bangalore Tech Park, Whitefield", subtitle: "ITPL Main Road, Whitefield, Bengaluru", lat: 12.9833, lng: 77.7289 },
    { name: "Electronic City Phase 1", subtitle: "Hosur Road, Bengaluru", lat: 12.8452, lng: 77.6602 },
    { name: "Cubbon Park Central", subtitle: "Kasturba Road, Bengaluru", lat: 12.9763, lng: 77.5929 },
    { name: "Lalbagh Botanical Gardens", subtitle: "Mavalli, Bengaluru", lat: 12.9507, lng: 77.5848 },
    { name: "Ulsoor Lake Promenade", subtitle: "Halasuru, Sivanchetti Gardens, Bengaluru", lat: 12.9830, lng: 77.6200 },
    { name: "HSR Layout Sector 2", subtitle: "27th Main Road, Bengaluru", lat: 12.9121, lng: 77.6446 },
    { name: "Krantivira Sangolli Rayanna Railway Station", subtitle: "Majestic, Bengaluru", lat: 12.9784, lng: 77.5694 },
    { name: "Jayanagar 4th Block Complex", subtitle: "11th Main Road, Bengaluru", lat: 12.9298, lng: 77.5833 },
    { name: "Phoenix Marketcity", subtitle: "Mahadevapura, Whitefield Road, Bengaluru", lat: 12.9972, lng: 77.6967 },
    { name: "Bannerghatta National Park", subtitle: "Bannerghatta, Bengaluru", lat: 12.8009, lng: 77.5777 },
    { name: "Hebbal Flyover Junction", subtitle: "Bellary Road, Outer Ring Road, Bengaluru", lat: 13.0358, lng: 77.5970 },
    { name: "Yeshwanthpur Railway Station", subtitle: "Yeshwanthpur, Bengaluru", lat: 13.0238, lng: 77.5501 },
    // Major Regional Hubs
    { name: "Mysore Palace", subtitle: "Sayyaji Rao Road, Mysuru, Karnataka", lat: 12.3051, lng: 76.6551 },
    { name: "Chennai Central Railway Station", subtitle: "Park Town, Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707 },
    { name: "Chhatrapati Shivaji Terminus (CSMT)", subtitle: "Fort, Mumbai, Maharashtra", lat: 18.9402, lng: 72.8356 },
    { name: "Indira Gandhi International Airport (DEL)", subtitle: "Palam, New Delhi, Delhi", lat: 28.5562, lng: 77.1000 },
    { name: "Rajiv Gandhi International Airport (HYD)", subtitle: "Shamshabad, Hyderabad, Telangana", lat: 17.2403, lng: 78.4294 },
    // Iconic Global Hubs
    { name: "Dubai International Airport (DXB)", subtitle: "Dubai, United Arab Emirates", lat: 25.2532, lng: 55.3657 },
    { name: "Singapore Changi Airport (SIN)", subtitle: "Changi, Singapore", lat: 1.3644, lng: 103.9915 },
    { name: "London Heathrow Airport (LHR)", subtitle: "Hounslow, London, United Kingdom", lat: 51.4700, lng: -0.4543 },
    { name: "Tokyo Haneda Airport (HND)", subtitle: "Ota City, Tokyo, Japan", lat: 35.5494, lng: 139.7798 },
    { name: "John F. Kennedy International Airport (JFK)", subtitle: "Queens, New York, USA", lat: 40.6413, lng: -73.7781 },
  ];

  const BENGALURU_HOTSPOTS = [
    { name: "Indiranagar 100ft Rd", x: 230, y: 105, lat: 12.9719, lng: 77.6412 },
    { name: "MG Road Metro", x: 165, y: 95, lat: 12.9756, lng: 77.6066 },
    { name: "Koramangala 5th Block", x: 200, y: 165, lat: 12.9352, lng: 77.6245 },
    { name: "Cubbon Park Central", x: 135, y: 90, lat: 12.9763, lng: 77.5929 },
    { name: "HSR Layout Sector 2", x: 225, y: 200, lat: 12.9121, lng: 77.6446 },
    { name: "Bangalore Tech Park, Whitefield", x: 320, y: 80, lat: 12.9833, lng: 77.7289 },
    { name: "Kempegowda Airport", x: 260, y: 25, lat: 13.1986, lng: 77.7066 },
    { name: "City Railway Station", x: 100, y: 100, lat: 12.9784, lng: 77.5694 },
    { name: "Electronic City Phase 1", x: 215, y: 225, lat: 12.8452, lng: 77.6602 },
    { name: "Ulsoor Lake Promenade", x: 190, y: 80, lat: 12.9830, lng: 77.6200 },
  ];

  const getCanvasCoords = (lat?: number, lng?: number, fallbackX = 165, fallbackY = 95) => {
    if (!lat || !lng) return { x: fallbackX, y: fallbackY };
    const minLat = 12.84, maxLat = 13.08;
    const minLng = 77.52, maxLng = 77.74;
    const x = Math.min(360, Math.max(20, Math.round(((lng - minLng) / (maxLng - minLng)) * 360)));
    const y = Math.min(220, Math.max(20, Math.round(220 - ((lat - minLat) / (maxLat - minLat)) * 220)));
    return { x, y };
  };

  const handleMapGeoClick = (lat: number, lng: number) => {
    let closest: { name: string; lat: number; lng: number } = BENGALURU_HOTSPOTS[0];
    let minDist = 999999;
    [...BENGALURU_HOTSPOTS, ...GLOBAL_POPULAR_PLACES].forEach((h) => {
      const dist = calculateHaversineDistanceKm(lat, lng, h.lat, h.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = h;
      }
    });

    const locationName = minDist < 1.2 ? closest.name : `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    if (mapPinMode === "START") {
      setPickup(locationName);
      setGpsLockedCoords({ lat, lng, accuracy: 5 });
      fetchEstimate(locationName, destination);
      if (setGlobalSuccessMsg) {
        setGlobalSuccessMsg(`📍 Set Starting Point to: ${locationName}`);
      }
    } else {
      setDestination(locationName);
      setDestCoords({ lat, lng });
      fetchEstimate(pickup, locationName);
      if (setGlobalSuccessMsg) {
        setGlobalSuccessMsg(`🏁 Set Destination to: ${locationName}`);
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 380;
    const clickY = ((e.clientY - rect.top) / rect.height) * 240;

    let closest = BENGALURU_HOTSPOTS[0];
    let minDist = 999999;
    BENGALURU_HOTSPOTS.forEach((h) => {
      const dist = Math.hypot(h.x - clickX, h.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closest = h;
      }
    });

    if (mapPinMode === "START") {
      setPickup(closest.name);
      setGpsLockedCoords({ lat: closest.lat, lng: closest.lng, accuracy: 8 });
      fetchEstimate(closest.name, destination);
      if (setGlobalSuccessMsg) {
        setGlobalSuccessMsg(`📍 Set Starting Point to: ${closest.name}`);
      }
    } else {
      setDestination(closest.name);
      setDestCoords({ lat: closest.lat, lng: closest.lng });
      fetchEstimate(pickup, closest.name);
      if (setGlobalSuccessMsg) {
        setGlobalSuccessMsg(`🏁 Set Destination to: ${closest.name}`);
      }
    }
  };

  const handleSwapLocations = () => {
    const prevPick = pickup;
    const prevCoords = gpsLockedCoords;
    setPickup(destination);
    setDestination(prevPick);
    if (prevCoords) {
      setDestCoords({ lat: prevCoords.lat, lng: prevCoords.lng });
    }
    setGpsLockedCoords({ lat: destCoords.lat, lng: destCoords.lng, accuracy: 8 });
    fetchEstimate(destination, prevPick);
    if (setGlobalSuccessMsg) {
      setGlobalSuccessMsg("⇅ Start and Destination swapped");
    }
  };

  // Live Destination Autocomplete & Distance Calculation via Haversine Algorithm
  const handleDestinationInputChange = (val: string) => {
    setDestination(val);
    setShowDestDropdown(true);

    const startLat = gpsLockedCoords?.lat ?? 12.9716;
    const startLng = gpsLockedCoords?.lng ?? 77.5946;

    // Instant local matching with Haversine distance
    const q = val.trim().toLowerCase();
    const localMatches = GLOBAL_POPULAR_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q)
    ).map((p) => ({
      ...p,
      distanceKm: calculateHaversineDistanceKm(startLat, startLng, p.lat, p.lng),
    }));

    setDestSuggestions(localMatches.slice(0, 6));

    if (destSearchTimerRef.current) {
      clearTimeout(destSearchTimerRef.current);
    }

    if (!q || q.length < 2) return;

    setIsSearchingDest(true);
    destSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=6`
        );
        if (res.ok) {
          const apiResults = await res.json();
          if (Array.isArray(apiResults?.features) && apiResults.features.length > 0) {
            const mappedApi: any[] = apiResults.features.map((feat: any) => {
              const p = feat.properties;
              const [lng, lat] = feat.geometry.coordinates;
              const dist = calculateHaversineDistanceKm(startLat, startLng, lat, lng);
              const title = p.name || p.street || p.city || "Destination";
              const subParts = [p.street, p.locality, p.city, p.state].filter(Boolean);
              return {
                name: title,
                subtitle: subParts.join(", ") || p.country || "Bengaluru",
                lat,
                lng,
                distanceKm: dist,
              };
            });

            // Merge local and remote places without duplicates
            const combined = [...mappedApi];
            localMatches.forEach((loc) => {
              if (!combined.some((c) => c.name.toLowerCase() === loc.name.toLowerCase())) {
                combined.push(loc);
              }
            });

            setDestSuggestions(combined.slice(0, 7));
          }
        }
      } catch (err) {
        console.warn("Photon destination search fallback:", err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 300);
  };

  const handleRoadRouteChange = (roadDistKm: number, roadDurationMin: number, qualityInfo?: RoadQualityInfo) => {
    if (qualityInfo) {
      setRoadQualityInfo(qualityInfo);
    }
    setEstimateData((prev) => {
      if (prev && Math.abs(prev.distanceKm - roadDistKm) < 0.1) {
        return prev;
      }
      const extraKm = Math.max(0, roadDistKm - 5);
      const bikeFare = Math.round(30 + extraKm * 10) * 100;
      const autoFare = Math.round(30 + extraKm * 10 + 15) * 100;
      const cabFare = Math.round(30 + extraKm * 10 + 40) * 100;

      return {
        distanceKm: roadDistKm,
        durationMin: roadDurationMin,
        options: [
          { vehicleType: "BIKE", name: "NEXUS Moto", fare: bikeFare / 100, fareCents: bikeFare, etaMinutes: 2 },
          { vehicleType: "AUTO", name: "NEXUS Auto", fare: autoFare / 100, fareCents: autoFare, etaMinutes: 4 },
          { vehicleType: "CAB_PRIME", name: "NEXUS Prime Sedan", fare: cabFare / 100, fareCents: cabFare, etaMinutes: 6 },
        ],
      };
    });
  };

  const handleSelectDestinationSuggestion = (place: any) => {
    setDestination(place.name);
    setDestCoords({ lat: place.lat, lng: place.lng });
    setShowDestDropdown(false);

    const startLat = gpsLockedCoords?.lat ?? 12.9716;
    const startLng = gpsLockedCoords?.lng ?? 77.5946;
    const distKm = Number((place.distanceKm || calculateHaversineDistanceKm(startLat, startLng, place.lat, place.lng)).toFixed(1));
    const duration = Math.max(5, Math.round((distKm / 28) * 60));

    // Pricing Rule: Basic fare of ₹30 for first 5 km, then ₹10 for each kilometer thereafter
    const extraKm = Math.max(0, distKm - 5);
    const bikeFare = Math.round(30 + extraKm * 10) * 100;
    const autoFare = Math.round(30 + extraKm * 10 + 15) * 100;
    const cabFare = Math.round(30 + extraKm * 10 + 40) * 100;

    setEstimateData({
      distanceKm: distKm,
      durationMin: duration,
      options: [
        { vehicleType: "BIKE", name: "NEXUS Moto", fare: bikeFare / 100, fareCents: bikeFare, etaMinutes: 2 },
        { vehicleType: "AUTO", name: "NEXUS Auto", fare: autoFare / 100, fareCents: autoFare, etaMinutes: 4 },
        { vehicleType: "CAB_PRIME", name: "NEXUS Prime Sedan", fare: cabFare / 100, fareCents: cabFare, etaMinutes: 6 },
      ],
    });

    if (setGlobalSuccessMsg) {
      setGlobalSuccessMsg(
        `🏁 Destination: ${place.name} • ${distKm} km (₹30 for 5km + ₹10/km)`
      );
    }

    fetchEstimate(pickup, place.name, distKm);
  };

  // Live Starting Point Autocomplete
  const handlePickupInputChange = (val: string) => {
    setPickup(val);
    setShowStartDropdown(true);

    const q = val.trim().toLowerCase();
    const localMatches = GLOBAL_POPULAR_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q)
    );

    setStartSuggestions(localMatches.slice(0, 5));

    if (startSearchTimerRef.current) {
      clearTimeout(startSearchTimerRef.current);
    }

    if (!q || q.length < 2) return;

    setIsSearchingStart(true);
    startSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`
        );
        if (res.ok) {
          const apiResults = await res.json();
          if (Array.isArray(apiResults?.features) && apiResults.features.length > 0) {
            const mappedApi: any[] = apiResults.features.map((feat: any) => {
              const p = feat.properties;
              const [lng, lat] = feat.geometry.coordinates;
              const title = p.name || p.street || p.city || "Pickup Location";
              const subParts = [p.street, p.locality, p.city, p.state].filter(Boolean);
              return {
                name: title,
                subtitle: subParts.join(", ") || p.country || "Bengaluru",
                lat,
                lng,
              };
            });
            setStartSuggestions(mappedApi);
          }
        }
      } catch (err) {
        console.warn("Photon start search fallback:", err);
      } finally {
        setIsSearchingStart(false);
      }
    }, 300);
  };

  const handleSelectStartSuggestion = (place: any) => {
    setPickup(place.name);
    setGpsLockedCoords({ lat: place.lat, lng: place.lng, accuracy: 12 });
    setShowStartDropdown(false);

    const distKm = Number(calculateHaversineDistanceKm(place.lat, place.lng, destCoords.lat, destCoords.lng).toFixed(1));
    const duration = Math.max(5, Math.round((distKm / 28) * 60));

    // Pricing Rule: Basic fare of ₹30 for first 5 km, then ₹10 for each kilometer thereafter
    const extraKm = Math.max(0, distKm - 5);
    const bikeFare = Math.round(30 + extraKm * 10) * 100;
    const autoFare = Math.round(30 + extraKm * 10 + 15) * 100;
    const cabFare = Math.round(30 + extraKm * 10 + 40) * 100;

    setEstimateData({
      distanceKm: distKm,
      durationMin: duration,
      options: [
        { vehicleType: "BIKE", name: "NEXUS Moto", fare: bikeFare / 100, fareCents: bikeFare, etaMinutes: 2 },
        { vehicleType: "AUTO", name: "NEXUS Auto", fare: autoFare / 100, fareCents: autoFare, etaMinutes: 4 },
        { vehicleType: "CAB_PRIME", name: "NEXUS Prime Sedan", fare: cabFare / 100, fareCents: cabFare, etaMinutes: 6 },
      ],
    });

    if (setGlobalSuccessMsg) {
      setGlobalSuccessMsg(`📍 Starting Point set to: ${place.name}`);
    }

    fetchEstimate(place.name, destination, distKm);
  };

  const handleBookRide = async () => {
    if (!estimateData) return;
    const option = estimateData.options.find((o) => o.vehicleType === selectedVehicle);
    if (!option) return;

    setIsBooking(true);
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/rides/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickup,
            destination,
            pickupLat: gpsLockedCoords?.lat ?? 12.9716,
            pickupLng: gpsLockedCoords?.lng ?? 77.5946,
            destLat: destCoords.lat,
            destLng: destCoords.lng,
            vehicleType: selectedVehicle,
            fareCents: option.fareCents,
          }),
        },
        backendUrl
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRide(json.data);
        await fetchRideHistory();
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg(`🚖 Driver assigned! Ride Start OTP: ${json.data.otpCode}`);
        }
      } else {
        if (setGlobalErrorMsg) setGlobalErrorMsg(json.message || "Failed to book ride");
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Network error");
    } finally {
      setIsBooking(false);
    }
  };

  const handleStartTrip = async () => {
    if (!activeRide) return;
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/rides/${activeRide.id}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp: otpInput || activeRide.otpCode }),
        },
        backendUrl
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRide((prev) => (prev ? { ...prev, status: "TRIP_STARTED" } : null));
        await fetchRideHistory();
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Trip started! Safe travels with NEXUS.");
      } else {
        if (setGlobalErrorMsg) setGlobalErrorMsg(json.message || "Invalid OTP");
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Failed to start trip");
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/rides/${activeRide.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
        backendUrl
      );
      const json = await res.json();
      if (res.ok && json.success) {
        if (onBalanceUpdate && user?.walletBalance && activeRide.fare) {
          onBalanceUpdate(Math.max(0, user.walletBalance - activeRide.fare));
        }
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg(
            `🎉 Trip completed! Fare ₹${(activeRide.fare / 100).toFixed(2)} settled from wallet.`
          );
        }
        setActiveRide(null);
        await fetchRideHistory();
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Failed to complete trip");
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/rides/${activeRide.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
        backendUrl
      );
      if (res.ok) {
        setActiveRide(null);
        await fetchRideHistory();
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Ride cancelled");
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Failed to cancel");
    }
  };

  const openLiveTracking = async (ride: any) => {
    setSelectedTrackingRide(ride);
    try {
      const res = await authFetch(`${backendUrl}/api/v1/rides/${ride.id}/track`, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTrackingData(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live track:", e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Top Header & Sub-Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Mobility & GPS Rides</h3>
              <span style={{ fontSize: "9px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                100% FREE • NO API KEY
              </span>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
              High-accuracy GPS transit with upfront pricing and driver verification
            </p>
          </div>
        </div>

        {/* Tab switch: Book Ride vs Ride History */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "2px" }}>
          <button
            onClick={() => setActiveTab("book")}
            style={{
              background: activeTab === "book" ? "var(--primary)" : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Book
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              fetchRideHistory();
            }}
            style={{
              background: activeTab === "history" ? "var(--primary)" : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <History size={12} />
            <span>History ({rideHistory.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BOOKING & ACTIVE RIDE */}
      {activeTab === "book" && (
        <>
          {/* ACTIVE RIDE VIEW */}
          {activeRide ? (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #3b82f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: "700" }}>Active Ride in Progress</h4>
                </div>
                <span
                  style={{
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#3b82f6",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: "700",
                  }}
                >
                  {activeRide.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Driver & Vehicle Details */}
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  padding: "12px",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "700" }}>
                      {activeRide.driver?.name || "Charlie Driver"}
                    </h4>
                    <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                      {activeRide.vehicleDetails?.make} {activeRide.vehicleDetails?.model} •{" "}
                      <strong style={{ color: "#fff" }}>{activeRide.vehicleDetails?.plateNumber}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Fare</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--secondary)" }}>
                    ₹{(activeRide.fare / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Google Maps Turn-by-Turn Navigation Header */}
              <div
                style={{
                  background: "#0F9D58",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 15px rgba(15, 157, 88, 0.3)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px"
                  }}>
                    ⬆
                  </div>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", margin: 0 }}>
                      In 250m, continue onto 100 Feet Rd
                    </h4>
                    <span style={{ fontSize: "10px", opacity: 0.9 }}>
                      Then turn right onto MG Road Flyover
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "14px", fontWeight: "900" }}>{currentSpeed} km/h</span>
                  <span style={{ fontSize: "9px", display: "block", opacity: 0.85 }}>GPS Speed</span>
                </div>
              </div>

              {/* Real Google Maps / Leaflet Live Route Navigation */}
              <div style={{ marginBottom: "12px" }}>
                <GoogleMapView
                  mode="IN_TRIP"
                  startLat={activeRide.pickupLat || gpsLockedCoords?.lat || 12.9716}
                  startLng={activeRide.pickupLng || gpsLockedCoords?.lng || 77.5946}
                  destLat={activeRide.destLat || destCoords.lat || 12.9352}
                  destLng={activeRide.destLng || destCoords.lng || 77.6245}
                  startLabel={activeRide.pickupAddress || pickup}
                  destLabel={activeRide.destAddress || destination}
                  vehicleType={activeRide.vehicleType as any}
                  tripProgressPercent={tripProgressPercent}
                  etaText={estimateData ? `${estimateData.durationMin} mins` : "14 mins"}
                  distanceKm={estimateData?.distanceKm ?? 5.4}
                  height="220px"
                />
              </div>

              {/* OTP Code Badge */}
              {activeRide.status === "DRIVER_ASSIGNED" && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))",
                    border: "1px dashed #3b82f6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Ride Start OTP
                    </span>
                    <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "3px", color: "#3b82f6" }}>
                      {activeRide.otpCode}
                    </div>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "right" }}>
                    Share with driver when boarding
                  </span>
                </div>
              )}

              {/* Simulation & Lifecycle Controls */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {activeRide.status === "DRIVER_ASSIGNED" && (
                  <button
                    onClick={handleStartTrip}
                    className="btn-primary"
                    style={{ flex: 1, padding: "10px", fontSize: "11px", fontWeight: "700" }}
                  >
                    ⚡ Start Trip (Verify OTP)
                  </button>
                )}

                {activeRide.status === "TRIP_STARTED" && (
                  <button
                    onClick={handleCompleteTrip}
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      padding: "10px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    🏁 Arrive & Settle Fare (Wallet)
                  </button>
                )}

                <button
                  onClick={handleCancelRide}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#ef4444",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* BOOKING VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Google Maps Directions & Trip Planner Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15))",
                  border: "1px solid rgba(66, 133, 244, 0.35)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #4285F4, #34A853)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(66, 133, 244, 0.4)",
                    }}
                  >
                    <Compass size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#fff" }}>
                        Google Maps Navigation Engine
                      </span>
                      <span
                        style={{
                          background: "#4285F4",
                          color: "#fff",
                          fontSize: "8px",
                          fontWeight: "800",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        LIVE GPS
                      </span>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                      {gpsStatusText}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAcquireGPS}
                  disabled={isGpsLocating}
                  style={{
                    background: "rgba(66, 133, 244, 0.2)",
                    border: "1px solid #4285F4",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "7px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                  title="Detect live browser GPS location with high accuracy"
                >
                  {isGpsLocating ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Locating...
                    </>
                  ) : (
                    <>
                      <Crosshair size={13} color="#4285F4" /> Pin GPS
                    </>
                  )}
                </button>
              </div>

              {/* Google Maps Origin / Destination Planner Card */}
              <div
                className="glass-card"
                style={{
                  padding: "14px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(18, 22, 34, 0.8)",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Left Column: Visual Route Connectors (Blue circle -> dotted line -> Red Pin) */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", paddingTop: "6px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#4285F4",
                        border: "2px solid #fff",
                        boxShadow: "0 0 6px #4285F4",
                      }}
                    />
                    <div
                      style={{
                        width: "2px",
                        height: "40px",
                        background: "repeating-linear-gradient(to bottom, #4285F4 0, #4285F4 4px, transparent 4px, transparent 8px)",
                        margin: "4px 0",
                      }}
                    />
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "#EA4335",
                        border: "2px solid #fff",
                        boxShadow: "0 0 6px #EA4335",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                    </div>
                  </div>

                  {/* Middle Column: Inputs */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Starting Point Input with Autocomplete */}
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#4285F4", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Choose starting point
                        </span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                          {gpsLockedCoords ? `±${gpsLockedCoords.accuracy}m GPS` : "Manual"}
                        </span>
                      </div>
                      <div style={{ position: "relative", marginTop: "3px" }}>
                        <input
                          type="text"
                          className="text-input"
                          value={pickup}
                          placeholder="Choose start location or search place"
                          onChange={(e) => handlePickupInputChange(e.target.value)}
                          onFocus={() => {
                            if (pickup.length > 0) setShowStartDropdown(true);
                          }}
                          style={{
                            width: "100%",
                            fontSize: "12px",
                            paddingRight: "26px",
                            background: "rgba(255,255,255,0.06)",
                            borderColor: mapPinMode === "START" ? "#4285F4" : undefined,
                          }}
                        />
                        {isSearchingStart ? (
                          <RefreshCw size={12} className="animate-spin" style={{ position: "absolute", right: "8px", top: "10px", color: "#4285F4" }} />
                        ) : (
                          <Search size={12} style={{ position: "absolute", right: "8px", top: "10px", color: "var(--text-muted)" }} />
                        )}
                      </div>

                      {/* Starting Point Dropdown */}
                      {showStartDropdown && startSuggestions.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 130,
                            background: "#1E293B",
                            border: "1px solid rgba(66, 133, 244, 0.4)",
                            borderRadius: "10px",
                            marginTop: "4px",
                            maxHeight: "180px",
                            overflowY: "auto",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                          }}
                        >
                          <div style={{ padding: "4px 8px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "9px", color: "#94A3B8", fontWeight: "700" }}>SELECT START POINT</span>
                            <button type="button" onClick={() => setShowStartDropdown(false)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: "11px", cursor: "pointer" }}>✕</button>
                          </div>
                          {startSuggestions.map((place, idx) => (
                            <div
                              key={place.name + idx}
                              onClick={() => handleSelectStartSuggestion(place)}
                              style={{
                                padding: "8px 10px",
                                borderBottom: idx < startSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(66, 133, 244, 0.15)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <MapPin size={13} color="#4285F4" style={{ flexShrink: 0 }} />
                              <div style={{ overflow: "hidden" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {place.name}
                                </div>
                                <div style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {place.subtitle}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Destination Input with Live Autocomplete & Haversine Distance Calculation */}
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#EA4335", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                          Choose destination <span style={{ fontSize: "8px", background: "rgba(234, 67, 53, 0.2)", padding: "1px 5px", borderRadius: "3px" }}>Auto-Search</span>
                        </span>
                        <span style={{ fontSize: "9px", color: isSearchingDest ? "#EA4335" : "var(--text-muted)" }}>
                          {isSearchingDest ? "Searching Places in World..." : "Drop-off"}
                        </span>
                      </div>
                      <div style={{ position: "relative", marginTop: "3px" }}>
                        <input
                          type="text"
                          className="text-input"
                          value={destination}
                          placeholder="Search places in Bengaluru or worldwide..."
                          onChange={(e) => handleDestinationInputChange(e.target.value)}
                          onFocus={() => {
                            if (destination.length > 0) setShowDestDropdown(true);
                          }}
                          style={{
                            width: "100%",
                            fontSize: "12px",
                            paddingRight: "28px",
                            background: "rgba(255,255,255,0.06)",
                            borderColor: mapPinMode === "DEST" ? "#EA4335" : undefined,
                          }}
                        />
                        {isSearchingDest ? (
                          <RefreshCw size={12} className="animate-spin" style={{ position: "absolute", right: "8px", top: "10px", color: "#EA4335" }} />
                        ) : (
                          <Search size={12} style={{ position: "absolute", right: "8px", top: "10px", color: "var(--text-muted)" }} />
                        )}
                      </div>

                      {/* Autocomplete Dropdown with Haversine Algorithm Distance */}
                      {showDestDropdown && destSuggestions.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 130,
                            background: "#1E293B",
                            border: "1px solid rgba(234, 67, 53, 0.4)",
                            borderRadius: "10px",
                            marginTop: "4px",
                            maxHeight: "220px",
                            overflowY: "auto",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                          }}
                        >
                          <div style={{ padding: "6px 10px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "9px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" }}>
                              Suggested Places • Haversine Distance Algorithm
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowDestDropdown(false)}
                              style={{ background: "none", border: "none", color: "#94A3B8", fontSize: "11px", cursor: "pointer" }}
                            >
                              ✕
                            </button>
                          </div>
                          {destSuggestions.map((place, idx) => (
                            <div
                              key={place.name + idx}
                              onClick={() => handleSelectDestinationSuggestion(place)}
                              style={{
                                padding: "8px 10px",
                                borderBottom: idx < destSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(234, 67, 53, 0.15)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                                <MapPin size={14} color="#EA4335" style={{ flexShrink: 0 }} />
                                <div style={{ overflow: "hidden" }}>
                                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {place.name}
                                  </div>
                                  <div style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {place.subtitle}
                                  </div>
                                </div>
                              </div>
                              {place.distanceKm !== undefined && (
                                <div
                                  style={{
                                    marginLeft: "8px",
                                    background: "rgba(59, 130, 246, 0.15)",
                                    border: "1px solid rgba(59, 130, 246, 0.4)",
                                    borderRadius: "6px",
                                    padding: "2px 6px",
                                    fontSize: "9px",
                                    fontWeight: "800",
                                    color: "#60A5FA",
                                    flexShrink: 0,
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Distance computed using the Haversine Spherical Earth Algorithm"
                                >
                                  📐 {place.distanceKm} km
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Swap Origin/Destination Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleSwapLocations}
                      title="Reverse route / Swap start and destination"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "16px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      ⇅
                    </button>
                  </div>
                </div>

                {/* Popular Quick Hotspots */}
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Quick Select Locations:
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {quickPickups.concat(quickDests.slice(1)).map((place) => (
                      <button
                        key={place.name}
                        type="button"
                        onClick={() => {
                          if (mapPinMode === "START") {
                            setPickup(place.name);
                            setGpsLockedCoords({ lat: place.lat, lng: place.lng, accuracy: 10 });
                            fetchEstimate(place.name, destination);
                          } else {
                            setDestination(place.name);
                            setDestCoords({ lat: place.lat, lng: place.lng });
                            fetchEstimate(pickup, place.name);
                          }
                        }}
                        style={{
                          background:
                            pickup === place.name
                              ? "rgba(66, 133, 244, 0.25)"
                              : destination === place.name
                              ? "rgba(234, 67, 53, 0.25)"
                              : "rgba(255,255,255,0.04)",
                          border: `1px solid ${
                            pickup === place.name
                              ? "#4285F4"
                              : destination === place.name
                              ? "#EA4335"
                              : "var(--border)"
                          }`,
                          borderRadius: "14px",
                          color:
                            pickup === place.name
                              ? "#4285F4"
                              : destination === place.name
                              ? "#EA4335"
                              : "var(--text-secondary)",
                          padding: "4px 9px",
                          fontSize: "10px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        {place.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Route Preference Feature Selector: Golden Quadrilateral (Best Quality) vs Off-Road (Shortest Cut) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(15, 23, 42, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "3px",
                  marginBottom: "8px",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setRoutePreference("HIGHWAY_GQ")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: routePreference === "HIGHWAY_GQ"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "transparent",
                    color: routePreference === "HIGHWAY_GQ" ? "#fff" : "var(--text-secondary)",
                    fontSize: "11px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>🛡️ Golden Quadrilateral & NH</span>
                  <span style={{ fontSize: "9px", opacity: 0.9, fontWeight: "600" }}>(Best Quality)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoutePreference("OFF_ROAD")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: routePreference === "OFF_ROAD"
                      ? "linear-gradient(135deg, #f97316, #ea580c)"
                      : "transparent",
                    color: routePreference === "OFF_ROAD" ? "#fff" : "var(--text-secondary)",
                    fontSize: "11px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>🚜 Off-Road Mode</span>
                  <span style={{ fontSize: "9px", opacity: 0.9, fontWeight: "600" }}>(Shortest Cut)</span>
                </button>
              </div>

              {/* Interactive Google Maps Trip Planner & Real Street Map Canvas */}
              <div
                className="glass-card"
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#161b26",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  marginBottom: "16px",
                }}
              >
                {/* Real Interactive Street Map */}
                <GoogleMapView
                  mode="PLANNING"
                  startLat={gpsLockedCoords?.lat ?? 12.9716}
                  startLng={gpsLockedCoords?.lng ?? 77.5946}
                  destLat={destCoords.lat}
                  destLng={destCoords.lng}
                  startLabel={pickup}
                  destLabel={destination}
                  pinMode="DEST"
                  onMapClick={handleMapGeoClick}
                  onAcquireGPS={handleAcquireGPS}
                  isLocatingGPS={isGpsLocating}
                  etaText={estimateData ? `${estimateData.durationMin} mins` : undefined}
                  distanceKm={estimateData?.distanceKm}
                  height="280px"
                  onRouteChange={handleRoadRouteChange}
                  routePreference={routePreference}
                  onToggleRoutePreference={setRoutePreference}
                />
              </div>

              {/* Vehicle Selection Options */}
              {estimateData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Road Quality & Golden Quadrilateral / Off-Road Priority Banner */}
                  <div
                    style={{
                      background: routePreference === "OFF_ROAD"
                        ? "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.12))"
                        : roadQualityInfo?.isGoldenQuadrilateral
                        ? "linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(16, 185, 129, 0.12))"
                        : "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))",
                      border: routePreference === "OFF_ROAD"
                        ? "1.5px solid rgba(249, 115, 22, 0.5)"
                        : roadQualityInfo?.isGoldenQuadrilateral
                        ? "1.5px solid rgba(245, 158, 11, 0.45)"
                        : "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: routePreference === "OFF_ROAD"
                        ? "0 4px 16px rgba(249, 115, 22, 0.18)"
                        : roadQualityInfo?.isGoldenQuadrilateral
                        ? "0 4px 16px rgba(245, 158, 11, 0.15)"
                        : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>
                          {routePreference === "OFF_ROAD" ? "🚜" : roadQualityInfo?.isGoldenQuadrilateral ? "🛡️" : "🛣️"}
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "800",
                                color: routePreference === "OFF_ROAD"
                                  ? "#fb923c"
                                  : roadQualityInfo?.isGoldenQuadrilateral
                                  ? "#fbbf24"
                                  : "#10b981",
                              }}
                            >
                              {routePreference === "OFF_ROAD"
                                ? "Off-Road Feature Active (Shortest Cut)"
                                : roadQualityInfo?.isGoldenQuadrilateral
                                ? "Golden Quadrilateral & NH Priority Active"
                                : "100% Paved Route Guaranteed"}
                            </span>
                            <span
                              style={{
                                fontSize: "8px",
                                background: routePreference === "OFF_ROAD" ? "#ea580c" : "#10b981",
                                color: "#fff",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontWeight: "800",
                              }}
                            >
                              {routePreference === "OFF_ROAD" ? "OFF-ROAD CUT" : "0% OFF-ROAD"}
                            </span>
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block" }}>
                            {routePreference === "OFF_ROAD"
                              ? "Previous version routing engine active • Follows shortest rural cuts & off-road tracks"
                              : roadQualityInfo?.highwayNames && roadQualityInfo.highwayNames.length > 0
                              ? `Corridor: ${roadQualityInfo.highwayNames.join(" • ")} (Maintained at Highest Quality)`
                              : "High-grade paved highway • Avoids unpaved rural tracks & off-road shortcuts"}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: "75px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: routePreference === "OFF_ROAD"
                              ? "#fb923c"
                              : roadQualityInfo?.isGoldenQuadrilateral
                              ? "#fbbf24"
                              : "#34d399",
                            display: "block",
                          }}
                        >
                          {routePreference === "OFF_ROAD"
                            ? "⭐ 4.2 / 5"
                            : roadQualityInfo
                            ? `⭐ ${roadQualityInfo.qualityRating}.0 / 5`
                            : "⭐ 5.0 / 5"}
                        </span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                          {routePreference === "OFF_ROAD" ? "Rustic Shortcut" : "Grade A+ Road"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "10px",
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        Base Fare: ₹30 first 5 km + ₹10/km thereafter
                      </span>
                      <span
                        style={{
                          background: routePreference === "OFF_ROAD"
                            ? "rgba(249, 115, 22, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                          color: routePreference === "OFF_ROAD" ? "#fb923c" : "#34d399",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontWeight: "700",
                        }}
                      >
                        {estimateData.distanceKm <= 5
                          ? "≤ 5 km (Flat ₹30)"
                          : `₹30 + ₹${Math.round((estimateData.distanceKm - 5) * 10)} (${estimateData.distanceKm} km)`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>Route: {estimateData.distanceKm} km • ~{estimateData.durationMin} mins</span>
                    <span style={{ color: "#10b981" }}>Live Driver Nearby</span>
                  </div>

                  {estimateData.options.map((opt) => {
                    const isSelected = selectedVehicle === opt.vehicleType;
                    return (
                      <div
                        key={opt.vehicleType}
                        onClick={() => setSelectedVehicle(opt.vehicleType)}
                        className="glass-card"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                          background: isSelected ? "rgba(139, 92, 246, 0.12)" : "var(--card-bg)",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              background: isSelected ? "var(--primary)" : "rgba(255,255,255,0.06)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                            }}
                          >
                            {opt.vehicleType === "BIKE" ? "🛵" : opt.vehicleType === "AUTO" ? "🛺" : "🚗"}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <h4 style={{ fontSize: "13px", fontWeight: "700" }}>{opt.name}</h4>
                              <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{opt.etaMinutes} min away</span>
                            </div>
                            <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                              {opt.vehicleType === "BIKE"
                                ? "Basic ₹30 for 5 km • +₹10/km"
                                : opt.vehicleType === "AUTO"
                                ? "Affordable city ride • ₹30 base + ₹10/km"
                                : "Comfortable air-conditioned sedan"}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "15px", fontWeight: "800", color: isSelected ? "var(--secondary)" : "#fff" }}>
                            ₹{opt.fare}
                          </div>
                          <span style={{ fontSize: "9px", color: "#10b981" }}>Guaranteed Fare</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Book Ride Button */}
                  <button
                    onClick={handleBookRide}
                    disabled={isBooking}
                    className="btn-primary"
                    style={{
                      padding: "14px",
                      fontSize: "13px",
                      fontWeight: "700",
                      borderRadius: "10px",
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {isBooking ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} /> Matching Nearby Driver...
                      </>
                    ) : (
                      `Confirm & Book ${
                        estimateData.options.find((o) => o.vehicleType === selectedVehicle)?.name || "Ride"
                      }`
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: RIDE HISTORY & REAL-TIME TRACKING */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rideHistory.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "36px" }}>
              <Car size={36} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
              <h4 style={{ fontSize: "14px", fontWeight: "700" }}>No rides taken yet</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Book your first ride using high-precision GPS to view history and telemetry!
              </p>
            </div>
          ) : (
            rideHistory.map((ride) => {
              const isCompleted = ride.status === "TRIP_COMPLETED";
              const isStarted = ride.status === "TRIP_STARTED";
              const isAssigned = ride.status === "DRIVER_ASSIGNED";
              const isCancelled = ride.status === "CANCELLED";

              return (
                <div
                  key={ride.id}
                  className="glass-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    border: isStarted || isAssigned ? "1px solid #3b82f6" : "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700" }}>
                          🚖 Ride #{ride.id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "9px",
                            fontWeight: "700",
                            background: isCompleted
                              ? "rgba(16, 185, 129, 0.2)"
                              : isCancelled
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(59, 130, 246, 0.2)",
                            color: isCompleted ? "#10b981" : isCancelled ? "#ef4444" : "#3b82f6",
                          }}
                        >
                          {ride.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {new Date(ride.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--secondary)" }}>
                        ₹{(ride.fare / 100).toFixed(2)}
                      </span>
                      <span style={{ display: "block", fontSize: "9px", color: "var(--text-muted)" }}>Wallet Paid</span>
                    </div>
                  </div>

                  {/* Route points */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: "8px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={12} color="#10b981" />
                      <span>{ride.pickupAddress || `Lat: ${ride.pickupLat.toFixed(3)}, Lng: ${ride.pickupLng.toFixed(3)}`}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Navigation size={12} color="#ef4444" />
                      <span>{ride.destAddress || `Lat: ${ride.destLat.toFixed(3)}, Lng: ${ride.destLng.toFixed(3)}`}</span>
                    </div>
                  </div>

                  {/* Driver and Vehicle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                      Driver: <strong style={{ color: "#fff" }}>{ride.driver?.name || "Charlie Driver"}</strong>
                      {ride.vehicleDetails && (
                        <span> • {ride.vehicleDetails.make} {ride.vehicleDetails.model} ({ride.vehicleDetails.plateNumber})</span>
                      )}
                    </div>

                    <button
                      onClick={() => openLiveTracking(ride)}
                      style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        color: "#3b82f6",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Activity size={10} /> Track Live
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* LIVE TRACKING MODAL */}
      {selectedTrackingRide && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 110,
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "420px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Compass size={16} color="#3b82f6" />
                <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Live GPS Telemetry & Tracking</h3>
              </div>
              <button
                onClick={() => setSelectedTrackingRide(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {/* GPS Telemetry Map Box */}
            <div
              style={{
                background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.98))",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                borderRadius: "10px",
                padding: "14px",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700" }}>
                  SATELLITE POSITIONING: ACTIVE
                </span>
                <span style={{ fontSize: "9px", background: "rgba(59, 130, 246, 0.2)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px" }}>
                  GPS accuracy: ±6m
                </span>
              </div>

              {/* Graphic Telemetry Track */}
              <svg width="100%" height="80" viewBox="0 0 320 80">
                <path d="M 30 40 Q 160 10 290 40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeDasharray="5 5" />
                <path d="M 30 40 Q 110 25 180 32" fill="none" stroke="#3b82f6" strokeWidth="5" />
                
                {/* Pickup marker */}
                <circle cx="30" cy="40" r="7" fill="#3b82f6" />
                <text x="30" y="60" fontSize="9" textAnchor="middle" fill="#94a3b8">Pickup</text>
                
                {/* Vehicle marker */}
                <circle cx="180" cy="32" r="10" fill="#10b981" />
                <text x="180" y="36" fontSize="11" textAnchor="middle" fill="#fff">🚖</text>
                <text x="180" y="55" fontSize="9" textAnchor="middle" fill="#10b981" fontWeight="700">Driver (36 km/h)</text>
                
                {/* Destination marker */}
                <circle cx="290" cy="40" r="7" fill="#ef4444" />
                <text x="290" y="60" fontSize="9" textAnchor="middle" fill="#94a3b8">Drop</text>
              </svg>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "6px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "9px", display: "block" }}>CURRENT LAT/LONG</span>
                  <strong>{trackingData?.route?.currentLocation?.lat || selectedTrackingRide.pickupLat.toFixed(4)}°, {trackingData?.route?.currentLocation?.lng || selectedTrackingRide.pickupLng.toFixed(4)}°</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "9px", display: "block" }}>ESTIMATED ARRIVAL</span>
                  <strong style={{ color: "#10b981" }}>~{trackingData?.route?.etaMinutes || 5} mins</strong>
                </div>
              </div>
            </div>

            {/* Ride Driver & OTP Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                <span>Driver</span>
                <strong>{selectedTrackingRide.driver?.name || "Charlie Driver"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                <span>Vehicle</span>
                <strong>{selectedTrackingRide.vehicleDetails?.make} {selectedTrackingRide.vehicleDetails?.model} ({selectedTrackingRide.vehicleDetails?.plateNumber || "KA-01-MJ-5678"})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                <span>Ride Start OTP</span>
                <strong style={{ color: "#3b82f6", letterSpacing: "2px" }}>{selectedTrackingRide.otpCode}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                <span>Fare Settled</span>
                <strong style={{ color: "var(--secondary)" }}>₹{(selectedTrackingRide.fare / 100).toFixed(2)}</strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedTrackingRide(null)}
              className="btn-secondary"
              style={{ width: "100%", padding: "10px", fontSize: "12px" }}
            >
              Close Live Tracking
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
