import React, { useState, useEffect } from "react";
import {
  Wallet,
  Send,
  PlusCircle,
  Lock,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  CreditCard,
  Smartphone,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";
import { authFetch } from "./services/apiClient";
import { RazorpayModal } from "./RazorpayModal";
import { SecurityPinModal } from "./SecurityPinModal";

interface WalletPortalProps {
  user: any;
  accessToken?: string | null;
  backendUrl?: string;
  onBalanceUpdate?: (newBalance: number) => void;
  setGlobalSuccessMsg?: (msg: string) => void;
  setGlobalErrorMsg?: (msg: string) => void;
  initialAction?: "send" | "topup" | null;
  onClearInitialAction?: () => void;
}

interface TransactionItem {
  id: string;
  transactionId: string;
  referenceId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  amountINR: number;
  description: string;
  category: "TOPUP" | "P2P_TRANSFER" | "PURCHASE" | "REFUND" | "GENERAL";
  isDebit: boolean;
  counterparty: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  createdAt: string;
}

export const WalletPortal: React.FC<WalletPortalProps> = ({
  user,
  accessToken,
  backendUrl,
  onBalanceUpdate,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
  initialAction,
  onClearInitialAction
}) => {
  // Wallet State
  const [walletData, setWalletData] = useState<{
    id: string;
    balance: number;
    balanceINR: number;
    currency: string;
    hasPin: boolean;
    totalTransactions: number;
  } | null>(null);

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<"ALL" | "SENT" | "RECEIVED" | "TOPUP">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [showPinAuthModal, setShowPinAuthModal] = useState<boolean>(false);
  const [showTopUpModal, setShowTopUpModal] = useState<boolean>(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Form States - Send Money
  const [sendRecipient, setSendRecipient] = useState<string>("");
  const [sendRecipientName, setSendRecipientName] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [sendNote, setSendNote] = useState<string>("");
  const [recipientSuggestions, setRecipientSuggestions] = useState<any[]>([]);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [pinAuthError, setPinAuthError] = useState<string | null>(null);

  // Form States - Top Up / Razorpay
  const [topUpAmount, setTopUpAmount] = useState<string>("500");
  const [razorpayAmount, setRazorpayAmount] = useState<number>(500);

  // Form States - PIN
  const [currentPin, setCurrentPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);

  // Error/Success local alerts
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const notifySuccess = (msg: string) => {
    setLocalSuccess(msg);
    if (setGlobalSuccessMsg) setGlobalSuccessMsg(msg);
    setTimeout(() => setLocalSuccess(null), 4000);
  };

  const notifyError = (msg: string) => {
    setLocalError(msg);
    if (setGlobalErrorMsg) setGlobalErrorMsg(msg);
    setTimeout(() => setLocalError(null), 4000);
  };

  // Fetch Wallet Balance & Details
  const fetchWallet = async (silent: boolean = false) => {
    if (!accessToken) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await authFetch(`${backendUrl}/api/v1/wallet`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWalletData(json.data);
          if (onBalanceUpdate) {
            onBalanceUpdate(json.data.balance);
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed fetching wallet:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch Transaction History Statements
  const fetchTransactions = async () => {
    if (!accessToken) return;
    try {
      const res = await authFetch(`${backendUrl}/api/v1/wallet/transactions?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTransactions(json.data || []);
        }
      }
    } catch (e: any) {
      console.warn("Failed fetching transactions:", e);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [accessToken]);

  // Handle auto-opening Send or Top-up modals from external triggers (e.g. Home page)
  useEffect(() => {
    if (initialAction === "send") {
      setShowSendModal(true);
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === "topup") {
      setShowTopUpModal(true);
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  // Recipient search autocomplete
  useEffect(() => {
    if (!sendRecipient || sendRecipient.length < 2 || !accessToken) {
      setRecipientSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRecipient(true);
      try {
        const res = await authFetch(`${backendUrl}/api/v1/wallet/lookup?q=${encodeURIComponent(sendRecipient)}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }, backendUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setRecipientSuggestions(json.data || []);
          }
        }
      } catch (e) {
        console.warn("Autocomplete lookup error:", e);
      } finally {
        setIsSearchingRecipient(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [sendRecipient, accessToken]);

  // Step 1: Validate transfer details and open Security PIN Authorization Modal
  const handleProceedToSendPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) {
      notifyError("Please enter a valid transfer amount.");
      return;
    }

    if (!sendRecipient || sendRecipient.trim() === "") {
      notifyError("Please specify a recipient email, phone, or User ID.");
      return;
    }

    if (walletData && walletData.balanceINR < amt) {
      notifyError(`Insufficient balance. Your current balance is ₹${walletData.balanceINR.toFixed(2)}.`);
      return;
    }

    // Determine recipient display name
    const matched = recipientSuggestions.find(
      (s) => s.email === sendRecipient || s.phone === sendRecipient || s.id === sendRecipient
    );
    setSendRecipientName(matched?.name || sendRecipient);
    setPinAuthError(null);
    setShowSendModal(false);
    setShowPinAuthModal(true);
  };

  // Step 2: Execute Transfer with entered Security PIN
  const handleExecuteTransfer = async (enteredPin: string) => {
    if (!accessToken) return;
    const amt = parseFloat(sendAmount);

    setIsSending(true);
    setPinAuthError(null);

    try {
      const res = await authFetch(`${backendUrl}/api/v1/wallet/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          recipient: sendRecipient.trim(),
          amount: amt,
          pin: enteredPin.trim(),
          note: sendNote.trim() || undefined
        })
      }, backendUrl);

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json.error?.message || json.message || "Transfer failed. Check PIN.";
        setPinAuthError(errorMsg);
        throw new Error(errorMsg);
      }

      notifySuccess(`₹${amt.toFixed(2)} sent to ${json.data?.recipient?.name || sendRecipient}! Ref: ${json.data?.referenceId || ""}`);
      setShowPinAuthModal(false);
      setSendAmount("");
      setSendRecipient("");
      setSendRecipientName("");
      setSendNote("");

      // Refresh balances & statement
      await fetchWallet(true);
      await fetchTransactions();
    } catch (err: any) {
      setPinAuthError(err.message || "Incorrect Security PIN. Please try again.");
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Handle Top-Up / Trigger Razorpay Modal
  const handleProceedToRazorpay = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt < 10) {
      notifyError("Please enter a valid deposit amount (minimum ₹10).");
      return;
    }
    setRazorpayAmount(amt);
    setShowTopUpModal(false);
    setShowRazorpayModal(true);
  };

  const handleRazorpaySuccess = async (details: {
    paymentId: string;
    orderId: string;
    amount: number;
    newBalanceINR?: number;
    paymentMethod: string;
  }) => {
    notifySuccess(`₹${details.amount.toFixed(2)} added via Razorpay (${details.paymentMethod})! Ref: ${details.paymentId}`);
    setShowRazorpayModal(false);
    // Refresh balances & statement
    await fetchWallet(true);
    await fetchTransactions();
  };

  const handleRazorpayFailure = (errMsg: string) => {
    notifyError(errMsg || "Razorpay transaction was not completed.");
  };

  // Handle Set / Update Security PIN
  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!/^\d{4}$/.test(newPin)) {
      notifyError("New PIN must be exactly 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      notifyError("New PIN and confirmation PIN do not match.");
      return;
    }

    if (walletData?.hasPin && !currentPin) {
      notifyError("Please enter your current PIN to change it.");
      return;
    }

    setIsSettingPin(true);
    try {
      const res = await authFetch(`${backendUrl}/api/v1/wallet/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          pin: newPin,
          currentPin: currentPin || undefined
        })
      }, backendUrl);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to set security PIN");
      }

      notifySuccess("4-Digit Security PIN configured successfully!");
      setShowPinModal(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await fetchWallet(true);
    } catch (err: any) {
      notifyError(err.message || "Failed to set PIN");
    } finally {
      setIsSettingPin(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === "SENT" && (!t.isDebit || t.category === "TOPUP")) return false;
    if (activeFilter === "RECEIVED" && t.isDebit) return false;
    if (activeFilter === "TOPUP" && t.category !== "TOPUP") return false;

    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchRef = t.referenceId?.toLowerCase().includes(q);
      const matchParty = t.counterparty?.name?.toLowerCase().includes(q) || t.counterparty?.email?.toLowerCase().includes(q);
      return matchDesc || matchRef || matchParty;
    }

    return true;
  });

  const displayBalance = walletData ? walletData.balanceINR : ((user?.walletBalance ?? 0) / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "24px" }}>
      {/* Alert Banners */}
      {localError && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "10px 14px", borderRadius: "10px", color: "#FCA5A5", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} color="#EF4444" />
          <span>{localError}</span>
        </div>
      )}

      {localSuccess && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "10px 14px", borderRadius: "10px", color: "#6EE7B7", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{localSuccess}</span>
        </div>
      )}

      {/* Main Glassmorphism Wallet Balance Card */}
      <div
        className="glass-card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 20, 48, 0.95), rgba(16, 12, 28, 0.95))",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", background: "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Wallet size={16} color="var(--primary)" />
              <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", fontWeight: "600" }}>
                Double-Entry Ledger Account
              </span>
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px", margin: 0 }}>
              ₹{displayBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
          </div>

          <button
            onClick={() => {
              fetchWallet(true);
              fetchTransactions();
            }}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)"
            }}
            title="Refresh balance"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Account Details Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", fontSize: "11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: "6px", color: "var(--text-muted)" }}>
            <span>ID:</span>
            <strong style={{ color: "#fff", fontFamily: "monospace" }}>{user?.id ? `${user.id.slice(0, 8)}...` : "NEXUS-01"}</strong>
            <button
              onClick={() => copyToClipboard(user?.id || "", "uid")}
              style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              {copiedId === "uid" ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: "6px" }}>
            <Shield size={12} color="#a78bfa" />
            <span style={{ color: "#a78bfa", fontWeight: "600" }}>{user?.activeRole || "CONSUMER"}</span>
          </div>

          <div
            onClick={() => setShowPinModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: walletData?.hasPin ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              border: walletData?.hasPin ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
              padding: "4px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              marginLeft: "auto"
            }}
          >
            <Lock size={12} color={walletData?.hasPin ? "#10B981" : "#F59E0B"} />
            <span style={{ color: walletData?.hasPin ? "#10B981" : "#F59E0B", fontWeight: "600" }}>
              {walletData?.hasPin ? "PIN Protected" : "Set Security PIN"}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Action Buttons Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        {/* Send Money */}
        <button
          onClick={() => {
            if (!walletData?.hasPin) {
              notifyError("Please configure your 4-digit Security PIN before transferring funds.");
              setShowPinModal(true);
            } else {
              setShowSendModal(true);
            }
          }}
          className="btn-primary"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            padding: "12px 6px",
            borderRadius: "14px",
            fontSize: "11px",
            background: "linear-gradient(135deg, var(--primary), var(--primary-hover))"
          }}
        >
          <Send size={18} />
          <span>Send</span>
        </button>

        {/* Add Money / Top-Up */}
        <button
          onClick={() => setShowTopUpModal(true)}
          className="btn-secondary"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            padding: "12px 6px",
            borderRadius: "14px",
            fontSize: "11px",
            background: "rgba(255,255,255,0.05)"
          }}
        >
          <PlusCircle size={18} color="#10B981" />
          <span>Add Money</span>
        </button>

        {/* Security PIN */}
        <button
          onClick={() => setShowPinModal(true)}
          className="btn-secondary"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            padding: "12px 6px",
            borderRadius: "14px",
            fontSize: "11px",
            background: "rgba(255,255,255,0.05)"
          }}
        >
          <Lock size={18} color="#F59E0B" />
          <span>PIN Lock</span>
        </button>

        {/* Receive QR */}
        <button
          onClick={() => setShowQrModal(true)}
          className="btn-secondary"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            padding: "12px 6px",
            borderRadius: "14px",
            fontSize: "11px",
            background: "rgba(255,255,255,0.05)"
          }}
        >
          <QrCode size={18} color="#38BDF8" />
          <span>Receive</span>
        </button>
      </div>

      {/* Double-Entry Ledger Statements Section */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={16} color="var(--primary)" /> Double-Entry Ledger Statement
          </h3>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
          {[
            { id: "ALL", label: "All Records" },
            { id: "SENT", label: "Sent (Debits)" },
            { id: "RECEIVED", label: "Received (Credits)" },
            { id: "TOPUP", label: "Deposits / Top-Up" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={activeFilter === f.id ? "btn-primary" : "btn-secondary"}
              style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "11px", flexShrink: 0 }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search in Statement */}
        <div style={{ position: "relative" }}>
          <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search by name, note, or reference ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
            style={{ paddingLeft: "32px", fontSize: "11px", height: "34px", width: "100%" }}
          />
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-secondary)" }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px", color: "var(--primary)" }} />
            <p style={{ fontSize: "12px" }}>Loading ledger entries...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
            <Wallet size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <p style={{ fontSize: "12px", fontWeight: "600" }}>No transactions found</p>
            <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {activeFilter !== "ALL" || searchQuery ? "Try adjusting your filter or search query." : "Make a transfer or add money to view entries."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: tx.isDebit ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: tx.isDebit ? "#EF4444" : "#10B981"
                    }}
                  >
                    {tx.isDebit ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>

                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#fff", marginBottom: "2px" }}>
                      {tx.category === "TOPUP"
                        ? "Wallet Top-Up"
                        : tx.counterparty
                        ? `${tx.isDebit ? "Sent to" : "Received from"} ${tx.counterparty.name}`
                        : tx.description}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--text-muted)" }}>
                      <span>{new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span style={{ fontFamily: "monospace" }}>{tx.referenceId ? `${tx.referenceId.slice(0, 12)}...` : ""}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: tx.isDebit ? "#F87171" : "#34D399"
                    }}
                  >
                    {tx.isDebit ? "-" : "+"}₹{tx.amountINR.toFixed(2)}
                  </span>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {tx.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. SEND MONEY (P2P) STEP 1: RECIPIENT & AMOUNT MODAL         */}
      {/* ============================================================ */}
      {showSendModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "400px", background: "linear-gradient(135deg, #1c1427, #100b1a)", border: "1px solid var(--border)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>P2P Money Transfer</h3>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Instant & Zero Fee</span>
                </div>
              </div>
              <button onClick={() => setShowSendModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleProceedToSendPin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Recipient Input with Autocomplete */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  Recipient Email, Phone, or User ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. seller@nexus.com or +919777777777"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  className="text-input"
                  style={{ width: "100%" }}
                  required
                />

                {/* Quick Recipient Autocomplete Suggestions */}
                {recipientSuggestions.length > 0 && (
                  <div style={{ background: "#241933", border: "1px solid var(--border)", borderRadius: "8px", marginTop: "4px", overflow: "hidden", maxHeight: "140px", overflowY: "auto" }}>
                    {recipientSuggestions.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => {
                          setSendRecipient(sug.email || sug.phone || sug.id);
                          setSendRecipientName(sug.name);
                          setRecipientSuggestions([]);
                        }}
                        style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: "600", color: "#fff" }}>{sug.name}</p>
                          <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{sug.email}</p>
                        </div>
                        <ChevronRight size={12} color="var(--text-muted)" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Input with Preset Pills */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  Transfer Amount (₹ INR)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="text-input"
                    style={{ paddingLeft: "28px", width: "100%", fontSize: "16px", fontWeight: "700" }}
                    required
                  />
                </div>

                {/* Presets */}
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {["100", "250", "500", "1000", "5000"].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setSendAmount(preset)}
                      className={sendAmount === preset ? "btn-primary" : "btn-secondary"}
                      style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "10px", flex: 1, fontWeight: sendAmount === preset ? "700" : "500" }}
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer Note */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  Transfer Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner bill, Grocery share, Rent"
                  value={sendNote}
                  onChange={(e) => setSendNote(e.target.value)}
                  className="text-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                <Lock size={14} color="#A78BFA" style={{ flexShrink: 0 }} />
                <span>You will be prompted to enter your <strong>4-digit Security PIN</strong> in the next step to authorize this transfer.</span>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: "700" }}
                >
                  <span>Proceed to Authorize</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1b. DEDICATED SECURITY PIN AUTHORIZATION MODAL & KEYPAD      */}
      {/* ============================================================ */}
      <SecurityPinModal
        isOpen={showPinAuthModal}
        onClose={() => setShowPinAuthModal(false)}
        onSubmitPin={handleExecuteTransfer}
        recipientName={sendRecipientName || sendRecipient || "Recipient"}
        recipientIdentifier={sendRecipient}
        amount={parseFloat(sendAmount) || 0}
        note={sendNote}
        isProcessing={isSending}
        errorMessage={pinAuthError}
      />

      {/* ============================================================ */}
      {/* 2. TOP UP / ADD MONEY MODAL (AMOUNT SELECTION)               */}
      {/* ============================================================ */}
      {showTopUpModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "420px", background: "linear-gradient(135deg, #18221b, #0f1712)", border: "1px solid rgba(16, 185, 129, 0.3)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlusCircle size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Add Money to Wallet</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                    <Shield size={11} color="#3399CC" />
                    <span style={{ fontSize: "10px", color: "#38BDF8", fontWeight: "600" }}>Secured by Razorpay</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowTopUpModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleProceedToRazorpay} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  Top-Up Amount (₹ INR)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", fontWeight: "700", color: "#10B981" }}>₹</span>
                  <input
                    type="number"
                    min="10"
                    placeholder="500"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="text-input"
                    style={{ paddingLeft: "30px", width: "100%", fontSize: "18px", fontWeight: "700" }}
                    required
                  />
                </div>

                {/* Amount Presets */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  {["200", "500", "1000", "2000", "5000"].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setTopUpAmount(preset)}
                      className={topUpAmount === preset ? "btn-primary" : "btn-secondary"}
                      style={{ padding: "5px 6px", borderRadius: "10px", fontSize: "11px", flex: 1, fontWeight: topUpAmount === preset ? "700" : "500" }}
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Razorpay Gateway Channel Information */}
              <div style={{ background: "rgba(51, 153, 204, 0.08)", border: "1px solid rgba(51, 153, 204, 0.25)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "5px" }}>
                    <CreditCard size={14} color="#3399CC" /> Payment Methods Available
                  </span>
                  <span style={{ fontSize: "9px", background: "#3399CC", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                    RAZORPAY
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "10px", color: "var(--text-secondary)" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px", borderRadius: "6px", textAlign: "center" }}>
                    <CreditCard size={14} color="#10B981" style={{ margin: "0 auto 2px" }} />
                    <div>Cards (Debit/Credit)</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px", borderRadius: "6px", textAlign: "center" }}>
                    <Smartphone size={14} color="#a78bfa" style={{ margin: "0 auto 2px" }} />
                    <div>UPI / QR Code</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px", borderRadius: "6px", textAlign: "center" }}>
                    <Wallet size={14} color="#F59E0B" style={{ margin: "0 auto 2px" }} />
                    <div>NetBanking</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "10px", color: "var(--text-muted)" }}>
                  <Lock size={12} color="#10B981" />
                  <span>256-bit SSL encrypted • 3D Secure OTP verification enabled</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={() => setShowTopUpModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #3399CC, #0c2340)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: "700"
                  }}
                >
                  <span>Proceed with Razorpay</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2b. RAZORPAY CHECKOUT GATEWAY MODAL                          */}
      {/* ============================================================ */}
      <RazorpayModal
        isOpen={showRazorpayModal}
        onClose={() => setShowRazorpayModal(false)}
        amount={razorpayAmount}
        user={user}
        accessToken={accessToken}
        backendUrl={backendUrl}
        onPaymentSuccess={handleRazorpaySuccess}
        onPaymentFailure={handleRazorpayFailure}
      />

      {/* ============================================================ */}
      {/* 3. CONFIGURE / UPDATE PIN MODAL                              */}
      {/* ============================================================ */}
      {showPinModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "380px", background: "linear-gradient(135deg, #241b18, #140e0c)", border: "1px solid rgba(245, 158, 11, 0.3)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={16} color="#fff" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>{walletData?.hasPin ? "Change Security PIN" : "Configure Security PIN"}</h3>
              </div>
              <button onClick={() => setShowPinModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSetPin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {walletData?.hasPin && (
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                    Current 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    className="text-input"
                    style={{ width: "100%", letterSpacing: "8px", fontSize: "16px", textAlign: "center" }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  {walletData?.hasPin ? "New 4-Digit PIN" : "Create 4-Digit PIN"}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="text-input"
                  style={{ width: "100%", letterSpacing: "8px", fontSize: "16px", textAlign: "center" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="text-input"
                  style={{ width: "100%", letterSpacing: "8px", fontSize: "16px", textAlign: "center" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowPinModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSettingPin}
                  style={{ flex: 1, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {isSettingPin ? <RefreshCw size={16} className="animate-spin" /> : <><Lock size={14} /> Save PIN</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. RECEIVE / QR CODE MODAL                                   */}
      {/* ============================================================ */}
      {showQrModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "360px", background: "linear-gradient(135deg, #14222b, #0b141a)", border: "1px solid rgba(56, 189, 248, 0.3)", textAlign: "center", position: "relative" }}>
            <button onClick={() => setShowQrModal(false)} style={{ position: "absolute", right: "12px", top: "12px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>

            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#38BDF8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <QrCode size={22} color="#fff" />
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Receive Money</h3>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "16px" }}>Scan QR code or share your account identifier</p>

            {/* Simulated QR Code Visual */}
            <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", width: "180px", height: "180px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", height: "100%", border: "4px solid #000", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: "2px", padding: "4px" }}>
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} style={{ background: (i % 2 === 0 || i % 5 === 0 || i < 7) ? "#000" : "#fff", borderRadius: "1px" }} />
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>NEXUS UPI VPA</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <strong style={{ fontSize: "13px", color: "#38BDF8" }}>{user?.email || "consumer@nexus"}</strong>
                <button
                  onClick={() => copyToClipboard(user?.email || "", "vpa")}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  {copiedId === "vpa" ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button onClick={() => setShowQrModal(false)} className="btn-secondary" style={{ width: "100%" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
