import apiClient from "./api";

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = async () => {
  // Get token before clearing to check authentication
  const token = getToken();

  // Call backend logout to record the activity
  if (token) {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.warn("Backend logout failed:", error);
      // Continue with local logout even if backend fails
    }
  }

  // Clear local storage
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  // Redirect to login
  window.location.href = "/login";
};

// Synchronous version for places that can't await
export const logoutSync = () => {
  const token = getToken();

  // Fire API call (may not complete before redirect)
  if (token) {
    apiClient.post("/auth/logout").catch(() => { });
  }

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export const getUserType = () => {
  const user = getUser();
  return user?.userType || null;
};
