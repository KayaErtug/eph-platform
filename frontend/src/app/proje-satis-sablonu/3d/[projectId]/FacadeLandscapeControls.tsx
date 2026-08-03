"use client";

import { Copy, Palette, Sparkles, Trees } from "lucide-react";

import type {
  FacadePresetId,
  ProjectLandscapeSettings,
  ProjectSceneData,
  ProjectSceneElement,
} from "./projectSceneTypes";
import {
  FACADE_PRESETS,
  LANDSCAPE_PRESETS,
  facadePresetForElement,
} from "./sceneStylePresets";

type FacadeLandscapeControlsProps = {
  selectedElement: ProjectSceneElement | null;
  sceneData: ProjectSceneData;
  onApplyFacadePreset: (presetId: FacadePresetId) => void;
  onApplyFacadeToAllBlocks: (presetId: FacadePresetId) => void;
  onUpdateLandscape: (next: ProjectLandscapeSettings) => void;
};

const landscapeToggles: Array<{
  key: keyof Pick<
    ProjectLandscapeSettings,
    "showTrees" | "showPaths" | "showLighting" | "showBenches" | "showShrubs"
  >;
  label: string;
}> = [
  { key: "showTrees", label: "Ağaçlar" },
  { key: "showPaths", label: "Yürüyüş yolları" },
  { key: "showLighting", label: "Aydınlatma" },
  { key: "showBenches", label: "Oturma alanları" },
  { key: "showShrubs", label: "Çalı ve bitkiler" },
];

export default function FacadeLandscapeControls({
  selectedElement,
  sceneData,
  onApplyFacadePreset,
  onApplyFacadeToAllBlocks,
  onUpdateLandscape,
}: FacadeLandscapeControlsProps) {
  const selectedBlock = selectedElement?.type === "BLOCK" ? selectedElement : null;
  const activeFacadePreset = selectedBlock
    ? facadePresetForElement(selectedBlock)
    : null;
  const activeLandscape = sceneData.landscape;

  return (
    <section className="space-y-3 rounded-2xl border border-[#C7D6E8] bg-white p-4 shadow-sm">
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Cephe Paketi</h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Blok görünümünü tek dokunuşla değiştir.
              </p>
            </div>
          </div>
          <Sparkles size={17} className="text-blue-600" />
        </summary>

        <div className="mt-4">
          {selectedBlock ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {FACADE_PRESETS.map((preset) => {
                  const active = activeFacadePreset?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyFacadePreset(preset.id)}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        active
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <div className="mb-2 flex h-5 overflow-hidden rounded-md border border-white shadow-sm">
                        {preset.swatches.map((color) => (
                          <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="text-[11px] font-black text-slate-800">
                        {preset.label}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-slate-500">
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  onApplyFacadeToAllBlocks(
                    (activeFacadePreset?.id || "MODERN_LIGHT") as FacadePresetId,
                  )
                }
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-black text-blue-700"
              >
                <Copy size={15} /> Bu cepheyi tüm bloklara uygula
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-5 text-center text-xs font-semibold leading-5 text-blue-800">
              Cephe seçmek için sahneden bir blok seç.
            </div>
          )}
        </div>
      </details>

      <div className="border-t border-slate-100" />

      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Trees size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Peyzaj Paketi</h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Tüm vaziyet planının dış mekân dilini yönet.
              </p>
            </div>
          </div>
          <Sparkles size={17} className="text-emerald-600" />
        </summary>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {LANDSCAPE_PRESETS.map((preset) => {
              const active = activeLandscape.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onUpdateLandscape({
                      ...activeLandscape,
                      preset: preset.id,
                    })
                  }
                  className={`rounded-xl border p-2.5 text-left transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="mb-2 flex h-5 overflow-hidden rounded-md border border-white shadow-sm">
                    {preset.swatches.map((color) => (
                      <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="text-[11px] font-black text-slate-800">
                    {preset.label}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-slate-500">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>

          <label className="block rounded-xl bg-slate-50 p-3">
            <span className="flex items-center justify-between text-[11px] font-black text-slate-700">
              Bitki Yoğunluğu
              <strong className="rounded-full bg-white px-2 py-1 text-emerald-700 shadow-sm">
                {activeLandscape.density}/5
              </strong>
            </span>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={activeLandscape.density}
              onChange={(event) =>
                onUpdateLandscape({
                  ...activeLandscape,
                  density: Number(event.target.value),
                })
              }
              className="mt-3 w-full accent-emerald-600"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {landscapeToggles.map((item) => {
              const active = activeLandscape[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    onUpdateLandscape({
                      ...activeLandscape,
                      [item.key]: !active,
                    })
                  }
                  className={`min-h-10 rounded-xl border px-2.5 py-2 text-[10px] font-black transition ${
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
