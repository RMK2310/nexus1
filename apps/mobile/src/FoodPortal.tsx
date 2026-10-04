import React, { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Clock,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  Truck,
  Sparkles,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { authFetch } from "./services/apiClient";
import { GoogleMapView } from "./GoogleMapView";

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  lat?: number;
  lng?: number;
  address?: string;
  menus: MenuItem[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface FoodOrder {
  id: string;
  restaurantId: string;
  status: string;
  otpCode: string;
  totalAmount: number;
  items?: string;
  createdAt: string;
}

interface FoodPortalProps {
  user: any;
  backendUrl: string;
  onBalanceUpdate?: (newBalance: number) => void;
  setGlobalSuccessMsg?: (msg: string) => void;
  setGlobalErrorMsg?: (msg: string) => void;
  onPayWithRazorpay?: (amount: number, description: string, onSuccess: () => void) => void;
}

const DEFAULT_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-curry-palace",
    name: "The Curry Palace",
    cuisine: "North Indian • Mughlai • Biryani",
    lat: 12.9784,
    lng: 77.6408,
    address: "100 Feet Rd, Indiranagar",
    menus: [
      { id: "menu-cp-1", name: "Butter Chicken with Garlic Naan", price: 349, isAvailable: true },
      { id: "menu-cp-2", name: "Paneer Tikka Masala", price: 299, isAvailable: true },
      { id: "menu-cp-3", name: "Hyderabadi Dum Mutton Biryani", price: 449, isAvailable: true },
      { id: "menu-cp-4", name: "Dal Makhani (Slow-Cooked 24hrs)", price: 249, isAvailable: true },
      { id: "menu-cp-5", name: "Murgh Malai Tikka (6 pcs)", price: 329, isAvailable: true },
      { id: "menu-cp-6", name: "Garlic Butter Naan Basket", price: 129, isAvailable: true },
      { id: "menu-cp-7", name: "Kesari Kheer & Gulab Jamun", price: 149, isAvailable: true },
      { id: "menu-cp-8", name: "Royal Mango Lassi", price: 119, isAvailable: true },
    ],
  },
  {
    id: "rest-pizza-roma",
    name: "Pizza Roma Trattoria",
    cuisine: "Italian • Wood-Fired Pizza • Pasta",
    lat: 12.9352,
    lng: 77.6245,
    address: "5th Block, Koramangala",
    menus: [
      { id: "menu-pr-1", name: "Margherita di Bufala Pizza", price: 449, isAvailable: true },
      { id: "menu-pr-2", name: "Quattro Formaggi Wood-Fired Pizza", price: 529, isAvailable: true },
      { id: "menu-pr-3", name: "Truffle Mushroom Fettuccine", price: 499, isAvailable: true },
      { id: "menu-pr-4", name: "Pepperoni Piccante Sourdough Pizza", price: 579, isAvailable: true },
      { id: "menu-pr-5", name: "Classic Garlic Knots with Marinara", price: 189, isAvailable: true },
      { id: "menu-pr-6", name: "Creamy Pesto Penne Primavera", price: 419, isAvailable: true },
      { id: "menu-pr-7", name: "Traditional Tiramisu al Caffe", price: 249, isAvailable: true },
      { id: "menu-pr-8", name: "Sicilian Lemon Iced Tea", price: 139, isAvailable: true },
    ],
  },
  {
    id: "rest-sushi-harbor",
    name: "Sushi Harbor & Asian Wok",
    cuisine: "Pan-Asian • Sushi • Dim Sum",
    lat: 12.9756,
    lng: 77.6066,
    address: "Church Street, MG Road",
    menus: [
      { id: "menu-sh-1", name: "Spicy Salmon Crunch Roll (8 pcs)", price: 549, isAvailable: true },
      { id: "menu-sh-2", name: "Truffle Edamame Dim Sum (6 pcs)", price: 379, isAvailable: true },
      { id: "menu-sh-3", name: "Peking Chilli Garlic Noodles", price: 319, isAvailable: true },
      { id: "menu-sh-4", name: "Crispy Prawn Tempura (4 pcs)", price: 429, isAvailable: true },
      { id: "menu-sh-5", name: "Chicken Katsu Curry with Jasmine Rice", price: 469, isAvailable: true },
      { id: "menu-sh-6", name: "Steamed Teriyaki Chicken Bao Buns (3 pcs)", price: 299, isAvailable: true },
      { id: "menu-sh-7", name: "Thai Green Curry with Steamed Rice", price: 399, isAvailable: true },
      { id: "menu-sh-8", name: "Japanese Matcha Boba Cooler", price: 189, isAvailable: true },
    ],
  },
  {
    id: "rest-burger-craft",
    name: "Burger Craft & Shake Lab",
    cuisine: "Gourmet Smash Burgers • Fries",
    lat: 12.9719,
    lng: 77.5937,
    address: "Lavelle Road, Central Bengaluru",
    menus: [
      { id: "menu-bc-1", name: "Double Smash Bacon Cheeseburger", price: 399, isAvailable: true },
      { id: "menu-bc-2", name: "Crispy Peri Peri Chicken Burger", price: 349, isAvailable: true },
      { id: "menu-bc-3", name: "Truffle Mushroom Swiss Melt Burger", price: 389, isAvailable: true },
      { id: "menu-bc-4", name: "Loaded Truffle Parmesan Fries", price: 199, isAvailable: true },
      { id: "menu-bc-5", name: "Fiery Buffalo Wings with Blue Cheese Dip", price: 279, isAvailable: true },
      { id: "menu-bc-6", name: "Thick Belgian Chocolate Shake", price: 219, isAvailable: true },
      { id: "menu-bc-7", name: "Salted Caramel Pretzel Shake", price: 229, isAvailable: true },
      { id: "menu-bc-8", name: "Crispy Beer-Battered Onion Rings", price: 159, isAvailable: true },
    ],
  },
  {
    id: "rest-bengaluru-tiffin",
    name: "Namma Bengaluru Tiffin & Dosa Hub",
    cuisine: "South Indian • Filter Coffee • Tiffin",
    lat: 12.9298,
    lng: 77.5833,
    address: "Jayanagar 4th Block, Bengaluru",
    menus: [
      { id: "menu-bt-1", name: "Iconic Benne Masala Dosa with Chutneys", price: 149, isAvailable: true },
      { id: "menu-bt-2", name: "Ghee Podi Thatte Idli with Coconut Chutney", price: 119, isAvailable: true },
      { id: "menu-bt-3", name: "Crispy Medu Vada (2 pcs) with Sambar", price: 89, isAvailable: true },
      { id: "menu-bt-4", name: "Traditional Rava Masala Dosa", price: 139, isAvailable: true },
      { id: "menu-bt-5", name: "Royal Bisibelebath with Khara Boondi", price: 129, isAvailable: true },
      { id: "menu-bt-6", name: "Filter Coffee (Kumbakonam Degree)", price: 49, isAvailable: true },
      { id: "menu-bt-7", name: "Pure Ghee Mysore Pak (4 pcs)", price: 129, isAvailable: true },
      { id: "menu-bt-8", name: "Kesari Bath with Cashews & Saffron", price: 89, isAvailable: true },
    ],
  },
  {
    id: "rest-meghana-biryani",
    name: "Meghana Royal Biryani & Andhra Spices",
    cuisine: "Authentic Andhra Biryani • Spicy Starters",
    lat: 12.9344,
    lng: 77.6111,
    address: "Sony Signal, Koramangala",
    menus: [
      { id: "menu-mb-1", name: "Special Andhra Boneless Chicken Biryani", price: 389, isAvailable: true },
      { id: "menu-mb-2", name: "Authentic Meghana Chicken 65", price: 319, isAvailable: true },
      { id: "menu-mb-3", name: "Andhra Chilli Chicken (Green Gravy)", price: 329, isAvailable: true },
      { id: "menu-mb-4", name: "Fragrant Mutton Dum Biryani (Full Pot)", price: 489, isAvailable: true },
      { id: "menu-mb-5", name: "Paneer 65 Biryani with Raita", price: 299, isAvailable: true },
      { id: "menu-mb-6", name: "Guntur Ghee Roast Chicken", price: 349, isAvailable: true },
      { id: "menu-mb-7", name: "Double Ka Meetha (Royal Bread Pudding)", price: 139, isAvailable: true },
      { id: "menu-mb-8", name: "Spiced Buttermilk & Sweet Lime Soda", price: 69, isAvailable: true },
    ],
  },
  {
    id: "rest-taco-fiesta",
    name: "Taco Fiesta Mexicana",
    cuisine: "Mexican • Tacos • Burritos & Bowls",
    lat: 12.9719,
    lng: 77.6412,
    address: "12th Main Road, Indiranagar",
    menus: [
      { id: "menu-tf-1", name: "Smoky Chipotle Chicken Tacos (3 pcs)", price: 349, isAvailable: true },
      { id: "menu-tf-2", name: "Slow-Cooked Birria Beef Tacos with Consomé", price: 449, isAvailable: true },
      { id: "menu-tf-3", name: "Loaded Triple Cheese Quesadilla", price: 299, isAvailable: true },
      { id: "menu-tf-4", name: "Grilled Fajita Burrito Bowl", price: 369, isAvailable: true },
      { id: "menu-tf-5", name: "House Fresh Guacamole with Tortilla Chips", price: 229, isAvailable: true },
      { id: "menu-tf-6", name: "Crispy Cinnamon Churros with Chocolate Dulce", price: 199, isAvailable: true },
      { id: "menu-tf-7", name: "Mexican Horchata Spiced Drink", price: 139, isAvailable: true },
    ],
  },
  {
    id: "rest-artisan-bakery",
    name: "Artisan Bakery & Dessert Atelier",
    cuisine: "Pastries • Cheesecakes • Speciality Coffee",
    lat: 12.9716,
    lng: 77.5955,
    address: "UB City, Vittal Mallya Road",
    menus: [
      { id: "menu-ab-1", name: "Belgian Dark Chocolate Ganache Gateau", price: 289, isAvailable: true },
      { id: "menu-ab-2", name: "New York Baked Blueberry Cheesecake", price: 319, isAvailable: true },
      { id: "menu-ab-3", name: "French Almond Butter Croissant", price: 179, isAvailable: true },
      { id: "menu-ab-4", name: "Pastel French Macarons Box (4 assorted)", price: 299, isAvailable: true },
      { id: "menu-ab-5", name: "Warm Nutella Stuffed Cookie Skillet", price: 249, isAvailable: true },
      { id: "menu-ab-6", name: "Iced Spanish Latte with Condensed Milk", price: 219, isAvailable: true },
      { id: "menu-ab-7", name: "Cold Brew Tonic with Citrus Peel", price: 199, isAvailable: true },
    ],
  },
  {
    id: "rest-street-chaat",
    name: "Chai & Street Chaat Junction",
    cuisine: "Street Food • Chaat • Kulhad Chai",
    lat: 12.9822,
    lng: 77.6083,
    address: "Commercial Street, Tasker Town",
    menus: [
      { id: "menu-sc-1", name: "Delhi Style Papdi Chaat & Dahi Bhalla", price: 149, isAvailable: true },
      { id: "menu-sc-2", name: "Mumbai Pav Bhaji with Extra Amul Butter", price: 189, isAvailable: true },
      { id: "menu-sc-3", name: "Crispy Samosa Chaat with Tangy Chutneys", price: 129, isAvailable: true },
      { id: "menu-sc-4", name: "Kolkata Puchka / Golgappe Platter (8 pcs)", price: 119, isAvailable: true },
      { id: "menu-sc-5", name: "Maskabun with Ginger Cardamom Chai", price: 99, isAvailable: true },
      { id: "menu-sc-6", name: "Kulhad Rabdi Jalebi (Hot & Crisp)", price: 149, isAvailable: true },
    ],
  },
];

export const FoodPortal: React.FC<FoodPortalProps> = ({
  user,
  backendUrl,
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(DEFAULT_RESTAURANTS);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<{ [restaurantId: string]: CartItem[] }>({});
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "orders">("browse");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "COD">("WALLET");
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.address || "42, Tech Park Residency, Bengaluru"
  );
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9279,
    lng: 77.6271,
  });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedFoodTracking, setSelectedFoodTracking] = useState<any | null>(null);
  const [foodTrackingData, setFoodTrackingData] = useState<any | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [deliveryRoadDistance, setDeliveryRoadDistance] = useState<number | null>(null);
  const [deliveryRoadDuration, setDeliveryRoadDuration] = useState<number | null>(null);
  const [courierSimulatedProgress, setCourierSimulatedProgress] = useState<number>(35);

  useEffect(() => {
    fetchRestaurants();
    fetchOrders();
  }, [backendUrl]);

  useEffect(() => {
    if (!selectedFoodTracking) {
      setDeliveryRoadDistance(null);
      setDeliveryRoadDuration(null);
      return;
    }

    if (selectedFoodTracking.status === "OUT_FOR_DELIVERY") {
      setCourierSimulatedProgress((prev) => (prev < 20 || prev > 90 ? 35 : prev));
      const interval = setInterval(() => {
        setCourierSimulatedProgress((prev) => {
          if (prev >= 92) return 92;
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (selectedFoodTracking.status === "DELIVERED") {
      setCourierSimulatedProgress(100);
    } else if (selectedFoodTracking.status === "PREPARING") {
      setCourierSimulatedProgress(25);
    } else {
      setCourierSimulatedProgress(10);
    }
  }, [selectedFoodTracking?.status, selectedFoodTracking?.id]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/food/restaurants`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setRestaurants(data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch restaurants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await authFetch(`${backendUrl}/api/v1/food/orders`, {}, backendUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch food orders:", err);
    }
  };

  const openFoodTracking = async (order: any) => {
    setSelectedFoodTracking(order);
    setCourierSimulatedProgress(
      order.status === "DELIVERED"
        ? 100
        : order.status === "OUT_FOR_DELIVERY"
        ? 40
        : order.status === "PREPARING"
        ? 25
        : 10
    );
    setIsTrackingLoading(true);
    try {
      const res = await authFetch(`${backendUrl}/api/v1/food/orders/${order.id}/track`, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFoodTrackingData(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch food tracking:", e);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const currentCart = selectedRestaurant ? cart[selectedRestaurant.id] || [] : [];
  const cartTotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (restaurant: Restaurant, item: MenuItem) => {
    setCart((prev) => {
      const prevItems = prev[restaurant.id] || [];
      const existing = prevItems.find((i) => i.id === item.id);
      let updated: CartItem[];
      if (existing) {
        updated = prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updated = [...prevItems, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
      }
      return { ...prev, [restaurant.id]: updated };
    });
  };

  const removeFromCart = (restaurantId: string, itemId: string) => {
    setCart((prev) => {
      const prevItems = prev[restaurantId] || [];
      const existing = prevItems.find((i) => i.id === itemId);
      if (!existing) return prev;
      let updated: CartItem[];
      if (existing.quantity <= 1) {
        updated = prevItems.filter((i) => i.id !== itemId);
      } else {
        updated = prevItems.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return { ...prev, [restaurantId]: updated };
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedRestaurant || currentCart.length === 0) return;

    if (paymentMethod === "WALLET") {
      const walletBalance = (user?.walletBalance ?? 0) / 100;
      if (walletBalance < cartTotal) {
        if (setGlobalErrorMsg) {
          setGlobalErrorMsg(
            `Insufficient wallet balance. Total: ₹${cartTotal}, Balance: ₹${walletBalance.toFixed(2)}`
          );
        }
        return;
      }
    }

    setIsPlacingOrder(true);
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/food/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId: selectedRestaurant.id,
            items: currentCart,
            paymentMethod,
            deliveryAddress,
          }),
        },
        backendUrl
      );

      const json = await res.json();
      if (res.ok && json.success) {
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg(
            `🎉 Order placed successfully! Delivery OTP: ${json.data.otpCode}`
          );
        }
        // Deduct balance locally
        if (paymentMethod === "WALLET" && onBalanceUpdate && user?.walletBalance) {
          onBalanceUpdate(user.walletBalance - cartTotal * 100);
        }
        // Clear cart for this restaurant
        setCart((prev) => ({ ...prev, [selectedRestaurant.id]: [] }));
        setShowCheckoutModal(false);
        await fetchOrders();
        setActiveTab("orders");
      } else {
        if (setGlobalErrorMsg) {
          setGlobalErrorMsg(json.message || "Failed to place food order");
        }
      }
    } catch (err: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(err.message || "Network error");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const advanceOrderStatus = async (orderId: string) => {
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/food/orders/${orderId}/advance-status`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        backendUrl
      );
      if (res.ok) {
        await fetchOrders();
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Order status updated!");
      }
    } catch (err) {
      console.warn("Failed to advance order:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UtensilsCrossed size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Food Courier</h3>
              <span style={{ fontSize: "9px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                100% FREE • NO API KEY
              </span>
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
              Hyper-local gourmet delivery & real-time street map tracking
            </p>
          </div>
        </div>

        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "2px" }}>
          <button
            onClick={() => {
              setActiveTab("browse");
              setSelectedRestaurant(null);
            }}
            style={{
              background: activeTab === "browse" ? "var(--primary)" : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Restaurants
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            style={{
              background: activeTab === "orders" ? "var(--primary)" : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Live Orders
            {orders.some((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED") && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* BROWSE TAB */}
      {activeTab === "browse" && !selectedRestaurant && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px" }}>Loading gourmet restaurants...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "32px" }}>
              <UtensilsCrossed size={36} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "13px" }}>No restaurants open currently.</p>
            </div>
          ) : (
            restaurants.map((rest, idx) => {
              const ratings = [4.8, 4.9, 4.7, 4.9];
              const times = ["20-30 min", "25-35 min", "30-40 min", "15-25 min"];
              const cuisines = [
                "North Indian • Mughlai • Biryani",
                "Italian • Wood-Fired Pizza • Pasta",
                "Pan-Asian • Sushi • Dim Sum",
                "Gourmet Smash Burgers • Fries",
              ];

              return (
                <div
                  key={rest.id}
                  onClick={() => setSelectedRestaurant(rest)}
                  className="glass-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "12px",
                        background: `linear-gradient(135deg, ${
                          idx % 2 === 0 ? "rgba(249, 115, 22, 0.2)" : "rgba(16, 185, 129, 0.2)"
                        }, rgba(20, 16, 28, 0.9))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      {idx === 0 ? "🍛" : idx === 1 ? "🍕" : idx === 2 ? "🍣" : "🍔"}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "700" }}>{rest.name}</h4>
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <Star size={10} fill="#10b981" /> {ratings[idx % ratings.length]}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {cuisines[idx % cuisines.length] || rest.cuisine}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "6px",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <Clock size={11} /> {times[idx % times.length]}
                        </span>
                        <span>•</span>
                        <span>{rest.menus?.length || 4} dishes available</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ color: "var(--text-muted)" }}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* RESTAURANT MENU VIEW */}
      {activeTab === "browse" && selectedRestaurant && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Back to Restaurants Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setSelectedRestaurant(null)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h3 style={{ fontSize: "15px", fontWeight: "700" }}>{selectedRestaurant.name}</h3>
          </div>

          {/* Menu Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {selectedRestaurant.menus?.map((item) => {
              const inCart = currentCart.find((c) => c.id === item.id);
              const qty = inCart ? inCart.quantity : 0;

              return (
                <div
                  key={item.id}
                  className="glass-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ flex: 1, paddingRight: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "2px",
                          background: item.name.toLowerCase().includes("chicken") || item.name.toLowerCase().includes("pepperoni") || item.name.toLowerCase().includes("salmon")
                            ? "#ef4444"
                            : "#10b981",
                        }}
                      />
                      <h4 style={{ fontSize: "13px", fontWeight: "600" }}>{item.name}</h4>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)", marginTop: "4px", display: "inline-block" }}>
                      ₹{item.price}
                    </span>
                  </div>

                  <div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(selectedRestaurant, item)}
                        className="btn-primary"
                        style={{
                          padding: "6px 16px",
                          fontSize: "11px",
                          fontWeight: "700",
                          borderRadius: "8px",
                        }}
                      >
                        + ADD
                      </button>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "var(--primary)",
                          borderRadius: "8px",
                          padding: "4px 8px",
                        }}
                      >
                        <button
                          onClick={() => removeFromCart(selectedRestaurant.id, item.id)}
                          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>{qty}</span>
                        <button
                          onClick={() => addToCart(selectedRestaurant, item)}
                          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Cart Bar */}
          {currentCart.length > 0 && (
            <div
              style={{
                position: "sticky",
                bottom: "10px",
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(99, 102, 241, 0.95))",
                borderRadius: "14px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 8px 24px rgba(139, 92, 246, 0.4)",
                cursor: "pointer",
                zIndex: 10,
              }}
              onClick={() => setShowCheckoutModal(true)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px" }}>
                  <ShoppingBag size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>
                    {currentCart.reduce((sum, i) => sum + i.quantity, 0)} items added
                  </div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)" }}>From {selectedRestaurant.name}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: "800", color: "#fff" }}>₹{cartTotal}</span>
                <span style={{ background: "#fff", color: "var(--primary)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                  View Cart ➔
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOD CHECKOUT MODAL */}
      {showCheckoutModal && selectedRestaurant && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 100,
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
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Delivery Checkout</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {/* Restaurant & Items summary */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Restaurant</span>
              <h4 style={{ fontSize: "14px", fontWeight: "600" }}>{selectedRestaurant.name}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                {currentCart.map((i) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>{i.name} × {i.quantity}</span>
                    <span style={{ fontWeight: "600" }}>₹{i.price * i.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address & Real Map Pinning */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Delivery Address</span>
                <span style={{ fontSize: "10px", color: "#F97316", fontWeight: "600" }}>📍 Tap map to set drop location</span>
              </div>
              <input
                type="text"
                className="text-input"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{ width: "100%", marginBottom: "8px" }}
              />
              <GoogleMapView
                mode="PLANNING"
                startLat={selectedRestaurant.lat || 12.9784}
                startLng={selectedRestaurant.lng || 77.6408}
                destLat={deliveryCoords.lat}
                destLng={deliveryCoords.lng}
                startLabel={`${selectedRestaurant.name} (Kitchen)`}
                destLabel={`Drop: ${deliveryAddress}`}
                pinMode="DEST"
                onMapClick={(lat, lng) => {
                  setDeliveryCoords({ lat, lng });
                  setDeliveryAddress(`Pinned Address (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                }}
                distanceKm={calculateDistanceKm(
                  selectedRestaurant.lat || 12.9784,
                  selectedRestaurant.lng || 77.6408,
                  deliveryCoords.lat,
                  deliveryCoords.lng
                )}
                etaText={`${Math.max(12, Math.round(calculateDistanceKm(selectedRestaurant.lat || 12.9784, selectedRestaurant.lng || 77.6408, deliveryCoords.lat, deliveryCoords.lng) * 3.5 + 10))} mins`}
                height="170px"
              />
            </div>

            {/* Payment method */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Payment Method
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("WALLET")}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: "8px",
                    border: paymentMethod === "WALLET" ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: paymentMethod === "WALLET" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.03)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  ⚡ NEXUS Wallet (₹{((user?.walletBalance ?? 0) / 100).toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("COD")}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: "8px",
                    border: paymentMethod === "COD" ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: paymentMethod === "COD" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.03)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  💵 Cash on Delivery
                </button>
              </div>
            </div>

            {/* Bill Summary */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span>Delivery Partner Fee</span>
                <span style={{ color: "#10b981" }}>FREE (Nexus Pass)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "2px" }}>
                <span>Total Amount</span>
                <span style={{ color: "var(--secondary)" }}>₹{cartTotal}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "13px", fontWeight: "700" }}
            >
              {isPlacingOrder ? "Processing Order..." : `Place Order (₹${cartTotal})`}
            </button>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "36px" }}>
              <Truck size={36} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
              <h4 style={{ fontSize: "14px" }}>No orders placed yet</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Browse menus and place an order to test live kitchen and courier tracking!
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              let parsedItems: any = {};
              try {
                parsedItems = ord.items ? JSON.parse(ord.items) : {};
              } catch {}

              const isPreparing = ord.status === "PREPARING";
              const isOut = ord.status === "OUT_FOR_DELIVERY";
              const isDelivered = ord.status === "DELIVERED";

              return (
                <div key={ord.id} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: "700" }}>
                        {parsedItems.restaurantName || "Gourmet Kitchen Order"}
                      </h4>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "700",
                        background: isDelivered
                          ? "rgba(16, 185, 129, 0.2)"
                          : isOut
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(249, 115, 22, 0.2)",
                        color: isDelivered ? "#10b981" : isOut ? "#3b82f6" : "#f97316",
                      }}
                    >
                      {ord.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Delivery OTP Badge */}
                  {!isDelivered && (
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(139, 92, 246, 0.15))",
                        border: "1px dashed #f97316",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          Delivery Verification OTP
                        </span>
                        <div style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "3px", color: "#f97316" }}>
                          {ord.otpCode}
                        </div>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "right" }}>
                        Share with delivery partner upon arrival
                      </span>
                    </div>
                  )}

                  {/* Items List */}
                  {parsedItems.items && Array.isArray(parsedItems.items) && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                      {parsedItems.items.map((i: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{i.name} × {i.quantity}</span>
                          <span>₹{i.price * i.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      onClick={() => openFoodTracking(ord)}
                      style={{
                        flex: 1,
                        background: "rgba(249, 115, 22, 0.15)",
                        border: "1px solid rgba(249, 115, 22, 0.35)",
                        borderRadius: "6px",
                        color: "#f97316",
                        padding: "8px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Truck size={12} /> Live Delivery Tracker
                    </button>

                    {/* Simulation Button for evaluation */}
                    {!isDelivered && (
                      <button
                        onClick={() => advanceOrderStatus(ord.id)}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--primary)",
                          padding: "8px",
                          fontSize: "10px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        ⚡ Advance ({isPreparing ? "Kitchen ➔ En Route" : "En Route ➔ Delivered"})
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* LIVE FOOD DELIVERY TRACKING MODAL */}
      {selectedFoodTracking && (
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
                <Truck size={16} color="#f97316" />
                <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Live Courier Tracking</h3>
              </div>
              <button
                onClick={() => setSelectedFoodTracking(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {/* Live GPS Street Map Telemetry */}
            {(() => {
              const trackingRest =
                restaurants.find((r) => r.id === selectedFoodTracking.restaurantId) ||
                DEFAULT_RESTAURANTS.find((r) => r.id === selectedFoodTracking.restaurantId) ||
                restaurants[0] ||
                DEFAULT_RESTAURANTS[0];

              const restLat = trackingRest?.lat || 12.9784;
              const restLng = trackingRest?.lng || 77.6408;
              const restName = trackingRest?.name || "Kitchen";
              const progressPercent =
                selectedFoodTracking.status === "DELIVERED"
                  ? 100
                  : selectedFoodTracking.status === "OUT_FOR_DELIVERY"
                  ? courierSimulatedProgress
                  : selectedFoodTracking.status === "PREPARING"
                  ? 25
                  : 10;

              const distKm = calculateDistanceKm(restLat, restLng, deliveryCoords.lat, deliveryCoords.lng);
              const effectiveDistKm = deliveryRoadDistance !== null ? deliveryRoadDistance : distKm;
              const etaMin =
                selectedFoodTracking.status === "DELIVERED"
                  ? 0
                  : deliveryRoadDuration !== null
                  ? Math.max(1, Math.round(deliveryRoadDuration * (1 - (selectedFoodTracking.status === "OUT_FOR_DELIVERY" ? courierSimulatedProgress / 100 : 0.2))))
                  : Math.max(4, Math.round(distKm * 3.5));

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <GoogleMapView
                    mode="FOOD_DELIVERY"
                    startLat={restLat}
                    startLng={restLng}
                    destLat={deliveryCoords.lat}
                    destLng={deliveryCoords.lng}
                    startLabel={`${restName} Kitchen`}
                    destLabel={`Delivery: ${deliveryAddress}`}
                    tripProgressPercent={progressPercent}
                    etaText={selectedFoodTracking.status === "DELIVERED" ? "Delivered" : `${etaMin} mins`}
                    distanceKm={effectiveDistKm}
                    onRouteChange={(dist, dur) => {
                      setDeliveryRoadDistance(dist);
                      setDeliveryRoadDuration(dur);
                    }}
                    height="230px"
                  />

                  {/* Telemetry Card */}
                  <div
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.95))",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "9px", display: "block" }}>
                        DELIVERY PARTNER
                      </span>
                      <strong style={{ color: "#f8fafc" }}>
                        {foodTrackingData?.deliveryPartner?.name || "Ramesh Kumar (Fleet #12)"}
                      </strong>
                      <div style={{ fontSize: "10px", color: "#10b981", marginTop: "2px", fontWeight: "600" }}>
                        🛵 100% Paved Road Network (0% Off-Road)
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "9px", display: "block" }}>
                        LIVE STATUS / ETA
                      </span>
                      <strong style={{ color: "#10b981", fontSize: "12px" }}>
                        {selectedFoodTracking.status === "DELIVERED"
                          ? "Delivered 🎉"
                          : `~${etaMin} mins (${effectiveDistKm} km)`}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stepper Status Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "700" }}>✓ Order Confirmed by Restaurant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: selectedFoodTracking.status !== "PLACED" ? "#10b981" : "#64748b" }} />
                <span style={{ fontSize: "12px", color: selectedFoodTracking.status !== "PLACED" ? "#fff" : "var(--text-muted)", fontWeight: "600" }}>
                  🍳 Kitchen Preparing Hot Meals
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(selectedFoodTracking.status) ? "#10b981" : "#64748b" }} />
                <span style={{ fontSize: "12px", color: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(selectedFoodTracking.status) ? "#fff" : "var(--text-muted)", fontWeight: "600" }}>
                  🛵 Delivery Partner Picked Up & En Route
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: selectedFoodTracking.status === "DELIVERED" ? "#10b981" : "#64748b" }} />
                <span style={{ fontSize: "12px", color: selectedFoodTracking.status === "DELIVERED" ? "#10b981" : "var(--text-muted)", fontWeight: "600" }}>
                  🎉 Delivered at Doorstep
                </span>
              </div>
            </div>

            {/* OTP Banner */}
            {selectedFoodTracking.status !== "DELIVERED" && (
              <div style={{ background: "rgba(249, 115, 22, 0.15)", border: "1px dashed #f97316", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>DELIVERY OTP</span>
                  <div style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "2px", color: "#f97316" }}>
                    {selectedFoodTracking.otpCode}
                  </div>
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "right" }}>
                  Share with delivery rider upon arrival
                </span>
              </div>
            )}

            {/* Advance Status button inside modal */}
            {selectedFoodTracking.status !== "DELIVERED" && (
              <button
                onClick={async () => {
                  await advanceOrderStatus(selectedFoodTracking.id);
                  const updatedOrders = await authFetch(`${backendUrl}/api/v1/food/orders`, {}, backendUrl).then(r => r.json());
                  if (updatedOrders.success) {
                    setOrders(updatedOrders.data);
                    const curr = updatedOrders.data.find((o: any) => o.id === selectedFoodTracking.id);
                    if (curr) setSelectedFoodTracking(curr);
                  }
                }}
                className="btn-primary"
                style={{ width: "100%", padding: "10px", fontSize: "11px", fontWeight: "700" }}
              >
                ⚡ Advance Order Status Simulation
              </button>
            )}

            <button
              onClick={() => setSelectedFoodTracking(null)}
              className="btn-secondary"
              style={{ width: "100%", padding: "8px", fontSize: "11px" }}
            >
              Close Tracker
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
