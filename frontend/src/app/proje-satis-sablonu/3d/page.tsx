"use client";

import {
  ArrowLeft,
  Box,
  Building2,
  ChevronRight,
  Layers3,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import api from "@/lib/api";

import type { ProjectSummary } from "../lib/projectSalesTypes";

function errorMessage(error: unknown) {
  const candidate = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = candidate.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  return candidate.message || "Projeler yüklenemedi.";
}

function setupStatusLabel(status: string) {
  const labels: Record<string, string> = {
    TASLAK: "Taslak",
    YAPI_OLUSTURULUYOR: "Yapı Oluşturuluyor",
    BILGI_GIRISI_EKSIK: "Bilgi Eksik",
    KONTROLE_HAZIR: "Kontrole Hazır",
    TAMAMLANDI: "Tamamlandı",
    ARSIVLENDI: "Arşivlendi",
  };

  return labels[status] || status;
}

export default function Project3DStudioSelectorPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<ProjectSummary[]>("/project-sales/projects");
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <main className="min-h-screen bg-[#F4F8FF] px-4 py-5 md:px-7 md:py-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/proje-satis-sablonu")}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#C7D6E8] bg-white px-4 text-sm font-bold text-slate-700 shadow-sm"
        >
          <ArrowLeft size={17} /> Geri
        </button>

        <section className="mb-4 overflow-hidden rounded-[28px] border border-[#C7D6E8] bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white md:p-9">
            <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 backdrop-blur">
              <Box size={30} />
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              3D Proje Stüdyosu
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
              Blokları ve proje alanlarını otomatik 2.5D modele dönüştür.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-3xl border border-[#C7D6E8] bg-white">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
              <Loader2 className="animate-spin text-blue-600" size={20} />
              Projeler hazırlanıyor
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="mt-4 h-11 rounded-xl bg-blue-600 px-6 text-sm font-black text-white"
            >
              Tekrar Dene
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-white p-10 text-center">
            <Sparkles className="mx-auto text-blue-500" size={32} />
            <h2 className="mt-3 text-lg font-black text-slate-900">Proje Bulunamadı</h2>
            <p className="mt-1 text-sm text-slate-500">
              Önce Proje Satış Merkezi&apos;nden proje oluştur.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => {
              const ready = project._count.blocks > 0;

              return (
                <article
                  key={project.id}
                  className="rounded-3xl border border-[#C7D6E8] bg-white p-4 shadow-sm md:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                        <Building2 size={22} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-black text-slate-900">
                          {project.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-500">
                          <MapPin size={13} /> {project.city} / {project.district}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                      {setupStatusLabel(project.setupStatus)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Metric label="Blok" value={project._count.blocks} />
                    <Metric label="Kat/Birim" value={project._count.units} />
                    <Metric label="Alan" value={project._count.spaces} />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/proje-satis-sablonu/3d/${encodeURIComponent(project.id)}`,
                      )
                    }
                    disabled={!ready}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Layers3 size={18} />
                    {ready ? "3D Stüdyoyu Aç" : "Önce Blokları Oluştur"}
                    {ready && <ChevronRight size={18} />}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-base font-black text-slate-900">{value}</div>
      <div className="mt-1 text-[10px] font-bold text-slate-500">{label}</div>
    </div>
  );
}
