import React, { useState, useEffect, useRef, useMemo } from "react";
import { firebaseMock, UserProfile as FirebaseUserProfile } from "./firebaseMock";
import { LoginPage } from "./LoginPage";
import { CustomerPortal } from "./CustomerPortal";
import { SellerPortal } from "./SellerPortal";
import { AdminPortal } from "./AdminPortal";
import { ProductRepository } from "./services/productRepository";
import { RazorpayModal } from "./RazorpayModal";
import { WolfLoader, GlobalWolfLoader, triggerWolfLoad } from "./WolfLoader";
import {
  Home,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Grid,
  Lock,
  User,
  Shield,
  ArrowRight,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Tag,
  Star,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Heart,
  Eye,
  FileText,
  AlertCircle,
  Zap,
  CreditCard,
  Package,
  Truck
} from "lucide-react";
import { resolvePreciseProductImage } from "@nexus/shared";
import {
  authFetch,
  setAuthSession,
  clearAuthSession,
  validateSessionOnBoot,
  getBackendUrl,
  BACKEND_URL as DEFAULT_BACKEND_URL
} from "./services/apiClient";

const BACKEND_URL = getBackendUrl();

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "ddvwimzfr";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "nexus_preset";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  activeRole: string;
  roles: string[];
  walletBalance?: number;
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

interface Product {
  id: string;
  title: string;
  description: string;
  brand: Brand | null;
  category: Category;
  productType: string;
  ratingAvg: number;
  reviewCount: number;
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  attributes: string | null;
  imageUrl: string | null;
  listings: SellerListing[];
  dimensions: string;
  weight: string;
  material_composition: string;
  country_of_origin: string;
  warranty_information: string;
  price_basis: string;
  price_checked_date: string;
  image_source: string;
  image_alt_text: string;
  image_source_url: string;
  image_status: string;
  image_search_url: string;
  source_dataset: string;
  stock_quantity: number;
  availability_status: string;
}

interface SellerListing {
  id: string;
  price: number; // in cents
  compareAtPrice: number | null; // in cents
  currency: string;
  seller: {
    id: string;
    businessName: string;
  };
  inventory: {
    quantity: number;
  } | null;
}

interface CartItem {
  id: string;
  quantity: number;
  sellerListing: {
    id: string;
    price: number;
    compareAtPrice: number | null;
    seller: { businessName: string };
    productVariant: {
      id?: string;
      name: string;
      imageUrl: string | null;
      product: { title: string };
    };
  };
}

interface WishlistItem {
  id: string;
  sellerListing: {
    id: string;
    price: number;
    seller: { businessName: string };
    productVariant: {
      name: string;
      imageUrl: string | null;
      product: { title: string };
    };
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "shop" | "chat" | "wallet" | "services">("home");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [walletInitialAction, setWalletInitialAction] = useState<"send" | "topup" | null>(null);

  // Wolf Page Transition Loading State (1 second duration)
  const [pageTransitionLoading, setPageTransitionLoading] = useState<{
    active: boolean;
    message: string;
  } | null>(null);
  const pageTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNavigateWithWolf = (
    tab: "home" | "shop" | "chat" | "wallet" | "services",
    customMessage?: string
  ) => {
    const labelMap: Record<string, string> = {
      home: "Opening Home...",
      shop: "Loading Marketplace...",
      chat: "Connecting Messages...",
      wallet: "Accessing Wallet...",
      services: "Loading Services...",
    };

    triggerWolfLoad(customMessage || labelMap[tab] || "Loading...", 1000);
    setActiveTab(tab);
  };

  // Catalog States
  const productRepoRef = useRef(new ProductRepository());
  const [isCsvLoaded, setIsCsvLoaded] = useState(false);
  const [csvLoadProgress, setCsvLoadProgress] = useState("Loading CSV Catalog...");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [paginationLimit, setPaginationLimit] = useState<number>(48);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  
  // Details Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedListing, setSelectedListing] = useState<SellerListing | null>(null);
  const [productDetailsReviews, setProductDetailsReviews] = useState<any[]>([]);

  // Persistent Cart & Wishlist States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Ingestion Barcode Input
  const [barcodeInput, setBarcodeInput] = useState<string>("");

  // Common UI Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Overlays
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);
  
  // Real-time Chat Notifications
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [activeNotificationToast, setActiveNotificationToast] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !BACKEND_URL) return;

    const checkNotifs = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/api/v1/messaging/notifications`, {}, BACKEND_URL);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setChatNotifications(json.data);
            if (json.data.length > 0) {
              const latest = json.data[0];
              setActiveNotificationToast((prev: any) => {
                if (!prev || prev.id !== latest.id) {
                  return latest;
                }
                return prev;
              });
            }
          }
        }
      } catch (e) {
        // silent background poll
      }
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, BACKEND_URL, activeTab]);
  
  // Razorpay Checkout State
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [razorpayCheckoutType, setRazorpayCheckoutType] = useState<"CART" | "BUY_NOW">("CART");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Firebase Multi-Role Auth states
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP" | "FORGOT_PASSWORD" | "VERIFY_CODE">("LOGIN");
  const [activeLoginRole, setActiveLoginRole] = useState<"CUSTOMER" | "SELLER" | "ADMIN">("CUSTOMER");
  
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
  const [sellImageUrl, setSellImageUrl] = useState("");
  const [sellFolder, setSellFolder] = useState("food_beverages/apple");

  // Review Input
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");

  // Profile and Buy Now overlay states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBuyNowConfirmation, setShowBuyNowConfirmation] = useState(false);
  const [placedOrderConfirmation, setPlacedOrderConfirmation] = useState<any | null>(null);
  const [buyNowListing, setBuyNowListing] = useState<any | null>(null);
  const [buyNowName, setBuyNowName] = useState("");
  const [buyNowPhone, setBuyNowPhone] = useState("");
  const [buyNowAddress, setBuyNowAddress] = useState("");
  const [buyNowPincode, setBuyNowPincode] = useState("");
  const [buyNowState, setBuyNowState] = useState("");
  const [buyNowCountry, setBuyNowCountry] = useState("");
  const [buyNowPin, setBuyNowPin] = useState("");

  // Action history logger helper
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

  // Direct media upload to Cloudinary using unsigned upload presets
  const handleCloudinaryUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const cleanSeller = ((user?.businessName || user?.name || "seller") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const keyword = sellFolder.split("/").pop() || "product";
      const filename = `${keyword}_${cleanSeller}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", `nexus1/${sellFolder}`);
      formData.append("public_id", filename);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to upload image to Cloudinary.");
      }

      setSellImageUrl(data.secure_url);
      setSuccessMsg("Image uploaded successfully to Cloudinary!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Cloudinary upload failed.");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Environment Flag
  const isProd = import.meta.env.PROD;

  // Initialize catalog and categories directly from Open Food Facts & Open Products Facts
  // Initialize catalog and categories directly from backend with local repository fallback
  useEffect(() => {
    const initCatalog = async () => {
      // 1. Instant optimistic restore from repository cache (0ms lag)
      const initialCats = productRepoRef.current.getCategories();
      if (initialCats.length > 0) {
        setCategories(initialCats.map(c => ({ id: c, name: c, parentId: null })));
        const initialProds = productRepoRef.current.queryProducts({
          search: "",
          category: "ALL",
          subcategory: "ALL",
          priceMin: 0,
          priceMax: 0,
          sortBy: "newest"
        });
        if (initialProds.length > 0) {
          setProducts(initialProds);
          setTotalProductsCount(initialProds.length);
          setIsCsvLoaded(true);
        }
      }

      // 2. Fetch categories and catalog from backend directly
      await fetchCategories();
      await fetchCatalog();
      setIsCsvLoaded(true);

      // 3. Optional background sync with external Open Facts if repository empty
      productRepoRef.current.loadLiveCatalog(BACKEND_URL).then(() => {
        setIsCsvLoaded(true);
      }).catch(() => {});
    };
    initCatalog();
  }, []);

  // Fetch catalog whenever search, category, subcategory, sort, price, or pagination changes
  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy, priceMin, priceMax, paginationLimit]);

  // Fetch Categories Hierarchy
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/categories`);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : (Array.isArray(json.data) ? json.data : (json.data?.categories || []));
        if (Array.isArray(list) && list.length > 0) {
          setCategories(list.map((cat: any) => ({
            id: typeof cat === "string" ? cat : cat.id || cat.name,
            name: typeof cat === "string" ? cat : cat.name,
            parentId: cat.parentId || null
          })));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend categories API failed, using local repository fallback:", err);
    }

    // Fallback
    const cats = productRepoRef.current.getCategories().map(cat => ({
      id: cat,
      name: cat,
      parentId: null
    }));
    setCategories(cats);
  };

  // Fetch Catalog Products with dynamic parameters (Environment-based Paginated API)
  const fetchCatalog = async () => {
    // 1. Fetch canonical catalog products from backend API
    try {
      const page = Math.floor(paginationLimit / 48);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "48",
        search: searchQuery || "",
        category: selectedCategory || "",
        subcategory: selectedSubcategory || "",
        minPrice: priceMin || "",
        maxPrice: priceMax || "",
        sort: sortBy || "newest"
      });

      const res = await fetch(`${BACKEND_URL}/api/products?${queryParams.toString()}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const prods = Array.isArray(result.data)
            ? result.data
            : (result.data?.products || []);
          const total = typeof result.data?.total === "number"
            ? result.data.total
            : prods.length;

          if (prods.length > 0) {
            if (page > 1) {
              setProducts(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newItems = prods.filter((p: any) => !existingIds.has(p.id));
                return [...prev, ...newItems];
              });
            } else {
              setProducts(prods);
            }
            setTotalProductsCount(total);
            setIsCsvLoaded(true);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Backend products API failed, using local repository fallback:", err);
    }

    // 2. Offline fallback only if backend fails
    const localFiltered = productRepoRef.current.queryProducts({
      search: searchQuery,
      category: selectedCategory || "ALL",
      subcategory: selectedSubcategory || "ALL",
      priceMin,
      priceMax,
      sortBy
    });
    if (localFiltered.length > 0) {
      setProducts(localFiltered);
      setTotalProductsCount(localFiltered.length);
    }
    setIsCsvLoaded(true);
  };

  // Fetch subcategories dynamically when selectedCategory changes (Instant 0ms + background sync)
  useEffect(() => {
    const fetchSubcategoriesList = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        return;
      }

      // 1. Instant optimistic subcategories from local repository
      const localSubs = productRepoRef.current.getSubcategoriesForCategory(selectedCategory);
      if (localSubs.length > 0) {
        setSubcategories(localSubs);
      }

      // 2. Background sync with backend
      try {
        const res = await fetch(`${BACKEND_URL}/api/categories/${encodeURIComponent(selectedCategory)}/subcategories`);
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json)
            ? json
            : (Array.isArray(json.data) ? json.data : []);
          if (Array.isArray(list) && list.length > 0) {
            setSubcategories(list.map((s: any) => typeof s === "string" ? s : s.name || s));
            return;
          }
        }
      } catch (err) {
        console.warn("Backend subcategories API failed, using local repository fallback:", err);
      }

      if (localSubs.length > 0) {
        setSubcategories(localSubs);
      }
    };
    fetchSubcategoriesList();
  }, [selectedCategory, isCsvLoaded]);

  // Helper to deduplicate cart items by seller listing id and consolidate quantities
  const deduplicateCartItems = (items: CartItem[]): CartItem[] => {
    if (!Array.isArray(items)) return [];
    const map = new Map<string, CartItem>();
    for (const item of items) {
      const listingId = item?.sellerListing?.id;
      if (!listingId) continue;
      const cleanQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      if (map.has(listingId)) {
        const existing = map.get(listingId)!;
        existing.quantity = (existing.quantity || 1) + cleanQty;
      } else {
        map.set(listingId, {
          ...item,
          quantity: cleanQty,
        });
      }
    }
    return Array.from(map.values());
  };

  // Synchronize cart state to React state and localStorage in 0ms
  const syncCart = (rawItems: CartItem[]) => {
    const cleaned = deduplicateCartItems(rawItems);
    setCart(cleaned);
    const emailKey = user?.email?.toLowerCase() || "guest";
    try {
      localStorage.setItem(`nexus_cart_${emailKey}`, JSON.stringify(cleaned));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
    return cleaned;
  };

  // Fetch Cart (persistent DB-backed)
  const fetchCart = async (token?: string) => {
    try {
      const activeToken = token || accessToken;
      if (!activeToken) return;
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/cart`, {}, BACKEND_URL);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        syncCart(data.data);
      }
    } catch (e) {
      console.error("Failed to load user cart:", e);
    }
  };

  // Fetch Wishlist
  const fetchWishlist = async (token?: string) => {
    try {
      const activeToken = token || accessToken;
      if (!activeToken) return;
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/wishlist`, {}, BACKEND_URL);
      const data = await res.json();
      if (res.ok && data.success) {
        setWishlist(data.data);
      }
    } catch (e) {
      console.error("Failed to load user wishlist:", e);
    }
  };

  // Fetch live wallet balance from backend DB
  const fetchWalletBalance = async (token?: string) => {
    try {
      const activeToken = token || accessToken;
      if (!activeToken) return;
      const res = await authFetch(`${BACKEND_URL}/api/v1/wallet`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      }, BACKEND_URL);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const balCents = json.data.balance;
          setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, walletBalance: balCents };
            setAuthSession(activeToken, null, updated);
            return updated;
          });
          if (user?.email) {
            firebaseMock.updateUserWallet(user.email, balCents);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch wallet balance:", e);
    }
  };

  // Helper to find listing from products catalog
  const findListing = (listingId: string) => {
    for (const p of products) {
      for (const v of p.variants) {
        const matched = v.listings.find((l: any) => l.id === listingId);
        if (matched) return { product: p, variant: v, listing: matched };
      }
    }
    return null;
  };

  // Add / Increment Item in Cart locally and synchronously
  const localAddToCart = (listingId: string) => {
    const found = findListing(listingId);
    if (!found) return;

    const existingIndex = cart.findIndex(item => item?.sellerListing?.id === listingId);
    let updatedCart = [...cart];
    if (existingIndex >= 0) {
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: (updatedCart[existingIndex].quantity || 1) + 1,
      };
    } else {
      updatedCart.push({
        id: "cart-item-" + Math.random().toString(36).substring(2, 9),
        userId: user?.id || "local-user",
        sellerListingId: listingId,
        quantity: 1,
        createdAt: new Date().toISOString(),
        sellerListing: {
          id: found.listing.id,
          price: found.listing.price,
          compareAtPrice: found.listing.compareAtPrice,
          currency: found.listing.currency || "INR",
          status: "ACTIVE",
          createdAt: (found.listing as any).createdAt,
          updatedAt: (found.listing as any).updatedAt,
          seller: found.listing.seller,
          productVariant: {
            id: found.variant.id,
            productId: found.product.id,
            sku: found.variant.sku,
            name: found.variant.name,
            imageUrl: found.variant.imageUrl,
            status: "ACTIVE",
            product: {
              id: found.product.id,
              title: found.product.title,
              description: found.product.description,
              status: "ACTIVE",
              productType: found.product.productType,
              createdAt: (found.product as any).createdAt,
              updatedAt: (found.product as any).updatedAt
            }
          }
        }
      } as any);
    }
    syncCart(updatedCart);
    if (user?.email) {
      logUserAction(user.email, `Added to Cart: ${found.product.title} (${found.variant.name})`);
    }
  };

  // Local fallback for Wishlist Additions
  const localAddToWishlist = (listingId: string) => {
    const found = findListing(listingId);
    if (!found || !user) return;
    
    if (wishlist.some(item => item.sellerListing.id === listingId)) return;
    
    const updatedWishlist = [...wishlist, {
      id: "wishlist-item-" + Math.random().toString(36).substring(2, 9),
      userId: user.id || "local-user",
      sellerListingId: listingId,
      createdAt: new Date().toISOString(),
      sellerListing: {
        id: found.listing.id,
        price: found.listing.price,
        compareAtPrice: found.listing.compareAtPrice,
        currency: found.listing.currency || "INR",
        status: "ACTIVE",
        createdAt: (found.listing as any).createdAt,
        updatedAt: (found.listing as any).updatedAt,
        seller: found.listing.seller,
        productVariant: {
          id: found.variant.id,
          productId: found.product.id,
          sku: found.variant.sku,
          name: found.variant.name,
          imageUrl: found.variant.imageUrl,
          status: "ACTIVE",
          product: {
            id: found.product.id,
            title: found.product.title,
            description: found.product.description,
            status: "ACTIVE",
            productType: found.product.productType,
            createdAt: (found.product as any).createdAt,
            updatedAt: (found.product as any).updatedAt
          }
        }
      }
    } as any];
    setWishlist(updatedWishlist);
    localStorage.setItem(`nexus_wishlist_${user.email.toLowerCase()}`, JSON.stringify(updatedWishlist));
    logUserAction(user.email, `Added to Wishlist: ${found.product.title} (${found.variant.name})`);
  };

  // Add Item to DB Cart with instant 0ms optimistic response
  const handleAddToCart = async (listingId: string) => {
    localAddToCart(listingId);
    const found = findListing(listingId);
    const title = found?.product?.title || "Item";
    setSuccessMsg(`Added "${title}" to cart!`);
    setTimeout(() => setSuccessMsg(null), 2000);

    if (!accessToken || accessToken.startsWith("simulated-firebase-token-")) {
      return;
    }

    try {
      await authFetch(`${BACKEND_URL}/api/v1/commerce/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sellerListingId: listingId, quantity: 1 }),
      }, BACKEND_URL);
    } catch (e: any) {
      console.warn("Backend add to cart sync warning (local state preserved):", e);
    }
  };

  // Add Item to DB Wishlist
  const handleAddToWishlist = async (listingId: string) => {
    if (!accessToken) return;
    if (accessToken.startsWith("simulated-firebase-token-")) {
      localAddToWishlist(listingId);
      setSuccessMsg("Item added to wishlist!");
      setTimeout(() => setSuccessMsg(null), 2000);
      return;
    }
    try {
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sellerListingId: listingId }),
      }, BACKEND_URL);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Item added to wishlist!");
        fetchWishlist();
        const found = findListing(listingId);
        if (found && user) {
          logUserAction(user.email, `Added to Wishlist: ${found.product.title} (${found.variant.name})`);
        }
        setTimeout(() => setSuccessMsg(null), 2000);
      } else {
        throw new Error(data.error?.message || "Failed to save to wishlist");
      }
    } catch (e: any) {
      console.warn("Backend add to wishlist failed, falling back to local storage:", e);
      localAddToWishlist(listingId);
      setSuccessMsg("Item added to wishlist!");
      setTimeout(() => setSuccessMsg(null), 2000);
    }
  };

  // Mutate Quantity in DB Cart with instant 0ms optimistic update
  const handleUpdateCartQuantity = async (listingId: string, currentQuantity: number, diff: number) => {
    const newQty = currentQuantity + diff;
    if (newQty <= 0) {
      handleRemoveFromCart(listingId);
      return;
    }

    const updated = cart.map(item =>
      item?.sellerListing?.id === listingId ? { ...item, quantity: newQty } : item
    );
    syncCart(updated);

    if (!accessToken || accessToken.startsWith("simulated-firebase-token-")) {
      return;
    }

    try {
      await authFetch(`${BACKEND_URL}/api/v1/commerce/cart/items/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: newQty }),
      }, BACKEND_URL);
    } catch (e) {
      console.warn("Backend update cart quantity warning (local state preserved):", e);
    }
  };

  // Remove from DB Cart with instant 0ms optimistic update
  const handleRemoveFromCart = async (listingId: string) => {
    const updated = cart.filter(item => item?.sellerListing?.id !== listingId);
    syncCart(updated);
    setSuccessMsg("Item removed from cart");
    setTimeout(() => setSuccessMsg(null), 2000);

    if (!accessToken || accessToken.startsWith("simulated-firebase-token-")) {
      return;
    }

    try {
      await authFetch(`${BACKEND_URL}/api/v1/commerce/cart/items/${listingId}`, {
        method: "DELETE",
      }, BACKEND_URL);
    } catch (e) {
      console.warn("Backend remove from cart warning (local state preserved):", e);
    }
  };

  // Clear entire cart with instant 0ms optimistic update
  const handleClearCart = async () => {
    syncCart([]);
    setSuccessMsg("Cart cleared successfully");
    setTimeout(() => setSuccessMsg(null), 2000);

    if (!accessToken || accessToken.startsWith("simulated-firebase-token-")) {
      return;
    }

    try {
      await authFetch(`${BACKEND_URL}/api/v1/commerce/cart`, {
        method: "DELETE",
      }, BACKEND_URL);
    } catch (e) {
      console.warn("Backend clear cart warning:", e);
    }
  };

  // Remove from DB Wishlist
  const handleRemoveFromWishlist = async (listingId: string) => {
    if (!accessToken) return;
    if (accessToken.startsWith("simulated-firebase-token-")) {
      const updatedWishlist = wishlist.filter(item => item.sellerListing.id !== listingId);
      setWishlist(updatedWishlist);
      localStorage.setItem(`nexus_wishlist_${user?.email.toLowerCase()}`, JSON.stringify(updatedWishlist));
      return;
    }
    try {
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/wishlist/${listingId}`, {
        method: "DELETE",
      }, BACKEND_URL);
      if (res.ok) {
        fetchWishlist();
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Ingest external food item barcode search (Open Food Facts integration)
  const handleIngestOFF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput || !accessToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcode: barcodeInput }),
      }, BACKEND_URL);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("External item ingested successfully into catalog!");
        setBarcodeInput("");
        fetchCatalog();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        throw new Error(data.message || "Ingestion failed");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Product Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !accessToken) return;
    try {
      const res = await authFetch(`${BACKEND_URL}/api/v1/commerce/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          rating: reviewRating,
          text: reviewText,
        }),
      }, BACKEND_URL);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Review submitted! Thank you.");
        setReviewText("");
        // Reload details to sync reviews list
        const updatedDetails = await fetch(`${BACKEND_URL}/api/v1/commerce/products/${selectedProduct.id}`);
        const updatedDetailsJson = await updatedDetails.json();
        if (updatedDetailsJson.success) {
          setProductDetailsReviews(updatedDetailsJson.data.reviews);
        }
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        throw new Error(data.error?.message || "Review submission failed.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Resolve Product Variant Images cleanly with precision fallback
  const resolveProductImage = (prod: any, varId?: string): string => {
    if (!prod) return "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80";
    const v = varId ? prod.variants?.find((x: any) => x.id === varId) : prod.variants?.[0];
    if (v?.imageUrl && (v.imageUrl.startsWith("http") || v.imageUrl.startsWith("/"))) {
      return v.imageUrl;
    }
    if (prod.imageUrl && (prod.imageUrl.startsWith("http") || prod.imageUrl.startsWith("/"))) {
      return prod.imageUrl;
    }
    const catName = prod.category?.name || "";
    const subcatName = (prod.category as any)?.parent?.name || catName;
    return resolvePreciseProductImage(prod.title || "", catName, subcatName, v?.imageUrl);
  };

  // Load detailed Product information modal (Environment-aware Product Details lookup)
  const openProductDetails = async (product: any) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/products/${product.id}`);
      if (res.ok) {
        const result = await res.json();
        const prod = result.success ? result.data : result;
        if (prod) {
          setSelectedProduct(prod);
          setProductDetailsReviews(prod.reviews || []);
          if (prod.variants && prod.variants.length > 0) {
            setSelectedVariant(prod.variants[0]);
            if (prod.variants[0].listings && prod.variants[0].listings.length > 0) {
              setSelectedListing(prod.variants[0].listings[0]);
            } else {
              setSelectedListing(null);
            }
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Backend product details fetch failed, trying local fallback:", err);
    }

    // Local fallback
    const repoProd = productRepoRef.current.getProductById(product.id);
    if (repoProd) {
      setSelectedProduct(repoProd as any);
      setProductDetailsReviews([]);
      if (repoProd.variants.length > 0) {
        setSelectedVariant(repoProd.variants[0] as any);
        if (repoProd.variants[0].listings.length > 0) {
          setSelectedListing(repoProd.variants[0].listings[0] as any);
        } else {
          setSelectedListing(null);
        }
      }
    }
  };

  // Switch product variant selections in modal
  const selectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    if (variant.listings.length > 0) {
      setSelectedListing(variant.listings[0]);
    } else {
      setSelectedListing(null);
    }
  };

  // Buy Now checkout handlers
  const handleOpenBuyNow = (listing: any) => {
    if (!user) return;
    setBuyNowListing(listing);
    setBuyNowName(user.name || "");
    setBuyNowPhone(user.mobileNumber || "");
    setBuyNowAddress(user.address || "");
    setBuyNowPincode(user.pincode || "");
    setBuyNowState(user.state || "");
    setBuyNowCountry(user.country || "");
    setShowBuyNowConfirmation(true);
  };

  const handleBuyNowCheckout = async () => {
    if (!buyNowListing || !user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (!buyNowName.trim() || !buyNowPhone.trim() || !buyNowAddress.trim() || !buyNowPincode.trim() || !buyNowState.trim() || !buyNowCountry.trim()) {
        throw new Error("Please verify and fill all required address fields.");
      }

      // Instead of doing direct internal checkout, we launch the Razorpay Checkout Modal
      setRazorpayCheckoutType("BUY_NOW");
      setShowRazorpayCheckout(true);
      setShowBuyNowConfirmation(false);
      
    } catch (err: any) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const syncCartToBackend = async () => {
    if (!accessToken || cart.length === 0) return;
    try {
      for (const item of cart) {
        const listingId = item.sellerListing.id;
        if (!listingId) continue;
        await authFetch(`${BACKEND_URL}/api/v1/commerce/cart/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sellerListingId: listingId, quantity: item.quantity || 1 }),
        }, BACKEND_URL).catch(() => {});
      }
      await fetchCart();
    } catch (e) {
      console.warn("Cart sync warning:", e);
    }
  };

  const handleCheckout = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    await syncCartToBackend();
    setIsLoading(false);
    setRazorpayCheckoutType("CART");
    setShowRazorpayCheckout(true);
    setShowCartDrawer(false);
  };

  const handleWalletCheckout = async () => {
    if (!accessToken || !user) return;
    if ((user.walletBalance || 0) < cartTotalCents) {
      setErrorMsg(`Insufficient wallet balance (₹${((user.walletBalance || 0) / 100).toFixed(2)}). Please top up or pay via Gateway.`);
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await syncCartToBackend();

      const res = await authFetch(
        `${BACKEND_URL}/api/v1/commerce/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: `chk_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            paymentMethod: "WALLET",
            items: cart.map(c => ({ sellerListingId: c.sellerListing.id, quantity: c.quantity || 1 })),
          }),
        },
        BACKEND_URL
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || "Checkout failed");
      }

      // Decrement wallet balance in local state and sync with backend
      const newBal = json.data?.newBalanceCents !== undefined
        ? json.data.newBalanceCents
        : Math.max(0, (user.walletBalance || 0) - cartTotalCents);
      const updatedUser = { ...user, walletBalance: newBal };
      setUser(updatedUser);
      setAuthSession(accessToken, null, updatedUser);
      firebaseMock.updateUserWallet(user.email, newBal);
      fetchWalletBalance();

      syncCart([]);
      if (accessToken) {
        authFetch(`${BACKEND_URL}/api/v1/commerce/cart`, { method: "DELETE" }, BACKEND_URL).catch(() => {});
      }
      fetchCatalog();
      setShowCartDrawer(false);

      // Trigger Amazon Order Placed & Tracking Confirmation
      setPlacedOrderConfirmation({
        orderId: json.data?.orderId || json.data?.id || `NEX-ORD-${Date.now().toString().slice(-6)}`,
        totalAmount: cartTotalCents,
        paymentMethod: "NEXUS Wallet Balance",
        itemsCount: cart.length,
        shippingAddress: user?.address || "Flat 402, NEXUS Heights, 100ft Road, Indiranagar, Bengaluru - 560038",
        estimatedDelivery: "Tomorrow by 8:00 PM",
      });

      // Record activity log
      try {
        const actKey = `nexus_actions_${user.email.toLowerCase()}`;
        const raw = localStorage.getItem(actKey);
        const actions = raw ? JSON.parse(raw) : [];
        actions.unshift({
          id: "act_" + Date.now(),
          text: `Purchased Cart Items #${(json.data?.orderId || json.data?.id || "").substring(0, 8)} (₹${(cartTotalCents / 100).toFixed(2)} debited from Wallet)`,
          timestamp: new Date().toLocaleTimeString(),
        });
        localStorage.setItem(actKey, JSON.stringify(actions.slice(0, 25)));
      } catch (e) {}

      setSuccessMsg(`🎉 Order placed successfully! ₹${(cartTotalCents / 100).toFixed(2)} debited from wallet. Order Ref: #${(json.data?.orderId || json.data?.id || "").substring(0, 8) || "NEXUS"}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete checkout with wallet.");
      setTimeout(() => setErrorMsg(null), 3500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRazorpayCheckoutSuccess = (details: any) => {
    setSuccessMsg(`Order placed successfully via ${details.paymentMethod}! Order Ref: ${details.orderId}`);
    
    // Decrement wallet balance on order checkout
    const orderCostCents = details.amountINR
      ? Math.round(details.amountINR * 100)
      : (details.totalAmount || cartTotalCents);

    const newBalCents = details.newBalanceINR !== undefined
      ? Math.round(details.newBalanceINR * 100)
      : Math.max(0, (user?.walletBalance ?? 0) - orderCostCents);

    if (user) {
      const updatedUser = { ...user, walletBalance: newBalCents };
      setUser(updatedUser);
      setAuthSession(accessToken, null, updatedUser);
      firebaseMock.updateUserWallet(user.email, newBalCents);
    }
    fetchWalletBalance();
    
    // Trigger Amazon Order Placed & Tracking Confirmation
    setPlacedOrderConfirmation({
      orderId: details.orderId || `NEX-ORD-${Date.now().toString().slice(-6)}`,
      totalAmount: orderCostCents,
      paymentMethod: details.paymentMethod || "Online Gateway (Razorpay)",
      itemsCount: cart.length || 1,
      shippingAddress: user?.address || "Flat 402, NEXUS Heights, 100ft Road, Indiranagar, Bengaluru - 560038",
      estimatedDelivery: "Tomorrow by 8:00 PM",
    });

    syncCart([]);
    setShowCartDrawer(false);

    // Clear selections and refresh
    if (razorpayCheckoutType === "CART") {
      syncCart([]);
      if (accessToken) {
        authFetch(`${BACKEND_URL}/api/v1/commerce/cart`, { method: "DELETE" }, BACKEND_URL).catch(() => {});
      }
      setShowCartDrawer(false);
    } else {
      setSelectedProduct(null);
    }

    // Record activity log
    try {
      const userEmail = user?.email || "customer";
      const actKey = `nexus_actions_${userEmail.toLowerCase()}`;
      const raw = localStorage.getItem(actKey);
      const actions = raw ? JSON.parse(raw) : [];
      actions.unshift({
        id: "act_" + Date.now(),
        text: `Order placed #${(details.orderId || "").substring(0, 8)} (${details.paymentMethod})`,
        timestamp: new Date().toLocaleTimeString(),
      });
      localStorage.setItem(actKey, JSON.stringify(actions.slice(0, 25)));
    } catch (e) {}
    
    fetchCatalog(); // Refresh catalog stock counts
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Session Handlers (using Firebase Authentication Simulation)
  const handleLogin = async (emailInput: string, passwordInput: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const email = emailInput.trim();
      const password = passwordInput.trim();
      let token: string | null = null;
      let refreshToken: string | null = null;
      let resolvedUser: any = null;

      // 1. Prioritize real backend JWT authentication
      try {
        const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const backendData = await backendRes.json();
        if (backendRes.ok && backendData.success && backendData.data?.accessToken) {
          token = backendData.data.accessToken;
          refreshToken = backendData.data.refreshToken || null;
          resolvedUser = {
            walletBalance: backendData.data.user.walletBalance ?? 50000,
            ...backendData.data.user,
            id: backendData.data.user.id,
            activeRole: backendData.data.user.activeRole || activeLoginRole,
            roles: backendData.data.user.roles || [activeLoginRole],
          };
        }
      } catch (backendErr) {
        console.warn("Backend auth login failed:", backendErr);
      }

      // 2. Firebase simulation sync & fallback
      const res = await firebaseMock.signIn(email, password, activeLoginRole);
      if (res.success && res.user) {
        if (!resolvedUser || !token) {
          resolvedUser = {
            walletBalance: 50000,
            ...res.user,
            id: res.user.uid,
            activeRole: res.user.role,
            roles: [res.user.role],
          };
          token = "simulated-firebase-token-" + res.user.uid;
        }

        setUser(resolvedUser as any);
        setAccessToken(token);
        setIsAuthenticated(true);
        setAuthSession(token, refreshToken, resolvedUser);
        setSuccessMsg(res.message || "Logged in successfully!");

        // Load local cart and wishlist state if any
        const localCart = localStorage.getItem(`nexus_cart_${email.toLowerCase()}`);
        if (localCart) {
          setCart(JSON.parse(localCart));
        } else {
          setCart([]);
        }
        const localWishlist = localStorage.getItem(`nexus_wishlist_${email.toLowerCase()}`);
        if (localWishlist) {
          setWishlist(JSON.parse(localWishlist));
        } else {
          setWishlist([]);
        }

        // Fetch cart, wishlist & live wallet balance with active token
        fetchCart(token);
        fetchWishlist(token);
        fetchWalletBalance(token);

        // Reset inputs
        setLoginEmail("");
        setLoginPassword("");

        // If Admin, load users list
        if (resolvedUser.activeRole === "ADMIN") {
          firebaseMock.getAllUsers(email).then(users => {
            setFirebaseUsersList(users);
          });
        }
      } else {
        setErrorMsg(res.message || "Invalid credentials.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed.");
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
        const list = await firebaseMock.getAllUsers(user.email);
        setFirebaseUsersList(list);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const res = await validateSessionOnBoot(BACKEND_URL);
      if (res.valid && res.user && res.accessToken) {
        setAccessToken(res.accessToken);
        setUser(res.user);
        setIsAuthenticated(true);
        fetchCart(res.accessToken);
        fetchWishlist(res.accessToken);
        fetchWalletBalance(res.accessToken);
        if (res.user.activeRole === "ADMIN") {
          firebaseMock.getAllUsers(res.user.email).then(users => {
            setFirebaseUsersList(users);
          });
        }
      } else {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    initSession();

    const handleTokenRefreshed = (e: any) => {
      if (e.detail?.accessToken) {
        setAccessToken(e.detail.accessToken);
      }
    };

    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setCart([]);
      setWishlist([]);
      setErrorMsg("Session expired. Please log in again.");
      setTimeout(() => setErrorMsg(null), 4000);
    };

    window.addEventListener("nexus_token_refreshed", handleTokenRefreshed);
    window.addEventListener("nexus_session_expired", handleSessionExpired);

    return () => {
      window.removeEventListener("nexus_token_refreshed", handleTokenRefreshed);
      window.removeEventListener("nexus_session_expired", handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchWalletBalance();
    }
  }, [activeTab, isAuthenticated, accessToken]);

  useEffect(() => {
    setPaginationLimit(48);
    fetchCatalog();
  }, [isCsvLoaded, selectedCategory, selectedSubcategory, sortBy, searchQuery, priceMin, priceMax]);

  const cartTotalCents = cart.reduce((acc, item) => acc + (item?.sellerListing?.price || 0) * (item.quantity || 1), 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      if (item?.sellerListing?.id) {
        map[item.sellerListing.id] = (map[item.sellerListing.id] || 0) + (item.quantity || 1);
      }
    }
    return map;
  }, [cart]);

  return (
    <div className="device-frame">
      <div className="device-notch"></div>
      <div className="home-indicator"></div>

      <div className="app-container">
        {/* Banner Alerts */}
        {errorMsg && (
          <div style={{
            position: "absolute", top: 40, left: 16, right: 16,
            background: "rgba(239, 68, 68, 0.95)", padding: "10px 14px",
            borderRadius: "10px", fontSize: "12px", zIndex: 140,
            backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <XCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={{
            position: "absolute", top: 40, left: 16, right: 16,
            background: "rgba(16, 185, 129, 0.95)", padding: "10px 14px",
            borderRadius: "10px", fontSize: "12px", zIndex: 140,
            backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Header */}
        <header style={{
          padding: "16px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <h1 style={{ fontSize: "20px", background: "linear-gradient(to right, #8B5CF6, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              NEXUS
            </h1>
            <p style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
              One App. Every Connection.
            </p>
          </div>
          {isAuthenticated && (
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <button
                onClick={() => setShowProfileModal(true)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
                title="View Profile"
              >
                <User size={18} />
              </button>

              <button
                onClick={() => setShowWishlistDrawer(true)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", position: "relative" }}
              >
                <Heart size={18} />
                {wishlist.length > 0 && (
                  <span style={{
                    position: "absolute", top: "-6px", right: "-6px",
                    background: "var(--error)", color: "#fff",
                    borderRadius: "50%", padding: "1px 4px", fontSize: "8px", fontWeight: "700"
                  }}>
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowCartDrawer(true)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", position: "relative" }}
              >
                <ShoppingBag size={18} />
                {cartItemsCount > 0 && (
                  <span style={{
                    position: "absolute", top: "-6px", right: "-6px",
                    background: "var(--primary)", color: "#fff",
                    borderRadius: "50%", padding: "1px 4px", fontSize: "8px", fontWeight: "700"
                  }}>
                    {cartItemsCount}
                  </span>
                )}
              </button>

              <button onClick={() => {
                clearAuthSession();
                setAccessToken(null);
                setUser(null);
                setCart([]);
                setWishlist([]);
                setShowProfileModal(false);
                setIsAuthenticated(false);
              }} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer" }}>
                <LogOut size={18} />
              </button>
            </div>
          )}
        </header>        {/* Scroll Area */}
        <div className="scroll-area">
          {!isAuthenticated ? (
            <LoginPage
              authMode={authMode}
              setAuthMode={setAuthMode}
              activeLoginRole={activeLoginRole}
              setActiveLoginRole={setActiveLoginRole}
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
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
          ) : (
            <>
              {/* If on home tab, render the role-specific portal home view */}
              {activeTab === "home" && (
                <>
                  {(user?.activeRole === "CUSTOMER" || user?.activeRole === "CONSUMER" || (user?.activeRole !== "SELLER" && user?.activeRole !== "ADMIN")) && (
                    <CustomerPortal
                      activeTab="home"
                      setActiveTab={setActiveTab}
                      onNavigateWithWolf={handleNavigateWithWolf}
                      user={user}
                      accessToken={accessToken}
                      backendUrl={BACKEND_URL}
                      onBalanceUpdate={(newBal) => {
                        setUser(prev => prev ? { ...prev, walletBalance: newBal } : null);
                      }}
                      setGlobalSuccessMsg={setSuccessMsg}
                      setGlobalErrorMsg={setErrorMsg}
                      categories={categories}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedSubcategory={selectedSubcategory}
                      setSelectedSubcategory={setSelectedSubcategory}
                      subcategories={subcategories}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      priceMin={priceMin}
                      setPriceMin={setPriceMin}
                      priceMax={priceMax}
                      setPriceMax={setPriceMax}
                      products={products}
                      displayedProducts={products.slice(0, paginationLimit)}
                      totalProductsCount={totalProductsCount}
                      displayedProductsCount={Math.min(products.length, paginationLimit)}
                      loadMoreProducts={() => setPaginationLimit(prev => prev + 48)}
                      onResetFilters={() => {
                        setSelectedCategory("");
                        setSelectedSubcategory("");
                        setSearchQuery("");
                        setSortBy("newest");
                        setPriceMin("");
                        setPriceMax("");
                      }}
                      getProductImage={resolveProductImage}
                      registerImageFailure={(varId) => {
                        if (isCsvLoaded && !isProd) {
                          productRepoRef.current.registerImageFailure(varId);
                        }
                      }}
                      validationStats={isProd ? null : productRepoRef.current.validationStats}
                      isCsvLoaded={isCsvLoaded}
                      csvLoadProgress={csvLoadProgress}
                      openProductDetails={openProductDetails}
                      onAddToCart={handleAddToCart}
                      onUpdateCartQuantity={handleUpdateCartQuantity}
                      cartQuantities={cartQuantities}
                      onOpenCart={() => setShowCartDrawer(true)}
                      cartItemsCount={cartItemsCount}
                      cartTotalCents={cartTotalCents}
                      barcodeInput={barcodeInput}
                      setBarcodeInput={setBarcodeInput}
                      handleIngestOFF={handleIngestOFF}
                      isLoading={isLoading}
                      onOpenSendMoney={() => {
                        setActiveTab("wallet");
                        setWalletInitialAction("send");
                      }}
                      onOpenAddFunds={() => {
                        setActiveTab("wallet");
                        setWalletInitialAction("topup");
                      }}
                      initialWalletAction={walletInitialAction}
                      onClearInitialWalletAction={() => setWalletInitialAction(null)}
                    />
                  )}
                  {user?.activeRole === "SELLER" && (
                    <SellerPortal
                      sellerTab={sellerTab}
                      setSellerTab={setSellerTab}
                      user={user}
                      products={products}
                      sellTitle={sellTitle}
                      setSellTitle={setSellTitle}
                      sellDescription={sellDescription}
                      setSellDescription={setSellDescription}
                      sellSku={sellSku}
                      setSellSku={setSellSku}
                      sellPrice={sellPrice}
                      setSellPrice={setSellPrice}
                      sellStock={sellStock}
                      setSellStock={setSellStock}
                      sellImageUrl={sellImageUrl}
                      setSellImageUrl={setSellImageUrl}
                      sellFolder={sellFolder}
                      setSellFolder={setSellFolder}
                      handleCloudinaryUpload={handleCloudinaryUpload}
                      setErrorMsg={setErrorMsg}
                      setSuccessMsg={setSuccessMsg}
                    />
                  )}
                  {user?.activeRole === "ADMIN" && (
                    <AdminPortal
                      adminTab={adminTab}
                      setAdminTab={setAdminTab}
                      firebaseUsersList={firebaseUsersList}
                      handleRemoveFirebaseUser={handleRemoveFirebaseUser}
                      newAdminEmail={newAdminEmail}
                      setNewAdminEmail={setNewAdminEmail}
                      newAdminPass={newAdminPass}
                      setNewAdminPass={setNewAdminPass}
                      handleCreateAdmin={handleCreateAdmin}
                    />
                  )}
                </>
              )}

              {/* If on any non-home tab, render the CustomerPortal's respective tab */}
              {activeTab !== "home" && (
                <CustomerPortal
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onNavigateWithWolf={handleNavigateWithWolf}
                  user={user}
                  accessToken={accessToken}
                  backendUrl={BACKEND_URL}
                  onBalanceUpdate={(newBal) => {
                    setUser(prev => prev ? { ...prev, walletBalance: newBal } : null);
                  }}
                  setGlobalSuccessMsg={setSuccessMsg}
                  setGlobalErrorMsg={setErrorMsg}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedSubcategory={selectedSubcategory}
                  setSelectedSubcategory={setSelectedSubcategory}
                  subcategories={subcategories}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  priceMin={priceMin}
                  setPriceMin={setPriceMin}
                  priceMax={priceMax}
                  setPriceMax={setPriceMax}
                  products={products}
                  displayedProducts={products.slice(0, paginationLimit)}
                  totalProductsCount={totalProductsCount}
                  displayedProductsCount={Math.min(products.length, paginationLimit)}
                  loadMoreProducts={() => setPaginationLimit(prev => prev + 48)}
                  onResetFilters={() => {
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setSearchQuery("");
                    setSortBy("newest");
                    setPriceMin("");
                    setPriceMax("");
                  }}
                  getProductImage={resolveProductImage}
                  registerImageFailure={(varId) => {
                    if (isCsvLoaded && !isProd) {
                      productRepoRef.current.registerImageFailure(varId);
                    }
                  }}
                  validationStats={isProd ? null : productRepoRef.current.validationStats}
                  isCsvLoaded={isCsvLoaded}
                  csvLoadProgress={csvLoadProgress}
                  openProductDetails={openProductDetails}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQuantity={handleUpdateCartQuantity}
                  cartQuantities={cartQuantities}
                  onOpenCart={() => setShowCartDrawer(true)}
                  cartItemsCount={cartItemsCount}
                  cartTotalCents={cartTotalCents}
                  barcodeInput={barcodeInput}
                  setBarcodeInput={setBarcodeInput}
                  handleIngestOFF={handleIngestOFF}
                  isLoading={isLoading}
                  onOpenSendMoney={() => {
                    setActiveTab("wallet");
                    setWalletInitialAction("send");
                  }}
                  onOpenAddFunds={() => {
                    setActiveTab("wallet");
                    setWalletInitialAction("topup");
                  }}
                  initialWalletAction={walletInitialAction}
                  onClearInitialWalletAction={() => setWalletInitialAction(null)}
                />
              )}
            </>
          )}
        </div>

        {/* Detailed Product Details Modal */}
        {selectedProduct && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.98)", zIndex: 125, display: "flex",
            flexDirection: "column", padding: "40px 16px 24px", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Product Information</h3>
              <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Image & Title */}
              <div style={{ width: "100%", height: "180px", borderRadius: "12px", background: "var(--border)", overflow: "hidden" }}>
                <img
                  src={resolveProductImage(selectedProduct, selectedVariant?.id)}
                  alt={selectedProduct.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = () => {
                      target.onerror = null;
                      target.src = "/images/products/fruits.jpg";
                    };
                    const cat = selectedProduct.category?.name || "";
                    const sub = (selectedProduct.category as any)?.parent?.name || cat;
                    target.src = resolvePreciseProductImage(selectedProduct.title || "", cat, sub);
                  }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div>
                <span style={{ fontSize: "10px", color: "var(--primary)", fontWeight: "600" }}>{selectedProduct.brand?.name || "Generic"}</span>
                <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "4px 0" }}>{selectedProduct.title}</h2>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{selectedProduct.description}</p>
              </div>

              {/* Variant Selectors */}
              <div>
                <h4 style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>CHOOSE VARIANT</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedProduct.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v)}
                      className={selectedVariant?.id === v.id ? "btn-primary" : "btn-secondary"}
                      style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "16px" }}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comparative Sellers Listings */}
              <div>
                <h4 style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>COMPARE SELLERS</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedVariant?.listings.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => setSelectedListing(list)}
                      className="glass-card"
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", border: selectedListing?.id === list.id ? "1px solid var(--secondary)" : "1px solid var(--border)"
                      }}
                    >
                      <div>
                        <h5 style={{ fontSize: "12px", fontWeight: "600" }}>{list.seller.businessName}</h5>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Stock remaining: {list.inventory?.quantity ?? 0} units</span>
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--secondary)" }}>₹{(list.price / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedVariant?.listings.length === 0 && (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>No sellers offering this variant currently.</p>
                  )}
                </div>
              </div>

              {/* Specifications Grid */}
              {selectedVariant && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "4px" }}>
                  <h4 style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase" }}>SPECIFICATIONS</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                    {selectedVariant.sku && <div>SKU: <strong style={{ color: "#fff" }}>{selectedVariant.sku}</strong></div>}
                    {selectedVariant.dimensions && <div>Dimensions: <strong style={{ color: "#fff" }}>{selectedVariant.dimensions}</strong></div>}
                    {selectedVariant.weight && <div>Weight: <strong style={{ color: "#fff" }}>{selectedVariant.weight}</strong></div>}
                    {selectedVariant.material_composition && <div>Material: <strong style={{ color: "#fff" }}>{selectedVariant.material_composition}</strong></div>}
                    {selectedVariant.country_of_origin && <div>Origin: <strong style={{ color: "#fff" }}>{selectedVariant.country_of_origin}</strong></div>}
                    {selectedVariant.warranty_information && <div>Warranty: <strong style={{ color: "#fff" }}>{selectedVariant.warranty_information}</strong></div>}
                    {selectedVariant.price_basis && <div>Price Basis: <strong style={{ color: "#fff" }}>{selectedVariant.price_basis}</strong></div>}
                    {selectedVariant.source_dataset && <div>Source Dataset: <strong style={{ color: "#fff" }}>{selectedVariant.source_dataset}</strong></div>}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedListing && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleAddToWishlist(selectedListing.id)}>
                      <Heart size={16} /> Wishlist
                    </button>
                    <button className="btn-primary" style={{ flex: 2 }} onClick={() => handleAddToCart(selectedListing.id)}>
                      Add to Cart
                    </button>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ width: "100%", background: "linear-gradient(135deg, #10B981, #059669)", borderColor: "#10B981", fontWeight: "700" }}
                    onClick={() => handleOpenBuyNow(selectedListing)}
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              )}

              {/* Reviews & Submit */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "10px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px" }}>Customer Reviews</h4>
                
                {/* Submit review */}
                <form onSubmit={handleSubmitReview} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Rating:</span>
                    <select
                      className="text-input"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(parseInt(e.target.value))}
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Write your product review here..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      style={{ flex: 1, padding: "8px 12px" }}
                      required
                    />
                    <button type="submit" className="btn-primary" style={{ padding: "8px 12px" }}>
                      Post
                    </button>
                  </div>
                </form>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {productDetailsReviews.map((rev) => (
                    <div key={rev.id} style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border)", padding: "10px", borderRadius: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>{rev.user.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <Star size={10} color="#F59E0B" fill="#F59E0B" />
                          <span style={{ fontSize: "10px" }}>{rev.rating}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{rev.text}</p>
                      {rev.verifiedPurchase && (
                        <span style={{ fontSize: "8px", background: "rgba(16,185,129,0.15)", color: "var(--secondary)", padding: "2px 4px", borderRadius: "4px", display: "inline-block", marginTop: "4px" }}>
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  ))}
                  {productDetailsReviews.length === 0 && (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>No reviews for this product yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database-persisted Wishlist Drawer */}
        {showWishlistDrawer && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.95)", zIndex: 120, display: "flex",
            flexDirection: "column", padding: "40px 16px 24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px" }}>Your Saved Wishlist</h3>
              <button onClick={() => setShowWishlistDrawer(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {wishlist.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "40px" }}>Your wishlist is empty.</p>
              ) : (
                wishlist.map((item) => (
                  <div key={item.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: "600" }}>{item.sellerListing.productVariant.product.title}</h4>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.sellerListing.productVariant.name}</span>
                      <span style={{ fontSize: "11px", color: "var(--secondary)", display: "block", marginTop: "2px" }}>₹{(item.sellerListing.price / 100).toFixed(2)}</span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="btn-primary" style={{ padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => {
                          handleAddToCart(item.sellerListing.id);
                          handleRemoveFromWishlist(item.sellerListing.id);
                        }}>
                        Move to Cart
                      </button>
                      <button onClick={() => handleRemoveFromWishlist(item.sellerListing.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Database-persisted Cart Drawer */}
        {showCartDrawer && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.96)", zIndex: 120, display: "flex",
            flexDirection: "column", padding: "40px 16px 24px",
            backdropFilter: "blur(12px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "18px", margin: 0, fontWeight: "700" }}>Your Shopping Cart</h3>
                {cart.length > 0 && (
                  <span style={{
                    fontSize: "11px",
                    background: "rgba(167, 139, 250, 0.2)",
                    border: "1px solid rgba(167, 139, 250, 0.4)",
                    color: "var(--primary)",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontWeight: "700"
                  }}>
                    {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    title="Clear entire cart"
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#F87171",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowCartDrawer(false)}
                  style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "4px" }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: "60px", color: "var(--text-muted)" }}>
                  <ShoppingBag size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Your cart is empty</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Add items from the store to see them here.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const unitPrice = item.sellerListing.price;
                  const itemSubtotal = unitPrice * item.quantity;
                  const prodImg = resolveProductImage(
                    item.sellerListing.productVariant.product,
                    item.sellerListing.productVariant.id
                  );
                  return (
                    <div
                      key={item.sellerListing.id}
                      className="glass-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "10px"
                      }}
                    >
                      <img
                        src={prodImg}
                        alt={item.sellerListing.productVariant.product.title}
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "#12121a",
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          margin: 0
                        }}>
                          {item.sellerListing.productVariant.product.title}
                        </h4>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>
                          {item.sellerListing.productVariant.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--secondary)" }}>
                            ₹{(itemSubtotal / 100).toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                              (₹{(unitPrice / 100).toFixed(2)} ea)
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: "0",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: "700"
                          }}
                          onClick={() => handleUpdateCartQuantity(item.sellerListing.id, item.quantity, -1)}
                          title="Decrease count"
                        >
                          -
                        </button>
                        <span style={{ fontSize: "12px", fontWeight: "800", minWidth: "16px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: "0",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: "700"
                          }}
                          onClick={() => handleUpdateCartQuantity(item.sellerListing.id, item.quantity, 1)}
                          title="Increase count"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.sellerListing.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "6px",
                            color: "#F87171",
                            cursor: "pointer",
                            width: "26px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: "3px"
                          }}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Total and Wallet Balance Preview */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "11px", display: "block" }}>Total Amount</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--secondary)" }}>₹{(cartTotalCents / 100).toFixed(2)}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px", display: "block" }}>NEXUS Wallet</span>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: (user?.walletBalance || 0) >= cartTotalCents ? "#10B981" : "#F59E0B"
                    }}>
                      ₹{((user?.walletBalance || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Primary: 1-Click Pay with Wallet */}
                <button
                  className="btn-primary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: (user?.walletBalance || 0) >= cartTotalCents
                      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                    boxShadow: (user?.walletBalance || 0) >= cartTotalCents
                      ? "0 4px 15px rgba(16, 185, 129, 0.35)"
                      : undefined
                  }}
                  onClick={handleWalletCheckout}
                  disabled={isLoading}
                >
                  <Zap size={16} />
                  <span>
                    {(user?.walletBalance || 0) >= cartTotalCents
                      ? "⚡ 1-Click Pay with NEXUS Wallet"
                      : "Pay with NEXUS Wallet"}
                  </span>
                </button>

                {/* Secondary: Pay via Razorpay Online Gateway */}
                <button
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: "10px",
                    color: "#38BDF8",
                    fontSize: "12px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={handleCheckout}
                >
                  <CreditCard size={15} />
                  <span>Pay via Online Gateway (UPI / Cards / Razorpay)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Buy Now Confirmation Overlay */}
        {showBuyNowConfirmation && buyNowListing && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.98)", zIndex: 130, display: "flex",
            flexDirection: "column", padding: "40px 16px 24px", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Confirm Direct Purchase</h3>
              <button onClick={() => setShowBuyNowConfirmation(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="glass-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Purchasing Product</span>
                <h4 style={{ fontSize: "14px", fontWeight: "700", marginTop: "2px" }}>{selectedProduct?.title}</h4>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Variant: {selectedVariant?.name} | Price: <strong style={{ color: "var(--secondary)" }}>₹{(buyNowListing.price / 100).toFixed(2)}</strong></p>
              </div>

              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "700", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>DELIVERY ADDRESS DETAILS</h4>
                
                <div className="input-group">
                  <span className="input-label">CONTACT NAME</span>
                  <input type="text" className="text-input" value={buyNowName} onChange={(e) => setBuyNowName(e.target.value)} />
                </div>
                <div className="input-group">
                  <span className="input-label">CONTACT PHONE</span>
                  <input type="text" className="text-input" value={buyNowPhone} onChange={(e) => setBuyNowPhone(e.target.value)} />
                </div>
                <div className="input-group">
                  <span className="input-label">DELIVERY STREET ADDRESS</span>
                  <input type="text" className="text-input" value={buyNowAddress} onChange={(e) => setBuyNowAddress(e.target.value)} />
                </div>
                <div className="input-group">
                  <span className="input-label">PINCODE</span>
                  <input type="text" className="text-input" value={buyNowPincode} onChange={(e) => setBuyNowPincode(e.target.value)} />
                </div>
                <div className="input-group">
                  <span className="input-label">STATE / PROVINCE</span>
                  <input type="text" className="text-input" value={buyNowState} onChange={(e) => setBuyNowState(e.target.value)} />
                </div>
                <div className="input-group">
                  <span className="input-label">COUNTRY</span>
                  <input type="text" className="text-input" value={buyNowCountry} onChange={(e) => setBuyNowCountry(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowBuyNowConfirmation(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleBuyNowCheckout} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="animate-spin" size={16} /> : "Proceed to Payment"}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Razorpay Modal for Checkout */}
        <RazorpayModal
          isOpen={showRazorpayCheckout}
          onClose={() => setShowRazorpayCheckout(false)}
          amount={razorpayCheckoutType === "CART" ? cartTotalCents / 100 : ((buyNowListing?.price || 0) / 100)}
          user={user}
          accessToken={accessToken}
          backendUrl={BACKEND_URL}
          paymentType="COMMERCE_CHECKOUT"
          buyNow={razorpayCheckoutType === "BUY_NOW" && buyNowListing ? {
            sellerListingId: buyNowListing.id,
            quantity: 1
          } : undefined}
          shippingAddress={{
            name: buyNowName || user?.name || "Alice Consumer",
            phone: buyNowPhone || user?.mobileNumber || "+919876543210",
            address: buyNowAddress || user?.address || "Flat 402, NEXUS Heights, Tech City",
            pincode: buyNowPincode || user?.pincode || "560100",
            state: buyNowState || user?.state || "Karnataka",
            country: buyNowCountry || user?.country || "India"
          }}
          cartItems={razorpayCheckoutType === "CART" ? cart.map(c => ({
            sellerListingId: c.sellerListing.id,
            quantity: c.quantity || 1
          })) : undefined}
          purposeTitle={razorpayCheckoutType === "CART" ? "NEXUS Cart Checkout" : `Buy Now: ${selectedProduct?.title}`}
          onPaymentSuccess={handleRazorpayCheckoutSuccess}
          onPaymentFailure={(msg) => setErrorMsg(msg)}
        />

        {/* Amazon Order Placed & Tracking Modal Overlay */}
        {placedOrderConfirmation && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.96)", zIndex: 150,
            display: "flex", flexDirection: "column", padding: "40px 16px 24px",
            overflowY: "auto"
          }}>
            <div style={{
              background: "#1E1E24",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "14px",
              padding: "24px 18px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                border: "2px solid #10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10B981",
                fontSize: "28px"
              }}>
                ✓
              </div>

              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: "0 0 4px" }}>
                  Order Placed, thank you!
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                  Confirmation has been sent to {user?.email}.
                </p>
              </div>

              {/* Amazon Order Details Box */}
              <div style={{
                width: "100%",
                background: "#232F3E",
                borderRadius: "10px",
                padding: "12px 14px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                border: "1px solid rgba(255, 153, 0, 0.2)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#A6A6A6" }}>Order ID</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff" }}>
                    #{placedOrderConfirmation.orderId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#A6A6A6" }}>Total Amount</span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#FF9900" }}>
                    ₹{(placedOrderConfirmation.totalAmount / 100).toFixed(2)} ({placedOrderConfirmation.paymentMethod})
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "#A6A6A6" }}>Guaranteed Delivery</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#10B981" }}>
                    {placedOrderConfirmation.estimatedDelivery}
                  </span>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "6px" }}>
                  <span style={{ fontSize: "9px", color: "#A6A6A6", textTransform: "uppercase" }}>Shipping Address</span>
                  <p style={{ fontSize: "11px", color: "#E5E7EB", margin: "2px 0 0" }}>
                    {placedOrderConfirmation.shippingAddress}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPlacedOrderConfirmation(null);
                    setActiveTab("home");
                  }}
                  style={{
                    width: "100%",
                    background: "#FFD814",
                    border: "1px solid #FCD200",
                    color: "#0F1111",
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(255, 216, 20, 0.3)"
                  }}
                >
                  <Package size={15} /> Track Your Package (Live Status)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlacedOrderConfirmation(null);
                    setActiveTab("shop");
                  }}
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: "11px", fontWeight: "600" }}
                >
                  Continue Shopping on Amazon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal Overlay */}
        {showProfileModal && user && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(3, 2, 5, 0.98)", zIndex: 130, display: "flex",
            flexDirection: "column", padding: "40px 16px 24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Account Profile</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "16px" }}>
              {/* Profile Card Header */}
              <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "12px", background: "linear-gradient(135deg, rgba(26,20,38,0.95), rgba(12,10,18,0.95))" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={24} color="#fff" />
                </div>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: "700" }}>{user.name}</h4>
                  <span style={{ fontSize: "10px", background: "rgba(167, 139, 250, 0.2)", color: "var(--primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                    {user.activeRole}
                  </span>
                </div>
              </div>

              {/* Wallet Ledger Info */}
              <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Ledger Balance</span>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", color: "var(--secondary)" }}>₹{((user.walletBalance ?? 0) / 100).toFixed(2)}</h3>
                </div>
                <Wallet size={24} color="var(--text-muted)" />
              </div>

              {/* Detail fields based on role */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "700", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>PROFILE DETAILS</h4>
                
                <div>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>EMAIL ADDRESS</span>
                  <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.email}</p>
                </div>
                <div>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>MOBILE / PHONE</span>
                  <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.mobileNumber || "Not Set"}</p>
                </div>

                {(user.activeRole === "CUSTOMER" || user.activeRole === "CONSUMER") && (
                  <>
                    {user.age && (
                      <div>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>AGE</span>
                        <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.age} Years</p>
                      </div>
                    )}
                    {user.dob && (
                      <div>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>DATE OF BIRTH</span>
                        <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.dob}</p>
                      </div>
                    )}
                    {user.address && (
                      <div>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>DELIVERY ADDRESS</span>
                        <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600", whiteSpace: "pre-line" }}>
                          {user.address}
                          {user.pincode && `\nPIN: ${user.pincode}`}
                          {user.district && `\nDistrict: ${user.district}`}
                          {user.state && `\nState: ${user.state}`}
                          {user.country && `\nCountry: ${user.country}`}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {user.activeRole === "SELLER" && (
                  <>
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>BUSINESS / COMPANY NAME</span>
                      <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.businessName || "Bob's Organic Market"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>BUSINESS TYPE</span>
                      <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.businessType || "Retail Groceries"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>BUSINESS LOCATION</span>
                      <p style={{ fontSize: "13px", color: "#F3F4F6", fontWeight: "600" }}>{user.location || "Indiranagar, Bengaluru"}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Log / Order History */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, minHeight: "150px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "700" }}>
                    {(user.activeRole === "CUSTOMER" || user.activeRole === "CONSUMER") ? "ORDER & ACTIVITY HISTORY" : "PERFORMED ACTIONS LOG"}
                  </h4>
                  {(user.activeRole === "CUSTOMER" || user.activeRole === "CONSUMER") && (
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        setActiveTab("home");
                      }}
                      style={{
                        background: "rgba(108, 92, 231, 0.2)",
                        border: "1px solid var(--primary)",
                        color: "#A29BFE",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      📦 Live Tracker
                    </button>
                  )}
                </div>
                
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(() => {
                    const key = `nexus_actions_${user.email.toLowerCase()}`;
                    const raw = localStorage.getItem(key);
                    const actions = raw ? JSON.parse(raw) : [];
                    if (actions.length === 0) {
                      return (
                        <div style={{ textAlign: "center", marginTop: "14px", padding: "8px" }}>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Your food orders, rides & purchases are tracked live in the Home dashboard.</p>
                          <button
                            onClick={() => {
                              setShowProfileModal(false);
                              setActiveTab("home");
                            }}
                            className="btn-primary"
                            style={{ fontSize: "11px", padding: "6px 12px", width: "auto" }}
                          >
                            📦 View Live Orders & Tracking
                          </button>
                        </div>
                      );
                    }
                    return actions.map((act: any) => (
                      <div key={act.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "8px 10px", borderRadius: "8px" }}>
                        <p style={{ fontSize: "11px", color: "#F3F4F6", fontWeight: "500", lineHeight: "1.4" }}>{act.text}</p>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>{act.timestamp}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating WhatsApp Notification Banner Toast */}
        {activeNotificationToast && activeTab !== "chat" && (
          <div
            style={{
              position: "fixed",
              top: "70px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 28px)",
              maxWidth: "400px",
              background: "linear-gradient(135deg, rgba(6, 78, 59, 0.96), rgba(15, 23, 42, 0.98))",
              border: "1px solid #10b981",
              boxShadow: "0 10px 25px rgba(0,0,0,0.6), 0 0 16px rgba(16, 185, 129, 0.35)",
              borderRadius: "14px",
              padding: "12px 14px",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              onClick={() => {
                setActiveTab("chat");
                setActiveNotificationToast(null);
                authFetch(`${BACKEND_URL}/api/v1/messaging/notifications/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: activeNotificationToast.conversationId }) }, BACKEND_URL);
              }}
              style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer", minWidth: 0 }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                💬
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ fontSize: "12px", color: "#fff" }}>{activeNotificationToast.senderName}</strong>
                  <span style={{ fontSize: "9px", background: "rgba(16, 185, 129, 0.25)", color: "#34d399", padding: "1px 5px", borderRadius: "4px", fontWeight: "700" }}>
                    NEXUS Direct Message
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#e2e8f0", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeNotificationToast.content}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}>
              <button
                onClick={() => {
                  setActiveTab("chat");
                  setActiveNotificationToast(null);
                  authFetch(`${BACKEND_URL}/api/v1/messaging/notifications/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: activeNotificationToast.conversationId }) }, BACKEND_URL);
                }}
                style={{
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Reply
              </button>
              <button
                onClick={() => setActiveNotificationToast(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "15px", padding: "2px 4px" }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        {isAuthenticated && (
          <nav style={{
            display: "flex", justifyContent: "space-around", padding: "12px 6px",
            borderTop: "1px solid var(--border)", background: "rgba(20, 18, 26, 0.95)",
            backdropFilter: "blur(10px)", zIndex: 98
          }}>
            <button onClick={() => handleNavigateWithWolf("home")} style={{ background: "none", border: "none", color: activeTab === "home" ? "var(--primary)" : "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px" }}>
              <Home size={18} />
              <span>Home</span>
            </button>
            {user?.activeRole !== "ADMIN" && (
              <button onClick={() => handleNavigateWithWolf("shop")} style={{ background: "none", border: "none", color: activeTab === "shop" ? "var(--primary)" : "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px" }}>
                <ShoppingBag size={18} />
                <span>Shop</span>
              </button>
            )}
            <button
              onClick={() => {
                handleNavigateWithWolf("chat");
                setActiveNotificationToast(null);
                authFetch(`${BACKEND_URL}/api/v1/messaging/notifications/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, BACKEND_URL);
              }}
              style={{
                background: "none",
                border: "none",
                color: activeTab === "chat" ? "var(--primary)" : "var(--text-secondary)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                fontSize: "10px",
                position: "relative",
              }}
            >
              <MessageSquare size={18} />
              {chatNotifications.length > 0 && activeTab !== "chat" && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "12px",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "8px",
                    fontWeight: "800",
                    width: "15px",
                    height: "15px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 8px rgba(239, 68, 68, 0.8)",
                  }}
                >
                  {chatNotifications.length}
                </span>
              )}
              <span>Chat</span>
            </button>
            <button onClick={() => handleNavigateWithWolf("wallet")} style={{ background: "none", border: "none", color: activeTab === "wallet" ? "var(--primary)" : "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px" }}>
              <Wallet size={18} />
              <span>Wallet</span>
            </button>
            <button onClick={() => handleNavigateWithWolf("services")} style={{ background: "none", border: "none", color: activeTab === "services" ? "var(--primary)" : "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px" }}>
              <Grid size={18} />
              <span>Services</span>
            </button>
          </nav>
        )}

        {/* Small Centered Cyber Wolf Loading Card (App-wide for every button activity & transition) */}
        <GlobalWolfLoader />
      </div>
    </div>
  );
}
