import React, { useState, useEffect } from "react";
import { firebaseMock, UserProfile as FirebaseUserProfile } from "./firebaseMock";
import { LoginPage } from "./LoginPage";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  History,
  Settings,
  LogOut,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Cpu,
  Database,
  CheckCircle,
  XCircle,
  ShoppingBag,
  User,
  Wallet
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  activeRole: string;
  roles: string[];
  mobileNumber?: string;
  age?: string;
  dob?: string;
  address?: string;
  pincode?: string;
  district?: string;
  state?: string;
  country?: string;
  businessName?: string;
  location?: string;
  businessType?: string;
  walletBalance?: number;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  listings: Array<{
    id: string;
    price: number;
    compareAtPrice: number | null;
    seller: { businessName: string };
    inventory: { quantity: number } | null;
  }>;
}

interface Product {
  id: string;
  title: string;
  description: string;
  status: string;
  productType: string;
  category: Category;
  brand: Brand | null;
  variants: ProductVariant[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "fraud" | "audit" | "config" | "products" | "moderation">("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Dynamic Catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const logUserAction = (email: string, actionText: string) => {
    try {
      const key = `nexus_actions_${email.toLowerCase()}`;
      const existing = localStorage.getItem(key);
      const actions = existing ? JSON.parse(existing) : [];
      actions.unshift({
        id: Math.random().toString(36).substring(2, 9),
        text: actionText,
        timestamp: new Date().toLocaleString()
      });
      localStorage.setItem(key, JSON.stringify(actions));
    } catch (e) {
      console.error("Failed to log user action:", e);
    }
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Firebase Multi-Role Auth states
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP" | "FORGOT_PASSWORD" | "VERIFY_CODE">("LOGIN");
  const [activeLoginRole, setActiveLoginRole] = useState<"CUSTOMER" | "SELLER" | "ADMIN">("ADMIN"); // Admin by default in admin portal!
  
  // Registration Profile fields
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPincode, setRegPincode] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regState, setRegState] = useState("");
  const [regCountry, setRegCountry] = useState("");
  const [regBusinessName, setRegBusinessName] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regBusinessType, setRegBusinessType] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Admin and Seller Custom dashboard tabs/states
  const [adminTab, setAdminTab] = useState<"users" | "add_admin" | "moderation" | "products">("users");
  const [sellerTab, setSellerTab] = useState<"catalog" | "add_listing" | "profile">("catalog");
  const [firebaseUsersList, setFirebaseUsersList] = useState<FirebaseUserProfile[]>([]);
  
  // New Admin Form State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");

  // Add Product Variant state for Seller Portal
  const [sellTitle, setSellTitle] = useState("");
  const [sellDescription, setSellDescription] = useState("");
  const [sellSku, setSellSku] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellStock, setSellStock] = useState("");

  // Fetch catalog products
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/commerce/products`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.data);
      }
    } catch (e) {
      console.error("Failed to load admin products:", e);
    }
  };

  // Fetch pending products for moderation
  const fetchPendingProducts = async (token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/commerce/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingProducts(data.data);
      }
    } catch (e) {
      console.error("Failed to load pending products:", e);
    }
  };

  // Approve product
  const handleApproveProduct = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/commerce/admin/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Product approved and added to active catalog!");
        if (user) {
          logUserAction(user.email, `Approved product listing ID: ${id}`);
        }
        fetchPendingProducts(accessToken);
        fetchProducts();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject product
  const handleRejectProduct = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/commerce/admin/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Product rejected and returned to draft.");
        if (user) {
          logUserAction(user.email, `Rejected product listing ID: ${id}`);
        }
        fetchPendingProducts(accessToken);
        fetchProducts();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mock System Audit logs
  const auditLogs = [
    { id: 1, action: "USER_LOGIN", resource: "auth", details: "Admin logged in successfully", user: "admin@nexus.com", timestamp: "Just Now", requestId: "req-9a8b7c" },
    { id: 2, action: "ROLE_SWITCH", resource: "auth", details: "Switched active context to ADMIN", user: "admin@nexus.com", timestamp: "5 mins ago", requestId: "req-2c3d4e" },
    { id: 3, action: "KYC_APPROVED", resource: "seller", details: "Approved business Bob's Mega Electronics", user: "admin@nexus.com", timestamp: "10 mins ago", requestId: "req-5e6f7g" },
    { id: 4, action: "PRODUCT_MODERATION", resource: "catalog", details: "Auto-approved Product NX-SP-HEADPHONES-01", user: "system-bot", timestamp: "12 mins ago", requestId: "req-8h9i0j" },
    { id: 5, action: "WALLET_INITIALIZED", resource: "payments", details: "Wallet created for email consumer@nexus.com", user: "system-bot", timestamp: "1 hour ago", requestId: "req-0k1l2m" }
  ];

  // Mock Fraud Alerts
  const fraudAlerts = [
    { id: 1, type: "VELOCITY_LIMIT", amount: "₹45,000", status: "HIGH", user: "alice@consumer.com", score: 91, action: "STEP_UP_MFA" },
    { id: 2, type: "LOCATION_ANOMALY", amount: "₹2,500", status: "MEDIUM", user: "driver@nexus.com", score: 54, action: "MANUAL_REVIEW" },
    { id: 3, type: "UNUSUAL_AMOUNT", amount: "₹120,000", status: "HIGH", user: "unknown@nexus.com", score: 96, action: "BLOCK_TRANSACTION" }
  ];

  // Mock AI Registry Models
  const aiRegistry = [
    { id: "gpt-4o", provider: "OpenAI", context: "128k", costInput: "$5.00/M", costOutput: "$15.00/M", latency: "Fast", status: "ACTIVE" },
    { id: "claude-3-5-sonnet", provider: "Anthropic", context: "200k", costInput: "$3.00/M", costOutput: "$15.00/M", latency: "Normal", status: "ACTIVE" },
    { id: "gemini-1-5-pro", provider: "Google", context: "2M", costInput: "$7.00/M", costOutput: "$21.00/M", latency: "Fast", status: "ACTIVE" },
    { id: "gpt-3-5-turbo-fallback", provider: "OpenAI", context: "16k", costInput: "$0.50/M", costOutput: "$1.50/M", latency: "Ultra-Fast", status: "STANDBY" }
  ];

  // Session Handlers (using Firebase Authentication Simulation)
  const handleLogin = async (emailInput: string, passwordInput: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await firebaseMock.signIn(emailInput, passwordInput, activeLoginRole);
      if (res.success && res.user) {
        setSuccessMsg(res.message);
        const resolvedUser = {
          ...res.user,
          id: res.user.uid,
          activeRole: res.user.role,
          roles: [res.user.role],
        };

        let token = "simulated-firebase-token-" + res.user.uid;
        
        try {
          const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailInput, password: passwordInput })
          });
          const backendData = await backendRes.json();
          if (backendRes.ok && backendData.success && backendData.data.accessToken) {
            token = backendData.data.accessToken;
            resolvedUser.id = backendData.data.user.id;
          }
        } catch (backendErr) {
          console.warn("Backend auth login failed/unavailable. Using mock token fallback:", backendErr);
        }

        setUser(resolvedUser as any);
        setAccessToken(token);
        setIsAuthenticated(true);
        localStorage.setItem("nexus_admin_token", token);
        localStorage.setItem("nexus_logged_in_user", JSON.stringify(resolvedUser));
        
        // Reset inputs
        setEmail("");
        setPassword("");
        
        // Load users list for Admin
        if (res.user.role === "ADMIN") {
          const list = await firebaseMock.getAllUsers(res.user.email);
          setFirebaseUsersList(list);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Profile Details payload
    const details: Partial<FirebaseUserProfile> = {
      name: regName,
      mobileNumber: regMobile,
    };

    if (activeLoginRole === "CUSTOMER") {
      details.age = regAge;
      details.dob = regDob;
      details.address = regAddress;
      details.pincode = regPincode;
      details.district = regDistrict;
      details.state = regState;
      details.country = regCountry;
    } else if (activeLoginRole === "SELLER") {
      details.businessName = regBusinessName;
      details.location = regLocation;
      details.businessType = regBusinessType;
    }

    // Validations
    if (!regEmail || !regPassword) {
      setErrorMsg("Email address and Password are required.");
      setIsLoading(false);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await firebaseMock.signUp(regEmail, regPassword, activeLoginRole, details);
      if (res.success) {
        // Sync registration with Nest backend
        try {
          await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: regEmail,
              password: regPassword,
              name: regName,
              phone: regMobile
            })
          });
        } catch (backendErr) {
          console.warn("Backend auth registration failed/unavailable:", backendErr);
        }

        setSuccessMsg(res.message + " Please log in.");
        setAuthMode("LOGIN");
        // Clear registration fields
        setRegName(""); setRegMobile(""); setRegEmail(""); setRegPassword(""); setRegConfirmPassword("");
        setRegAge(""); setRegDob(""); setRegAddress(""); setRegPincode(""); setRegDistrict(""); setRegState(""); setRegCountry("");
        setRegBusinessName(""); setRegLocation(""); setRegBusinessType("");
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!forgotEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    try {
      const res = await firebaseMock.sendResetCode(forgotEmail);
      if (res.success) {
        if (res.code) {
          setSentCode(res.code);
          setSuccessMsg(`Verification code generated: ${res.code} (Simulated Email Outbox)`);
          setAuthMode("VERIFY_CODE");
        } else {
          setSuccessMsg(res.message);
          setAuthMode("LOGIN");
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleVerifyAndResetPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!verificationCode) {
      setErrorMsg("Please enter the verification code.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    try {
      const res = await firebaseMock.verifyCodeAndResetPassword(forgotEmail, verificationCode, newPassword);
      if (res.success) {
        setSuccessMsg(res.message);
        setAuthMode("LOGIN");
        setForgotEmail("");
        setVerificationCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.activeRole !== "ADMIN") return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await firebaseMock.addAdmin(user.email, newAdminEmail, newAdminPass);
      if (res.success) {
        setSuccessMsg("Co-Administrator added successfully.");
        logUserAction(user.email, `Created Co-Admin: ${newAdminEmail}`);
        setNewAdminEmail("");
        setNewAdminPass("");
        const list = await firebaseMock.getAllUsers(user.email);
        setFirebaseUsersList(list);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveFirebaseUser = async (uid: string) => {
    if (!user || user.activeRole !== "ADMIN") return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await firebaseMock.removeUser(user.email, uid);
      if (res.success) {
        setSuccessMsg(res.message);
        logUserAction(user.email, `Removed User ID: ${uid}`);
        const list = await firebaseMock.getAllUsers(user.email);
        setFirebaseUsersList(list);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nexus_admin_token");
    localStorage.removeItem("nexus_logged_in_user");
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("nexus_admin_token");
    const storedUser = localStorage.getItem("nexus_logged_in_user");
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      if (parsedUser.role === "ADMIN") {
        firebaseMock.getAllUsers(parsedUser.email).then(list => {
          setFirebaseUsersList(list);
        });
      }
      fetchProducts();
    }
  }, []);

  return (
    <div>
      {/* Alerts */}
      {errorMsg && (
        <div style={{
          position: "fixed", top: 24, right: 24,
          background: "rgba(239, 68, 68, 0.95)", padding: "14px 20px",
          borderRadius: "12px", fontSize: "13px", zIndex: 110,
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{
          position: "fixed", top: 24, right: 24,
          background: "rgba(16, 185, 129, 0.95)", padding: "14px 20px",
          borderRadius: "12px", fontSize: "13px", zIndex: 110,
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}>
          {successMsg}
        </div>
      )}

      {!isAuthenticated ? (
        <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", margin: "100px auto", padding: "20px", background: "rgba(20, 18, 26, 0.95)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <LoginPage
            authMode={authMode}
            setAuthMode={setAuthMode}
            activeLoginRole={activeLoginRole}
            setActiveLoginRole={setActiveLoginRole}
            loginEmail={email}
            setLoginEmail={setEmail}
            loginPassword={password}
            setLoginPassword={setPassword}
            regName={regName}
            setRegName={setRegName}
            regMobile={regMobile}
            setRegMobile={setRegMobile}
            regEmail={regEmail}
            setRegEmail={setRegEmail}
            regAge={regAge}
            setRegAge={setRegAge}
            regDob={regDob}
            setRegDob={setRegDob}
            regAddress={regAddress}
            setRegAddress={setRegAddress}
            regPincode={regPincode}
            setRegPincode={setRegPincode}
            regDistrict={regDistrict}
            setRegDistrict={setRegDistrict}
            regState={regState}
            setRegState={setRegState}
            regCountry={regCountry}
            setRegCountry={setRegCountry}
            regBusinessName={regBusinessName}
            setRegBusinessName={setRegBusinessName}
            regLocation={regLocation}
            setRegLocation={setRegLocation}
            regBusinessType={regBusinessType}
            setRegBusinessType={setRegBusinessType}
            regPassword={regPassword}
            setRegPassword={setRegPassword}
            regConfirmPassword={regConfirmPassword}
            setRegConfirmPassword={setRegConfirmPassword}
            forgotEmail={forgotEmail}
            setForgotEmail={setForgotEmail}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmNewPassword={confirmNewPassword}
            setConfirmNewPassword={setConfirmNewPassword}
            isLoading={isLoading}
            handleLogin={handleLogin}
            handleSignUp={handleSignUp}
            handleSendResetCode={handleSendResetCode}
            handleVerifyAndResetPassword={handleVerifyAndResetPassword}
          />
        </div>
      ) : (
        /* Authenticated Layouts */
        <div style={{ display: "flex", width: "100%", height: "100%", flex: 1 }}>
          {user?.activeRole === "ADMIN" && (
            <div className="admin-layout" style={{ display: "flex", flex: 1 }}>
              {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-brand">
              <h2 style={{ fontSize: "22px", background: "linear-gradient(to right, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                NEXUS Admin
              </h2>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>SYSTEM CONTROL PORTAL</span>
            </div>

            <nav className="sidebar-menu">
              <button onClick={() => setActiveTab("dashboard")} className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`}>
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button onClick={() => setActiveTab("products")} className={`menu-item ${activeTab === "products" ? "active" : ""}`}>
                <ShoppingBag size={18} />
                Active Catalog
              </button>
              <button onClick={() => setActiveTab("moderation")} className={`menu-item ${activeTab === "moderation" ? "active" : ""}`}>
                <ShieldAlert size={18} />
                Seller Moderation
                {pendingProducts.length > 0 && (
                  <span style={{ marginLeft: "auto", background: "var(--error)", color: "#fff", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: "700" }}>
                    {pendingProducts.length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab("users")} className={`menu-item ${activeTab === "users" ? "active" : ""}`}>
                <Users size={18} />
                User Profiles
              </button>
              <button onClick={() => setActiveTab("fraud")} className={`menu-item ${activeTab === "fraud" ? "active" : ""}`}>
                <ShieldAlert size={18} />
                Fraud Risk Review
              </button>
              <button onClick={() => setActiveTab("audit")} className={`menu-item ${activeTab === "audit" ? "active" : ""}`}>
                <History size={18} />
                System Audit Logs
              </button>
              <button onClick={() => setActiveTab("config")} className={`menu-item ${activeTab === "config" ? "active" : ""}`}>
                <Settings size={18} />
                AI Model Registry
              </button>
            </nav>

            <button onClick={handleLogout} className="menu-item" style={{ marginTop: "auto", color: "var(--error)" }}>
              <LogOut size={18} />
              Terminate Session
            </button>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: "24px" }}>
                  {activeTab === "dashboard" && "Dashboard Analytics"}
                  {activeTab === "products" && "Active Product Catalog"}
                  {activeTab === "moderation" && "Seller Catalog Moderation"}
                  {activeTab === "users" && "User Base Directory"}
                  {activeTab === "fraud" && "Fraud Risk Alerts"}
                  {activeTab === "audit" && "Security Audit Logs"}
                  {activeTab === "config" && "AI Model Registry Engine"}
                </h1>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Signed in as: <span style={{ color: "#fff", fontWeight: 600 }}>{user?.name}</span> ({user?.activeRole})
                </p>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", width: "auto" }}
                onClick={() => setShowProfileModal(true)}
              >
                <User size={16} /> View Profile
              </button>
            </div>

            {/* Dashboard tab */}
            {activeTab === "dashboard" && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>ACTIVE CATALOG PRODUCTS</span>
                      <h2 style={{ fontSize: "28px", marginTop: "4px" }}>{products.length} Products</h2>
                    </div>
                    <ShoppingBag size={32} color="var(--primary)" />
                  </div>
                  <div className="stat-card">
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>MODERATION QUEUE</span>
                      <h2 style={{ fontSize: "28px", marginTop: "4px" }}>{pendingProducts.length} Pending</h2>
                    </div>
                    <ShieldAlert size={32} color="var(--error)" />
                  </div>
                </div>
              </div>
            )}

            {/* Active Products Catalog */}
            {activeTab === "products" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PRODUCT ID</th>
                      <th>TITLE</th>
                      <th>BRAND</th>
                      <th>CATEGORY</th>
                      <th>TYPE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)" }}>No products registered in active catalog.</td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id}>
                          <td style={{ fontFamily: "monospace", fontSize: "11px" }}>{prod.id}</td>
                          <td style={{ fontWeight: "600" }}>{prod.title}</td>
                          <td>{prod.brand?.name || "Generic"}</td>
                          <td>{prod.category?.name}</td>
                          <td>{prod.productType}</td>
                          <td><span style={{ color: "var(--secondary)" }}>ACTIVE</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Moderation Pending Catalog */}
            {activeTab === "moderation" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PRODUCT TITLE</th>
                      <th>DESCRIPTION</th>
                      <th>CATEGORY</th>
                      <th>TYPE</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>Moderation queue is clean. No pending seller submissions.</td>
                      </tr>
                    ) : (
                      pendingProducts.map((prod) => (
                        <tr key={prod.id}>
                          <td style={{ fontWeight: "600" }}>{prod.title}</td>
                          <td>{prod.description}</td>
                          <td>{prod.category?.name}</td>
                          <td>{prod.productType}</td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                className="btn-primary"
                                style={{ padding: "6px 12px", fontSize: "11px", background: "var(--secondary)", borderColor: "var(--secondary)" }}
                                onClick={() => handleApproveProduct(prod.id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: "6px 12px", fontSize: "11px", color: "var(--error)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                                onClick={() => handleRejectProduct(prod.id)}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Users directory */}
            {activeTab === "users" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>USER NAME</th>
                      <th>EMAIL ADDRESS</th>
                      <th>ROLE PROFILES</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Platform Administrator</td>
                      <td>admin@nexus.com</td>
                      <td>ADMIN, SUPER_ADMIN, CONSUMER</td>
                    </tr>
                    <tr>
                      <td>Alice Consumer</td>
                      <td>consumer@nexus.com</td>
                      <td>CONSUMER</td>
                    </tr>
                    <tr>
                      <td>Bob Seller</td>
                      <td>seller@nexus.com</td>
                      <td>SELLER, CONSUMER</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Fraud alerts */}
            {activeTab === "fraud" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ALERT TYPE</th>
                      <th>SOURCE ACCOUNT</th>
                      <th>RISK SCORE</th>
                      <th>LEVEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraudAlerts.map((alert) => (
                      <tr key={alert.id}>
                        <td style={{ fontWeight: "600" }}>{alert.type}</td>
                        <td>{alert.user}</td>
                        <td>{alert.score}%</td>
                        <td>
                          <span style={{
                            padding: "4px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "700",
                            background: alert.status === "HIGH" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                            color: alert.status === "HIGH" ? "var(--error)" : "var(--warning)"
                          }}>
                            {alert.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit log */}
            {activeTab === "audit" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ACTION</th>
                      <th>RESOURCE</th>
                      <th>DETAILS</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.resource}</td>
                        <td>{log.details}</td>
                        <td style={{ color: "var(--text-muted)" }}>{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AI Model config */}
            {activeTab === "config" && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>MODEL ID</th>
                      <th>PROVIDER</th>
                      <th>CONTEXT LIMIT</th>
                      <th>COST INPUT / OUT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiRegistry.map((model) => (
                      <tr key={model.id}>
                        <td style={{ fontWeight: "600", fontFamily: "monospace" }}>{model.id}</td>
                        <td>{model.provider}</td>
                        <td>{model.context}</td>
                        <td>{model.costInput} / {model.costOutput}</td>
                        <td><span style={{ color: "var(--secondary)" }}>{model.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Seller Web view */}
      {user?.activeRole === "SELLER" && (
        <div style={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "20px", background: "var(--bg-main)", minHeight: "100vh", color: "var(--text-main)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "20px" }}>
             <div>
               <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Seller Web Portal</h1>
               <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Manage inventory listings and moderation approval</p>
             </div>
             <button onClick={handleLogout} className="btn-secondary" style={{ color: "var(--error)", border: "1px solid var(--error)", padding: "8px 16px" }}>
               Sign Out
             </button>
           </div>
           
           <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
              <div className="glass-card" style={{ padding: "20px" }}>
                 <h3 style={{ fontSize: "16px", marginBottom: "16px", fontWeight: "600" }}>Active Catalog</h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                   {products.slice(0, 10).map((prod) => (
                     <div key={prod.id} className="glass-card" style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px" }}>
                       <div style={{ width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", background: "var(--border)" }}>
                         <img src={prod.variants[0]?.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       </div>
                       <div style={{ flex: 1 }}>
                         <h4 style={{ fontSize: "13px", fontWeight: "600" }}>{prod.title}</h4>
                         <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Category: {prod.category.name}</p>
                       </div>
                       <div style={{ textAlign: "right" }}>
                         <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>₹{(prod.variants[0]?.listings[0]?.price ?? 8900) / 100}</span>
                         <p style={{ fontSize: "9px", color: "var(--text-muted)" }}>Stock: {prod.variants[0]?.listings[0]?.inventory?.quantity ?? 45} units</p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
              <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                 <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Business Profile Details</h3>
                 <div>
                   <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>BUSINESS OWNER</span>
                   <p style={{ fontSize: "14px", fontWeight: "600" }}>{user?.name}</p>
                 </div>
                 <div>
                   <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>COMPANY NAME</span>
                   <p style={{ fontSize: "14px", fontWeight: "600" }}>{user?.businessName || "Bob's Organic Market"}</p>
                 </div>
                 <div>
                   <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>BUSINESS TYPE</span>
                   <p style={{ fontSize: "14px", fontWeight: "600" }}>{user?.businessType || "Retail Groceries"}</p>
                 </div>
                 <div>
                   <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>STORE LOCATION</span>
                   <p style={{ fontSize: "14px", fontWeight: "600" }}>{user?.location || "Indiranagar, Bengaluru"}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Customer Web view */}
      {user?.activeRole === "CUSTOMER" && (
        <div style={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", minHeight: "100vh", color: "var(--text-main)" }}>
            <div className="glass-card" style={{ maxWidth: "450px", textAlign: "center", padding: "30px" }}>
               <h2 style={{ fontSize: "22px", marginBottom: "10px", fontWeight: "700" }}>Customer Web Portal</h2>
               <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Welcome back, {user?.name}. Customer transactions and wallet balances must be managed via the Mobile client app.
               </p>
               <div style={{ textAlign: "left", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "20px" }}>
                  <p style={{ fontSize: "13px", marginBottom: "6px" }}><strong>Email:</strong> {user?.email}</p>
                  <p style={{ fontSize: "13px", marginBottom: "6px" }}><strong>Mobile:</strong> {user?.mobileNumber}</p>
                  <p style={{ fontSize: "13px", marginBottom: "6px" }}><strong>Location:</strong> {user?.address}, {user?.district}, {user?.state}</p>
                  <p style={{ fontSize: "13px" }}><strong>Wallet Balance:</strong> ₹{((user?.walletBalance ?? 0)/100).toFixed(2)}</p>
               </div>
               <button onClick={handleLogout} className="btn-primary" style={{ width: "100%" }}>
                  Sign Out
               </button>
            </div>
         </div>
       )}
    </div>
  )}

      {/* Admin Profile Modal Overlay */}
      {showProfileModal && user && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(3, 2, 5, 0.85)", zIndex: 1000, display: "flex",
          alignItems: "center", justifyContent: "center", padding: "16px",
          backdropFilter: "blur(8px)"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "24px", background: "rgba(20, 18, 26, 0.98)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={22} color="var(--primary)" /> Profile Summary
              </h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Profile Card Info */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "16px", borderRadius: "10px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Primary Identity</span>
                <h4 style={{ fontSize: "16px", fontWeight: "700", marginTop: "4px" }}>{user.name}</h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Email: {user.email} | Mobile: {user.mobileNumber || "Not Set"}</p>
                <span style={{ marginTop: "8px", display: "inline-block", fontSize: "10px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", padding: "3px 8px", borderRadius: "4px", fontWeight: "700" }}>
                  ROLE: {user.activeRole}
                </span>
              </div>

              {/* Wallet Bal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "14px 16px", borderRadius: "10px" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>WALLET LEDGER BALANCE</span>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "var(--secondary)", marginTop: "2px" }}>₹{((user.walletBalance ?? 0) / 100).toFixed(2)}</h3>
                </div>
                <Wallet size={24} color="var(--text-muted)" />
              </div>

              {/* Business listings context if Seller */}
              {user.activeRole === "SELLER" && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "700", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>BUSINESS PROFILE</h4>
                  <p style={{ fontSize: "12px" }}><strong>Company Name:</strong> {user.businessName}</p>
                  <p style={{ fontSize: "12px" }}><strong>Store Location:</strong> {user.location}</p>
                  <p style={{ fontSize: "12px" }}><strong>Business Type:</strong> {user.businessType}</p>
                </div>
              )}

              {/* Actions History List */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "700", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>ACTIVITY ACTIONS LOG</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(() => {
                    const key = `nexus_actions_${user.email.toLowerCase()}`;
                    const raw = localStorage.getItem(key);
                    const actions = raw ? JSON.parse(raw) : [];
                    if (actions.length === 0) {
                      return <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "10px" }}>No recent actions logged.</p>;
                    }
                    return actions.map((act: any) => (
                      <div key={act.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px" }}>
                        <p style={{ fontSize: "11px", color: "#e5e7eb", lineHeight: "1.3" }}>{act.text}</p>
                        <span style={{ fontSize: "8px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>{act.timestamp}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" style={{ padding: "8px 24px", width: "auto" }} onClick={() => setShowProfileModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
