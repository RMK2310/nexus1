import React from "react";
import { User, Shield, KeyRound, RefreshCw, XCircle, CheckCircle } from "lucide-react";

interface LoginPageProps {
  authMode: "LOGIN" | "SIGNUP" | "FORGOT_PASSWORD" | "VERIFY_CODE";
  setAuthMode: (mode: "LOGIN" | "SIGNUP" | "FORGOT_PASSWORD" | "VERIFY_CODE") => void;
  activeLoginRole: "CUSTOMER" | "SELLER" | "ADMIN";
  setActiveLoginRole: (role: "CUSTOMER" | "SELLER" | "ADMIN") => void;
  
  // Login fields
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  
  // Registration fields
  regName: string;
  setRegName: (v: string) => void;
  regMobile: string;
  setRegMobile: (v: string) => void;
  regEmail: string;
  setRegEmail: (v: string) => void;
  regAge: string;
  setRegAge: (v: string) => void;
  regDob: string;
  setRegDob: (v: string) => void;
  regAddress: string;
  setRegAddress: (v: string) => void;
  regPincode: string;
  setRegPincode: (v: string) => void;
  regDistrict: string;
  setRegDistrict: (v: string) => void;
  regState: string;
  setRegState: (v: string) => void;
  regCountry: string;
  setRegCountry: (v: string) => void;
  regBusinessName: string;
  setRegBusinessName: (v: string) => void;
  regLocation: string;
  setRegLocation: (v: string) => void;
  regBusinessType: string;
  setRegBusinessType: (v: string) => void;
  regPassword: string;
  setRegPassword: (v: string) => void;
  regConfirmPassword: string;
  setRegConfirmPassword: (v: string) => void;

  // Forgot password fields
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;

  // Loading/Triggers
  isLoading: boolean;
  handleLogin: (email: string, pass: string) => void;
  handleSignUp: () => void;
  handleSendResetCode: () => void;
  handleVerifyAndResetPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  authMode, setAuthMode,
  activeLoginRole, setActiveLoginRole,
  loginEmail, setLoginEmail,
  loginPassword, setLoginPassword,
  regName, setRegName,
  regMobile, setRegMobile,
  regEmail, setRegEmail,
  regAge, setRegAge,
  regDob, setRegDob,
  regAddress, setRegAddress,
  regPincode, setRegPincode,
  regDistrict, setRegDistrict,
  regState, setRegState,
  regCountry, setRegCountry,
  regBusinessName, setRegBusinessName,
  regLocation, setRegLocation,
  regBusinessType, setRegBusinessType,
  regPassword, setRegPassword,
  regConfirmPassword, setRegConfirmPassword,
  forgotEmail, setForgotEmail,
  verificationCode, setVerificationCode,
  newPassword, setNewPassword,
  confirmNewPassword, setConfirmNewPassword,
  isLoading,
  handleLogin,
  handleSignUp,
  handleSendResetCode,
  handleVerifyAndResetPassword
}) => {
  return (
    <div style={{ padding: "10px 16px" }}>
      {authMode === "LOGIN" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "24px", color: "#F3F4F6", marginBottom: "6px" }}>Sign In to NEXUS</h2>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Choose your workspace role to begin</p>
          </div>

          {/* Role tabs */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "4px", marginBottom: "20px", border: "1px solid var(--border)" }}>
            {(["CUSTOMER", "SELLER", "ADMIN"] as const).map((r) => (
              <button
                key={r}
                style={{
                  flex: 1, padding: "8px 0", fontSize: "12px", borderRadius: "6px", border: "none", cursor: "pointer",
                  background: activeLoginRole === r ? "var(--primary)" : "transparent",
                  color: activeLoginRole === r ? "#fff" : "var(--text-secondary)",
                  fontWeight: activeLoginRole === r ? "600" : "400"
                }}
                onClick={() => setActiveLoginRole(r)}
              >
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="input-group">
            <span className="input-label">EMAIL ADDRESS</span>
            <input type="email" placeholder="name@example.com" className="text-input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
            <button
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer" }}
              onClick={() => setAuthMode("FORGOT_PASSWORD")}
            >
              Forgot Password?
            </button>
          </div>

          <button
            className="btn-primary" style={{ width: "100%", marginBottom: "15px" }}
            onClick={() => handleLogin(loginEmail, loginPassword)}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Sign In"}
          </button>

          {activeLoginRole !== "ADMIN" && (
            <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
              New to NEXUS?{" "}
              <button
                style={{ background: "none", border: "none", color: "var(--secondary)", fontWeight: "600", cursor: "pointer", padding: 0 }}
                onClick={() => setAuthMode("SIGNUP")}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Seed autofill buttons */}
          <div style={{ position: "relative", textAlign: "center", margin: "24px 0 12px" }}>
            <hr style={{ border: "0", borderTop: "1px solid var(--border)" }} />
            <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "var(--bg-main)", padding: "0 10px", fontSize: "10px", color: "var(--text-muted)" }}>DEMO SHORTCUTS</span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-secondary" style={{ flex: 1, padding: "8px", fontSize: "11px" }}
              onClick={() => {
                setActiveLoginRole("CUSTOMER");
                setLoginEmail("consumer@nexus.com");
                setLoginPassword("NexusPass123!");
              }}
            >
              Auto Customer
            </button>
            <button
              className="btn-secondary" style={{ flex: 1, padding: "8px", fontSize: "11px" }}
              onClick={() => {
                setActiveLoginRole("SELLER");
                setLoginEmail("seller@nexus.com");
                setLoginPassword("NexusPass123!");
              }}
            >
              Auto Seller
            </button>
            <button
              className="btn-secondary" style={{ flex: 1, padding: "8px", fontSize: "11px" }}
              onClick={() => {
                setActiveLoginRole("ADMIN");
                setLoginEmail("admin@nexus.com");
                setLoginPassword("NexusPass123!");
              }}
            >
              Auto Admin
            </button>
          </div>
        </div>
      )}

      {authMode === "SIGNUP" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <button
              style={{ background: "none", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer" }}
              onClick={() => setAuthMode("LOGIN")}
            >
              ← Back
            </button>
            <h2 style={{ fontSize: "20px", color: "#F3F4F6" }}>Register as {activeLoginRole}</h2>
          </div>

          <div className="input-group">
            <span className="input-label">FULL NAME</span>
            <input type="text" placeholder="John Doe" className="text-input" value={regName} onChange={(e) => setRegName(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">MOBILE NUMBER</span>
            <input type="tel" placeholder="10-digit mobile" className="text-input" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">EMAIL ADDRESS</span>
            <input type="email" placeholder="john@example.com" className="text-input" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
          </div>

          {activeLoginRole === "CUSTOMER" && (
            <>
              <div style={{ display: "flex", gap: "10px" }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">AGE</span>
                  <input type="number" placeholder="25" className="text-input" value={regAge} onChange={(e) => setRegAge(e.target.value)} />
                </div>
                <div className="input-group" style={{ flex: 2 }}>
                  <span className="input-label">DOB</span>
                  <input type="date" className="text-input" value={regDob} onChange={(e) => setRegDob(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <span className="input-label">STREET ADDRESS</span>
                <input type="text" placeholder="House, Street name" className="text-input" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">PINCODE</span>
                  <input type="text" placeholder="560001" className="text-input" value={regPincode} onChange={(e) => setRegPincode(e.target.value)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">DISTRICT</span>
                  <input type="text" placeholder="Bengaluru" className="text-input" value={regDistrict} onChange={(e) => setRegDistrict(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">STATE</span>
                  <input type="text" placeholder="Karnataka" className="text-input" value={regState} onChange={(e) => setRegState(e.target.value)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="input-label">COUNTRY</span>
                  <input type="text" placeholder="India" className="text-input" value={regCountry} onChange={(e) => setRegCountry(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {activeLoginRole === "SELLER" && (
            <>
              <div className="input-group">
                <span className="input-label">COMPANY / BUSINESS NAME</span>
                <input type="text" placeholder="Bob's Groceries Ltd" className="text-input" value={regBusinessName} onChange={(e) => setRegBusinessName(e.target.value)} />
              </div>

              <div className="input-group">
                <span className="input-label">STORE LOCATION</span>
                <input type="text" placeholder="Indiranagar, Bengaluru" className="text-input" value={regLocation} onChange={(e) => setRegLocation(e.target.value)} />
              </div>

              <div className="input-group">
                <span className="input-label">TYPE OF BUSINESS</span>
                <input type="text" placeholder="Groceries, Retail" className="text-input" value={regBusinessType} onChange={(e) => setRegBusinessType(e.target.value)} />
              </div>
            </>
          )}

          <div className="input-group">
            <span className="input-label">PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">CONFIRM PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} />
          </div>

          <button
            className="btn-primary" style={{ width: "100%", marginTop: "10px" }}
            onClick={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Create Account"}
          </button>
        </div>
      )}

      {authMode === "FORGOT_PASSWORD" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <button
              style={{ background: "none", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer" }}
              onClick={() => setAuthMode("LOGIN")}
            >
              ← Back
            </button>
            <h2 style={{ fontSize: "20px", color: "#F3F4F6" }}>Reset Password</h2>
          </div>

          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Enter your registered email address to receive a 6-digit verification code.
          </p>

          <div className="input-group">
            <span className="input-label">EMAIL ADDRESS</span>
            <input type="email" placeholder="john@example.com" className="text-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
          </div>

          <button
            className="btn-primary" style={{ width: "100%", marginTop: "10px" }}
            onClick={handleSendResetCode}
          >
            Send Verification Code
          </button>
        </div>
      )}

      {authMode === "VERIFY_CODE" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <button
              style={{ background: "none", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer" }}
              onClick={() => setAuthMode("FORGOT_PASSWORD")}
            >
              ← Back
            </button>
            <h2 style={{ fontSize: "20px", color: "#F3F4F6" }}>Verify PIN Code</h2>
          </div>

          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Enter the 6-digit PIN and choose your new password.
          </p>

          <div className="input-group">
            <span className="input-label">6-DIGIT PIN CODE</span>
            <input type="text" placeholder="123456" maxLength={6} className="text-input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">NEW PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>

          <div className="input-group">
            <span className="input-label">CONFIRM NEW PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          </div>

          <button
            className="btn-primary" style={{ width: "100%", marginTop: "10px" }}
            onClick={handleVerifyAndResetPassword}
          >
            Update Password
          </button>
        </div>
      )}
    </div>
  );
};
