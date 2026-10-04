import React, { useState, useEffect } from "react";
import {
  Home,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Grid,
  Lock,
  User,
  Shield,
  RefreshCw,
  Trash2,
  Tag,
  Star,
  Search,
  SlidersHorizontal,
  Heart,
  Eye,
  FileText,
  AlertCircle,
  XCircle,
  RotateCcw,
  Send,
  PlusCircle,
  Truck,
  Car,
  History,
  Activity,
  ChevronRight,
  Package,
  CheckCircle2,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  ExternalLink,
  X,
  Utensils,
  Navigation,
  Zap,
  Sparkles,
  Smartphone,
  Layers,
  Compass,
} from "lucide-react";
import { resolvePreciseProductImage, getOptimizedImageUrl } from "@nexus/shared";
import { WalletPortal } from "./WalletPortal";
import { FoodPortal } from "./FoodPortal";
import { MobilityPortal } from "./MobilityPortal";
import { ChatPortal } from "./ChatPortal";
import { WolfLoader, triggerWolfLoad } from "./WolfLoader";

interface CustomerPortalProps {
  activeTab: "home" | "shop" | "chat" | "wallet" | "services";
  setActiveTab: (tab: "home" | "shop" | "chat" | "wallet" | "services") => void;
  onNavigateWithWolf?: (tab: "home" | "shop" | "chat" | "wallet" | "services", customMessage?: string) => void;
  user: any;
  accessToken?: string | null;
  backendUrl?: string;
  onBalanceUpdate?: (newBalance: number) => void;
  setGlobalSuccessMsg?: (msg: string) => void;
  setGlobalErrorMsg?: (msg: string) => void;
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (s: string) => void;
  subcategories: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  priceMin: string;
  setPriceMin: (p: string) => void;
  priceMax: string;
  setPriceMax: (p: string) => void;
  products: any[]; // the full filtered list
  displayedProducts: any[]; // the paginated slice
  totalProductsCount: number;
  displayedProductsCount: number;
  loadMoreProducts: () => void;
  onResetFilters: () => void;
  getProductImage: (product: any) => string;
  registerImageFailure: (variantId: string) => void;
  validationStats: any;
  isCsvLoaded: boolean;
  csvLoadProgress: string;
  
  // Details Modal triggers
  openProductDetails: (prod: any) => void;
  
  // Cart Actions
  onAddToCart?: (listingId: string) => void;
  onUpdateCartQuantity?: (listingId: string, currentQuantity: number, diff: number) => void;
  cartQuantities?: Record<string, number>;
  onOpenCart?: () => void;
  cartItemsCount?: number;
  cartTotalCents?: number;

  // Ingest OFF
  barcodeInput: string;
  setBarcodeInput: (b: string) => void;
  handleIngestOFF: (e: React.FormEvent) => void;
  isLoading: boolean;

  // Wallet Quick Actions
  onOpenSendMoney?: () => void;
  onOpenAddFunds?: () => void;
  initialWalletAction?: "send" | "topup" | null;
  onClearInitialWalletAction?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  activeTab,
  setActiveTab,
  onNavigateWithWolf,
  user,
  accessToken,
  backendUrl = "http://localhost:3000",
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  subcategories,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  products,
  displayedProducts,
  totalProductsCount,
  displayedProductsCount,
  loadMoreProducts,
  onResetFilters,
  getProductImage,
  registerImageFailure,
  validationStats,
  isCsvLoaded,
  csvLoadProgress,
  openProductDetails,
  onAddToCart,
  onUpdateCartQuantity,
  cartQuantities,
  onOpenCart,
  cartItemsCount = 0,
  cartTotalCents = 0,
  barcodeInput,
  setBarcodeInput,
  handleIngestOFF,
  isLoading,
  onOpenSendMoney,
  onOpenAddFunds,
  initialWalletAction,
  onClearInitialWalletAction
}) => {
  const [showDevStats, setShowDevStats] = useState(false);
  const [servicesSubTab, setServicesSubTab] = useState<"hub" | "food" | "mobility">("hub");
  const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Unified Placed Orders state across Commerce, Food & Mobility
  const [unifiedOrders, setUnifiedOrders] = useState<{
    commerce: any[];
    food: any[];
    rides: any[];
  }>({ commerce: [], food: [], rides: [] });
  const [ordersFilter, setOrdersFilter] = useState<"ALL" | "COMMERCE" | "FOOD" | "RIDES">("ALL");

  // Amazon-style Shop View & Package Tracking state
  const [shopView, setShopView] = useState<"CATALOG" | "ORDERS" | "DEALS">("CATALOG");
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<any | null>(null);
  const [packageTrackingData, setPackageTrackingData] = useState<any | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [showWolfDemo, setShowWolfDemo] = useState(false);

  // 1-second Centered Wolf Loader state for internal feature transitions
  const [internalWolfLoading, setInternalWolfLoading] = useState<{
    active: boolean;
    message: string;
  } | null>(null);

  const handleWolfNavigate = (
    tab: "home" | "shop" | "chat" | "wallet" | "services",
    message?: string,
    subTabAction?: () => void
  ) => {
    if (subTabAction) subTabAction();
    if (onNavigateWithWolf) {
      onNavigateWithWolf(tab, message);
    } else {
      triggerWolfLoad(message || "Loading...", 1000);
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    fetchUnifiedOrders();
  }, [backendUrl, accessToken, activeTab]);

  const fetchUnifiedOrders = async () => {
    try {
      const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const [commRes, foodRes, rideRes] = await Promise.all([
        fetch(`${backendUrl}/api/v1/commerce/orders`, { headers }).then(r => r.ok ? r.json() : { success: false, data: [] }).catch(() => ({ success: false, data: [] })),
        fetch(`${backendUrl}/api/v1/food/orders`, { headers }).then(r => r.ok ? r.json() : { success: false, data: [] }).catch(() => ({ success: false, data: [] })),
        fetch(`${backendUrl}/api/v1/rides/history`, { headers }).then(r => r.ok ? r.json() : { success: false, data: [] }).catch(() => ({ success: false, data: [] })),
      ]);

      setUnifiedOrders({
        commerce: commRes.success && Array.isArray(commRes.data) ? commRes.data : [],
        food: foodRes.success && Array.isArray(foodRes.data) ? foodRes.data : [],
        rides: rideRes.success && Array.isArray(rideRes.data) ? rideRes.data : [],
      });
    } catch (err) {
      console.warn("Unified orders fetch failed:", err);
    }
  };

  const handleOpenPackageTracking = async (order: any) => {
    setSelectedTrackingOrder(order);
    setIsTrackingLoading(true);
    try {
      const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const res = await fetch(`${backendUrl}/api/v1/commerce/orders/${order.id}/track`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPackageTrackingData(json.data);
          setIsTrackingLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Package tracking API error, using simulation:", e);
    }

    const orderDate = new Date(order.createdAt || Date.now());
    setPackageTrackingData({
      orderId: order.id,
      trackingNumber: `NEX-AMZ-${(order.id || "").slice(0, 8).toUpperCase()}`,
      carrier: "NEXUS Express Prime (Amazon Hub)",
      status: "SHIPPED",
      currentStep: 2,
      estimatedDelivery: "Tomorrow by 8:00 PM",
      deliveryAddress: user?.address || "Flat 402, NEXUS Heights, 100ft Road, Indiranagar, Bengaluru - 560038",
      courierPartner: {
        name: "Anand Verma",
        phone: "+91 98451 22334",
        vehicle: "Electric Delivery Van (KA-03-EX-4412)",
        facility: "NEXUS Fulfillment Center BLR-4, Whitefield, Bengaluru",
      },
      timeline: [
        {
          step: "ORDERED",
          title: "Order Placed & Confirmed",
          description: "Payment confirmed. Seller received order.",
          time: orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: orderDate.toLocaleDateString(),
          completed: true,
        },
        {
          step: "PACKED",
          title: "Package Packed & Quality Checked",
          description: "Items packed securely in eco-friendly Amazon boxes.",
          time: new Date(orderDate.getTime() + 15 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: orderDate.toLocaleDateString(),
          completed: true,
        },
        {
          step: "SHIPPED",
          title: "Dispatched from NEXUS Hub",
          description: "Package received by carrier. In transit to destination city hub.",
          time: new Date(orderDate.getTime() + 45 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: orderDate.toLocaleDateString(),
          completed: true,
        },
        {
          step: "OUT_FOR_DELIVERY",
          title: "Out for Delivery",
          description: "Courier associate Anand Verma is out for delivery to your doorstep.",
          time: "Tomorrow, 09:30 AM",
          date: "Tomorrow",
          completed: false,
        },
        {
          step: "DELIVERED",
          title: "Delivered",
          description: "Package delivered with OTP confirmation.",
          time: "Tomorrow, by 8:00 PM",
          date: "Tomorrow",
          completed: false,
        },
      ],
      order,
    });
    setIsTrackingLoading(false);
  };

  return (
    <div>
      {/* Home Tab */}
      {activeTab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Cyber Wolf Hero Banner */}
          <div
            className="glass-card"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.9), rgba(10, 10, 18, 0.98))",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(6, 182, 212, 0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative", zIndex: 1 }}>
              {/* Animated Cyber Wolf Mascot Avatar */}
              <div
                onClick={() => setShowWolfDemo(true)}
                title="Tap to preview Wolf Loading Engine"
                style={{
                  position: "relative",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  padding: "2px",
                  background: "conic-gradient(from 0deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "0 0 15px rgba(6, 182, 212, 0.5)",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#09090e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src="/wolf-loader.jpg"
                    alt="NEXUS Cyber Wolf"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    background: "#10b981",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    border: "2px solid #000",
                  }}
                  title="System Online"
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#fff", letterSpacing: "0.5px" }}>
                    NEXUS SUPER-APP
                  </h2>
                  <span
                    style={{
                      fontSize: "9px",
                      background: "rgba(6, 182, 212, 0.2)",
                      color: "#38bdf8",
                      border: "1px solid rgba(6, 182, 212, 0.35)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      fontWeight: "700",
                    }}
                  >
                    CYBER CORE 2.0
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  One Unified App. 5 Powerful Ecosystems at your fingertips.
                </p>
              </div>
            </div>

            {/* Quick Feature Jump Pills & Wolf Demo Button */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                scrollbarWidth: "none",
                marginTop: "14px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {[
                { label: "🚖 Rides", action: () => handleWolfNavigate("services", "Launching Mobility & Rides...", () => setServicesSubTab("mobility")) },
                { label: "🍔 Food", action: () => handleWolfNavigate("services", "Opening Food Delivery...", () => setServicesSubTab("food")) },
                { label: "🛍️ Shopping", action: () => handleWolfNavigate("shop", "Opening Super Store...") },
                { label: "💬 Direct Chat", action: () => handleWolfNavigate("chat", "Connecting Direct Chat...") },
                { label: "💳 Pay & Wallet", action: () => handleWolfNavigate("wallet", "Accessing Wallet...") },
              ].map((pill, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={pill.action}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "20px",
                    padding: "5px 10px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.25)";
                    e.currentTarget.style.borderColor = "#06b6d4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  }}
                >
                  {pill.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleWolfNavigate("home", "NEXUS Cyber Wolf Loading...")}
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))",
                  border: "1px solid rgba(139, 92, 246, 0.5)",
                  borderRadius: "20px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#c084fc",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Sparkles size={11} color="#c084fc" /> Wolf Loader
              </button>
            </div>
          </div>

          {/* User Profile & Wallet Card */}
          <div className="glass-card" style={{ background: "linear-gradient(135deg, rgba(26,20,38,0.95), rgba(12,10,18,0.95))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--primary-hover))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: "16px" }}>{user?.name}</h3>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{user?.email}</p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Wallet Balance</span>
                <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--secondary)" }}>₹{((user?.walletBalance ?? 0) / 100).toFixed(2)}</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Persona</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Shield size={12} color="#a78bfa" />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#a78bfa" }}>{user?.activeRole}</span>
                </div>
              </div>
            </div>

            {/* Quick Wallet Actions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  if (onOpenSendMoney) onOpenSendMoney();
                  else setActiveTab("wallet");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                  background: "rgba(167, 139, 250, 0.15)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <Send size={12} color="var(--primary)" /> Send Money
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAddFunds) onOpenAddFunds();
                  else setActiveTab("wallet");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <PlusCircle size={12} color="#10B981" /> Add Funds
              </button>
            </div>
          </div>

          {/* ========================================================
              FEATURE SUITE SHOWCASE (Interactive Deep-Linked Directory)
              ======================================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={16} color="var(--primary)" /> SUPER-APP FEATURE SUITE
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Explore all integrated services. Tap any card to launch immediately.
                </p>
              </div>
            </div>

            {/* Feature 1: NEXUS Mobility */}
            <div
              onClick={() => handleWolfNavigate("services", "Launching Mobility & Rides...", () => setServicesSubTab("mobility"))}
              style={{
                background: "linear-gradient(135deg, rgba(14, 116, 144, 0.25), rgba(15, 23, 42, 0.75))",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#06b6d4")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.4)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(6, 182, 212, 0.4)",
                    }}
                  >
                    <Car size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>NEXUS Mobility</h4>
                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600" }}>
                      Ride-Hailing & Real Road Navigation
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(6, 182, 212, 0.2)",
                    color: "#38bdf8",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                  }}
                >
                  LIVE OSRM GPS
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", margin: "2px 0" }}>
                Request city cabs, sedans, and autos with turn-by-turn road navigation via OSRM, Golden Quadrilateral highway prioritization, off-road path analysis, and transparent fares (₹30 first 5 km + ₹10/km).
              </p>

              {/* Badges / Highlights */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["OSRM Turn-by-Turn", "Highway Priority", "Off-Road Toggle", "Live Driver KA-03"].map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "9px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
                  Launch Mobility <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Feature 2: NEXUS Food Delivery */}
            <div
              onClick={() => handleWolfNavigate("services", "Opening Food Delivery...", () => setServicesSubTab("food"))}
              style={{
                background: "linear-gradient(135deg, rgba(194, 65, 12, 0.25), rgba(15, 23, 42, 0.75))",
                border: "1px solid rgba(249, 115, 22, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.4)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #ea580c, #f97316)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(249, 115, 22, 0.4)",
                    }}
                  >
                    <Utensils size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>NEXUS Food Delivery</h4>
                    <span style={{ fontSize: "11px", color: "#fb923c", fontWeight: "600" }}>
                      Curated Restaurants & Scooter Fleet
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(249, 115, 22, 0.2)",
                    color: "#fb923c",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    border: "1px solid rgba(249, 115, 22, 0.3)",
                  }}
                >
                  30-MIN HOT DELIVERY
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", margin: "2px 0" }}>
                Order from 9 authentic curated restaurants across Bengaluru. Track delivery scooters along 100% paved road routes with thermal container care and secure 4-digit OTP.
              </p>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["9 Local Kitchens", "Paved Road Routing", "Live Thermal Box", "4-Digit Delivery OTP"].map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "9px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#fb923c", display: "flex", alignItems: "center", gap: "4px" }}>
                  Order Delicious Food <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Feature 3: NEXUS Commerce */}
            <div
              onClick={() => handleWolfNavigate("shop", "Opening Super Marketplace...")}
              style={{
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(15, 23, 42, 0.75))",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c084fc")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.4)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(168, 85, 247, 0.4)",
                    }}
                  >
                    <ShoppingBag size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>NEXUS Commerce</h4>
                    <span style={{ fontSize: "11px", color: "#c084fc", fontWeight: "600" }}>
                      Verified Retail & Super Marketplace
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(168, 85, 247, 0.2)",
                    color: "#c084fc",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                  }}
                >
                  AMAZON HUB 1-DAY
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", margin: "2px 0" }}>
                Shop hundreds of verified products spanning Electronics, Fashion, Essentials and Home Appliances with real-time stock, multi-seller prices, verified reviews, and step-by-step parcel tracking.
              </p>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["400+ Products", "Barcode OFF Ingest", "Amazon Hub Dispatch", "Live Milestones"].map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "9px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", display: "flex", alignItems: "center", gap: "4px" }}>
                  Explore Marketplace <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Feature 4: NEXUS Direct Chat */}
            <div
              onClick={() => handleWolfNavigate("chat", "Connecting Direct Chat...")}
              style={{
                background: "linear-gradient(135deg, rgba(6, 78, 59, 0.35), rgba(15, 23, 42, 0.75))",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#10b981")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.4)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #059669, #10b981)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    <MessageSquare size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>NEXUS Direct Chat</h4>
                    <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>
                      Instant Messaging by Mobile Number
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  SOCKET.IO WEBSOCKETS
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", margin: "2px 0" }}>
                Connect instantly with any contact, merchant, or driver simply by entering their mobile number. Features WebSocket real-time typing indicators, push banner notifications, and companion AI.
              </p>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["Mobile Number Messaging", "Real-Time WebSockets", "Live Typing Indicators", "Push Banner Toasts"].map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "9px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                  Open Direct Chat <ArrowRight size={13} />
                </span>
              </div>
            </div>

            {/* Feature 5: NEXUS Digital Wallet */}
            <div
              onClick={() => handleWolfNavigate("wallet", "Accessing Secure Wallet...")}
              style={{
                background: "linear-gradient(135deg, rgba(109, 40, 217, 0.3), rgba(15, 23, 42, 0.75))",
                border: "1px solid rgba(139, 92, 246, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8b5cf6")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(139, 92, 246, 0.4)",
                    }}
                  >
                    <Wallet size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>NEXUS Pay & Wallet</h4>
                    <span style={{ fontSize: "11px", color: "#a78bfa", fontWeight: "600" }}>
                      Instant Top-ups & Zero-Fee P2P
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "#a78bfa",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                  }}
                >
                  INSTANT RAZORPAY UPI
                </span>
              </div>

              <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", margin: "2px 0" }}>
                Manage wallet funds with one-click Razorpay UPI, Cards, and Netbanking. Transfer money peer-to-peer to any phone or email with zero fees, protected by bank-grade 4-digit PIN security.
              </p>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["Razorpay Integration", "Zero-Fee P2P", "4-Digit PIN Security", "Instant Top-Up"].map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "9px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#a78bfa", display: "flex", alignItems: "center", gap: "4px" }}>
                  Manage Wallet <ArrowRight size={13} />
                </span>
              </div>
            </div>
          </div>

          {/* Placed Orders & Real-Time Tracking Card */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Activity size={16} color="var(--primary)" />
                <h4 style={{ fontSize: "13px", fontWeight: "700" }}>Placed Orders & Live Tracking</h4>
              </div>
              <button
                type="button"
                onClick={fetchUnifiedOrders}
                title="Refresh orders"
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}
              >
                <RefreshCw size={10} /> Sync
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              {[
                { key: "ALL", label: `All (${unifiedOrders.commerce.length + unifiedOrders.food.length + unifiedOrders.rides.length})` },
                { key: "FOOD", label: `🍔 Food (${unifiedOrders.food.length})` },
                { key: "RIDES", label: `🚖 Rides (${unifiedOrders.rides.length})` },
                { key: "COMMERCE", label: `🛍️ Shop (${unifiedOrders.commerce.length})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setOrdersFilter(f.key as any)}
                  style={{
                    background: ordersFilter === f.key ? "var(--primary)" : "rgba(255,255,255,0.04)",
                    color: ordersFilter === f.key ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "3px 8px",
                    fontSize: "10px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Orders Feed */}
            {(() => {
              const allList: any[] = [];
              if (ordersFilter === "ALL" || ordersFilter === "FOOD") {
                unifiedOrders.food.forEach((f) => allList.push({ type: "FOOD", data: f, date: new Date(f.createdAt) }));
              }
              if (ordersFilter === "ALL" || ordersFilter === "RIDES") {
                unifiedOrders.rides.forEach((r) => allList.push({ type: "RIDE", data: r, date: new Date(r.createdAt) }));
              }
              if (ordersFilter === "ALL" || ordersFilter === "COMMERCE") {
                unifiedOrders.commerce.forEach((c) => allList.push({ type: "COMMERCE", data: c, date: new Date(c.createdAt) }));
              }
              allList.sort((a, b) => b.date.getTime() - a.date.getTime());

              if (allList.length === 0) {
                return (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                    No orders placed yet. Order food, book rides, or shop to track live deliveries!
                  </p>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                  {allList.slice(0, 10).map((item, idx) => {
                    if (item.type === "FOOD") {
                      const f = item.data;
                      let parsed: any = {};
                      try { parsed = f.items ? JSON.parse(f.items) : {}; } catch {}
                      const isDelivered = f.status === "DELIVERED";
                      return (
                        <div key={`food-${f.id}-${idx}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "8px 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700" }}>🍔 {parsed.restaurantName || "Food Courier Order"}</span>
                                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: isDelivered ? "rgba(16,185,129,0.2)" : "rgba(249,115,22,0.2)", color: isDelivered ? "#10b981" : "#f97316", fontWeight: "700" }}>
                                  {f.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                                Total: ₹{(f.totalAmount / 100).toFixed(2)} {!isDelivered && `• OTP: ${f.otpCode}`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setServicesSubTab("food");
                                setActiveTab("services");
                              }}
                              style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                            >
                              Track ➔
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (item.type === "RIDE") {
                      const r = item.data;
                      const isDone = r.status === "TRIP_COMPLETED";
                      return (
                        <div key={`ride-${r.id}-${idx}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "8px 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700" }}>🚖 Ride #{r.id.slice(-5).toUpperCase()}</span>
                                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: isDone ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.2)", color: isDone ? "#10b981" : "#3b82f6", fontWeight: "700" }}>
                                  {r.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                                Fare: ₹{(r.fare / 100).toFixed(2)} • Driver: {r.driver?.name || "Charlie Driver"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setServicesSubTab("mobility");
                                setActiveTab("services");
                              }}
                              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                            >
                              Track ➔
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (item.type === "COMMERCE") {
                      const c = item.data;
                      return (
                        <div key={`commerce-${c.id}-${idx}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "8px 10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700" }}>🛍️ Order #{c.id.slice(-6).toUpperCase()}</span>
                                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(16,185,129,0.2)", color: "#10b981", fontWeight: "700" }}>
                                  {c.status}
                                </span>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                                Amount: ₹{(c.totalAmount / 100).toFixed(2)} • Items: {c.subOrders?.length || 1} package(s)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenPackageTracking(c)}
                              style={{
                                background: "#FFD814",
                                border: "1px solid #FCD200",
                                color: "#0F1111",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "10px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: "0 2px 5px rgba(255, 216, 20, 0.2)"
                              }}
                            >
                              <Package size={11} /> Track ➔
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })()}
          </div>

          {/* Open Food Facts Ingest Interface */}
          <form onSubmit={handleIngestOFF} className="glass-card">
            <h3 style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={14} /> OFF Barcode Ingestion
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="text-input"
                placeholder="Enter food product barcode (e.g. 5449000000996)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary" disabled={isLoading} style={{ padding: "10px 16px" }}>
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Ingest"}
              </button>
            </div>
          </form>

          {/* Development validation integrity panel */}
          {isDevelopment && validationStats && (
            <div className="glass-card" style={{ border: "1px solid rgba(139, 92, 246, 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--primary)" }}>
                  🛠️ Developer Data Integrity
                </h4>
                <button
                  onClick={() => setShowDevStats(!showDevStats)}
                  style={{ background: "none", border: "none", color: "var(--secondary)", fontSize: "10px", cursor: "pointer", textDecoration: "underline" }}
                >
                  {showDevStats ? "Hide" : "Show Info"}
                </button>
              </div>
              
              {showDevStats && (
                <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "10px" }}>
                  <div>Total CSV Records: <strong>{validationStats.totalRecords}</strong></div>
                  <div>Unique Product IDs: <strong>{validationStats.uniqueProductIds}</strong></div>
                  <div>Missing Product Names: <strong style={{ color: validationStats.missingNames ? "#EF4444" : "#10B981" }}>{validationStats.missingNames}</strong></div>
                  <div>Missing Prices: <strong style={{ color: validationStats.missingPrices ? "#EF4444" : "#10B981" }}>{validationStats.missingPrices}</strong></div>
                  <div>Missing Categories: <strong style={{ color: validationStats.missingCategories ? "#EF4444" : "#10B981" }}>{validationStats.missingCategories}</strong></div>
                  <div>Missing Image URLs: <strong>{validationStats.missingImageUrls}</strong></div>
                  <div>Invalid Prices: <strong style={{ color: validationStats.invalidPrices ? "#EF4444" : "#10B981" }}>{validationStats.invalidPrices}</strong></div>
                  <div>Invalid Ratings: <strong style={{ color: validationStats.invalidRatings ? "#EF4444" : "#10B981" }}>{validationStats.invalidRatings}</strong></div>
                  <div>Invalid Discounts: <strong style={{ color: validationStats.invalidDiscounts ? "#EF4444" : "#10B981" }}>{validationStats.invalidDiscounts}</strong></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shop Tab */}
      {activeTab === "shop" && (
        (!isCsvLoaded && displayedProducts.length === 0) ? (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <WolfLoader
              mode="card"
              size="lg"
              message={csvLoadProgress}
              subMessage="Syncing product catalog and verified pricing..."
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Quick Cart Banner */}
            {cartItemsCount > 0 && onOpenCart && (
              <div
                onClick={onOpenCart}
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(139, 92, 246, 0.15))",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingBag size={16} color="#10b981" />
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>
                    {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"} in cart • ₹{(cartTotalCents / 100).toFixed(2)}
                  </span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981" }}>
                  View Cart →
                </span>
              </div>
            )}

            {/* Amazon Top Navigation Header */}
            <div style={{
              background: "#131921",
              borderRadius: "12px",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                    <span style={{ fontSize: "17px", fontWeight: "900", letterSpacing: "-0.5px", color: "#fff" }}>amazon</span>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#FF9900" }}>.in</span>
                  </div>
                  <span style={{
                    background: "linear-gradient(135deg, #00A8E1, #007EB9)",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: "800",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    letterSpacing: "0.5px"
                  }}>
                    prime
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setShopView("ORDERS")}
                    style={{
                      background: shopView === "ORDERS" ? "#232F3E" : "transparent",
                      border: shopView === "ORDERS" ? "1px solid #FF9900" : "1px solid rgba(255,255,255,0.15)",
                      color: shopView === "ORDERS" ? "#FF9900" : "#fff",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <Package size={13} />
                    <span>Returns & Orders</span>
                    <span style={{
                      background: "#FF9900",
                      color: "#0F1111",
                      borderRadius: "10px",
                      padding: "1px 6px",
                      fontSize: "9px",
                      fontWeight: "800"
                    }}>
                      {unifiedOrders.commerce.length}
                    </span>
                  </button>

                  {cartItemsCount > 0 && onOpenCart && (
                    <button
                      type="button"
                      onClick={onOpenCart}
                      style={{
                        background: "#FFD814",
                        border: "1px solid #FCD200",
                        color: "#0F1111",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <ShoppingBag size={13} />
                      <span>Cart ({cartItemsCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Amazon Sub-Navigation Tabs */}
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none" }}>
                <button
                  type="button"
                  onClick={() => setShopView("CATALOG")}
                  style={{
                    background: shopView === "CATALOG" ? "rgba(255, 153, 0, 0.15)" : "rgba(255,255,255,0.04)",
                    border: shopView === "CATALOG" ? "1px solid #FF9900" : "1px solid rgba(255,255,255,0.08)",
                    color: shopView === "CATALOG" ? "#FF9900" : "var(--text-secondary)",
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  🛍️ Amazon Store
                </button>
                <button
                  type="button"
                  onClick={() => setShopView("ORDERS")}
                  style={{
                    background: shopView === "ORDERS" ? "rgba(255, 153, 0, 0.15)" : "rgba(255,255,255,0.04)",
                    border: shopView === "ORDERS" ? "1px solid #FF9900" : "1px solid rgba(255,255,255,0.08)",
                    color: shopView === "ORDERS" ? "#FF9900" : "var(--text-secondary)",
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  📦 Your Orders & Package Tracking ({unifiedOrders.commerce.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShopView("CATALOG");
                    setSelectedCategory("Electronics");
                  }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-secondary)",
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  ⚡ Electronics & Gadgets
                </button>
              </div>
            </div>

            {/* IF IN ORDERS VIEW: Show Amazon Placed Orders & Tracking */}
            {shopView === "ORDERS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Your Orders</h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {unifiedOrders.commerce.length} {unifiedOrders.commerce.length === 1 ? "order" : "orders"} placed
                  </span>
                </div>

                {unifiedOrders.commerce.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: "center", padding: "40px 16px" }}>
                    <Package size={36} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
                    <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>No orders placed yet</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>
                      You have not placed any orders yet. Add items to your cart and place an order to track live delivery!
                    </p>
                    <button
                      type="button"
                      onClick={() => setShopView("CATALOG")}
                      style={{
                        background: "#FFD814",
                        border: "1px solid #FCD200",
                        color: "#0F1111",
                        borderRadius: "8px",
                        padding: "8px 18px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Start Shopping on Amazon
                    </button>
                  </div>
                ) : (
                  unifiedOrders.commerce.map((order: any, idx: number) => {
                    const orderDate = new Date(order.createdAt || Date.now());
                    const subOrders = order.subOrders || [];
                    const allItems: any[] = [];
                    subOrders.forEach((so: any) => {
                      (so.items || []).forEach((it: any) => allItems.push(it));
                    });

                    return (
                      <div
                        key={order.id || idx}
                        style={{
                          background: "#1E1E24",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "10px",
                          overflow: "hidden"
                        }}
                      >
                        {/* Amazon Order Card Header */}
                        <div style={{
                          background: "#232F3E",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)"
                        }}>
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                            <div>
                              <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase", display: "block" }}>Order Placed</span>
                              <span style={{ fontSize: "11px", color: "#fff", fontWeight: "600" }}>{orderDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <div>
                              <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase", display: "block" }}>Total</span>
                              <span style={{ fontSize: "11px", color: "#fff", fontWeight: "700" }}>₹{(order.totalAmount / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase", display: "block" }}>Ship To</span>
                              <span style={{ fontSize: "11px", color: "#38BDF8", fontWeight: "600" }}>{user?.name || "Alice Consumer"} ▾</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase", display: "block" }}>Order # {order.id.slice(0, 8).toUpperCase()}</span>
                            <span style={{ fontSize: "9px", color: "#10B981", fontWeight: "700" }}>Verified Purchase ✓</span>
                          </div>
                        </div>

                        {/* Amazon Order Card Body */}
                        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                            <div>
                              <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#10B981", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Truck size={16} /> Arriving Tomorrow by 8 PM
                              </h4>
                              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                Shipped with Amazon Logistics • Tracking ID: NEX-AMZ-{(order.id || "").slice(0, 8).toUpperCase()}
                              </p>
                            </div>

                            {/* Primary Amazon Action: Track Package */}
                            <button
                              type="button"
                              onClick={() => handleOpenPackageTracking(order)}
                              style={{
                                background: "#FFD814",
                                border: "1px solid #FCD200",
                                color: "#0F1111",
                                borderRadius: "8px",
                                padding: "8px 16px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 6px rgba(255, 216, 20, 0.25)"
                              }}
                            >
                              <Package size={14} /> Track Package
                            </button>
                          </div>

                          {/* Items List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                            {allItems.length > 0 ? (
                              allItems.map((item: any, iIdx: number) => {
                                const prod = item.sellerListing?.productVariant?.product;
                                const variant = item.sellerListing?.productVariant;
                                const imgUrl = prod ? resolvePreciseProductImage(prod.title || "", prod.category?.name || "", "") : "/images/products/fruits.jpg";
                                return (
                                  <div key={item.id || iIdx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "54px", height: "54px", borderRadius: "8px", overflow: "hidden", background: "#2d3748", flexShrink: 0 }}>
                                      <img src={imgUrl} alt={prod?.title || "Product"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <h5 style={{ fontSize: "12px", fontWeight: "700", color: "#F3F4F6", margin: 0 }}>
                                        {prod?.title || "NEXUS Prime Product"}
                                      </h5>
                                      <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "2px 0" }}>
                                        {variant?.name ? `Variant: ${variant.name} • ` : ""}Qty: {item.quantity || 1} • Sold by: {item.sellerListing?.seller?.businessName || "NEXUS Retail"}
                                      </p>
                                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#FF9900" }}>
                                        ₹{((item.price * (item.quantity || 1)) / 100).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "50px", height: "50px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Package size={24} color="#FF9900" />
                                </div>
                                <div>
                                  <h5 style={{ fontSize: "12px", fontWeight: "700" }}>NEXUS Prime Package</h5>
                                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Contains {subOrders.length || 1} package(s) • Total ₹{(order.totalAmount / 100).toFixed(2)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* IF IN CATALOG VIEW: Show Search and Products */}
            {shopView === "CATALOG" && (
              <>
            {/* Search Bar */}
            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
            <Search size={18} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search Amazon products, electronics, groceries..."
              className="text-input"
              style={{ paddingLeft: "38px", width: "100%" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Controls Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* Sorting Selection Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "20px", border: "1px solid var(--border)", flex: 1 }}>
                <SlidersHorizontal size={12} color="var(--text-secondary)" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "11px", outline: "none", cursor: "pointer", width: "100%" }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Rating: High to Low</option>
                  <option value="reviews_desc">Most Reviewed</option>
                  <option value="discount_desc">Discount: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </div>

              {/* Reset Filters button */}
              <button
                onClick={onResetFilters}
                className="btn-secondary"
                style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {/* Price range inputs (selling price, not mrp) */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "20px", border: "1px solid var(--border)", flex: 1 }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Min:</span>
                <input
                  type="number"
                  placeholder="₹ Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  style={{ width: "100%", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "11px", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "20px", border: "1px solid var(--border)", flex: 1 }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Max:</span>
                <input
                  type="number"
                  placeholder="₹ Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  style={{ width: "100%", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "11px", outline: "none" }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Category Chips */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
            <button
              onClick={() => {
                setSelectedCategory("");
                setSelectedSubcategory("");
              }}
              className={selectedCategory === "" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", flexShrink: 0 }}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setSelectedSubcategory("");
                }}
                className={selectedCategory === cat.name ? "btn-primary" : "btn-secondary"}
                style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", flexShrink: 0 }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dynamic Subcategories Chips (rendered when category is selected) */}
          {selectedCategory && subcategories.length > 0 && (
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", scrollbarWidth: "none" }}>
              <button
                onClick={() => setSelectedSubcategory("")}
                className={selectedSubcategory === "" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "4px 10px", borderRadius: "16px", fontSize: "10px", flexShrink: 0, background: selectedSubcategory === "" ? "var(--secondary)" : "rgba(255,255,255,0.03)" }}
              >
                All {selectedCategory}
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={selectedSubcategory === sub ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 10px", borderRadius: "16px", fontSize: "10px", flexShrink: 0, background: selectedSubcategory === sub ? "var(--secondary)" : "rgba(255,255,255,0.03)" }}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* Dynamic Filtered Count Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", padding: "0 4px" }}>
            <span>Showing {displayedProductsCount} of {totalProductsCount.toLocaleString()} products</span>
            {searchQuery && <span>Search: "{searchQuery}"</span>}
          </div>

          {/* Marketplace Catalog Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", paddingBottom: "10px" }}>
            {displayedProducts.map((prod) => {
              // Calculate actual dynamic properties directly from CSV mapped structures
              const priceA = prod.variants?.[0]?.listings?.[0]?.price ?? prod.price ?? 0;
              const comparePriceA = prod.variants?.[0]?.listings?.[0]?.compareAtPrice ?? prod.compareAtPrice ?? 0;
              const discount = comparePriceA > priceA 
                ? Math.round(((comparePriceA - priceA) / comparePriceA) * 100)
                : 0;

              // Image Priority retrieval with safe error fallback handler & CDN optimization
              const activeImageUrl = getOptimizedImageUrl(getProductImage(prod));

              // Stock Status checks
              const stock = prod.variants?.[0]?.listings?.[0]?.inventory?.quantity ?? prod.variants?.[0]?.stock_quantity ?? prod.stock ?? 50;
              const availability = stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK";

              return (
                <div key={prod.id} className="product-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", width: "100%", height: "110px", background: "#1f2937", overflow: "hidden" }}>
                    <img
                      src={activeImageUrl}
                      alt={prod.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = () => {
                          target.onerror = null;
                          target.src = "/images/products/fruits.jpg";
                        };
                        const cat = prod.category?.name || "";
                        const sub = (prod.category as any)?.parent?.name || cat;
                        target.src = resolvePreciseProductImage(prod.title || "", cat, sub);
                      }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s ease-in" }}
                    />
                    {discount > 0 && (
                      <div style={{
                        position: "absolute", top: 8, left: 8,
                        background: "var(--primary)", color: "#fff",
                        fontSize: "9px", fontWeight: "700",
                        padding: "2px 6px", borderRadius: "4px",
                        display: "flex", alignItems: "center", gap: "2px"
                      }}>
                        <Tag size={10} /> {discount}% OFF
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {prod.brand?.name || "Generic"}
                    </span>
                    <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#F3F4F6", margin: "2px 0 6px", lineBreak: "anywhere", height: "32px", overflow: "hidden" }}>
                      {prod.title}
                    </h4>

                    {/* Stock indicator badge */}
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      {availability === "OUT_OF_STOCK" || stock === 0 ? (
                        <span style={{ fontSize: "8px", color: "#EF4444", fontWeight: "600" }}>OUT OF STOCK</span>
                      ) : stock < 10 ? (
                        <span style={{ fontSize: "8px", color: "#F59E0B", fontWeight: "600" }}>ONLY {stock} LEFT</span>
                      ) : (
                        <span style={{ fontSize: "8px", color: "#10B981", fontWeight: "600" }}>IN STOCK ({stock})</span>
                      )}
                    </div>

                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>
                          ₹{(priceA / 100).toFixed(2)}
                        </span>
                        {comparePriceA > priceA && (
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", textDecoration: "line-through" }}>
                            ₹{(comparePriceA / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => openProductDetails(prod)}
                          title="View Details"
                          style={{
                            background: "rgba(167, 139, 250, 0.15)", border: "none",
                            color: "var(--primary)", cursor: "pointer",
                            width: "26px", height: "26px", borderRadius: "6px",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        {prod.variants?.[0]?.listings?.[0]?.id && (() => {
                          const listingId = prod.variants[0].listings[0].id;
                          const inCartQty = cartQuantities?.[listingId] || 0;
                          if (inCartQty > 0) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  background: "rgba(167, 139, 250, 0.18)",
                                  border: "1px solid rgba(167, 139, 250, 0.4)",
                                  borderRadius: "6px",
                                  padding: "2px 4px"
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateCartQuantity) {
                                      onUpdateCartQuantity(listingId, inCartQty, -1);
                                    }
                                  }}
                                  title="Decrease quantity"
                                  style={{
                                    background: "rgba(255, 255, 255, 0.12)",
                                    border: "none",
                                    color: "#fff",
                                    borderRadius: "4px",
                                    width: "22px",
                                    height: "22px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                  }}
                                >
                                  -
                                </button>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: "#fff",
                                    minWidth: "16px",
                                    textAlign: "center"
                                  }}
                                >
                                  {inCartQty}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateCartQuantity) {
                                      onUpdateCartQuantity(listingId, inCartQty, 1);
                                    }
                                  }}
                                  title="Increase quantity"
                                  style={{
                                    background: "rgba(255, 255, 255, 0.12)",
                                    border: "none",
                                    color: "#fff",
                                    borderRadius: "4px",
                                    width: "22px",
                                    height: "22px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            );
                          }
                          return onAddToCart ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(listingId);
                              }}
                              title="Add to Cart"
                              style={{
                                background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
                                border: "none",
                                color: "#fff",
                                borderRadius: "6px",
                                padding: "5px 8px",
                                fontSize: "10px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px"
                              }}
                            >
                              <ShoppingBag size={11} /> +Cart
                            </button>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty Search / Filters Results state handler */}
          {totalProductsCount === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
              <AlertCircle size={32} style={{ margin: "0 auto 10px" }} />
              <h4 style={{ fontSize: "13px", color: "#fff", marginBottom: "4px" }}>No products found</h4>
              <p style={{ fontSize: "11px" }}>Try another product name, brand, category, subcategory, or adjusting the price range filters.</p>
              <button onClick={onResetFilters} className="btn-secondary" style={{ marginTop: "14px", padding: "6px 14px", fontSize: "11px" }}>
                Clear Filters
              </button>
            </div>
          )}

          {/* Load More Pagination Trigger */}
          {displayedProductsCount < totalProductsCount && (
            <button
              onClick={loadMoreProducts}
              className="btn-secondary"
              style={{ width: "100%", padding: "12px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", color: "var(--primary)", border: "1px dashed var(--primary)", cursor: "pointer", margin: "10px 0 30px" }}
            >
              Load More Products (+48)
            </button>
          )}
          </>
        )}
        </div>
      )
    )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <ChatPortal
          user={user}
          backendUrl={backendUrl}
          setGlobalSuccessMsg={setGlobalSuccessMsg}
          setGlobalErrorMsg={setGlobalErrorMsg}
        />
      )}

      {/* Wallet Tab - Double-Entry Ledger, P2P Transfers & Statements */}
      {activeTab === "wallet" && (
        <WalletPortal
          user={user}
          accessToken={accessToken}
          backendUrl={backendUrl}
          onBalanceUpdate={onBalanceUpdate}
          setGlobalSuccessMsg={setGlobalSuccessMsg}
          setGlobalErrorMsg={setGlobalErrorMsg}
          initialAction={initialWalletAction}
          onClearInitialAction={onClearInitialWalletAction}
        />
      )}

      {/* Services Tab: Comprehensive Services Hub & Sub-Portals */}
      {activeTab === "services" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Sub-tab Pill Switcher */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "10px",
              padding: "3px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setServicesSubTab("hub")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: servicesSubTab === "hub" ? "var(--primary)" : "transparent",
                color: "#fff",
                fontWeight: "700",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              🏢 All Services
            </button>
            <button
              type="button"
              onClick={() => setServicesSubTab("food")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: servicesSubTab === "food" ? "var(--primary)" : "transparent",
                color: "#fff",
                fontWeight: "700",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              🍔 Food Delivery
            </button>
            <button
              type="button"
              onClick={() => setServicesSubTab("mobility")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                background: servicesSubTab === "mobility" ? "var(--primary)" : "transparent",
                color: "#fff",
                fontWeight: "700",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              🚗 Mobility & Rides
            </button>
          </div>

          {/* HUB OVERVIEW OF ALL OPTIONS */}
          {servicesSubTab === "hub" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(16, 185, 129, 0.1))",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    ✨ NEXUS Super-App Suite
                  </span>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", margin: "2px 0 4px" }}>
                  On-Demand Services
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  Order gourmet food, book city transit, shop instant groceries, chat with merchants, or manage your wallet.
                </p>
              </div>

              {/* Service Option 1: Food Delivery */}
              <div
                onClick={() => setServicesSubTab("food")}
                className="glass-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  background: "linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(20, 18, 26, 0.8))",
                  padding: "14px",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #f97316, #ea580c)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    🍔
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Food Courier</h4>
                      <span style={{ fontSize: "9px", background: "rgba(249, 115, 22, 0.2)", color: "#f97316", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        4 KITCHENS OPEN
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Indian, Italian, Asian & Gourmet Burgers • Live Kitchen & OTP Tracking
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#f97316",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Order →
                </button>
              </div>

              {/* Service Option 2: Mobility & Rides */}
              <div
                onClick={() => setServicesSubTab("mobility")}
                className="glass-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(20, 18, 26, 0.8))",
                  padding: "14px",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    🚗
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Mobility & Rides</h4>
                      <span style={{ fontSize: "9px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        NEARBY DRIVERS
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Moto, Auto Rickshaw & Prime Sedan • Upfront Fares & Ride Start OTP
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Book →
                </button>
              </div>

              {/* Service Option 3: Hyperlocal Grocery Mart */}
              <div
                onClick={() => setActiveTab("shop")}
                className="glass-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(20, 18, 26, 0.8))",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    🛒
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Grocery Marketplace</h4>
                      <span style={{ fontSize: "9px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        120+ PRODUCTS
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Open Food Facts verified groceries, dairy, snacks & pantry staples
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Shop →
                </button>
              </div>

              {/* Service Option 4: Real-Time Chat & Concierge */}
              <div
                onClick={() => setActiveTab("chat")}
                className="glass-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(20, 18, 26, 0.8))",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    💬
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>AI Concierge & Chat</h4>
                      <span style={{ fontSize: "9px", background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        INSTANT REPLIES
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Live chat with 24/7 AI Concierge, Charlie Driver, and Bob Seller
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Chat →
                </button>
              </div>

              {/* Service Option 5: Nexus Pay Wallet */}
              <div
                onClick={() => setActiveTab("wallet")}
                className="glass-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(236, 72, 153, 0.3)",
                  background: "linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(20, 18, 26, 0.8))",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #ec4899, #db2777)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    👛
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Double-Entry Wallet</h4>
                      <span style={{ fontSize: "9px", background: "rgba(236, 72, 153, 0.2)", color: "#f472b6", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        ZERO-FEE P2P
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Razorpay automated top-ups, audit ledger, and 4-digit PIN security
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#ec4899",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Wallet →
                </button>
              </div>
            </div>
          )}

          {/* FOOD DELIVERY SUB-PORTAL */}
          {servicesSubTab === "food" && (
            <div>
              <div style={{ marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => setServicesSubTab("hub")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0,
                  }}
                >
                  ← Back to All Services
                </button>
              </div>
              <FoodPortal
                user={user}
                backendUrl={backendUrl}
                onBalanceUpdate={onBalanceUpdate}
                setGlobalSuccessMsg={setGlobalSuccessMsg}
                setGlobalErrorMsg={setGlobalErrorMsg}
              />
            </div>
          )}

          {/* MOBILITY SUB-PORTAL */}
          {servicesSubTab === "mobility" && (
            <div>
              <div style={{ marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => setServicesSubTab("hub")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0,
                  }}
                >
                  ← Back to All Services
                </button>
              </div>
              <MobilityPortal
                user={user}
                backendUrl={backendUrl}
                onBalanceUpdate={onBalanceUpdate}
                setGlobalSuccessMsg={setGlobalSuccessMsg}
                setGlobalErrorMsg={setGlobalErrorMsg}
              />
            </div>
          )}
        </div>
      )}

      {/* Amazon Package Tracking Modal */}
      {selectedTrackingOrder && packageTrackingData && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(3, 2, 5, 0.96)",
          zIndex: 140,
          display: "flex",
          flexDirection: "column",
          padding: "30px 16px 20px",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Package size={18} color="#FF9900" />
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>Amazon Package Tracking</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTrackingOrder(null);
                setPackageTrackingData(null);
              }}
              style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Estimated Delivery Status Box */}
            <div style={{
              background: "linear-gradient(135deg, #131921, #232F3E)",
              border: "1px solid rgba(255, 153, 0, 0.4)",
              borderRadius: "12px",
              padding: "16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#FF9900", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Estimated Delivery
                  </span>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#fff", margin: "2px 0 4px" }}>
                    {packageTrackingData.estimatedDelivery}
                  </h2>
                  <p style={{ fontSize: "11px", color: "#10B981", fontWeight: "700" }}>
                    ● On schedule for delivery
                  </p>
                </div>
                <div style={{
                  background: "rgba(255, 153, 0, 0.15)",
                  border: "1px solid #FF9900",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  textAlign: "right"
                }}>
                  <span style={{ fontSize: "9px", color: "#A6A6A6", display: "block" }}>Carrier</span>
                  <span style={{ fontSize: "10px", color: "#FF9900", fontWeight: "800" }}>Amazon Logistics</span>
                </div>
              </div>

              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "10px", fontSize: "11px", color: "var(--text-secondary)" }}>
                Tracking #: <strong style={{ color: "#fff" }}>{packageTrackingData.trackingNumber}</strong>
              </div>
            </div>

            {/* 4-Stage Visual Progress Bar */}
            <div className="glass-card" style={{ padding: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#A6A6A6", textTransform: "uppercase", marginBottom: "14px" }}>
                Package Shipment Journey
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
                {packageTrackingData.timeline.map((step: any, sIdx: number) => {
                  const isCompleted = step.completed;
                  const isCurrent = sIdx === packageTrackingData.currentStep;
                  return (
                    <div key={step.step || sIdx} style={{ display: "flex", gap: "12px", alignItems: "flex-start", position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "24px" }}>
                        <div style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: isCompleted ? "#10B981" : isCurrent ? "#FF9900" : "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "800",
                          boxShadow: isCurrent ? "0 0 10px rgba(255, 153, 0, 0.6)" : undefined
                        }}>
                          {isCompleted ? "✓" : sIdx + 1}
                        </div>
                        {sIdx < packageTrackingData.timeline.length - 1 && (
                          <div style={{
                            width: "2px",
                            height: "40px",
                            background: isCompleted ? "#10B981" : "rgba(255,255,255,0.12)",
                            margin: "4px 0"
                          }} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h5 style={{ fontSize: "13px", fontWeight: "700", color: isCurrent ? "#FF9900" : isCompleted ? "#fff" : "var(--text-muted)", margin: 0 }}>
                            {step.title}
                          </h5>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{step.time}</span>
                        </div>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Partner & Facility Card */}
            {packageTrackingData.courierPartner && (
              <div className="glass-card" style={{ padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#232F3E", border: "1px solid #FF9900", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Truck size={20} color="#FF9900" />
                  </div>
                  <div>
                    <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase" }}>Delivery Associate</span>
                    <h5 style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>{packageTrackingData.courierPartner.name}</h5>
                    <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{packageTrackingData.courierPartner.vehicle}</p>
                  </div>
                </div>
                <a
                  href={`tel:${packageTrackingData.courierPartner.phone}`}
                  style={{
                    background: "#10B981",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Phone size={12} /> Call
                </a>
              </div>
            )}

            {/* Shipping Address */}
            <div className="glass-card" style={{ padding: "14px" }}>
              <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Delivery Address
              </span>
              <p style={{ fontSize: "12px", color: "#F3F4F6", lineHeight: "1.4" }}>
                {packageTrackingData.deliveryAddress}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTrackingOrder(null);
                setPackageTrackingData(null);
              }}
              className="btn-secondary"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", fontWeight: "700", fontSize: "12px" }}
            >
              Close Tracking
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
