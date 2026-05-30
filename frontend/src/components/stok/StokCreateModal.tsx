import { CITIES, ROOM_COUNT_OPTIONS, STATUS_LABELS, TYPE_LABELS } from "./stokConstants";
import type { Project, ProjectFormState, UnitFormState } from "./stokTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  projectForm: ProjectFormState;
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  unitForm: UnitFormState;
  setUnitForm: React.Dispatch<React.SetStateAction<UnitFormState>>;
  formError: string;
  formSuccess: boolean;
  formLoading: boolean;
  onSubmit: () => void;
}

export default function StokCreateModal({
  open, onClose, projects, selectedProjectId, setSelectedProjectId,
  projectForm, setProjectForm, unitForm, setUnitForm,
  formError, formSuccess, formLoading, onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div className="stock-modal-v2-backdrop" onClick={onClose}>
      <div className="stock-modal-v2" onClick={(e) => e.stopPropagation()}>
        <div className="stock-modal-v2-head">
          <div>
            <div className="stock-section-kicker">New Listing</div>
            <h2>Yeni İlan Ekle</h2>
            <p>Portföy kaydını hızlıca oluştur.</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="stock-modal-v2-body">
          {formSuccess && <div className="stock-form-success">İlan başarıyla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          <div className="stock-form-block">
            <h3>Proje</h3>
            <div className="stock-form-grid">
              {projects.length > 0 && (
                <label className="stock-form-field full">
                  <span>Mevcut Projeye Ekle</span>
                  <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                    <option value="">Yeni Proje Oluştur</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                  </select>
                </label>
              )}
              {!selectedProjectId && (
                <>
                  <label className="stock-form-field"><span>Proje Adı *</span><input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} /></label>
                  <label className="stock-form-field"><span>Şehir *</span><select value={projectForm.city} onChange={(e) => setProjectForm((f) => ({ ...f, city: e.target.value }))}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
                  <label className="stock-form-field"><span>İlçe *</span><input value={projectForm.district} onChange={(e) => setProjectForm((f) => ({ ...f, district: e.target.value }))} /></label>
                  <label className="stock-form-field"><span>Adres *</span><input value={projectForm.address} onChange={(e) => setProjectForm((f) => ({ ...f, address: e.target.value }))} /></label>
                </>
              )}
            </div>
          </div>
          <div className="stock-form-block">
            <h3>Mülk Bilgileri</h3>
            <div className="stock-form-grid">
              <label className="stock-form-field"><span>Mülk Tipi *</span><select value={unitForm.type} onChange={(e) => setUnitForm((f) => ({ ...f, type: e.target.value }))}>{Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="stock-form-field"><span>Durum *</span><select value={unitForm.status} onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value }))}>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="stock-form-field"><span>Oda / Plan Tipi</span><input list="room-count-options" value={unitForm.roomCount} onChange={(e) => setUnitForm((f) => ({ ...f, roomCount: e.target.value }))} placeholder="Örn: 3+1, 2,5+1, 10+4, Loft" /><datalist id="room-count-options">{ROOM_COUNT_OPTIONS.map((r) => <option key={r} value={r} />)}</datalist></label>
              <label className="stock-form-field"><span>Alan (m²) *</span><input type="number" value={unitForm.area} onChange={(e) => setUnitForm((f) => ({ ...f, area: e.target.value }))} /></label>
              <label className="stock-form-field"><span>Kat</span><input type="number" value={unitForm.floor} onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} /></label>
              <label className="stock-form-field"><span>Daire No *</span><input value={unitForm.number} onChange={(e) => setUnitForm((f) => ({ ...f, number: e.target.value }))} /></label>
              <label className="stock-form-field full"><span>Fiyat (TL) *</span><input type="number" value={unitForm.price} onChange={(e) => setUnitForm((f) => ({ ...f, price: e.target.value }))} /></label>
              <label className="stock-form-field full"><span>Açıklama</span><textarea value={unitForm.description} onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))} /></label>
            </div>
          </div>
        </div>
        <div className="stock-modal-v2-foot">
          <button className="stock-cancel-btn" onClick={onClose}>İptal</button>
          <button className="stock-save-btn" onClick={onSubmit} disabled={formLoading}>{formLoading ? "Kaydediliyor..." : "İlanı Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}
