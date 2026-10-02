# NEXUS Mobile & Web Frontend: App.tsx Decomposition Architecture & Plan

## 1. Executive Summary & Problem Analysis

`apps/mobile/src/App.tsx` is currently a **2,179-line monolithic "God Component"** (~93 KB). It manages:
- **60+ distinct `useState` hooks**
- **12 distinct domain feature flows**
- **Direct inline DOM rendering of complex modals, drawers, forms, and tables**
- **Mixed responsibilities**: Network communication, local mock state mutation, business validation, UI presentation, and routing.

This document defines the audited feature boundaries, state groupings, side effects, API interactions, and a non-breaking 5-stage decomposition roadmap.

---

## 2. Inventory of Monolith Responsibilities

### 2.1 State Groupings (Audited)

| State Cluster | Associated State Variables | Domain Responsibility |
|---|---|---|
| **Identity & Session** | `isAuthenticated`, `user`, `accessToken`, `authMode`, `activeLoginRole` | Authentication status, active JWT tokens, role switching (Consumer / Seller / Admin). |
| **Registration Form** | `regName`, `regMobile`, `regEmail`, `regAge`, `regDob`, `regAddress`, `regPincode`, `regDistrict`, `regState`, `regCountry`, `regBusinessName`, `regLocation`, `regBusinessType`, `regPassword`, `regConfirmPassword` | Full profile registration payload validation and dispatch. |
| **Password Recovery** | `forgotEmail`, `verificationCode`, `sentCode`, `newPassword`, `confirmNewPassword` | Multi-step OTP password reset flow. |
| **Catalog & Navigation** | `activeTab`, `products`, `categories`, `selectedCategory`, `selectedSubcategory`, `subcategories`, `searchQuery`, `sortBy`, `priceMin`, `priceMax`, `paginationLimit`, `totalProductsCount` | Shop catalog pagination, search query debouncing, multi-level category taxonomy. |
| **Product Inspection** | `selectedProduct`, `selectedVariant`, `selectedListing`, `productDetailsReviews`, `reviewRating`, `reviewText` | Product detail modal, variant switcher, seller comparison matrix, verified customer reviews. |
| **Cart & Commerce** | `cart`, `showCartDrawer`, `showCheckoutConfirmation`, `checkoutPin` | Persistent server-backed cart, quantity mutation, PIN-protected multi-seller checkout saga. |
| **Wishlist** | `wishlist`, `showWishlistDrawer` | User saved item toggling and sync. |
| **Buy Now Fast-Track** | `showBuyNowConfirmation`, `buyNowListing`, `buyNowName`, `buyNowPhone`, `buyNowAddress`, `buyNowPincode`, `buyNowState`, `buyNowCountry`, `buyNowPin` | Instant direct purchase bypass without cart mutation. |
| **Seller Dashboard** | `sellerTab`, `sellTitle`, `sellDescription`, `sellSku`, `sellPrice`, `sellStock`, `sellImageUrl`, `sellFolder` | Merchant catalog listing creator with Cloudinary unsigned image uploads. |
| **Admin Dashboard** | `adminTab`, `firebaseUsersList`, `newAdminEmail`, `newAdminPass` | User directory management, admin provisioning, pending product moderation approval. |
| **Open Food Facts** | `barcodeInput`, `handleIngestOFF` | Barcode scanning and external catalog ingestion. |
| **Global Feedback** | `errorMsg`, `successMsg`, `isLoading`, `showProfileModal` | Toast alerts, network activity spinners, profile editor overlay. |

---

## 3. Target Modular Architecture

```
apps/mobile/src/
 ├── components/
 │    ├── common/
 │    │    ├── ToastAlert.tsx
 │    │    ├── LoadingSpinner.tsx
 │    │    └── ModalBackdrop.tsx
 │    ├── navigation/
 │    │    ├── BottomTabBar.tsx
 │    │    └── HeaderBar.tsx
 │    ├── modals/
 │    │    ├── ProductDetailsModal.tsx
 │    │    ├── CartDrawer.tsx
 │    │    ├── WishlistDrawer.tsx
 │    │    ├── CheckoutPinModal.tsx
 │    │    ├── BuyNowModal.tsx
 │    │    └── ProfileModal.tsx
 ├── features/
 │    ├── auth/
 │    │    ├── AuthContainer.tsx
 │    │    ├── LoginForm.tsx
 │    │    ├── RegisterForm.tsx
 │    │    ├── ForgotPasswordForm.tsx
 │    │    └── useAuth.ts
 │    ├── shop/
 │    │    ├── ShopScreen.tsx
 │    │    ├── SearchBar.tsx
 │    │    ├── CategoryBar.tsx
 │    │    ├── FilterDrawer.tsx
 │    │    ├── ProductCard.tsx
 │    │    └── useCatalog.ts
 │    ├── cart/
 │    │    ├── useCart.ts
 │    │    └── CartItemRow.tsx
 │    ├── wishlist/
 │    │    └── useWishlist.ts
 │    ├── seller/
 │    │    ├── SellerPortal.tsx
 │    │    ├── AddListingForm.tsx
 │    │    └── useSellerCatalog.ts
 │    ├── admin/
 │    │    ├── AdminPortal.tsx
 │    │    ├── UserManagementTab.tsx
 │    │    └── ProductModerationTab.tsx
 │    └── wallet/
 │         ├── WalletScreen.tsx
 │         └── useWallet.ts
 ├── context/
 │    ├── AuthContext.tsx
 │    ├── CartContext.tsx
 │    └── CatalogContext.tsx
 ├── services/
 │    ├── api.client.ts
 │    ├── auth.api.ts
 │    ├── commerce.api.ts
 │    └── cloudinary.service.ts
 ├── types/
 │    └── index.ts
 └── App.tsx (Root Shell < 120 lines)
```

---

## 4. Phased Decomposition Plan

### Stage 1: API Client Extraction (Zero UI Risk)
- Move raw `fetch()` calls out of `App.tsx` into typed service modules (`services/commerce.api.ts`, `services/auth.api.ts`).
- Standardize error handling and authentication token injection via Axios/Fetch interceptor wrapper.

### Stage 2: Context State Providers (State Decoupling)
- Extract `AuthContext` (`user`, `accessToken`, `login`, `logout`, `roleSwitch`).
- Extract `CartContext` (`cart`, `addToCart`, `updateQuantity`, `removeFromCart`, `checkout`).
- Extract `CatalogContext` (`products`, `categories`, `searchQuery`, `sortBy`, `priceMin`, `priceMax`).

### Stage 3: Modal & Drawer Component Extraction
- Extract `ProductDetailsModal.tsx` (removes ~200 lines from `App.tsx`).
- Extract `CartDrawer.tsx` and `WishlistDrawer.tsx` (removes ~180 lines).
- Extract `BuyNowModal.tsx` and `CheckoutPinModal.tsx` (removes ~160 lines).
- Extract `ProfileModal.tsx` (removes ~100 lines).

### Stage 4: Feature View Isolation
- Move `SellerPortal` and `AdminPortal` sub-components into dedicated feature folders.
- Move Login / Register / Forgot Password forms into `features/auth/`.

### Stage 5: App Shell Consolidation
- Reduce `App.tsx` to route-matching container (~100 lines) with top-level Context Providers and Tab Navigation.

---

## 5. Non-Breaking Safety Invariants
1. **No Data Loss**: Cart, wishlist, and session states must remain synchronized across tab switches.
2. **Visual Parity**: All CSS classes (`glass-card`, `product-card`, `btn-primary`) and design tokens remain unchanged.
3. **Environment Switch**: Backend API base URL continues to resolve dynamically between `localhost:3000` and production HTTPS.
