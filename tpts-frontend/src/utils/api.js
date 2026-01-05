import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to requests and handle FormData properly
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If the request data is FormData, delete the Content-Type header
  // This allows the browser to automatically set the correct Content-Type
  // with the proper boundary parameter for multipart/form-data
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  // Add timestamp to GET requests to prevent caching
  if (config.method === "get") {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }

  return config;
});

export default apiClient;