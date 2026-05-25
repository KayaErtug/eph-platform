import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://emlakportfoyhavuzu.com/api";

const api = axios.create({
  baseURL: API_URL,
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error?.response) {
      return Promise.reject(
        new Error("Sunucu bağlantısı kurulamadı.")
      );
    }

    return Promise.reject(error);
  }
);

export default api;