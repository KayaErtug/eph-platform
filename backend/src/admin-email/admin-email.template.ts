export const ADMIN_EMAIL_RECIPIENT = 'ephplatform@gmail.com';
export const ADMIN_EMAIL_PANEL = 'https://emlakportfoyhavuzu.com/admin';

export type AdminEmailEvent = {
  id: string; recipient: string; category: string; entityType: string; entityId: string | null;
  title: string; summary: string; actorLabel: string | null; createdAt: Date; attempts: number;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function renderAdminEmail(event: AdminEmailEvent) {
  const date = new Date(event.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const modules: Record<string, string> = { User: 'Üyelik ve mesleki profil', Document: 'Mesleki belgeler', Application: 'Katılım başvuruları',
    Nomination: 'Aday gösterimleri', Unit: 'Portföy incelemeleri', PortfolioAuthorityDocument: 'Portföy belgeleri',
    Project: 'Proje incelemeleri', ProjectDesignReviewRequest: 'Proje tasarım incelemeleri', Report: 'İçerik şikâyetleri',
    AccountDeletionRequest: 'Hesap silme talepleri', Lead: 'İletişim kayıtları', PaymentOrder: 'Ödemeler', PaymentRefund: 'İadeler',
    PaymentTransaction: 'Ödeme işlemleri', PaymentWebhookEvent: 'Ödeme bildirimleri', AdminActionLog: 'Yönetim işlemleri',
    AuditLog: 'Yetki ve sistem denetimi', UserRestriction: 'Kullanıcı kısıtlamaları', LinaDenetim: 'Lina denetimi',
    Invitation: 'Üye davetleri', LinaEpostaGonderimKaydi: 'Lina e-posta gönderimleri', System: 'Yönetici bildirim sistemi' };
  const details = [event.summary, modules[event.entityType] ? `Bölüm: ${modules[event.entityType]}` : '', event.actorLabel ? `İlgili kişi: ${event.actorLabel}` : '',
    event.entityId ? `Kayıt numarası: ${event.entityId}` : '', `Tarih: ${date}`].filter(Boolean);
  const text = `${event.title}\n\n${details.join('\n')}\n\nGüncel durumu ve yapılacak işlemi yönetim ekranından kontrol edin.\n${ADMIN_EMAIL_PANEL}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><div style="background:#2563eb;color:white;padding:22px;border-radius:16px 16px 0 0"><strong>EPH · Yönetici Bildirimi</strong><h2>${escapeHtml(event.title)}</h2></div><div style="padding:22px;border:1px solid #dbe4ef;border-radius:0 0 16px 16px">${details.map(line => `<p style="white-space:pre-line;line-height:1.6">${escapeHtml(line)}</p>`).join('')}<p>Güncel durumu ve yapılacak işlemi yönetim ekranından kontrol edin.</p><a href="${ADMIN_EMAIL_PANEL}" style="display:inline-block;padding:14px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:12px;font-weight:bold">Yönetim Panelini Aç</a></div></div>`;
  return { subject: `[EPH] ${event.title.replace(/[\r\n]/g, ' ').slice(0, 140)}`, text, html };
}
