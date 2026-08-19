import React from "react";
import { Shield, User } from "lucide-react";

interface AdminPortalProps {
  adminTab: "users" | "add_admin" | "moderation" | "products";
  setAdminTab: (t: "users" | "add_admin" | "moderation" | "products") => void;
  firebaseUsersList: any[];
  handleRemoveFirebaseUser: (uid: string) => void;
  
  // Add Admin Fields
  newAdminEmail: string;
  setNewAdminEmail: (v: string) => void;
  newAdminPass: string;
  setNewAdminPass: (v: string) => void;
  handleCreateAdmin: (e: React.FormEvent) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  adminTab, setAdminTab,
  firebaseUsersList,
  handleRemoveFirebaseUser,
  newAdminEmail, setNewAdminEmail,
  newAdminPass, setNewAdminPass,
  handleCreateAdmin
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
      {/* Header/Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700" }}>NEXUS Admin Panel</h2>
        <span style={{ fontSize: "11px", background: "rgba(239, 68, 68, 0.15)", color: "var(--error)", padding: "4px 8px", borderRadius: "12px", fontWeight: "600" }}>ADMIN SESSION</span>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "4px", border: "1px solid var(--border)" }}>
        {[
          { id: "users", label: "Monitor" },
          { id: "add_admin", label: "+ Admin" },
          { id: "moderation", label: "Moderation" }
        ].map(t => (
          <button
            key={t.id}
            style={{
              flex: 1, padding: "8px 0", fontSize: "11px", borderRadius: "6px", border: "none", cursor: "pointer",
              background: adminTab === t.id ? "var(--primary)" : "transparent",
              color: adminTab === t.id ? "#fff" : "var(--text-secondary)",
              fontWeight: adminTab === t.id ? "600" : "400"
            }}
            onClick={() => setAdminTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Monitor Users & Sellers */}
      {adminTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Registered Platform Users</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {firebaseUsersList.map((usr) => (
              <div key={usr.uid} className="glass-card" style={{ padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: "700" }}>{usr.name}</h4>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{usr.email}</span>
                  </div>
                  <span style={{
                    fontSize: "9px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                    background: usr.role === "ADMIN" ? "rgba(239, 68, 68, 0.15)" : usr.role === "SELLER" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                    color: usr.role === "ADMIN" ? "var(--error)" : usr.role === "SELLER" ? "#10b981" : "#3b82f6"
                  }}>{usr.role}</span>
                </div>

                {/* Additional info based on role */}
                {usr.role === "CUSTOMER" && (
                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "6px" }}>
                    <div>Age/DOB: {usr.age} / {usr.dob}</div>
                    <div>Mobile: {usr.mobileNumber}</div>
                    <div style={{ gridColumn: "span 2" }}>Address: {usr.address}, {usr.pincode}, {usr.district}, {usr.state}, {usr.country}</div>
                  </div>
                )}

                {usr.role === "SELLER" && (
                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "6px" }}>
                    <div>Business: {usr.businessName}</div>
                    <div>Type: {usr.businessType}</div>
                    <div>Mobile: {usr.mobileNumber}</div>
                    <div>Location: {usr.location}</div>
                  </div>
                )}

                {/* Delete button */}
                {usr.role !== "ADMIN" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    <button
                      className="btn-secondary"
                      style={{ color: "var(--error)", border: "1px solid var(--error)", padding: "4px 8px", fontSize: "10px" }}
                      onClick={() => handleRemoveFirebaseUser(usr.uid)}
                    >
                      Remove Account
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Admin */}
      {adminTab === "add_admin" && (
        <form onSubmit={handleCreateAdmin} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600" }}>Register Platform Administrator</h3>
          <div className="input-group">
            <span className="input-label">ADMIN EMAIL ADDRESS</span>
            <input type="email" placeholder="admin2@nexus.com" className="text-input" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <span className="input-label">PASSWORD</span>
            <input type="password" placeholder="••••••••" className="text-input" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "10px" }}>
            Create Admin Account
          </button>
        </form>
      )}

      {/* Moderation Queue */}
      {adminTab === "moderation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Pending Catalog Moderations</h3>
          <div className="glass-card" style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>
            <Shield size={24} style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: "11px" }}>All seed items are auto-moderated. Newly submitted seller listings will appear here for audit approval.</p>
          </div>
        </div>
      )}
    </div>
  );
};
