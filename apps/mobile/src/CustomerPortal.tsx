import React, { useState } from "react";
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
  RotateCcw
} from "lucide-react";
import { resolvePreciseProductImage, getOptimizedImageUrl } from "@nexus/shared";
import { WalletPortal } from "./WalletPortal";
import { FoodPortal } from "./FoodPortal";
import { MobilityPortal } from "./MobilityPortal";
import { ChatPortal } from "./ChatPortal";

interface CustomerPortalProps {
  activeTab: "home" | "shop" | "chat" | "wallet" | "services";
  setActiveTab: (tab: "home" | "shop" | "chat" | "wallet" | "services") => void;
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
  
  // Ingest OFF
  barcodeInput: string;
  setBarcodeInput: (b: string) => void;
  handleIngestOFF: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  activeTab,
  setActiveTab,
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
  barcodeInput,
  setBarcodeInput,
  handleIngestOFF,
  isLoading
}) => {
  const [showDevStats, setShowDevStats] = useState(false);
  const [servicesSubTab, setServicesSubTab] = useState<"food" | "mobility">("food");
  const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  return (
    <div>
      {/* Home Tab */}
      {activeTab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        !isCsvLoaded ? (
          <div style={{ textAlign: "center", padding: "80px 16px", color: "var(--text-secondary)" }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 12px", color: "var(--primary)" }} />
            <p style={{ fontSize: "13px" }}>{csvLoadProgress}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Search Bar */}
          <div style={{ display: "flex", gap: "8px", position: "relative" }}>
            <Search size={18} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search products or brands..."
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
              const priceA = prod.variants[0]?.listings[0]?.price || 0;
              const comparePriceA = prod.variants[0]?.listings[0]?.compareAtPrice || 0;
              const discount = comparePriceA > priceA 
                ? Math.round(((comparePriceA - priceA) / comparePriceA) * 100)
                : 0;

              // Image Priority retrieval with safe error fallback handler & CDN optimization
              const activeImageUrl = getOptimizedImageUrl(getProductImage(prod));

              // Stock Status checks
              const stock = prod.variants?.[0]?.listings?.[0]?.inventory?.quantity ?? prod.variants?.[0]?.stock_quantity ?? 50;
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

                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                      <button
                        onClick={() => openProductDetails(prod)}
                        style={{
                          background: "rgba(167, 139, 250, 0.15)", border: "none",
                          color: "var(--primary)", cursor: "pointer",
                          width: "24px", height: "24px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        <Eye size={12} />
                      </button>
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
        />
      )}

      {/* Services Tab: Food Delivery & Mobility Rides */}
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
              onClick={() => setServicesSubTab("food")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: servicesSubTab === "food" ? "var(--primary)" : "transparent",
                color: "#fff",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
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
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: servicesSubTab === "mobility" ? "var(--primary)" : "transparent",
                color: "#fff",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              🚗 Mobility & Rides
            </button>
          </div>

          {servicesSubTab === "food" ? (
            <FoodPortal
              user={user}
              backendUrl={backendUrl}
              onBalanceUpdate={onBalanceUpdate}
              setGlobalSuccessMsg={setGlobalSuccessMsg}
              setGlobalErrorMsg={setGlobalErrorMsg}
            />
          ) : (
            <MobilityPortal
              user={user}
              backendUrl={backendUrl}
              onBalanceUpdate={onBalanceUpdate}
              setGlobalSuccessMsg={setGlobalSuccessMsg}
              setGlobalErrorMsg={setGlobalErrorMsg}
            />
          )}
        </div>
      )}
    </div>
  );
};
