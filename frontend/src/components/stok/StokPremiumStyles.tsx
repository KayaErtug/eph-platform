export default function StokPremiumStyles() {
  return (
    <style>{`
*{box-sizing:border-box}
body{margin:0;background:#F5F7FA;color:#111827;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{text-decoration:none;color:inherit}

.stock-page-v2{min-height:100vh;background:#F5F7FA;color:#111827}

.stock-appbar-v2{
  height:68px;background:#fff;border-bottom:1px solid #E5E7EB;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 34px;position:sticky;top:0;z-index:50
}
.stock-brand-v2{display:flex;align-items:center;gap:12px}
.stock-brand-v2 img{width:36px;height:36px;object-fit:contain}
.stock-brand-name{font-weight:900;font-size:17px;color:#0B1F44}
.stock-brand-sub{font-size:12px;color:#64748B;font-weight:600;margin-top:2px}

.stock-nav-v2{display:flex;align-items:center;gap:4px}
.stock-nav-v2 a{padding:9px 13px;border-radius:999px;color:#64748B;font-size:13px;font-weight:700}
.stock-nav-v2 a:hover,.stock-nav-v2 a.active{background:#EEF4FF;color:#1D4ED8}

.stock-logout-v2{
  border:1px solid #CBD5E1;background:#fff;border-radius:999px;
  padding:10px 15px;color:#334155;font-weight:800;cursor:pointer
}

.stock-main-v2{
  width:100%;
  max-width:1320px;
  margin:0 auto;
  padding:28px 28px 120px
}

.stock-hero-v2{
  display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;margin-bottom:18px
}
.stock-hero-left-v2 h1{
  font-size:34px;line-height:1;letter-spacing:-.04em;
  margin:0;color:#0B1F44
}
.stock-hero-left-v2 p{
  margin:10px 0 0;color:#64748B;font-size:15px;
  line-height:1.55;max-width:620px
}
.stock-section-kicker{
  font-size:12px;color:#1D4ED8;font-weight:800;margin-bottom:8px
}
.stock-hero-card-v2{
  background:#fff;border:1px solid #E2E8F0;color:#111827;
  border-radius:22px;padding:16px 18px;min-width:240px
}
.stock-hero-card-v2 span{display:block;font-size:12px;color:#64748B;font-weight:700}
.stock-hero-card-v2 strong{display:block;font-size:22px;margin-top:5px;color:#0B1F44}

.stock-kpi-v2-grid{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;margin-bottom:16px
}
.stock-kpi-v2{
  background:#fff;border:1px solid #E2E8F0;border-radius:22px;padding:16px
}
.stock-kpi-v2-label{font-size:12px;color:#64748B;font-weight:700}
.stock-kpi-v2-value{font-size:28px;line-height:1;font-weight:900;margin-top:10px;color:#111827}
.stock-kpi-v2-note{font-size:12px;color:#64748B;margin-top:7px}
.stock-kpi-v2.green .stock-kpi-v2-value{color:#047857}
.stock-kpi-v2.blue .stock-kpi-v2-value{color:#1D4ED8}
.stock-kpi-v2.gold .stock-kpi-v2-value{color:#0B1F44}

.stock-panel-v2{
  background:#fff;border:1px solid #E2E8F0;border-radius:24px;
  overflow:hidden;width:100%
}

.stock-toolbar-v2{border-bottom:1px solid #E5E7EB;background:#fff}
.stock-toolbar-top{
  display:flex;align-items:flex-start;justify-content:space-between;
  gap:14px;padding:20px 20px 14px
}
.stock-toolbar-top h2{margin:0;font-size:22px;color:#0B1F44}
.stock-toolbar-top p{margin:6px 0 0;color:#64748B;font-size:13px}
.stock-toolbar-actions{display:flex;gap:9px;align-items:center}
.stock-soft-btn,.stock-dark-btn{
  height:42px;border-radius:14px;padding:0 15px;font-weight:800;
  cursor:pointer;display:inline-flex;align-items:center;gap:7px
}
.stock-soft-btn{border:1px solid #CBD5E1;background:#fff;color:#334155}
.stock-dark-btn{border:1px solid #1D4ED8;background:#1D4ED8;color:#fff}

.stock-filter-grid{
  display:grid;grid-template-columns:minmax(320px,1.8fr) 230px 200px;
  gap:12px;padding:0 20px 20px
}
.stock-filter-field span{
  display:block;font-size:11px;color:#64748B;font-weight:800;margin-bottom:7px
}
.stock-filter-field input,.stock-filter-field select{
  width:100%;height:42px;border:1px solid #CBD5E1;background:#fff;
  border-radius:14px;padding:0 13px;color:#111827;font-weight:700;outline:none
}
.stock-filter-field input:focus,.stock-filter-field select:focus{
  border-color:#1D4ED8;box-shadow:0 0 0 4px rgba(29,78,216,.10)
}

/* TABLE FIX */
.stock-table-shell{
  width:100%;
  overflow-x:auto;
  overflow-y:hidden;
  background:#fff;
}
.stock-data-table{
  width:100%;
  min-width:1180px;
  border-collapse:separate;
  border-spacing:0;
  table-layout:auto;
}
.stock-data-table thead th{
  background:#F8FAFC;color:#64748B;text-align:left;
  font-size:11px;font-weight:800;padding:13px 15px;
  border-bottom:1px solid #E5E7EB;white-space:nowrap
}
.stock-data-row{cursor:pointer;outline:none}
.stock-data-row td{
  padding:16px 15px;border-bottom:1px solid #EEF2F7;
  vertical-align:middle;background:#fff;transition:.14s ease;
  white-space:nowrap
}
.stock-data-row:hover td{background:#F8FAFC}
.stock-data-row:focus td{background:#F8FAFC}

.stock-check-cell{width:44px;text-align:center}
.stock-check-cell input{width:16px;height:16px;accent-color:#1D4ED8}

.stock-main-cell{min-width:360px;width:360px}
.stock-property-cell{display:flex;align-items:center;gap:12px;min-width:0}
.stock-property-thumb{
  width:48px;height:48px;border-radius:15px;background:#E8EEF6;
  border:1px solid #DCE5F2;display:flex;align-items:center;
  justify-content:center;color:#1D4ED8;flex-shrink:0
}
.stock-property-meta{min-width:0}
.stock-property-title{
  font-size:14px;font-weight:900;color:#111827;margin-bottom:5px;
  max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap
}
.stock-property-sub{
  display:flex;align-items:center;gap:5px;
  font-size:12px;color:#64748B;max-width:280px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap
}
.stock-property-subtle{
  margin-top:4px;font-size:12px;color:#94A3B8;
  max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap
}

.stock-status-badge{
  display:inline-flex;align-items:center;gap:7px;border:1px solid;
  border-radius:999px;padding:7px 10px;font-size:11px;
  font-weight:800;white-space:nowrap
}
.stock-status-dot{width:7px;height:7px;border-radius:50%}

.stock-tags{
  display:flex;gap:6px;flex-wrap:nowrap;min-width:190px
}
.stock-tags span{
  border:1px solid #E2E8F0;background:#F8FAFC;color:#475569;
  border-radius:999px;padding:6px 8px;font-size:11px;
  font-weight:700;white-space:nowrap
}

.stock-price-cell{
  min-width:130px;font-size:14px;font-weight:900;color:#111827;white-space:nowrap
}
.stock-owner-cell{
  display:flex;align-items:center;gap:10px;min-width:170px
}
.stock-avatar{
  width:34px;height:34px;border-radius:50%;background:#EEF4FF;color:#1D4ED8;
  display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0
}
.stock-owner-name{font-size:12px;font-weight:800;color:#334155;white-space:nowrap}
.stock-owner-role{font-size:11px;color:#94A3B8;margin-top:2px;white-space:nowrap}

.stock-date-cell{
  min-width:110px;font-size:12px;color:#64748B;font-weight:700;white-space:nowrap
}
.stock-verify-cell{min-width:150px}
.stock-verify-pills{display:flex;gap:5px;flex-wrap:nowrap}
.stock-verify-pills span{
  font-size:10px;font-weight:800;color:#047857;background:#ECFDF3;
  border:1px solid #BBF7D0;border-radius:999px;padding:5px 7px;white-space:nowrap
}
.stock-verify-pills em{
  font-size:12px;color:#94A3B8;font-style:normal;font-weight:700;white-space:nowrap
}
.stock-action-cell{text-align:right;width:70px}
.stock-action-cell button{
  border:1px solid #CBD5E1;background:#fff;border-radius:12px;
  width:34px;height:34px;display:inline-flex;align-items:center;
  justify-content:center;font-weight:800;color:#334155;cursor:pointer
}
.stock-action-cell button:hover{
  background:#EEF4FF;color:#1D4ED8;border-color:#BFDBFE
}

.stock-empty-state{text-align:center;padding:64px 20px}
.stock-empty-icon{
  width:56px;height:56px;border-radius:20px;background:#F1F5F9;
  margin:0 auto 14px;display:flex;align-items:center;
  justify-content:center;font-size:28px;color:#64748B
}
.stock-empty-title{font-size:22px;font-weight:900;color:#111827;margin-bottom:6px}
.stock-empty-text{color:#64748B}

.stock-lina-v2{display:none}

.stock-modal-v2-backdrop{
  position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:100;
  display:flex;align-items:center;justify-content:center;padding:20px
}
.stock-modal-v2{
  width:100%;max-width:780px;max-height:90vh;overflow:auto;
  background:#fff;border-radius:28px
}
.stock-modal-v2-head{
  padding:24px 28px;border-bottom:1px solid #E5E7EB;
  display:flex;justify-content:space-between;gap:16px
}
.stock-modal-v2-head h2{margin:0;font-size:26px;color:#0B1F44}
.stock-modal-v2-head p{margin:6px 0 0;color:#64748B}
.stock-modal-v2-head button{
  width:40px;height:40px;border:none;border-radius:14px;
  background:#F1F5F9;color:#475569;font-size:22px;cursor:pointer
}
.stock-modal-v2-body{padding:24px 28px}

.stock-form-block{margin-bottom:24px}
.stock-form-block h3{font-size:12px;color:#1D4ED8;font-weight:900;margin:0 0 13px}
.stock-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.stock-form-field.full{grid-column:1/-1}
.stock-form-field span{
  display:block;font-size:11px;color:#64748B;font-weight:800;margin-bottom:7px
}
.stock-form-field input,.stock-form-field select,.stock-form-field textarea{
  width:100%;border:1px solid #CBD5E1;border-radius:14px;
  padding:12px 13px;outline:none;font:inherit;font-weight:700
}
.stock-form-field textarea{min-height:100px;resize:vertical}

.stock-form-error,.stock-form-success{
  border-radius:14px;padding:12px 14px;font-size:13px;
  font-weight:800;margin-bottom:14px
}
.stock-form-error{background:#FFF1F2;border:1px solid #FECDD3;color:#BE123C}
.stock-form-success{background:#ECFDF3;border:1px solid #BBF7D0;color:#047857}

.stock-modal-v2-foot{
  padding:18px 28px;border-top:1px solid #E5E7EB;
  display:flex;justify-content:flex-end;gap:10px
}
.stock-cancel-btn,.stock-save-btn{
  height:44px;border-radius:14px;padding:0 18px;font-weight:800;cursor:pointer
}
.stock-cancel-btn{background:#fff;color:#334155;border:1px solid #CBD5E1}
.stock-save-btn{background:#1D4ED8;color:#fff;border:1px solid #1D4ED8}
.stock-save-btn:disabled{opacity:.55;cursor:not-allowed}

@media(max-width:900px){
  .stock-appbar-v2{display:none}
  .stock-page-v2{background:#FAFBFC}
  .stock-main-v2{padding:22px 14px 100px}
  .stock-hero-v2{display:block;margin-bottom:16px}
  .stock-hero-left-v2 h1{font-size:30px}
  .stock-hero-left-v2 p{font-size:14px}
  .stock-hero-card-v2{margin-top:14px;min-width:0}
  .stock-kpi-v2-grid{grid-template-columns:1fr 1fr;gap:10px}
  .stock-kpi-v2{border-radius:20px;padding:14px}
  .stock-panel-v2{border-radius:22px}
  .stock-toolbar-top{display:block;padding:18px 16px 12px}
  .stock-toolbar-actions{margin-top:14px}
  .stock-soft-btn,.stock-dark-btn{height:40px;padding:0 13px}
  .stock-filter-grid{grid-template-columns:1fr;padding:0 16px 18px}
  .stock-data-table{min-width:980px}
  .stock-form-grid{grid-template-columns:1fr}
}
    `}</style>
  );
}