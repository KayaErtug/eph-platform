export default function StokStyles() {
  return <style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
  --text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}
.st-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.st-nav{display:none;}}
.st-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.st-logo img{width:34px;height:34px;object-fit:contain;}
.st-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.st-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.st-nav-links{display:flex;align-items:center;gap:4px;}
.st-nav-item{padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.st-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.st-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.st-nav-right{display:flex;align-items:center;gap:10px;}
.st-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.st-logout:hover{border-color:var(--navy);color:var(--navy);}
.st-main{max-width:1200px;margin:0 auto;padding:56px 48px 100px;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.st-main{padding:24px 16px 100px;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.st-header{margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px;}
@media(max-width:768px){.st-header{grid-template-columns:1fr;}}
.st-title{font-family:var(--serif);font-size:clamp(32px,4vw,48px);font-weight:300;color:var(--navy);letter-spacing:-0.5px;line-height:1.1;}
.st-title em{font-style:italic;color:var(--gold);}
.st-sub{font-size:13px;color:var(--muted);margin-top:8px;font-weight:300;}
.st-add-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;}
.st-add-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.st-add-btn:hover::before{left:0;}
.st-add-btn:hover{color:var(--navy);}
.st-add-btn span{position:relative;z-index:1;}
.st-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:40px;}
@media(max-width:768px){.st-stats{grid-template-columns:1fr 1fr;}}
.st-stat{background:#fff;padding:24px;}
.st-stat-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.st-stat-num{font-family:var(--serif);font-size:36px;font-weight:300;color:var(--navy);line-height:1;}
.st-stat-num.gold{color:var(--gold);}
.st-stat-num.green{color:#2D6A4F;}
.st-stat-num.blue{color:#1A4A7A;}
.st-tabs{display:flex;gap:0;margin-bottom:32px;border-bottom:1px solid var(--border);}
.st-tab{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;padding:12px 20px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;position:relative;bottom:-1px;}
.st-tab:hover{color:var(--navy);}
.st-tab.active{color:var(--navy);border-bottom-color:var(--gold);}
.st-filters{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;align-items:flex-end;}
.st-filter-wrap label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.st-select{background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;min-width:180px;}
.st-filter-input{background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:8px 0;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;font-weight:300;min-width:160px;}
.st-filter-input::placeholder{color:#C0BAB0;}
.st-filter-input:focus,.st-select:focus{border-bottom-color:var(--navy);}
.st-project{background:#fff;border:1px solid var(--border);margin-bottom:20px;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s;}
.st-project:hover{border-color:#B8943F;box-shadow:0 8px 24px rgba(0,0,0,0.08);}
.st-project-header{padding:20px 24px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;background:linear-gradient(135deg,#0D2137 0%,#1a3c5e 100%);}
.st-project-name{font-size:17px;font-weight:600;color:#fff;margin-bottom:4px;}
.st-project-loc{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.55);font-weight:300;margin-bottom:2px;}
.st-project-owner{font-size:10px;color:rgba(255,255,255,0.35);}
.st-project-meta{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
.st-active-badge{font-size:9px;letter-spacing:1px;text-transform:uppercase;border:1px solid;padding:5px 12px;border-radius:20px;font-weight:600;}
.st-unit-count{font-size:12px;color:rgba(255,255,255,0.5);font-style:italic;}
.st-units-list{padding:16px 20px 20px;display:flex;flex-direction:column;gap:10px;}
.st-unit-card{text-decoration:none;color:inherit;display:flex;text-decoration:none;color:inherit;border:1px solid #E7E1D8;border-radius:14px;overflow:hidden;cursor:pointer;background:#fff;transition:all 0.2s ease;min-height:88px;position:relative;z-index:1;}
.st-unit-card:hover{border-color:#C9A84C;box-shadow:0 2px 10px rgba(0,0,0,0.06);transform:none;}
.st-unit-img{width:100px;min-width:100px;background:#F3F5F7;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0;}
.st-unit-img-icon{font-size:28px;opacity:0.35;}
.st-unit-img-badge{position:absolute;bottom:0;left:0;right:0;text-align:center;background:rgba(184,148,63,0.95);color:#fff;font-size:8px;letter-spacing:1px;padding:4px;font-weight:700;}
.st-unit-body{flex:1;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;min-width:0;}
.st-unit-title{font-size:13px;font-weight:600;color:#0D2137;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.st-unit-loc{font-size:10px;color:#8E8E93;margin-bottom:8px;}
.st-unit-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}
.st-unit-tag{font-size:9px;padding:2px 8px;border-radius:20px;background:#F5F3EF;color:#555;border:0.5px solid #E8E4DC;}
.st-unit-footer{display:flex;justify-content:space-between;align-items:center;}
.st-unit-price-big{font-size:17px;font-weight:700;color:#0D2137;letter-spacing:-0.5px;}
.st-unit-status{font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;font-weight:600;border:1px solid;}
.st-badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}
.st-badge-verified{font-size:7px;letter-spacing:1px;text-transform:uppercase;border:1px solid #2D6A4F;color:#2D6A4F;background:#F0FAF4;padding:2px 7px;display:inline-flex;align-items:center;gap:3px;}
.st-all-units{display:flex;flex-direction:column;gap:10px;}
.st-unit-big{background:#fff;text-decoration:none;color:inherit;border:1px solid #E7E1D8;border-radius:14px;overflow:hidden;cursor:pointer;transition:all 0.2s ease;display:flex;min-height:88px;position:relative;z-index:1;}
.st-unit-big:hover{border-color:#C9A84C;box-shadow:0 2px 10px rgba(0,0,0,0.06);transform:none;}
.st-unit-big-img{width:100px;min-width:100px;background:#F3F5F7;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0;}
.st-unit-big-badge{position:absolute;bottom:0;left:0;right:0;text-align:center;background:rgba(184,148,63,0.95);color:#fff;font-size:8px;letter-spacing:1px;padding:4px;font-weight:700;}
.st-unit-big-body{flex:1;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;}
.st-unit-big-project{font-size:14px;font-weight:600;color:var(--navy);margin-bottom:3px;}
.st-unit-big-loc{font-size:10px;color:var(--muted);margin-bottom:8px;}
.st-unit-big-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}
.st-unit-big-tag{font-size:9px;padding:2px 8px;border-radius:20px;background:#F5F3EF;color:#555;border:0.5px solid #E8E4DC;}
.st-unit-big-footer{display:flex;align-items:center;justify-content:space-between;}
.st-unit-big-price{font-size:18px;font-weight:700;color:#0D2137;}
.st-empty{background:#fff;border:1px solid var(--border);border-radius:12px;padding:60px;text-align:center;}
.st-empty-text{font-family:var(--serif);font-size:22px;font-style:italic;color:var(--muted);margin-bottom:6px;}
.st-empty-sub{font-size:12px;color:#B8B2A8;font-weight:300;}
.st-overlay{position:fixed;inset:0;background:rgba(15,32,68,0.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.st-modal{background:#fff;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;position:relative;animation:slideUp 0.3s ease;border-radius:16px;}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.st-modal-header{padding:28px 32px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:#fff;z-index:1;border-radius:16px 16px 0 0;}
.st-modal-title{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--navy);}
.st-modal-sub{font-size:12px;color:var(--muted);margin-top:4px;font-weight:300;}
.st-modal-divider{width:28px;height:2px;background:var(--gold);margin-top:12px;}
.st-modal-close{position:absolute;top:20px;right:24px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:22px;}
.st-modal-body{padding:24px 32px 32px;}
.st-modal-section{margin-bottom:24px;}
.st-modal-section-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.st-modal-section-title::after{content:'';flex:1;height:1px;background:var(--border);}
.st-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:500px){.st-form-grid{grid-template-columns:1fr;}}
.st-field{margin-bottom:0;}
.st-field label{display:block;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:10px;font-weight:500;}
.st-input{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;transition:border-color 0.3s;font-weight:300;}
.st-input:focus{border-bottom-color:var(--navy);}
.st-input::placeholder{color:#C0BAB0;}
.st-fselect{width:100%;background:transparent;border:none;border-bottom:1.5px solid var(--border);padding:10px 0;font-size:14px;color:var(--navy);font-family:var(--sans);outline:none;appearance:none;cursor:pointer;font-weight:300;}
.st-fselect:focus{border-bottom-color:var(--navy);}
.st-ai-box{background:var(--navy);padding:20px 24px;margin-bottom:16px;border-radius:8px;}
.st-ai-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.st-ai-title{font-size:11px;color:var(--gold);letter-spacing:1px;font-weight:500;display:flex;align-items:center;gap:8px;}
.st-ai-btn{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:var(--gold);color:var(--navy);border:none;padding:8px 16px;cursor:pointer;font-family:var(--sans);font-weight:500;transition:all 0.2s;border-radius:4px;}
.st-ai-btn:hover{background:#B8962A;}
.st-ai-btn:disabled{opacity:0.5;cursor:not-allowed;}
.st-ai-desc{font-size:11px;color:rgba(245,243,239,0.5);font-weight:300;line-height:1.5;}
.st-ai-loading{display:flex;align-items:center;gap:8px;margin-top:12px;}
.st-ai-loading-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:bounce 1s ease infinite;}
.st-ai-loading-dot:nth-child(2){animation-delay:0.15s;}
.st-ai-loading-dot:nth-child(3){animation-delay:0.3s;}
@keyframes bounce{0%,100%{transform:translateY(0);opacity:0.5}50%{transform:translateY(-4px);opacity:1}}
.st-ai-result{margin-top:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.2);padding:14px;font-size:12px;color:rgba(245,243,239,0.8);line-height:1.7;font-weight:300;border-radius:4px;}
.st-ai-use-btn{margin-top:10px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:transparent;border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:7px 16px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;border-radius:4px;}
.st-ai-use-btn:hover{background:rgba(201,168,76,0.1);}
.st-textarea{width:100%;background:var(--warm);border:1px solid var(--border);padding:12px;font-size:13px;color:var(--navy);font-family:var(--sans);outline:none;resize:vertical;font-weight:300;min-height:100px;border-radius:4px;}
.st-textarea:focus{border-color:var(--navy);}
.st-modal-footer{padding:16px 32px 24px;border-top:1px solid var(--border);display:flex;gap:12px;}
.st-submit-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--navy);color:var(--cream);border:none;padding:14px 28px;cursor:pointer;font-family:var(--sans);transition:all 0.3s;position:relative;overflow:hidden;flex:1;border-radius:8px;}
.st-submit-btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:var(--gold);transition:left 0.4s;}
.st-submit-btn:hover::before{left:0;}
.st-submit-btn:hover{color:var(--navy);}
.st-submit-btn span{position:relative;z-index:1;}
.st-submit-btn:disabled{opacity:0.4;cursor:not-allowed;}
.st-submit-btn:disabled::before{display:none;}
.st-cancel-btn{font-size:9px;letter-spacing:2px;text-transform:uppercase;background:none;border:1px solid var(--border);padding:14px 20px;cursor:pointer;font-family:var(--sans);color:var(--muted);transition:all 0.2s;border-radius:8px;}
.st-cancel-btn:hover{border-color:var(--navy);color:var(--navy);}
.st-form-error{font-size:11px;color:#C0392B;margin-top:8px;}
.st-form-success{background:#F0FAF4;border-left:3px solid #2D6A4F;padding:14px 18px;margin-bottom:16px;font-size:12px;color:#2D6A4F;font-weight:300;border-radius:4px;}
`}</style>;
}
