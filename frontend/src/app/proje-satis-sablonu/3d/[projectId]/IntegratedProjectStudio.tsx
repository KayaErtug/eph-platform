"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { ProjectSceneData } from "./projectSceneTypes";

type Setup = { id: string; name: string; blocks: Array<{ id: string }>; units: Array<{ id: string }> };
export default function IntegratedProjectStudio({ projectId, sceneData }: { projectId: string; sceneData: ProjectSceneData }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSetup(null); setError("");
    api.get<Setup>(`/project-sales/projects/${encodeURIComponent(projectId)}/setup`).then(response => {
      if (active) setSetup(response.data);
    }).catch(() => { if (active) setError("Proje bölümleri yüklenemedi. Yetkinizi ve bağlantınızı kontrol edin."); });
    return () => { active = false; };
  }, [projectId, attempt]);
  const send = useCallback(() => {
    if (setup?.id !== projectId) return;
    frame.current?.contentWindow?.postMessage({ type: "EPH_STUDIO_LOAD", setup, scene: sceneData }, window.location.origin);
  }, [projectId, setup, sceneData]);
  useEffect(() => { send(); }, [send]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "EPH_STUDIO_READY") send();
      if (event.data?.type === "EPH_STUDIO_SELECTION" && event.data.projectId === projectId && setup?.units.some(unit => unit.id === event.data.unitId)) {
        window.dispatchEvent(new CustomEvent("eph:project-unit-selected", { detail: { projectId, unitId: event.data.unitId } }));
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [send, projectId, setup]);
  if (error) return <div role="alert" className="p-5 text-center text-sm text-red-700">{error}<button type="button" className="mx-auto mt-3 block min-h-11 rounded-lg border bg-white px-4" onClick={() => setAttempt(value => value + 1)}>Yeniden dene</button></div>;
  return <div className="bg-white">
    {!setup && <p role="status" className="p-3 text-center text-sm text-slate-600">Proje bölümleri yükleniyor…</p>}
    <iframe ref={frame} title="EPH etkileşimli 3D proje stüdyosu" src="/eph-3d-studio/index.html" onLoad={send} className="w-full border-0" style={{ height: 640 }} />
    <p className="px-4 pb-3 text-center text-xs text-slate-500">Bölüm bilgileri mevcut envanterden okunur. Alanları ve mağaza özelliklerini envanter ekranından düzenleyin.</p>
  </div>;
}
