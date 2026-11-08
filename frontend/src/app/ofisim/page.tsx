'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import OfficeRolloutPanel from './OfficeRolloutPanel';
import OfficeMembershipCard, { type OfficePackage as Package } from './OfficeMembershipCard';
import OfficeIdentityCard, { type OfficeIdentity } from './OfficeIdentityCard';
import { useAuthStore } from '@/store/auth.store';

type Member = { id: string; firstName: string; lastName: string; isApproved?: boolean; isVerified?: boolean };
type Office = OfficeIdentity & { mode: 'SHARED' | 'ALLOCATED'; modeConfigured: boolean; balance: number; members: Member[]; applicants: Member[] };
type Dashboard = { actorId: string; canCreate: boolean; requiresOffice: boolean; offices: Office[] };
type Intent = { requestId: string; memberId: string; amount: number; userId: string };
const message = (e: unknown) => { const x = e as { response?: { data?: { message?: string } }; message?: string }; return x.response?.data?.message || x.message || 'İşlem tamamlanamadı.'; };
const button = 'min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40';
const inputClass = 'min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900';
const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4';

export default function OfficePage() {
  const userId = useAuthStore(s => s.user?.id);
  const role = useAuthStore(s => s.user?.role);
  const [data, setData] = useState<Dashboard | null>(null), [packages, setPackages] = useState<Package[]>([]), [issue, setIssue] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState(''), [name, setName] = useState('');
  const lock = useRef(false), generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    const result = await api.get<Dashboard>('/office/dashboard');
    if (current !== generation.current || result.data.actorId !== useAuthStore.getState().user?.id) return;
    setData(result.data);
    try { const p = await api.get<{ data: Package[] }>('/office/packages'); if (current === generation.current) setPackages(Array.isArray(p.data?.data) ? p.data.data : []); } catch { if (current === generation.current) setIssue('Ofis paketleri yüklenemedi. Sayfayı yenileyin.'); }
  }, []);
  useEffect(() => { setData(null); setIssue(''); if (userId) void load().catch(e => setIssue(message(e))); return () => { generation.current++; }; }, [userId, load]);
  const run = async (work: () => Promise<unknown>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setIssue('');
    try { if (!data || useAuthStore.getState().user?.id !== data.actorId) throw new Error('Oturum değişti.'); await work(); await load(); }
    catch (e) { setIssue(message(e)); } finally { lock.current = false; setBusy(false); }
  };
  return <main className="mx-auto max-w-5xl space-y-5 p-4 pb-28 text-slate-900 md:p-8"><header><p className="text-xs font-bold tracking-widest text-blue-600">EPH · OFİS YÖNETİMİ</p><h1 className="mt-2 text-3xl font-bold">Ofisim</h1><p className="mt-2 text-sm text-slate-500">Danışmanlarınız, ofis bağlantınız ve tek birim PK yönetimi.</p></header>
    {role === 'SUPER_ADMIN' ? <OfficeRolloutPanel /> : null}
    {issue ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{issue}</p> : null}
    {!data ? (issue ? <button className={button} onClick={() => { setIssue(''); void load().catch(e => setIssue(message(e))); }}>Yeniden Dene</button> : <p>Ofis bilgileri yükleniyor…</p>) : <>
      {data.requiresOffice ? <section className={card}><h2 className="text-xl font-bold">Ofisinize bağlanın</h2><p className="text-sm text-slate-500">Danışman hesabınızı aktif bir emlak ofisine bağlayın. Ofis sahibinizin davet kodunu girin; katılımınız onun onayıyla tamamlanır.</p><input aria-label="Ofis davet kodu" value={code} onChange={e => setCode(e.target.value)} maxLength={200} className={inputClass} placeholder="Ofis davet kodu" /><button className={button} disabled={busy || !code.trim()} onClick={() => void run(async () => { const r = await api.post('/office/join', { code: code.trim() }); setIssue(r.data.message); })}>Katılma Başvurusu</button>
      {data.canCreate ? <><h2 className="text-xl font-bold">Kendi emlak ofisim</h2><input aria-label="Ofis adı" value={name} onChange={e => setName(e.target.value)} maxLength={120} className={inputClass} placeholder="Emlak ofisinizin adı" /><button className={button} disabled={busy || name.trim().length < 2} onClick={() => void run(() => api.post('/office/create', { name }))}>Ofisimi Oluştur</button></> : null}</section> : null}
      {data.offices.map(office => <OfficeCard key={`${data.actorId}:${office.id}`} office={office} actorId={data.actorId} reload={load} />)}
    </>}
    <div className="pt-2 text-left"><p className="text-[10px] font-bold tracking-[0.2em] text-blue-700">EKİBİNİZE UYGUN ÜYELİK</p><h2 className="mt-2 text-2xl font-bold">Ofis Paketleri</h2></div><div className="grid gap-4 md:grid-cols-2">{packages.map((p, i) => <OfficeMembershipCard key={`${p.code}-${i}`} item={p} />)}</div><p className="text-sm text-slate-500">Ofis paketleri mevcut katalogdan gösterilir. Paket satışları şu anda kapalıdır.</p>
  </main>;
}
function OfficeCard({ office, actorId, reload }: { office: Office; actorId: string; reload: () => Promise<void> }) {
  const [issue, setIssue] = useState(''), [invite, setInvite] = useState(''), [busy, setBusy] = useState(false), [pending, setPending] = useState<Intent | null>(null), [memberId, setMemberId] = useState(''), [amount, setAmount] = useState(''), [ready, setReady] = useState(false);
  const lock = useRef(false);
  const key = `eph.office.transfer.${actorId}.${office.id}`, base = `/office/${encodeURIComponent(office.id)}`;
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) { const value = JSON.parse(raw) as Intent; if (value.userId !== actorId || !/^[A-Za-z0-9_-]{16,100}$/.test(value.requestId) || !Number.isSafeInteger(value.amount) || value.amount <= 0) throw new Error('Kaydedilmiş PK işlemi doğrulanamadı.'); setPending(value); setMemberId(value.memberId); setAmount(String(value.amount)); } setReady(true); } catch (e) { setIssue(message(e)); } }, [actorId, key]);
  const run = async (work: () => Promise<unknown>) => { if (lock.current) return; lock.current = true; setBusy(true); setIssue(''); try { if (useAuthStore.getState().user?.id !== actorId) throw new Error('Oturum değişti.'); await work(); if (useAuthStore.getState().user?.id === actorId) await reload(); } catch (e) { setIssue(message(e)); } finally { lock.current = false; setBusy(false); } };
  const transfer = () => { const pk = Number(amount); if (!Number.isSafeInteger(pk) || pk <= 0) { setIssue('Pozitif tam sayı PK girin.'); return; } const recipient = office.members.find(m => m.id === memberId); if (!window.confirm(`${pk.toLocaleString('tr-TR')} PK, ofis sahibinden ${recipient ? `${recipient.firstName} ${recipient.lastName}` : memberId} hesabına aktarılacak. Onaylıyor musunuz?`)) return;
    void run(async () => { const intent = pending || { requestId: crypto.randomUUID(), memberId, amount: pk, userId: actorId }; localStorage.setItem(key, JSON.stringify(intent)); setPending(intent); try { const r = await api.post(base + '/transfer', intent); if (!r.data.ok || r.data.amount !== intent.amount || r.data.memberId !== intent.memberId) throw new Error('Aktarım makbuzu doğrulanamadı. Aynı işlemi kontrol edin.'); if (useAuthStore.getState().user?.id !== actorId) throw new Error('Oturum değişti.'); localStorage.removeItem(key); setPending(null); setAmount(''); setIssue('PK dağıtımı tamamlandı.'); } catch (e) { const status = (e as { response?: { status?: number } }).response?.status; if (status && [400, 403, 404].includes(status)) { localStorage.removeItem(key); setPending(null); } throw e; } });
  };
  return <section className={card}><OfficeIdentityCard office={office} actorId={actorId} reload={reload} /><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left"><div><p className="text-xs font-semibold text-slate-500">{office.isOwner || office.mode === 'SHARED' ? 'Ofis sahibinin ortak bakiyesi' : 'Danışman bakiyeniz'}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{office.balance.toLocaleString('tr-TR')} <span className="text-base text-blue-700">PK</span></p></div><span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700">{office.mode === 'SHARED' ? 'Ortak Havuz' : 'Dağıtım Modu'}</span></div>
    {office.isOwner ? <>{!office.modeConfigured ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">PK kullanım tercihinizi aşağıdaki iki seçenekten biriyle onaylayın.</p> : null}<p className="text-sm text-slate-500">Tek para birimi PK’dir. Sahip olduğunuz ofisler aynı sahip bakiyesini kullanır. Dağıtılan PK danışmana geçer; ortak mod mevcut bakiyeyle sınırlıdır.</p><div className="flex flex-wrap gap-3">{(['ALLOCATED', 'SHARED'] as const).map(mode => <button key={mode} className={button} disabled={busy || !!pending || (office.modeConfigured && office.mode === mode)} onClick={() => { if (window.confirm(mode === 'SHARED' ? 'Tüm danışmanlarınız mevcut ortak PK bakiyesini kişi başına limit olmadan kullanabilecek. Onaylıyor musunuz?' : 'Danışmanlar kendilerine aktarılan PK ile işlem yapacak. Önceki aktarımlar geri alınmaz. Danışmanlarınız güncel uygulamayı kullanmalı. Onaylıyor musunuz?')) void run(() => api.post(base + '/spending-mode', { mode })); }}>{mode === 'SHARED' ? 'Ortak Havuz' : 'Danışmana Dağıt'}</button>)}<button className={button} disabled={busy} onClick={() => void run(async () => { const r = await api.post(base + '/invite'); setInvite(r.data.code); })}>Yeni Davet Kodu</button></div>
    {invite ? <div><p className="break-all rounded-xl bg-slate-100 p-3 font-mono text-sm select-all">{invite}</p><p className="mt-2 text-xs text-slate-500">7 gün geçerlidir. Yeni kod eski kodu geçersiz kılar. Danışman başvurularını ayrıca onaylayın.</p></div> : null}
    <h3 className="font-bold">Katılma Başvuruları</h3>{office.applicants.length ? office.applicants.map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span>{m.firstName} {m.lastName}</span><div className="flex gap-2">{[true, false].map(approve => <button key={String(approve)} className={button} disabled={busy} onClick={() => void run(() => api.post(base + '/join-decision', { memberId: m.id, approve }))}>{approve ? 'Kabul Et' : 'Reddet'}</button>)}</div></div>) : <p className="text-sm text-slate-500">Bekleyen başvuru yok.</p>}
    <h3 className="font-bold">Danışmanlar ve PK Dağıtımı</h3>{office.mode === 'ALLOCATED' ? <><select aria-label="PK dağıtılacak danışman" className={inputClass} value={memberId} onChange={e => setMemberId(e.target.value)} disabled={busy || !!pending}><option value="">Danışman seçin</option>{office.members.filter(m => m.id !== actorId).map(m => <option key={m.id} value={m.id} disabled={!m.isApproved || !m.isVerified}>{m.firstName} {m.lastName}</option>)}</select><input aria-label="PK miktarı" inputMode="numeric" className={inputClass} maxLength={10} value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} disabled={busy || !!pending} placeholder="PK miktarı" /><button className={button} disabled={busy || !ready || !memberId || !amount} onClick={transfer}>{pending ? 'Bekleyen İşlemi Tamamla' : 'PK Dağıtımını Onayla'}</button>{pending ? <p className="text-sm text-slate-500">Aynı işlem anahtarıyla kontrol edilir; ikinci kez PK aktarılmaz.</p> : null}</> : <><p className="text-sm text-slate-500">Ortak kullanım açık. Danışmanlara tek tek PK dağıtmanız gerekmez.</p>{office.members.filter(m => m.id !== actorId).map(m => <p key={m.id} className="rounded-xl bg-slate-50 p-3 text-sm">{m.firstName} {m.lastName}</p>)}</>}
    </> : null}{issue ? <p role="alert" className="text-sm text-red-700">{issue}</p> : null}
  </section>;
}
