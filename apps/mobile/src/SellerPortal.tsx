import React from "react";
import { ShoppingBag, Shield } from "lucide-react";

interface SellerPortalProps {
  sellerTab: "catalog" | "add_listing" | "profile";
  setSellerTab: (t: "catalog" | "add_listing" | "profile") => void;
  user: any;
  products: any[];
  
  // Add Listing Fields
  sellTitle: string;
  setSellTitle: (v: string) => void;
  sellDescription: string;
  setSellDescription: (v: string) => void;
  sellSku: string;
  setSellSku: (v: string) => void;
  sellPrice: string;
  setSellPrice: (v: string) => void;
  sellStock: string;
  setSellStock: (v: string) => void;

  // Cloudinary Upload additions
  sellImageUrl: string;
  setSellImageUrl: (v: string) => void;
  sellFolder: string;
  setSellFolder: (v: string) => void;
  handleCloudinaryUpload: (file: File) => Promise<void>;
  
  // Callbacks
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  sellerTab, setSellerTab,
  user,
  products,
  sellTitle, setSellTitle,
  sellDescription, setSellDescription,
  sellSku, setSellSku,
  sellPrice, setSellPrice,
  sellStock, setSellStock,
  sellImageUrl, setSellImageUrl,
  sellFolder, setSellFolder,
  handleCloudinaryUpload,
  setErrorMsg, setSuccessMsg
}) => {
  const [folderSearch, setFolderSearch] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);

  const CLOUDINARY_FOLDERS = [
    { value: "food_beverages/apple", label: "Food & Beverages / Apple" },
    { value: "food_beverages/banana", label: "Food & Beverages / Banana" },
    { value: "food_beverages/strawberry", label: "Food & Beverages / Strawberry" },
    { value: "food_beverages/milk", label: "Food & Beverages / Milk" },
    { value: "food_beverages/butter", label: "Food & Beverages / Butter" },
    { value: "food_beverages/cheese", label: "Food & Beverages / Cheese" },
    { value: "food_beverages/bread", label: "Food & Beverages / Bread" },
    { value: "food_beverages/orange", label: "Food & Beverages / Orange" },
    { value: "food_beverages/kiwi", label: "Food & Beverages / Kiwi" },
    { value: "electronics/iphone", label: "Electronics / iPhone" },
    { value: "electronics/laptop", label: "Electronics / Laptop" },
    { value: "fashion/tshirt", label: "Fashion / T-Shirt" },
    { value: "fashion/jeans", label: "Fashion / Jeans" }
  ];

  const filteredFolders = CLOUDINARY_FOLDERS.filter(f =>
    f.label.toLowerCase().includes(folderSearch.toLowerCase())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
      {/* Header/Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Seller Portal</h2>
        <span style={{ fontSize: "11px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 8px", borderRadius: "12px", fontWeight: "600" }}>SELLER ACTIVE</span>
      </div>

      {/* Seller Tabs */}
      <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "4px", border: "1px solid var(--border)" }}>
        {[
          { id: "catalog", label: "Inventory" },
          { id: "add_listing", label: "Add Listing" },
          { id: "profile", label: "Business Details" }
        ].map(t => (
          <button
            key={t.id}
            style={{
              flex: 1, padding: "8px 0", fontSize: "11px", borderRadius: "6px", border: "none", cursor: "pointer",
              background: sellerTab === t.id ? "var(--primary)" : "transparent",
              color: sellerTab === t.id ? "#fff" : "var(--text-secondary)",
              fontWeight: sellerTab === t.id ? "600" : "400"
            }}
            onClick={() => setSellerTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {sellerTab === "catalog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Your Active Catalog Listings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {products.slice(0, 10).map((prod) => (
              <div key={prod.id} className="glass-card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
      )}

      {/* Add Listing Tab */}
      {sellerTab === "add_listing" && (
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600" }}>Add New Marketplace Listing</h3>
          <div className="input-group">
            <span className="input-label">PRODUCT TITLE (LOWERCASE ONLY)</span>
            <input type="text" placeholder="e.g. fresh organic strawberries" className="text-input" value={sellTitle} onChange={(e) => setSellTitle(e.target.value.toLowerCase())} />
          </div>
          <div className="input-group">
            <span className="input-label">DESCRIPTION</span>
            <textarea placeholder="Product description, freshness, origins..." className="text-input" style={{ minHeight: "60px", resize: "none" }} value={sellDescription} onChange={(e) => setSellDescription(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">SKU</span>
              <input type="text" placeholder="STR-ORG-01" className="text-input" value={sellSku} onChange={(e) => setSellSku(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-label">PRICE (IN RUPEES)</span>
              <input type="number" placeholder="250" className="text-input" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <span className="input-label">INITIAL STOCK LEVEL (UNITS)</span>
            <input type="number" placeholder="100" className="text-input" value={sellStock} onChange={(e) => setSellStock(e.target.value)} />
          </div>
          <div className="input-group" style={{ position: "relative" }}>
            <span className="input-label">CLOUDINARY STORAGE FOLDER</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
              <input
                type="text"
                placeholder="🔍 Search folder, e.g. apple..."
                className="text-input"
                value={folderSearch}
                onChange={(e) => {
                  setFolderSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{ flex: 1 }}
              />
              {sellFolder && (
                <span style={{ fontSize: "10px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", padding: "6px 10px", borderRadius: "6px", fontWeight: "600", whiteSpace: "nowrap" }}>
                  Active: {sellFolder}
                </span>
              )}
            </div>
            {showDropdown && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "rgba(20, 18, 26, 0.98)", border: "1px solid var(--border)",
                borderRadius: "8px", zIndex: 100, maxHeight: "150px", overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)", marginTop: "4px"
              }}>
                {filteredFolders.length === 0 ? (
                  <div style={{ padding: "10px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>No folders match your search</div>
                ) : (
                  filteredFolders.map(f => (
                     <div
                       key={f.value}
                       style={{
                         padding: "10px 12px", fontSize: "12px", cursor: "pointer",
                         background: sellFolder === f.value ? "rgba(99, 102, 241, 0.2)" : "transparent",
                         borderBottom: "1px solid rgba(255,255,255,0.03)",
                         color: sellFolder === f.value ? "#818cf8" : "var(--text-secondary)",
                         transition: "all 0.2s"
                       }}
                       onClick={() => {
                         setSellFolder(f.value);
                         setFolderSearch(f.label);
                         setShowDropdown(false);
                       }}
                     >
                       📁 {f.label}
                     </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="input-group">
            <span className="input-label">PRODUCT IMAGE (CUSTOM UPLOAD)</span>
            <input 
              type="file" 
              accept="image/*" 
              className="text-input" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleCloudinaryUpload(file);
                }
              }} 
            />
            {sellImageUrl ? (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <span style={{ fontSize: "9px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>PREVIEW FROM CLOUDINARY CDN</span>
                <img src={sellImageUrl} alt="Product Preview" style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)", display: "inline-block" }} />
              </div>
            ) : (
              sellFolder && (
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>PREVIEW DEFAULT DIRECTORY IMAGE</span>
                  <img src={`https://res.cloudinary.com/ddvwimzfr/image/upload/v1/nexus1/${sellFolder}/default.jpg`} alt="Product Preview" style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)", display: "inline-block" }} />
                </div>
              )
            )}
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: "10px" }} onClick={() => {
            if (!sellTitle || !sellPrice) {
              setErrorMsg("Product Title and Price are required.");
              return;
            }
            setSuccessMsg("Listing added to moderation queue! Pending Admin approval.");
            // Log listing creation activity
            try {
              const key = `nexus_actions_${user.email.toLowerCase()}`;
              const existing = localStorage.getItem(key);
              const actions = existing ? JSON.parse(existing) : [];
              actions.unshift({
                id: Math.random().toString(36).substring(2, 9),
                text: `Created Listing: ${sellTitle} - ₹${sellPrice}`,
                timestamp: new Date().toLocaleString()
              });
              localStorage.setItem(key, JSON.stringify(actions));
            } catch (_) {}

            setSellTitle(""); setSellDescription(""); setSellSku(""); setSellPrice(""); setSellStock(""); setSellImageUrl(""); setFolderSearch("");
            setTimeout(() => setSuccessMsg(null), 3000);
          }}>
            Submit Listing for Approval
          </button>
        </div>
      )}

      {/* Profile Tab */}
      {sellerTab === "profile" && (
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Business Profile Details</h3>
          
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>BUSINESS OWNER</span>
            <p style={{ fontSize: "13px", fontWeight: "600" }}>{user?.name}</p>
          </div>

          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>COMPANY NAME</span>
            <p style={{ fontSize: "13px", fontWeight: "600" }}>{user?.businessName || "Bob's Organic Market"}</p>
          </div>

          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>BUSINESS TYPE</span>
            <p style={{ fontSize: "13px", fontWeight: "600" }}>{user?.businessType || "Retail Groceries"}</p>
          </div>

          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>STORE LOCATION</span>
            <p style={{ fontSize: "13px", fontWeight: "600" }}>{user?.location || "Indiranagar, Bengaluru"}</p>
          </div>

          <div>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>MOBILE CONTACT</span>
            <p style={{ fontSize: "13px", fontWeight: "600" }}>{user?.mobileNumber || "8765432109"}</p>
          </div>
        </div>
      )}
    </div>
  );
};
