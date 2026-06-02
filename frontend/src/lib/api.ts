import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://emlakportfoyhavuzu.com/api";

const api = axios.create({
  baseURL: API_URL,
});

function getFriendlyErrorMessage(error: any) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage;
  }

  if (Array.isArray(serverMessage) && serverMessage.length > 0) {
    return serverMessage.join(" ");
  }

  if (status === 413) {
    return [
      "Yüklediğiniz görsel dosyası çok büyük.",
      "Lütfen daha düşük boyutlu bir görsel yükleyiniz.",
      "Önerilen sınır: Her görsel en fazla 10 MB olmalıdır.",
      "Telefonla çekilen yüksek çözünürlüklü fotoğrafları yüklemeden önce kırpabilir veya dosya boyutunu küçültebilirsiniz.",
    ].join(" ");
  }

  if (status === 400) {
    return "Girdiğiniz bilgilerde eksik veya hatalı alan var. Lütfen zorunlu alanları kontrol edip tekrar deneyiniz.";
  }

  if (status === 401) {
    return "Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapıp işlemi yeniden deneyiniz.";
  }

  if (status === 403) {
    return "Bu işlemi yapmak için yetkiniz bulunmuyor. Hesap rolünüzü veya portföy yetkinizi kontrol ediniz.";
  }

  if (status === 404) {
    return "İşlem yapılacak kayıt bulunamadı. Sayfayı yenileyip tekrar deneyiniz.";
  }

  if (status === 409) {
    return "Bu kayıt daha önce oluşturulmuş olabilir. Lütfen bilgileri kontrol edip tekrar deneyiniz.";
  }

  if (status === 422) {
    return "Girilen bilgiler sistem kurallarına uygun değil. Lütfen alanları kontrol edip tekrar deneyiniz.";
  }

  if (status && status >= 500) {
    return "Sunucu tarafında geçici bir hata oluştu. Lütfen birkaç dakika sonra tekrar deneyiniz.";
  }

  if (!error?.response) {
    return "Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyiniz.";
  }

  return "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyiniz.";
}

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
    const friendlyMessage = getFriendlyErrorMessage(error);

    if (error?.response) {
      error.response.data = {
        ...(typeof error.response.data === "object" && error.response.data !== null
          ? error.response.data
          : {}),
        message: friendlyMessage,
      };
    } else {
      error.message = friendlyMessage;
    }

    return Promise.reject(error);
  }
);

export default api;