import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { authFetch } from "./services/apiClient";

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
  driver?: { id: string; name: string; phone?: string };
  vehicleDetails?: { make: string; model: string; plateNumber: string };
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

export const MobilityPortal: React.FC<MobilityPortalProps> = ({
  user,
  backendUrl,
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
}) => {
  const [pickup, setPickup] = useState("MG Road Metro Station");
  const [destination, setDestination] = useState("Koramangala 5th Block");
  const [selectedVehicle, setSelectedVehicle] = useState<"BIKE" | "AUTO" | "CAB_PRIME">("CAB_PRIME");
  const [estimateData, setEstimateData] = useState<{
    distanceKm: number;
    durationMin: number;
    options: RideOption[];
  } | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  const quickPickups = ["MG Road Metro", "Indiranagar 100ft Rd", "Koramangala 5th Block"];
  const quickDests = ["Bangalore Tech Park", "Kempegowda Airport", "Forum Mall Koramangala"];

  useEffect(() => {
    fetchActiveRide();
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

  const fetchEstimate = async (pick: string, dest: string) => {
    if (!pick || !dest) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/rides/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup: pick, destination: dest }),
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
            vehicleType: selectedVehicle,
            fareCents: option.fareCents,
          }),
        },
        backendUrl
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRide(json.data);
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
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Trip started! Safe travels.");
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
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Ride cancelled");
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Failed to cancel");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
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
          <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Mobility & Rides</h3>
          <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
            Instant city transit with upfront pricing and driver verification
          </p>
        </div>
      </div>

      {/* ACTIVE RIDE VIEW */}
      {activeRide ? (
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
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
          {/* Pickup & Destination Inputs */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} color="#10b981" /> Pickup Location
              </label>
              <input
                type="text"
                className="text-input"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                onBlur={() => fetchEstimate(pickup, destination)}
                style={{ width: "100%", marginTop: "4px" }}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                {quickPickups.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPickup(p);
                      fetchEstimate(p, destination);
                    }}
                    style={{
                      background: pickup === p ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: pickup === p ? "#3b82f6" : "var(--text-secondary)",
                      padding: "3px 8px",
                      fontSize: "9px",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Navigation size={12} color="#ef4444" /> Drop-off Destination
              </label>
              <input
                type="text"
                className="text-input"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onBlur={() => fetchEstimate(pickup, destination)}
                style={{ width: "100%", marginTop: "4px" }}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                {quickDests.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDestination(d);
                      fetchEstimate(pickup, d);
                    }}
                    style={{
                      background: destination === d ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      color: destination === d ? "#3b82f6" : "var(--text-secondary)",
                      padding: "3px 8px",
                      fontSize: "9px",
                      cursor: "pointer",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicle Selection Options */}
          {estimateData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                            ? "Quick single passenger"
                            : opt.vehicleType === "AUTO"
                            ? "Affordable city ride"
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
    </div>
  );
};
