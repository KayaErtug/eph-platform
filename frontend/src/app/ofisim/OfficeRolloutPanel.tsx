'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
type Status = { enforced: boolean; unlinkedCount: number; unconfiguredCount: number; unlinkedAgents: { id: string; firstName: string; lastName: string }[]; unconfiguredOffices: { id: string; name: string }[] };
export default function OfficeRolloutPanel() {
  const [data, setData] = useState<Status | null>(null), [issue, setIssue] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false), actor = useAuthStore(s => s.user?.id);
  const load = useCallback(async () => { const id = useAuthStore.getState().user?.id; const r = await api.get<Status>('/office/rollout'); if (id === useAuthStore.getState().user?.id) setData(r.data); }, []);
  useEffect(() => { void load().catch(() => setIssue('Ofis geçiş durumu yüklenemedi.')); }, [load, actor]);
  const toggle = async () => {
    if (!data || lock.current || !window.confirm(data.enforced ? 'Geçiş dönemini yeniden açmak istiyor musunuz?' : 'Web ve mobil kurulumları, danışman bağlantıları ve gerçek cihaz testleri tamamlandı mı? Ofis kuralı devreye alınacak.')) return;
    lock.current = true; setBusy(true); setIssue('');
    try { if (useAuthStore.getState().user?.id !== actor) throw new Error('Oturum değişti.'); await api.post('/office/rollout', { enabled: !data.enforced }); await load(); }
    catch (e) { setIssue((e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (e as Error).message || 'İşlem tamamlanamadı.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="space-y-4 rounded-3xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-xl font-bold text-slate-900">Yazılım Ekibi · Ofis Geçişi</h2>{issue ? <p role="alert" className="text-red-700">{issue}</p> : null}{data ? <><p className="font-semibold">{data.enforced ? 'Ofis zorunluluğu aktif' : 'Geçiş dönemi açık'}</p><p className="text-sm text-slate-600">Önce yönetim ekranları kurulmalı, ofis sahipleri PK tercihini onaylamalı ve danışman bağlantıları tamamlanmalı. Android ve iOS cihaz testlerinden sonra kuralı açın.</p><p>Ofise bağlı olmayan aktif danışman: {data.unlinkedCount}</p>{data.unlinkedAgents.map(u => <p key={u.id} className="text-sm">{u.firstName} {u.lastName} · {u.id}</p>)}<p>PK tercihi onaylanmamış ofis: {data.unconfiguredCount}</p>{data.unconfiguredOffices.map(o => <p key={o.id} className="text-sm">{o.name}</p>)}<button className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-40" disabled={busy || (!data.enforced && (data.unlinkedCount > 0 || data.unconfiguredCount > 0))} onClick={() => void toggle()}>{data.enforced ? 'Geçiş Dönemini Aç' : 'Ofis Kuralını Devreye Al'}</button><button className="ml-3 min-h-11 p-3 text-blue-700" onClick={() => void load().catch(() => setIssue('Durum yenilenemedi.'))}>Durumu Yenile</button></> : null}</section>;
}
