import React, { useState, useEffect } from "react";
import {
  Lock,
  Shield,
  X,
  Delete,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Wallet
} from "lucide-react";

interface SecurityPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPin: (pin: string) => Promise<void>;
  recipientName?: string;
  recipientIdentifier?: string;
  amount: number;
  note?: string;
  isProcessing?: boolean;
  errorMessage?: string | null;
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({
  isOpen,
  onClose,
  onSubmitPin,
  recipientName = "Recipient",
  recipientIdentifier = "",
  amount,
  note,
  isProcessing = false,
  errorMessage = null,
}) => {
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setLocalError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (errorMessage) {
      setLocalError(errorMessage);
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  if (!isOpen) return null;

  // Handle number pad input
  const handleDigitClick = (digit: string) => {
    if (isProcessing) return;
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setLocalError(null);
    }
  };

  const handleDelete = () => {
    if (isProcessing) return;
    setPin((prev) => prev.slice(0, -1));
    setLocalError(null);
  };

  const handleClear = () => {
    if (isProcessing) return;
    setPin("");
    setLocalError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setLocalError("Please enter your 4-digit security PIN.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      await onSubmitPin(pin);
    } catch (err: any) {
      setLocalError(err.message || "Incorrect Security PIN. Please try again.");
      setIsShaking(true);
      setPin("");
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "linear-gradient(145deg, #161226, #0c0817)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.2)",
          borderRadius: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: isShaking ? "shake 0.4s ease-in-out" : "none",
        }}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>

        {/* Header with Close */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fff", margin: 0 }}>
                Authorize Transfer
              </h3>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                NEXUS UPI Security PIN
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Transfer Summary Badge */}
        <div style={{ padding: "16px 20px 8px 20px", textAlign: "center" }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "14px",
              padding: "12px 14px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Paying to <strong style={{ color: "#fff" }}>{recipientName}</strong>
            </div>
            {recipientIdentifier && (
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "monospace", marginBottom: "8px" }}>
                {recipientIdentifier}
              </div>
            )}
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#A78BFA", letterSpacing: "-0.5px" }}>
              ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {note && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>
                "{note}"
              </div>
            )}
          </div>

          {/* Error Message Banner */}
          {localError && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "#FCA5A5",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
                textAlign: "left",
              }}
            >
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
              <span>{localError}</span>
            </div>
          )}

          {/* 4-Digit PIN Visual Boxes */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                ENTER 4-DIGIT SECURITY PIN
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                }}
              >
                {showPin ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showPin ? "Hide" : "Show"}</span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                const isCurrent = pin.length === index;
                return (
                  <div
                    key={index}
                    style={{
                      width: "52px",
                      height: "56px",
                      borderRadius: "12px",
                      background: isFilled ? "rgba(139, 92, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: isCurrent
                        ? "2px solid #8B5CF6"
                        : isFilled
                        ? "1px solid rgba(139, 92, 246, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#A78BFA",
                      transition: "all 0.15s ease",
                      boxShadow: isCurrent ? "0 0 12px rgba(139, 92, 246, 0.3)" : "none",
                    }}
                  >
                    {isFilled ? (showPin ? pin[index] : "●") : ""}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
              Default seed test PIN is <strong style={{ color: "#A78BFA" }}>1234</strong>
            </div>
          </div>
        </div>

        {/* On-Screen Numeric Keypad (UPI Style) */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "12px 20px 20px 20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                disabled={isProcessing}
                style={{
                  height: "48px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.1s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={isProcessing || pin.length === 0}
              style={{
                height: "48px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => handleDigitClick("0")}
              disabled={isProcessing}
              style={{
                height: "48px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#fff",
                cursor: "pointer",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isProcessing || pin.length === 0}
              style={{
                height: "48px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Delete size={20} />
            </button>
          </div>

          {/* Confirm Authorization Action Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isProcessing || pin.length !== 4}
            className="btn-primary"
            style={{
              width: "100%",
              height: "46px",
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              fontSize: "14px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "12px",
              boxShadow: pin.length === 4 ? "0 4px 16px rgba(139, 92, 246, 0.4)" : "none",
              opacity: pin.length === 4 ? 1 : 0.6,
              cursor: pin.length === 4 ? "pointer" : "not-allowed",
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Verifying PIN & Transferring...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Authorize & Send ₹{amount.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
