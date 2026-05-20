import type { Dispatch, SetStateAction } from "react";
import type { Project, ProjectForm, UnitForm } from "./stokTypes";
import { CITIES, STATUS_LABELS, TYPE_LABELS } from "./stokConstants";

type Props = {
  myProjects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: Dispatch<SetStateAction<string>>;
  projectForm: ProjectForm;
  setProjectForm: Dispatch<SetStateAction<ProjectForm>>;
  unitForm: UnitForm;
  setUnitForm: Dispatch<SetStateAction<UnitForm>>;
  formSuccess: boolean;
  formError: string;
  formLoading: boolean;
  aiLoading: boolean;
  aiResult: string;
  onClose: () => void;
  onSubmit: () => void;
  onGenerateAiDescription: () => void;
};

export default function StokCreateModal({
  myProjects,
  selectedProjectId,
  setSelectedProjectId,
  projectForm,
  setProjectForm,
  unitForm,
  setUnitForm,
  formSuccess,
  formError,
  formLoading,
  aiLoading,
  aiResult,
  onClose,
  onSubmit,
  onGenerateAiDescription,
}: Props) {
  return (
    <div className="st-overlay" onClick={onClose}>
      <div className="st-modal" onClick={(e) => e.stopPropagation()}>
        <div className="st-modal-header">
          <button className="st-modal-close" onClick={onClose}>×</button>
          <h2 className="st-modal-title">Yeni Ilan Ekle</h2>
          <p className="st-modal-sub">Bilgileri girin, AI size aciklama yazsin</p>
          <div className="st-modal-divider" />
        </div>

        <div className="st-modal-body">
          {formSuccess && <div className="st-form-success">Ilan basariyla eklendi!</div>}

          <div className="st-modal-section">
            <div className="st-modal-section-title">Proje</div>
            {myProjects.length > 0 && (
              <div className="st-field" style={{ marginBottom: 16 }}>
                <label>Mevcut Projeye Ekle</label>
                <select className="st-fselect" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                  <option value="">Yeni Proje Olustur</option>
                  {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                </select>
              </div>
            )}

            {!selectedProjectId && (
              <div className="st-form-grid">
                <div className="st-field">
                  <label>Proje Adi *</label>
                  <input className="st-input" placeholder="Denizli Merkez" value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label>Sehir *</label>
                  <select className="st-fselect" value={projectForm.city} onChange={(e) => setProjectForm((f) => ({ ...f, city: e.target.value }))}>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="st-field">
                  <label>Ilce *</label>
                  <input className="st-input" placeholder="Merkezefendi" value={projectForm.district} onChange={(e) => setProjectForm((f) => ({ ...f, district: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label>Adres *</label>
                  <input className="st-input" placeholder="Mahalle, Cadde, No" value={projectForm.address} onChange={(e) => setProjectForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div className="st-modal-section">
            <div className="st-modal-section-title">Mulk Bilgileri</div>
            <div className="st-form-grid">
              <div className="st-field">
                <label>Mulk Tipi *</label>
                <select className="st-fselect" value={unitForm.type} onChange={(e) => setUnitForm((f) => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="st-field">
                <label>Durum *</label>
                <select className="st-fselect" value={unitForm.status} onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="st-field">
                <label>Oda Sayisi</label>
                <select className="st-fselect" value={unitForm.roomCount} onChange={(e) => setUnitForm((f) => ({ ...f, roomCount: e.target.value }))}>
                  {["Studio","1+0","1+1","2+1","3+1","4+1","5+1","5+2","6+1","6+2"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="st-field">
                <label>Alan (m2) *</label>
                <input className="st-input" type="number" placeholder="120" value={unitForm.area} onChange={(e) => setUnitForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
              <div className="st-field">
                <label>Kat</label>
                <input className="st-input" type="number" placeholder="3" value={unitForm.floor} onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} />
              </div>
              <div className="st-field">
                <label>Daire No *</label>
                <input className="st-input" placeholder="301" value={unitForm.number} onChange={(e) => setUnitForm((f) => ({ ...f, number: e.target.value }))} />
              </div>
              <div className="st-field" style={{ gridColumn: "span 2" }}>
                <label>Fiyat (TL) *</label>
                <input className="st-input" type="number" placeholder="2500000" value={unitForm.price} onChange={(e) => setUnitForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="st-modal-section">
            <div className="st-modal-section-title">AI Destekli Aciklama</div>
            <div className="st-ai-box">
              <div className="st-ai-header">
                <div className="st-ai-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                  </svg>
                  Yapay Zeka Aciklama Yazar
                </div>
                <button className="st-ai-btn" onClick={onGenerateAiDescription} disabled={aiLoading || !unitForm.area}>
                  {aiLoading ? "Yaziliyor..." : "Aciklama Olustur"}
                </button>
              </div>
              <p className="st-ai-desc">Bilgileri girdikten sonra butona basin, AI sizin icin profesyonel aciklama yazsin.</p>

              {aiLoading && (
                <div className="st-ai-loading">
                  <div className="st-ai-loading-dot" /><div className="st-ai-loading-dot" /><div className="st-ai-loading-dot" />
                  <span style={{ fontSize: 11, color: "rgba(245,243,239,0.5)" }}>Aciklama yaziliyor...</span>
                </div>
              )}

              {aiResult && (
                <div>
                  <div className="st-ai-result">{aiResult}</div>
                  <button className="st-ai-use-btn" onClick={() => setUnitForm((f) => ({ ...f, description: aiResult }))}>Bu aciklamayi kullan</button>
                </div>
              )}
            </div>

            <div className="st-field">
              <label>Ilan Aciklamasi</label>
              <textarea className="st-textarea" placeholder="Mulk hakkinda kisa aciklama..." value={unitForm.description} onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          {formError && <div className="st-form-error">{formError}</div>}
        </div>

        <div className="st-modal-footer">
          <button className="st-submit-btn" onClick={onSubmit} disabled={formLoading}>
            <span>{formLoading ? "Kaydediliyor..." : "Ilani Kaydet"}</span>
          </button>
          <button className="st-cancel-btn" onClick={onClose}>Iptal</button>
        </div>
      </div>
    </div>
  );
}
