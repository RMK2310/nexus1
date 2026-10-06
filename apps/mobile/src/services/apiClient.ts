/**
 * NEXUS Resilient API & Authentication Client
 * - Manages JWT access and refresh token lifecycle
 * - Automatically intercepts 401 Unauthorized responses to perform transparent token renewal
 * - Recovers sessions and dispatches events for seamless UI synchronization
 */

export const getBackendUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:3000";
  const custom = localStorage.getItem("nexus_backend_url");
  if (custom) return custom.replace(/\/+$/, "");

  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const isNative =
    (window as any).Capacitor?.isNativePlatform?.() ||
    window.location.protocol === "capacitor:" ||
    window.location.origin.includes("https://localhost");

  if (isNative) {
    return "https://nexus-backend-7n5v.onrender.com";
  }

  return "https://nexus-backend-7n5v.onrender.com";
};

export const BACKEND_URL = getBackendUrl();

export const getAccessToken = (): string | null => {
  return localStorage.getItem("nexus_access_token");
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem("nexus_refresh_token");
};

export const getStoredUser = (): any | null => {
  try {
    const raw = localStorage.getItem("nexus_logged_in_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthSession = (
  accessToken?: string | null,
  refreshToken?: string | null,
  user?: any
) => {
  if (accessToken) {
    localStorage.setItem("nexus_access_token", accessToken);
  }
  if (refreshToken) {
    localStorage.setItem("nexus_refresh_token", refreshToken);
  }
  if (user) {
    localStorage.setItem("nexus_logged_in_user", JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_refresh_token");
  localStorage.removeItem("nexus_logged_in_user");
};

// Concurrency mutex for refresh token requests
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (
  backendUrl = BACKEND_URL
): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuthSession();
        window.dispatchEvent(new CustomEvent("nexus_session_expired"));
        return null;
      }

      const json = await res.json();
      if (json.success && json.data?.accessToken) {
        const newAccess = json.data.accessToken;
        const newRefresh = json.data.refreshToken || refreshToken;
        setAuthSession(newAccess, newRefresh);
        window.dispatchEvent(
          new CustomEvent("nexus_token_refreshed", {
            detail: { accessToken: newAccess },
          })
        );
        return newAccess;
      }
      return null;
    } catch (err) {
      console.warn("Silent token refresh failed:", err);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Robust fetch wrapper that attaches Authorization header and automatically
 * retries the request with a fresh token if a 401 Unauthorized is returned.
 */
export const authFetch = async (
  url: string,
  options: AuthFetchOptions = {},
  backendUrl = BACKEND_URL
): Promise<Response> => {
  let token = getAccessToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization") && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // Handle 401 by attempting transparent token refresh & retry
  if (response.status === 401 && !options.skipAuth) {
    console.warn("[NEXUS] Received 401 Unauthorized. Attempting silent token renewal...");
    const newToken = await refreshAccessToken(backendUrl);

    if (newToken) {
      console.info("[NEXUS] Token renewed successfully. Retrying request...");
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers: retryHeaders });
    } else {
      console.warn("[NEXUS] Token renewal failed.");
      if (token && !token.startsWith("simulated-")) {
        clearAuthSession();
        window.dispatchEvent(new CustomEvent("nexus_session_expired"));
      }
    }
  }

  return response;
};

/**
 * Validate current session on startup. Returns validated user data or null.
 */
export const validateSessionOnBoot = async (
  backendUrl = BACKEND_URL
): Promise<{ valid: boolean; user?: any; accessToken?: string }> => {
  const token = getAccessToken();
  const user = getStoredUser();

  if (!token || !user) {
    return { valid: false };
  }

  if (token.startsWith("simulated-firebase-token-")) {
    return { valid: true, user, accessToken: token };
  }

  try {
    const res = await authFetch(`${backendUrl}/api/v1/auth/me`, {}, backendUrl);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const updatedUser = {
          ...user,
          ...json.data,
          id: json.data.userId,
        };
        setAuthSession(getAccessToken()!, getRefreshToken(), updatedUser);
        return { valid: true, user: updatedUser, accessToken: getAccessToken()! };
      }
    }
    // If validation fails and refresh failed, clear session
    clearAuthSession();
    return { valid: false };
  } catch (err) {
    console.warn("Boot session verification error:", err);
    // Return stored user for offline resiliency if network fails
    return { valid: true, user, accessToken: token };
  }
};
