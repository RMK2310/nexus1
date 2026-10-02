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

export const FoodPortal: React.FC<FoodPortalProps> = ({
  user,
  backendUrl,
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    fetchRestaurants();
    fetchOrders();
  }, [backendUrl]);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/food/restaurants`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
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
            <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Food Courier</h3>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
              Hyper-local gourmet delivery & real-time kitchen tracking
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

            {/* Delivery address */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Delivery Address</span>
              <input
                type="text"
                className="text-input"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{ width: "100%", marginTop: "4px" }}
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

                  {/* Simulation Button for evaluation */}
                  {!isDelivered && (
                    <button
                      onClick={() => advanceOrderStatus(ord.id)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        color: "var(--primary)",
                        padding: "6px",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                        marginTop: "4px",
                      }}
                    >
                      ⚡ Advance Order Simulation ({isPreparing ? "Kitchen ➔ Out for Delivery" : "Out for Delivery ➔ Delivered"})
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
