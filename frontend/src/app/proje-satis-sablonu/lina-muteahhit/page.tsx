"use client";

import { Bot, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import api from "@/lib/api";

type ProjectItem = {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  district?: string | null;
};

type AssistantResponse = {
  assistant: string;
  success: boolean;
  message: string;
  provider: string;
  kvkkFiltered: boolean;
  readOnly: boolean;
};

const QUICK_QUESTIONS = [
  "Bu projede hangi stoklara önce odaklanmalıyım?",
  "CRM ve Talep Merkezi fırsatlarını karşılaştır.",
  "Bölgede hangi daire tipine talep daha yüksek?",
  "Satılmayan stok için kampanya stratejisi öner.",
];

export default function LinaContractorPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState(QUICK_QUESTIONS[0]);
  const [answer, setAnswer] = useState<AssistantResponse | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<ProjectItem[]>("/project-sales/projects")
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response.data) ? response.data : [];
        setProjects(items);
        setProjectId(items[0]?.id || "");
      })
      .catch(() => active && setProjects([]))
      .finally(() => active && setLoadingProjects(false));

    return () => {
      active = false;
    };
  }, []);

  async function ask() {
    const clean = message.trim();
    if (!clean) return;

    setLoading(true);
    setError("");
    try {
      const response = await api.post<AssistantResponse>(
        "/project-sales/contractor-assistant/ask",
        {
          message: clean,
          projectId: projectId || undefined,
        },
      );
      setAnswer(response.data);
    } catch (requestError: any) {
      setAnswer(null);
      setError(
        requestError?.response?.data?.message ||
          "Lina analizi oluşturulamadı. Proje erişimini ve bağlantıyı kontrol edin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-[calc(18px+env(safe-area-inset-top))] sm:px-6">
        <header className="mb-5 rounded-[28px] border border-violet-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white">
            <Bot size={23} />
          </div>
          <h1 className="mt-3 text-2xl font-black">Lina Müteahhit Asistanı</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Proje stoğu, CRM fırsatları, Talep Merkezi ve bölgesel talep verilerini tek karar bağlamında yorumlayın.
          </p>
        </header>

        <section className="rounded-[24px] border border-[#D8E4F3] bg-white p-5 shadow-sm">
          <label className="text-xs font-black text-slate-600">
            Proje
            <select
              value={projectId}
              disabled={loadingProjects}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
            >
              <option value="">Genel / bölgesel analiz</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}{project.city ? ` · ${project.city}${project.district ? ` / ${project.district}` : ""}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setMessage(question)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
              >
                {question}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Lina'ya sorun..."
            className="mt-4 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-violet-500"
          />

          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading || !message.trim()}
            className="mx-auto mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Lina'ya Sor
          </button>
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {answer ? (
          <section className="mt-5 rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-sm font-black text-violet-700">
              <Sparkles size={18} /> Lina Analizi
            </div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {answer.message}
            </div>
            <div className="mt-4 text-center text-[11px] font-bold text-slate-400">
              Sağlayıcı: {answer.provider} · Salt okunur karar desteği
            </div>
          </section>
        ) : null}

        <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <p>
            Lina bu ekranda yalnız analiz ve öneri üretir. Fiyat, rezervasyon, stok veya yayın durumunu otomatik değiştirmez; CRM müşteri kimlikleri karar bağlamına eklenmez.
          </p>
        </div>
      </div>
    </main>
  );
}
