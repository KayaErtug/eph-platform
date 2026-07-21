"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  AudioLines,
  BarChart3,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Mic,
  RefreshCcw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Target,
  Trash2,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

type LinaActionData = {
  customerId?: string;
  interestId?: string;
  crmUrl?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  draft?: Record<string, unknown>;
  [key: string]: unknown;
};

type Message = {
  role: "user" | "lina";
  text: string;
  action?: string;
  requiresConfirmation?: boolean;
  data?: LinaActionData;
};

type LinaPanelProps = {
  open?: boolean;
  onClose?: () => void;
};

type LinaChatResponse = {
  success?: boolean;
  message?: string;
  reply?: string;
  error?: string;
  action?: string;
  requiresConfirmation?: boolean;
  data?: LinaActionData;
};

type LinaEndOfDayChoice =
  | "OTUZ_GUN_KAYDET"
  | "KALICI_KAYDET"
  | "BUGUNU_SIL";

type LinaEndOfDayReview = {
  id: string;
  date: string;
  summary: string;
  sessionCount: number;
  conversationCount: number;
  choice: LinaEndOfDayChoice | null;
  status: string;
};

type LinaEndOfDayResponse = {
  available?: boolean;
  date?: string;
  review?: LinaEndOfDayReview | null;
  success?: boolean;
  message?: string;
  error?: string;
};

type QuickCommand = {
  title: string;
  desc: string;
  text: string;
  icon: ReactNode;
  color: string;
  bg: string;
};

const QUICK_COMMANDS: QuickCommand[] = [
  {
    title: "Portföy Oluştur",
    desc: "Adım adım yeni kayıt",
    text: "Lina, yeni bir emlak portföyü oluşturmak istiyorum. Bana adım adım sorular sor.",
    icon: <Building2 size={20} />,
    color: "#1557D6",
    bg: "#EAF2FF",
  },
  {
    title: "İlan Metni",
    desc: "Profesyonel açıklama",
    text: "Lina, elimdeki portföy için profesyonel ve etkileyici bir ilan açıklaması yazmama yardım et.",
    icon: <WandSparkles size={20} />,
    color: "#7C3AED",
    bg: "#F3EFFF",
  },
  {
    title: "Müşteri Analizi",
    desc: "Talebi değerlendir",
    text: "Lina, bir müşterinin talebini analiz edip bana nasıl dönüş yapmam gerektiğini söyle.",
    icon: <Users size={20} />,
    color: "#0F766E",
    bg: "#E8FBF6",
  },
  {
    title: "CRM Öncelikleri",
    desc: "Bugünkü işleri sırala",
    text: "Lina, CRM kayıtlarımı yorumlayıp bugün hangi müşterilere öncelik vermem gerektiğini söyle.",
    icon: <BarChart3 size={20} />,
    color: "#C2410C",
    bg: "#FFF3E8",
  },
  {
    title: "Fiyat Yorumu",
    desc: "Değer analizi başlat",
    text: "Lina, bir portföy için fiyat değerlendirmesi yapmama yardımcı ol.",
    icon: <Target size={20} />,
    color: "#BE123C",
    bg: "#FFF0F4",
  },
  {
    title: "Fırsatları Bul",
    desc: "Eşleşmeleri özetle",
    text: "Lina, benim için yeni fırsatları, eşleşen talepleri ve takip etmem gereken işleri özetle.",
    icon: <Star size={20} />,
    color: "#A16207",
    bg: "#FFF9E8",
  },
];

function createWelcomeMessage(name: string) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "günaydın" : hour < 18 ? "iyi günler" : "iyi akşamlar";

  return `Merhaba ${name}, ${greeting}. Size nasıl yardımcı olabilirim?`;
}

function getSafeUserName(user: unknown) {
  const maybeUser = user as {
    firstName?: string;
    name?: string;
    email?: string;
  } | null;

  return (
    maybeUser?.firstName ||
    maybeUser?.name ||
    maybeUser?.email?.split("@")[0]?.split(".")[0] ||
    "Profesyonel"
  );
}

function getAuthToken(user: unknown) {
  const maybeStore = useAuthStore.getState() as unknown as {
    token?: string;
    accessToken?: string;
    jwt?: string;
    authToken?: string;
  };

  const maybeUser = user as {
    token?: string;
    accessToken?: string;
    jwt?: string;
    authToken?: string;
  } | null;

  return (
    maybeStore?.token ||
    maybeStore?.accessToken ||
    maybeStore?.jwt ||
    maybeStore?.authToken ||
    maybeUser?.token ||
    maybeUser?.accessToken ||
    maybeUser?.jwt ||
    maybeUser?.authToken ||
    ""
  );
}

function getLinaChatEndpoints() {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const endpoints = [
    envBase ? `${envBase}/lina/chat` : "",
    "/api/lina/chat",
    "/lina/chat",
    "https://emlakportfoyhavuzu.com/api/lina/chat",
    isLocal ? "http://localhost:3001/lina/chat" : "",
  ].filter(Boolean);

  return Array.from(new Set(endpoints));
}

function getLinaMemoryEndpoints(path: string) {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const endpoints = [
    envBase ? `${envBase}${normalizedPath}` : "",
    `/api${normalizedPath}`,
    normalizedPath,
    `https://emlakportfoyhavuzu.com/api${normalizedPath}`,
    isLocal ? `http://localhost:3001${normalizedPath}` : "",
  ].filter(Boolean);

  return Array.from(new Set(endpoints));
}

export default function LinaPanel({
  open = true,
  onClose = () => {},
}: LinaPanelProps) {
  const { user, hasHydrated } = useAuthStore();
  const userName = getSafeUserName(user);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const didMountMessagesRef = useRef(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceRequestIdRef = useRef(0);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const voiceDetectedRef = useRef(false);
  const discardRecordingRef = useRef(false);

  const [imageOk, setImageOk] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "lina",
      text: createWelcomeMessage(userName),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeVoiceText, setActiveVoiceText] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [endOfDayReview, setEndOfDayReview] =
    useState<LinaEndOfDayReview | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState("");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  }, []);

  const latestLinaText = useMemo(() => {
    return [...messages]
      .reverse()
      .find((messageItem) => messageItem.role === "lina")?.text;
  }, [messages]);

  const conversationCount = Math.max(messages.length - 1, 0);

  useEffect(() => {
    if (!hasHydrated || !user) {
      return;
    }

    setMessages((currentMessages) => {
      if (
        currentMessages.length !== 1 ||
        currentMessages[0]?.role !== "lina" ||
        !currentMessages[0].text.includes("Size nasıl yardımcı olabilirim?")
      ) {
        return currentMessages;
      }

      const nextWelcomeMessage = createWelcomeMessage(userName);

      if (currentMessages[0].text === nextWelcomeMessage) {
        return currentMessages;
      }

      return [
        {
          role: "lina",
          text: nextWelcomeMessage,
        },
      ];
    });
  }, [hasHydrated, user, userName]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "48px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 48), 112)}px`;
  }, [input]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const viewport = window.visualViewport;

    const updateViewportHeight = () => {
      setViewportHeight(
        Math.round(viewport?.height || window.innerHeight),
      );
    };

    document.body.style.overflow = "hidden";
    updateViewportHeight();

    viewport?.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("scroll", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);

    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("scroll", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, [open]);

  const fetchEndOfDayReview = async () => {
    const token = getAuthToken(user);

    if (!token) {
      setEndOfDayReview(null);
      return;
    }

    setMemoryLoading(true);

    try {
      const endpoints = getLinaMemoryEndpoints(
        "/lina/memory/end-of-day",
      );
      let lastError = "";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          const raw = await response.text();
          let data: LinaEndOfDayResponse = {};

          try {
            data = raw
              ? (JSON.parse(raw) as LinaEndOfDayResponse)
              : {};
          } catch {
            data = { message: raw };
          }

          if (!response.ok) {
            lastError =
              data?.message ||
              data?.error ||
              `HTTP ${response.status}`;
            continue;
          }

          const review =
            data?.available &&
            data?.review &&
            data.review.status !== "TAMAMLANDI"
              ? data.review
              : null;

          setEndOfDayReview(review);
          setMemoryMessage("");
          return;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Gün sonu hafızası alınamadı.";
        }
      }

      throw new Error(lastError || "Gün sonu hafızası alınamadı.");
    } catch {
      setEndOfDayReview(null);
    } finally {
      setMemoryLoading(false);
    }
  };

  const saveEndOfDayChoice = async (
    choice: LinaEndOfDayChoice,
  ) => {
    const token = getAuthToken(user);

    if (!token || !endOfDayReview || memorySaving) {
      return;
    }

    setMemorySaving(true);
    setMemoryMessage("");

    try {
      const endpoints = getLinaMemoryEndpoints(
        "/lina/memory/end-of-day",
      );
      let lastError = "";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              choice,
              date: endOfDayReview.date,
            }),
          });

          const raw = await response.text();
          let data: LinaEndOfDayResponse = {};

          try {
            data = raw
              ? (JSON.parse(raw) as LinaEndOfDayResponse)
              : {};
          } catch {
            data = { message: raw };
          }

          if (!response.ok) {
            lastError =
              data?.message ||
              data?.error ||
              `HTTP ${response.status}`;
            continue;
          }

          setMemoryMessage(
            data?.message || "Hafıza tercihiniz kaydedildi.",
          );
          setEndOfDayReview(null);
          return;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Hafıza tercihi kaydedilemedi.";
        }
      }

      throw new Error(lastError || "Hafıza tercihi kaydedilemedi.");
    } catch (error) {
      setMemoryMessage(
        error instanceof Error
          ? error.message
          : "Hafıza tercihi kaydedilemedi.",
      );
    } finally {
      setMemorySaving(false);
    }
  };

  const ensureAudioContext = async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    const context =
      audioContextRef.current || new AudioContextConstructor();

    audioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  };

  const unlockAudioPlayback = async () => {
    try {
      const context = await ensureAudioContext();

      if (!context) {
        return;
      }

      const silentBuffer = context.createBuffer(1, 1, 22050);
      const silentSource = context.createBufferSource();

      silentSource.buffer = silentBuffer;
      silentSource.connect(context.destination);
      silentSource.start(0);
    } catch {
      return;
    }
  };

  const stopCurrentAudio = () => {
    voiceRequestIdRef.current += 1;

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {
        // Kaynak zaten sonlanmış olabilir.
      }

      audioSourceRef.current = null;
    }

    setSpeaking(false);
    setActiveVoiceText(null);
  };

  const clearRecordingMonitor = () => {
    if (recordingFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }

    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    analyserRef.current?.disconnect();
    analyserRef.current = null;
  };

  const stopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    clearRecordingMonitor();

    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    } else {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }

    setRecording(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetchEndOfDayReview();
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!didMountMessagesRef.current) {
      didMountMessagesRef.current = true;
      return;
    }

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 80);
  }, [messages, loading, open, recording, transcribing]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      stopRecording(true);

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  if (!open) {
    return null;
  }

  const callLinaBackend = async (
    text: string,
    history: Message[],
  ): Promise<LinaChatResponse> => {
    const token = getAuthToken(user);
    const endpoints = getLinaChatEndpoints();
    let lastError = "";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            sourceModule: "general",
            history: history.map((messageItem) => ({
              role: messageItem.role === "lina" ? "assistant" : "user",
              content: messageItem.text,
            })),
          }),
        });

        const raw = await response.text();
        let data: LinaChatResponse = {};

        try {
          data = raw ? (JSON.parse(raw) as LinaChatResponse) : {};
        } catch {
          data = { message: raw };
        }

        if (!response.ok) {
          lastError =
            data?.message ||
            data?.error ||
            `HTTP ${response.status}`;
          continue;
        }

        const reply = data?.message || data?.reply;

        if (reply?.trim()) {
          return {
            ...data,
            message: reply.trim(),
          };
        }

        lastError = "Lina boş cevap döndürdü.";
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : "Lina bağlantısı kurulamadı.";
      }
    }

    throw new Error(lastError || "Lina bağlantısı kurulamadı.");
  };

  const speakWithOpenAi = async (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    try {
      setVoiceError("");

      const context = await ensureAudioContext();

      if (!context) {
        setVoiceError("Bu cihaz Lina sesini desteklemiyor.");
        return;
      }

      stopCurrentAudio();

      const requestId = voiceRequestIdRef.current + 1;
      voiceRequestIdRef.current = requestId;
      setSpeaking(true);
      setActiveVoiceText(cleanText);

      const response = await fetch("/lina-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        if (voiceRequestIdRef.current === requestId) {
          setSpeaking(false);
          setActiveVoiceText(null);
          setVoiceError("Lina sesi şu anda üretilemedi.");
        }
        return;
      }

      const audioData = await response.arrayBuffer();

      if (voiceRequestIdRef.current !== requestId) {
        return;
      }

      const audioBuffer = await context.decodeAudioData(
        audioData.slice(0),
      );

      if (voiceRequestIdRef.current !== requestId) {
        return;
      }

      const source = context.createBufferSource();

      source.buffer = audioBuffer;
      source.playbackRate.value = 1;
      source.connect(context.destination);
      audioSourceRef.current = source;

      source.onended = () => {
        if (audioSourceRef.current === source) {
          audioSourceRef.current = null;
        }

        if (voiceRequestIdRef.current === requestId) {
          setSpeaking(false);
          setActiveVoiceText(null);
        }
      };

      source.start(0);
    } catch {
      setSpeaking(false);
      setActiveVoiceText(null);
      setVoiceError(
        "Lina'nın sesi otomatik başlatılamadı. Dinle düğmesine dokunun.",
      );
    }
  };

  const toggleMessageVoice = (text: string) => {
    if (speaking && activeVoiceText === text) {
      stopCurrentAudio();
      return;
    }

    void speakWithOpenAi(text);
  };

  const sendMessage = async (textFromVoice?: string) => {
    const text = (textFromVoice || input).trim();

    if (!text || loading || recording || transcribing) {
      return;
    }

    stopCurrentAudio();
    await unlockAudioPlayback();

    const newMessages: Message[] = [
      ...messages,
      {
        role: "user",
        text,
      },
    ];

    setMessages(newMessages);
    setInput("");
    setVoiceError("");
    setLoading(true);

    try {
      const response = await callLinaBackend(text, newMessages);
      const reply =
        response.message ||
        response.reply ||
        "Lina işlemi tamamladı ancak sonuç mesajı oluşturamadı.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "lina",
          text: reply,
          action: response.action,
          requiresConfirmation:
            response.requiresConfirmation ?? false,
          data: response.data,
        },
      ]);

      await speakWithOpenAi(reply);
      await fetchEndOfDayReview();
    } catch {
      const fallback =
        "Şu anda Lina'nın ana beyniyle bağlantı kurulamadı. Demo cevap üretmeyeceğim. Lütfen bağlantı ayarlarını kontrol ettikten sonra tekrar deneyin.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "lina",
          text: fallback,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (recording || transcribing || loading) {
      return;
    }

    try {
      setVoiceError("");
      stopCurrentAudio();
      await unlockAudioPlayback();

      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        setVoiceError("Bu cihaz ses kaydını desteklemiyor.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recordingStreamRef.current = stream;
      mediaRef.current = recorder;
      discardRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();
      lastVoiceAtRef.current = Date.now();
      voiceDetectedRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearRecordingMonitor();
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRef.current = null;

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }

        if (!chunks.length || !voiceDetectedRef.current) {
          setVoiceError(
            "Ses algılanamadı. Mikrofona dokunup tekrar konuşun.",
          );
          return;
        }

        const blobType =
          recorder.mimeType || mimeType || "audio/webm";
        const extension = blobType.includes("mp4") ? "m4a" : "webm";
        const audioBlob = new Blob(chunks, { type: blobType });
        const formData = new FormData();

        formData.append("audio", audioBlob, `audio.${extension}`);

        try {
          setTranscribing(true);

          const response = await fetch("/api/whisper", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json()) as {
            text?: string;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(
              data?.error || "Ses metne dönüştürülemedi.",
            );
          }

          const voiceText = data?.text?.trim();

          if (voiceText) {
            setTranscribing(false);
            await sendMessage(voiceText);
          } else {
            setVoiceError(
              "Ses anlaşılamadı. Lütfen tekrar deneyin.",
            );
          }
        } catch {
          setVoiceError("Ses metne dönüştürülemedi.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(250);
      setRecording(true);

      const context = await ensureAudioContext();

      if (context) {
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        const samples = new Uint8Array(analyser.fftSize);

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyserRef.current = analyser;

        const monitorVoice = () => {
          if (
            !mediaRef.current ||
            mediaRef.current.state === "inactive"
          ) {
            return;
          }

          analyser.getByteTimeDomainData(samples);

          let total = 0;

          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            total += normalized * normalized;
          }

          const volume = Math.sqrt(total / samples.length);
          const now = Date.now();

          if (volume > 0.025) {
            voiceDetectedRef.current = true;
            lastVoiceAtRef.current = now;
          }

          const recordingDuration =
            now - recordingStartedAtRef.current;
          const silenceDuration = now - lastVoiceAtRef.current;

          if (
            voiceDetectedRef.current &&
            recordingDuration > 1000 &&
            silenceDuration > 1300
          ) {
            stopRecording();
            return;
          }

          if (
            !voiceDetectedRef.current &&
            recordingDuration > 7000
          ) {
            stopRecording();
            return;
          }

          recordingFrameRef.current =
            window.requestAnimationFrame(monitorVoice);
        };

        recordingFrameRef.current =
          window.requestAnimationFrame(monitorVoice);
      }

      recordingTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 45000);
    } catch {
      setRecording(false);
      recordingStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
      recordingStreamRef.current = null;
      clearRecordingMonitor();
      setVoiceError("Mikrofon izni alınamadı.");
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
      return;
    }

    void startRecording();
  };

  const resetConversation = () => {
    stopCurrentAudio();
    stopRecording(true);

    setMessages([
      {
        role: "lina",
        text: createWelcomeMessage(userName),
      },
    ]);
    setInput("");
    setVoiceError("");
    setMemoryMessage("");
  };

  const focusComposer = () => {
    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 220);
  };

  return (
    <div
      className="lina-professional-shell fixed inset-x-0 top-0 z-[140] flex justify-center overflow-hidden bg-[#EAF1FB] text-[#0B1F45]"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : "100dvh",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="relative flex h-full w-full max-w-[760px] flex-col overflow-hidden bg-[#F7FAFE] shadow-[0_0_80px_rgba(15,23,42,0.16)]">
        <header className="relative z-30 shrink-0 border-b border-[#DCE7F4] bg-white/95 px-3 pb-2.5 pt-[calc(10px+env(safe-area-inset-top,0px))] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DCE7F4] bg-white text-[#0B1F45] shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition active:scale-95"
              aria-label="Lina ekranını kapat"
              title="Geri"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#CFE0F6] bg-[#EAF2FF]">
                {imageOk ? (
                  <img
                    src="/Lina.jpg"
                    alt="Lina"
                    onError={() => setImageOk(false)}
                    className="h-full w-full object-cover"
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#1557D6]">
                    <Bot size={22} />
                  </div>
                )}

                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="lina-title truncate !text-left text-base font-black tracking-[-0.02em] text-[#0B1F45]">
                  Lina Asistan
                </h1>
                <p className="lina-copy mt-0.5 flex items-center gap-1.5 !text-left text-[11px] font-bold text-[#61708A]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                  Çevrimiçi · Gerçek EPH verisi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetConversation}
              disabled={loading || transcribing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DCE7F4] bg-white text-[#52627A] shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Yeni sohbet başlat"
              title="Yeni sohbet"
            >
              <RefreshCcw size={18} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (speaking) {
                  stopCurrentAudio();
                  return;
                }

                if (latestLinaText) {
                  void speakWithOpenAi(latestLinaText);
                }
              }}
              disabled={!latestLinaText}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                speaking
                  ? "border-[#BFD4F4] bg-[#1557D6] text-white"
                  : "border-[#DCE7F4] bg-white text-[#1557D6]"
              }`}
              aria-label={
                speaking ? "Lina sesini durdur" : "Son Lina yanıtını dinle"
              }
              title={
                speaking ? "Sesi durdur" : "Son yanıtı dinle"
              }
            >
              {speaking ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3 [-webkit-overflow-scrolling:touch]">
          <section className="overflow-hidden rounded-[22px] border border-[#D6E4F5] bg-gradient-to-br from-white via-[#F7FAFF] to-[#EAF2FF] p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1557D6] text-white shadow-[0_8px_20px_rgba(21,87,214,0.22)]">
                <Sparkles size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="lina-copy !text-left text-sm font-black text-[#0B1F45]">
                  {greeting} {userName}
                </p>
                <p className="lina-copy mt-1 !text-left text-xs font-semibold leading-5 text-[#5E6D84]">
                  Portföy, CRM ve müşteri süreçlerinde yazabilir veya
                  konuşabilirsiniz. Veri yoksa sayı üretmeden açıkça söylerim.
                </p>
              </div>

              <div className="shrink-0 rounded-full border border-[#CFE0F6] bg-white px-2.5 py-1 text-[10px] font-black text-[#1557D6]">
                {conversationCount} mesaj
              </div>
            </div>
          </section>

          <section className="mt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="lina-section-title !text-left text-xs font-black uppercase tracking-[0.12em] text-[#61708A]">
                Hızlı Başlangıç
              </h2>
              <span className="text-[10px] font-bold text-[#8A98AC]">
                Kaydırarak seçin
              </span>
            </div>

            <div className="-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_COMMANDS.map((command) => (
                <button
                  key={command.title}
                  type="button"
                  onClick={() => void sendMessage(command.text)}
                  disabled={loading || recording || transcribing}
                  className="flex min-h-[72px] w-[176px] shrink-0 !justify-start gap-3 rounded-[20px] border border-[#DCE7F4] bg-white p-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      color: command.color,
                      backgroundColor: command.bg,
                    }}
                  >
                    {command.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="lina-copy block truncate !text-left text-xs font-black text-[#0B1F45]">
                      {command.title}
                    </span>
                    <span className="lina-copy mt-1 block !text-left text-[10px] font-semibold leading-4 text-[#748198]">
                      {command.desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {(endOfDayReview || memoryLoading || memoryMessage) && (
            <section className="mt-3 rounded-[22px] border border-[#D7E5F6] bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#1557D6]">
                  <Brain size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="lina-section-title !text-left text-sm font-black text-[#0B1F45]">
                    Gün Sonu Hafıza Onayı
                  </h2>

                  {memoryLoading && !endOfDayReview ? (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-[#6B7890]">
                      <Loader2 size={15} className="animate-spin" />
                      Özet hazırlanıyor…
                    </div>
                  ) : endOfDayReview ? (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F7FC] px-2.5 py-1 text-[10px] font-black text-[#52627A]">
                          <Clock3 size={12} />
                          {endOfDayReview.conversationCount} konuşma
                        </span>
                        <span className="rounded-full bg-[#F3F7FC] px-2.5 py-1 text-[10px] font-black text-[#52627A]">
                          {endOfDayReview.sessionCount} oturum
                        </span>
                      </div>

                      <p className="lina-copy mt-2 !text-left text-xs font-semibold leading-5 text-[#52627A]">
                        {endOfDayReview.summary}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>

              {endOfDayReview && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      void saveEndOfDayChoice("OTUZ_GUN_KAYDET")
                    }
                    disabled={memorySaving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(21,87,214,0.18)] disabled:opacity-50"
                  >
                    {memorySaving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Clock3 size={15} />
                    )}
                    30 Gün Kaydet
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void saveEndOfDayChoice("KALICI_KAYDET")
                    }
                    disabled={memorySaving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#F1D889] bg-[#FFF9E8] px-3 text-xs font-black text-[#8A6500] disabled:opacity-50"
                  >
                    <Star size={15} />
                    Kalıcı Kaydet
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void saveEndOfDayChoice("BUGUNU_SIL")
                    }
                    disabled={memorySaving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#F3CBCB] bg-[#FFF4F4] px-3 text-xs font-black text-[#B42318] disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Bugünü Sil
                  </button>
                </div>
              )}

              {memoryMessage && (
                <p className="mt-3 rounded-2xl bg-[#EEF5FF] px-3 py-2.5 text-xs font-black text-[#1557D6]">
                  {memoryMessage}
                </p>
              )}
            </section>
          )}

          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="lina-section-title !text-left text-xs font-black uppercase tracking-[0.12em] text-[#61708A]">
                Sohbet
              </h2>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE7F4] bg-white px-2.5 py-1 text-[10px] font-black text-[#61708A]">
                <ShieldCheck size={12} className="text-[#10B981]" />
                Güvenli oturum
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {messages.map((messageItem, index) => {
                const isLina = messageItem.role === "lina";
                const isActiveVoice =
                  speaking && activeVoiceText === messageItem.text;

                return (
                  <article
                    key={`${messageItem.role}-${index}`}
                    className={`flex ${
                      isLina ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-[22px] border px-3.5 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] sm:max-w-[82%] ${
                        isLina
                          ? "border-[#DCE7F4] bg-white text-[#0B1F45]"
                          : "border-[#1557D6] bg-[#1557D6] text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isLina ? (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EAF2FF] text-[#1557D6]">
                            {imageOk ? (
                              <img
                                src="/Lina.jpg"
                                alt=""
                                className="h-full w-full object-cover"
                                style={{ width: "100%", height: "100%" }}
                              />
                            ) : (
                              <Bot size={15} />
                            )}
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                            <UserRound size={15} />
                          </div>
                        )}

                        <span
                          className={`lina-copy !text-left text-[10px] font-black uppercase tracking-[0.1em] ${
                            isLina ? "text-[#61708A]" : "text-white/75"
                          }`}
                        >
                          {isLina ? "Lina" : "Siz"}
                        </span>
                      </div>

                      <p className="lina-copy mt-2 whitespace-pre-wrap !text-left text-sm font-semibold leading-6">
                        {messageItem.text}
                      </p>

                      {isLina && (
                        <div className="mt-2.5 border-t border-[#EDF2F8] pt-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              toggleMessageVoice(messageItem.text)
                            }
                            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-black transition active:scale-95 ${
                              isActiveVoice
                                ? "border-[#BFD4F4] bg-[#1557D6] text-white"
                                : "border-[#DCE7F4] bg-[#F7FAFE] text-[#1557D6]"
                            }`}
                          >
                            {isActiveVoice ? (
                              <VolumeX size={14} />
                            ) : (
                              <Volume2 size={14} />
                            )}
                            {isActiveVoice ? "Durdur" : "Dinle"}
                          </button>

                          {messageItem.requiresConfirmation &&
                            index === messages.length - 1 && (
                              <div className="mt-2.5 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void sendMessage("Kaydı Onayla")
                                  }
                                  disabled={loading}
                                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#059669] px-3 text-xs font-black text-white shadow-[0_7px_18px_rgba(5,150,105,0.18)] disabled:opacity-50"
                                >
                                  <CheckCircle2 size={15} />
                                  {messageItem.data?.confirmLabel ||
                                    "Kaydı Onayla"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void sendMessage("İptal Et")
                                  }
                                  disabled={loading}
                                  className="flex min-h-11 items-center justify-center rounded-xl border border-[#F0BDB8] bg-[#FFF3F2] px-3 text-xs font-black text-[#B42318] disabled:opacity-50"
                                >
                                  {messageItem.data?.cancelLabel ||
                                    "İptal Et"}
                                </button>
                              </div>
                            )}

                          {!messageItem.requiresConfirmation &&
                            Boolean(messageItem.data?.customerId) &&
                            (
                              messageItem.action ===
                                "crm_customer_create" ||
                              messageItem.action ===
                                "crm_customer_create_with_interest"
                            ) && (
                              <button
                                type="button"
                                onClick={() =>
                                  window.location.assign(
                                    messageItem.data?.crmUrl || "/crm",
                                  )
                                }
                                className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#BFD4F4] bg-[#EEF5FF] px-3 text-xs font-black text-[#1557D6]"
                              >
                                CRM’de Görüntüle
                                <ChevronRight size={15} />
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-3 rounded-[20px] border border-[#DCE7F4] bg-white px-4 py-3 text-xs font-black text-[#61708A] shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                    <div className="flex items-end gap-1">
                      {[0, 1, 2, 3].map((item) => (
                        <span
                          key={item}
                          className="block w-1 rounded-full bg-[#1557D6]"
                          style={{
                            height: `${8 + item * 3}px`,
                            animation: `wave 0.8s ease-in-out ${item * 0.12}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    Lina yanıt hazırlıyor…
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-px" />
            </div>
          </section>
        </main>

        <footer
          className="relative z-30 shrink-0 border-t border-[#DCE7F4] bg-white/96 px-3 pt-2.5 backdrop-blur-xl"
          style={{
            paddingBottom:
              "max(10px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {voiceError && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-[#F3CBCB] bg-[#FFF4F4] px-3 py-2.5 text-[#B42318]">
              <span className="lina-copy min-w-0 flex-1 !text-left text-xs font-black">
                {voiceError}
              </span>
              <button
                type="button"
                onClick={() => setVoiceError("")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#B42318]"
                aria-label="Ses uyarısını kapat"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {(recording || transcribing) && (
            <div
              className={`mb-2 rounded-2xl border px-3 py-2.5 ${
                recording
                  ? "border-[#F1C1C7] bg-[#FFF2F4]"
                  : "border-[#CFE0F6] bg-[#EEF5FF]"
              }`}
            >
              <div className="flex items-center gap-3">
                {recording ? (
                  <div className="flex h-9 items-end gap-1">
                    {[0, 1, 2, 3, 4].map((item) => (
                      <span
                        key={item}
                        className="block w-1 rounded-full bg-[#E11D48]"
                        style={{
                          height: `${9 + (item % 3) * 5}px`,
                          animation: `wave 0.72s ease-in-out ${item * 0.1}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Loader2
                    size={19}
                    className="shrink-0 animate-spin text-[#1557D6]"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={`lina-copy !text-left text-xs font-black ${
                      recording ? "text-[#BE123C]" : "text-[#1557D6]"
                    }`}
                  >
                    {recording
                      ? "Sizi dinliyorum"
                      : "Sesiniz yazıya çevriliyor"}
                  </p>
                  <p className="lina-copy mt-0.5 !text-left text-[10px] font-semibold text-[#728098]">
                    {recording
                      ? "Konuşmanız bittiğinde otomatik olarak gönderilir."
                      : "Lütfen birkaç saniye bekleyin."}
                  </p>
                </div>

                {recording && (
                  <button
                    type="button"
                    onClick={() => stopRecording()}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-3 text-xs font-black text-white"
                  >
                    <Square size={13} fill="currentColor" />
                    Bitir
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[22px] border border-[#C9D9ED] bg-[#F8FBFF] p-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition focus-within:border-[#8CB3EA] focus-within:ring-4 focus-within:ring-[#1557D6]/[0.08]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={focusComposer}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={recording || transcribing}
              rows={1}
              maxLength={4000}
              placeholder={
                recording
                  ? "Sizi dinliyorum…"
                  : transcribing
                    ? "Sesiniz işleniyor…"
                    : "Lina’ya mesajınızı yazın…"
              }
              className="lina-professional-input block min-h-12 max-h-28 w-full resize-none overflow-y-auto border-0 bg-transparent px-2.5 py-2.5 text-base font-semibold leading-6 text-[#0B1F45] outline-none placeholder:text-[#98A5B7] disabled:cursor-not-allowed disabled:opacity-55"
            />

            <div className="mt-1 flex items-center justify-between gap-2 border-t border-[#E2EBF5] pt-2">
              <div className="flex min-w-0 items-center gap-1.5 px-1">
                <AudioLines size={14} className="shrink-0 text-[#7C8BA0]" />
                <span className="truncate text-[10px] font-bold text-[#7C8BA0]">
                  Yazın veya sesli anlatın
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={loading || transcribing}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_7px_18px_rgba(15,23,42,0.06)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                    recording
                      ? "border-[#E11D48] bg-[#E11D48] text-white"
                      : "border-[#D3E0F0] bg-white text-[#1557D6]"
                  }`}
                  aria-label={
                    recording ? "Ses kaydını bitir" : "Sesli mesaj başlat"
                  }
                  title={
                    recording ? "Kaydı bitir" : "Sesli mesaj"
                  }
                >
                  {recording ? (
                    <Square size={16} fill="currentColor" />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={
                    loading ||
                    recording ||
                    transcribing ||
                    !input.trim()
                  }
                  className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl bg-[#1557D6] px-3 text-white shadow-[0_9px_22px_rgba(21,87,214,0.24)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#B8C7DB] disabled:shadow-none"
                  aria-label="Mesajı gönder"
                  title="Gönder"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <SendHorizontal size={19} />
                  )}
                  <span className="hidden text-xs font-black sm:inline">
                    Gönder
                  </span>
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .lina-professional-shell .lina-professional-input {
          text-align: left !important;
        }

        .lina-professional-shell .lina-copy,
        .lina-professional-shell .lina-title,
        .lina-professional-shell .lina-section-title {
          text-align: left !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        .lina-professional-shell .lina-title {
          font-size: 16px !important;
          line-height: 1.15 !important;
        }

        .lina-professional-shell .lina-section-title {
          font-size: 12px !important;
          line-height: 1.2 !important;
        }

        .lina-professional-shell button {
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 380px) {
          .lina-professional-shell .lina-title {
            font-size: 15px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lina-professional-shell *,
          .lina-professional-shell *::before,
          .lina-professional-shell *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
