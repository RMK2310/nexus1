import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Shield,
  CreditCard,
  Smartphone,
  Building,
  Wallet as WalletIcon,
  Zap
} from "lucide-react";
import { authFetch } from "./services/apiClient";

export interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // in INR
  user: any;
  accessToken?: string | null;
  backendUrl?: string;
  paymentType?: "WALLET_TOPUP" | "COMMERCE_CHECKOUT";
  buyNow?: {
    sellerListingId: string;
    quantity: number;
  };
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: string;
    pincode?: string;
    state?: string;
    country?: string;
  };
  cartItems?: {
    sellerListingId: string;
    quantity: number;
  }[];
  purposeTitle?: string;
  onPaymentSuccess: (details: {
    paymentId: string;
    orderId: string;
    amount: number;
    newBalanceINR?: number;
    paymentMethod: string;
    rawResponse?: any;
  }) => void;
  onPaymentFailure: (errorMsg: string) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  amount,
  user,
  accessToken,
  backendUrl = "http://localhost:3000",
  paymentType = "WALLET_TOPUP",
  buyNow,
  shippingAddress,
  cartItems,
  purposeTitle,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  if (!isOpen) return null;

  // Flow status: INITIALIZING -> READY / POPUP_OPEN -> VERIFYING -> SUCCESS | FAILED
  const [status, setStatus] = useState<
    "INITIALIZING" | "READY" | "POPUP_OPEN" | "VERIFYING" | "SUCCESS" | "FAILED"
  >("INITIALIZING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [orderData, setOrderData] = useState<{
    orderId: string;
    amount: number;
    amountINR: number;
    currency: string;
    keyId: string;
    receipt: string;
    customer: { name: string; email: string; phone: string };
  } | null>(null);

  const hasAutoLaunchedRef = useRef(false);

  // Load official Razorpay Checkout SDK
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById("razorpay-checkout-script");
      if (existingScript) {
        existingScript.onload = () => resolve(true);
        existingScript.onerror = () => resolve(false);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Instant Test Simulator Payment Handler
  const handleSimulatedPayment = async (simulatedMethod: string = "CARD") => {
    setStatus("VERIFYING");
    setErrorMessage(null);

    try {
      const verifyEndpoint =
        paymentType === "COMMERCE_CHECKOUT"
          ? `${backendUrl}/api/v1/commerce/checkout/razorpay/verify-payment`
          : `${backendUrl}/api/v1/wallet/razorpay/verify-payment`;

      const simOrderId = orderData?.orderId || `order_sim_${Date.now()}`;
      const simPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const simSignature = `sig_mock_${Date.now()}`;

      const verifyPayload: any = {
        razorpay_order_id: simOrderId,
        razorpay_payment_id: simPaymentId,
        razorpay_signature: simSignature,
        amount: orderData?.amountINR || amount,
        paymentMethod: `SIMULATED_${simulatedMethod}`,
      };

      if (paymentType === "COMMERCE_CHECKOUT") {
        verifyPayload.buyNow = buyNow;
        verifyPayload.shippingAddress = shippingAddress;
        verifyPayload.items = cartItems;
      }

      const res = await authFetch(
        verifyEndpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyPayload),
        },
        backendUrl
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Payment simulation verification failed on backend"
        );
      }

      setStatus("SUCCESS");
      setTimeout(() => {
        onPaymentSuccess({
          paymentId: simPaymentId,
          orderId: simOrderId,
          amount: orderData?.amountINR || amount,
          newBalanceINR: json.data?.newBalanceINR,
          paymentMethod: `Razorpay Test Simulator (${simulatedMethod})`,
          rawResponse: json.data,
        });
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("[Razorpay Simulator] Error:", err);
      setStatus("FAILED");
      setErrorMessage(err.message || "Simulation payment failed.");
      onPaymentFailure(err.message || "Simulation payment failed");
    }
  };

  // Launch the official Razorpay Checkout Popup
  const launchOfficialCheckout = async (order: {
    orderId: string;
    amount: number;
    amountINR: number;
    currency: string;
    keyId: string;
    customer: { name: string; email: string; phone: string };
  }) => {
    setErrorMessage(null);
    setStatus("POPUP_OPEN");

    const sdkLoaded = await loadRazorpaySDK();
    if (!sdkLoaded || !(window as any).Razorpay) {
      setStatus("FAILED");
      setErrorMessage(
        "Unable to load official Razorpay Checkout SDK. Use the Instant Test Simulator below."
      );
      return;
    }

    try {
      const options = {
        key: order.keyId,
        amount: order.amount, // in paise
        currency: order.currency || "INR",
        name: "NEXUS Platform",
        description:
          purposeTitle ||
          (paymentType === "COMMERCE_CHECKOUT"
            ? "Order Payment Checkout"
            : `Wallet Top-Up of ₹${order.amountINR.toFixed(2)}`),
        order_id: order.orderId,
        prefill: {
          name: order.customer?.name || user?.name || "NEXUS User",
          email: order.customer?.email || user?.email || "customer@nexus.com",
          contact:
            order.customer?.phone ||
            user?.mobileNumber ||
            user?.phone ||
            "+919876543210",
        },
        notes: {
          paymentType: paymentType,
          orderId: order.orderId,
        },
        theme: {
          color: "#0284C7", // Cyan/Blue Razorpay branding
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            console.log("[Razorpay] Customer closed or dismissed the official popup.");
            setStatus("READY");
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          console.log("[Razorpay] Payment authorized by customer! Verifying signature...", response);
          setStatus("VERIFYING");
          try {
            const verifyEndpoint =
              paymentType === "COMMERCE_CHECKOUT"
                ? `${backendUrl}/api/v1/commerce/checkout/razorpay/verify-payment`
                : `${backendUrl}/api/v1/wallet/razorpay/verify-payment`;

            const verifyPayload: any = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amountINR || amount,
              paymentMethod: "RAZORPAY_OFFICIAL",
            };

            if (paymentType === "COMMERCE_CHECKOUT") {
              verifyPayload.buyNow = buyNow;
              verifyPayload.shippingAddress = shippingAddress;
              verifyPayload.items = cartItems;
            }

            const res = await authFetch(
              verifyEndpoint,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(verifyPayload),
              },
              backendUrl
            );

            const json = await res.json();
            if (!res.ok || !json.success) {
              throw new Error(
                json.error?.message || json.message || "Payment signature verification failed on backend"
              );
            }

            setStatus("SUCCESS");
            setTimeout(() => {
              onPaymentSuccess({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: order.amountINR || amount,
                newBalanceINR: json.data?.newBalanceINR,
                paymentMethod: "Razorpay Standard Checkout",
                rawResponse: json.data,
              });
              onClose();
            }, 1200);
          } catch (err: any) {
            console.error("[Razorpay] Verification error:", err);
            setStatus("FAILED");
            setErrorMessage(err.message || "Cryptographic signature verification failed.");
            onPaymentFailure(err.message || "Payment verification failed");
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);

      rzpInstance.on("payment.failed", (failRes: any) => {
        console.warn("[Razorpay] Payment failed or unverified test key:", failRes.error);
        setStatus("FAILED");
        setErrorMessage(
          failRes.error?.description ||
          "Payment was cancelled or test mode gateway closed. Complete your order using the Instant Test Simulator below."
        );
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error("[Razorpay] Exception opening checkout:", err);
      setStatus("FAILED");
      setErrorMessage(err.message || "Failed to initialize official Razorpay popup. Use the Test Simulator below.");
    }
  };

  // Initialize Razorpay Order on Mount
  useEffect(() => {
    let isMounted = true;
    hasAutoLaunchedRef.current = false;

    const initOrderAndLaunch = async () => {
      setStatus("INITIALIZING");
      setErrorMessage(null);

      // Pre-load SDK in background while backend creates order
      loadRazorpaySDK();

      try {
        const endpoint =
          paymentType === "COMMERCE_CHECKOUT"
            ? `${backendUrl}/api/v1/commerce/checkout/razorpay/create-order`
            : `${backendUrl}/api/v1/wallet/razorpay/create-order`;

        const requestBody =
          paymentType === "COMMERCE_CHECKOUT"
            ? { shippingAddress, buyNow, items: cartItems }
            : { amount };

        const res = await authFetch(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
          backendUrl
        );

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(
            json.error?.message || json.message || "Failed to create Razorpay Order on server."
          );
        }

        if (isMounted) {
          setOrderData(json.data);
          // Only auto-launch the external popup if configured with live production/registered keys.
          // In test/development mode with mock keys, remain in READY status so user can complete with 1 click.
          const isRealRegisteredKey = json.data.keyId && !json.data.keyId.startsWith("rzp_test_NEXUS");
          if (isRealRegisteredKey) {
            if (!hasAutoLaunchedRef.current) {
              hasAutoLaunchedRef.current = true;
              launchOfficialCheckout(json.data);
            }
          } else {
            setStatus("READY");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus("FAILED");
          setErrorMessage(err.message || "Failed to communicate with Razorpay payment service.");
        }
      }
    };

    initOrderAndLaunch();

    return () => {
      isMounted = false;
    };
  }, [amount, backendUrl, paymentType, JSON.stringify(buyNow), JSON.stringify(shippingAddress), JSON.stringify(cartItems)]);

  const displayAmount = orderData ? orderData.amountINR : amount;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "linear-gradient(135deg, #0F172A 0%, #030712 100%)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0284C7, #0369A1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)",
              }}
            >
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#F8FAFC", margin: 0 }}>
                  Razorpay Checkout
                </h3>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38BDF8",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    letterSpacing: "0.5px",
                  }}
                >
                  TEST MODE
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0 }}>
                Official Secure Payment Gateway
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#94A3B8",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px 20px" }}>
          {/* Status: INITIALIZING */}
          {status === "INITIALIZING" && (
            <div style={{ textAlign: "center", padding: "24px 8px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(56, 189, 248, 0.1)",
                  border: "2px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <RefreshCw size={26} color="#38BDF8" className="animate-spin" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#F1F5F9", marginBottom: "6px" }}>
                Connecting to Razorpay...
              </h4>
              <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.5 }}>
                Generating secure order session and preparing the official checkout popup.
              </p>
            </div>
          )}

          {/* Status: POPUP_OPEN or READY */}
          {(status === "POPUP_OPEN" || status === "READY") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Payment Summary Box */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>Amount Payable</span>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "#38BDF8" }}>
                    ₹{displayAmount.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748B", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                  <span>Order Reference</span>
                  <span style={{ fontFamily: "monospace", color: "#CBD5E1" }}>
                    {orderData?.orderId || "Generating..."}
                  </span>
                </div>

                {purposeTitle && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748B", marginTop: "6px" }}>
                    <span>Purpose</span>
                    <span style={{ color: "#E2E8F0", fontWeight: "500" }}>{purposeTitle}</span>
                  </div>
                )}
              </div>

              {/* Status Notice */}
              {status === "POPUP_OPEN" ? (
                <div
                  style={{
                    background: "rgba(2, 132, 199, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#38BDF8",
                      marginTop: "5px",
                      boxShadow: "0 0 8px #38BDF8",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h5 style={{ fontSize: "13px", fontWeight: "600", color: "#E0F2FE", margin: "0 0 4px" }}>
                      Razorpay Checkout Active
                    </h5>
                    <p style={{ fontSize: "11px", color: "#93C5FD", margin: 0, lineHeight: 1.4 }}>
                      Select your preferred payment method (UPI, Cards, NetBanking, or Wallet) in the official Razorpay window. Once authorized, your order will complete automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    fontSize: "12px",
                    color: "#FDE68A",
                  }}
                >
                  Payment window closed or waiting for action. Click below to continue.
                </div>
              )}

              {/* Action Button to Launch / Re-launch or Simulate */}
              {orderData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("CARD")}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Zap size={18} />
                    <span>⚡ Complete Payment (Instant Simulator)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => launchOfficialCheckout(orderData)}
                    style={{
                      width: "100%",
                      padding: "11px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "10px",
                      color: "#38BDF8",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>{status === "POPUP_OPEN" ? "Re-open Razorpay Popup" : "Launch Official Razorpay Window"}</span>
                  </button>
                </div>
              )}

              {/* Supported Payment Methods Quick Simulators */}
              <div style={{ marginTop: "4px" }}>
                <p style={{ fontSize: "10px", color: "#64748B", textAlign: "center", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Select Test Method to Authorize
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("UPI")}
                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "8px 4px", textAlign: "center", cursor: "pointer", color: "inherit" }}
                  >
                    <Smartphone size={14} color="#38BDF8" style={{ margin: "0 auto 4px" }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", display: "block" }}>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("CARD")}
                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "8px 4px", textAlign: "center", cursor: "pointer", color: "inherit" }}
                  >
                    <CreditCard size={14} color="#38BDF8" style={{ margin: "0 auto 4px" }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", display: "block" }}>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("NETBANKING")}
                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "8px 4px", textAlign: "center", cursor: "pointer", color: "inherit" }}
                  >
                    <Building size={14} color="#38BDF8" style={{ margin: "0 auto 4px" }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", display: "block" }}>NetBanking</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("WALLET")}
                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "8px 4px", textAlign: "center", cursor: "pointer", color: "inherit" }}
                  >
                    <WalletIcon size={14} color="#38BDF8" style={{ margin: "0 auto 4px" }} />
                    <span style={{ fontSize: "10px", color: "#94A3B8", display: "block" }}>Wallets</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status: VERIFYING */}
          {status === "VERIFYING" && (
            <div style={{ textAlign: "center", padding: "28px 8px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "2px solid #38BDF8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <RefreshCw size={28} color="#38BDF8" className="animate-spin" />
              </div>
              <h4 style={{ fontSize: "17px", fontWeight: "700", color: "#F1F5F9", marginBottom: "6px" }}>
                Verifying Payment Signature...
              </h4>
              <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.5 }}>
                Cryptographically validating the Razorpay HMAC SHA-256 signature with the secure backend.
              </p>
            </div>
          )}

          {/* Status: SUCCESS */}
          {status === "SUCCESS" && (
            <div style={{ textAlign: "center", padding: "28px 8px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "2px solid #22C55E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={32} color="#22C55E" />
              </div>
              <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#F1F5F9", marginBottom: "6px" }}>
                Payment Authorized & Verified!
              </h4>
              <p style={{ fontSize: "12px", color: "#86EFAC", lineHeight: 1.5 }}>
                Your transaction has been securely confirmed. Redirecting now...
              </p>
            </div>
          )}

          {/* Status: FAILED */}
          {status === "FAILED" && (
            <div style={{ textAlign: "center", padding: "16px 8px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "2px solid #EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <AlertCircle size={28} color="#EF4444" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#F1F5F9", marginBottom: "6px" }}>
                Payment Incomplete or Cancelled
              </h4>
              <p style={{ fontSize: "12px", color: "#FCA5A5", lineHeight: 1.5, marginBottom: "16px" }}>
                {errorMessage || "The transaction could not be completed."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {orderData && (
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("CARD")}
                    style={{
                      width: "100%",
                      padding: "13px",
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    <Zap size={16} />
                    <span>⚡ Complete Order with Simulator</span>
                  </button>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: "11px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      color: "#94A3B8",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  {orderData && (
                    <button
                      type="button"
                      onClick={() => launchOfficialCheckout(orderData)}
                      style={{
                        flex: 1,
                        padding: "11px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        borderRadius: "10px",
                        color: "#38BDF8",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Re-open Window
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Badge */}
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(3, 7, 18, 0.6)",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Shield size={12} color="#64748B" />
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            256-Bit SSL Encrypted • Powered by Razorpay Standard
          </span>
        </div>
      </div>
    </div>
  );
};
