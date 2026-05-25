import axios from "axios";

const api = axios.create({
  baseURL: "http://94.73.180.181:3001",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const authStorage = localStorage.getItem("auth-storage");

    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem("auth-storage");
      }
    }
  }

  return config;
});

export default api;