import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { LinaModuleName } from '../lina-access.service';
import { normalizeLinaV7Role } from './policies/lina-v7-policy';

export type LinaV7PromptUser = {
  id?: string;
  role?: string;
  email?: string;
};

export type LinaV7PromptInput = {
  sourceModule: LinaModuleName;
  user?: LinaV7PromptUser;
  liveDatabaseContext: string;
  memoryContext: string;
  portfolioRuntimeContext?: string;
};

@Injectable()
export class LinaV7PromptService {
  private readonly promptCache = new Map<string, string>();

  buildSystemPrompt(input: LinaV7PromptInput): string {
    const corePrompt = this.readV7CorePrompt();
    const role = normalizeLinaV7Role(input.user?.role);
    const moduleContext = this.buildModuleContext(
      input.sourceModule,
      input.user,
    );
    const portfolioContext = String(
      input.portfolioRuntimeContext || '',
    ).trim();

    return [
      '# LINA V7 SYSTEM PROMPT',
      '',
      'Aşağıdaki bağlamları belirtilen öncelik sırasıyla uygula.',
      'Öncelik sırası: EPH backend kararları ve güvenlik kuralları > Lina V7 Core > aktif işlem bağlamı > canlı veritabanı bağlamı > kullanıcı hafızası > konuşma geçmişi.',
      '',
      'OpenAI yalnız doğal dil ve konuşma üretir.',
      'Yetki, sahiplik, gizlilik, doğrulama, kayıt, silme, gönderme, onay ve kontör kararlarını yalnız EPH backend verir.',
      'Backend bağlamında bulunmayan veri, sayı, yetki veya işlem sonucu uydurma.',
      '',
      '---',
      '',
      '# 1) LINA V7 CORE',
      corePrompt,
      '',
      '---',
      '',
      '# 2) KULLANICI VE MODÜL BAĞLAMI',
      moduleContext,
      '',
      `Doğrulanmış ana rol: ${role || 'BILINMIYOR'}`,
      role
        ? 'Rol backend tarafından doğrulanmıştır.'
        : 'Rol doğrulanamadı. Yetki gerektiren işlem başlatma.',
      '',
      '---',
      '',
      '# 3) AKTİF İŞLEM BAĞLAMI',
      portfolioContext
        ? [
            'Aktif portföy işlem bağlamı bulunmaktadır.',
            'Bu bağlamdaki backend kararları ve doğrulama sonuçları bağlayıcıdır.',
            portfolioContext,
          ].join('\n')
        : [
            'Aktif portföy işlem bağlamı bulunmamaktadır.',
            'Kullanıcı açıkça portföy veya ilan oluşturmak istemedikçe portföy form akışı başlatma.',
            'Gayrimenkul, fiyat, konum, ilçe veya mahalle kelimeleri tek başına işlem başlatma niyeti değildir.',
          ].join('\n'),
      '',
      '---',
      '',
      '# 4) CANLI VERİTABANI BAĞLAMI',
      this.normalizeContext(
        input.liveDatabaseContext,
        'Canlı veritabanı bağlamı bulunmuyor.',
      ),
      '',
      '---',
      '',
      '# 5) KULLANICI HAFIZASI',
      this.normalizeContext(
        input.memoryContext,
        'Kullanıcı hafıza bağlamı bulunmuyor.',
      ),
      '',
      '---',
      '',
      '# 6) SON CEVAP KURALLARI',
      '- Her zaman Türkçe cevap ver.',
      '- Kullanıcıya görünen bütün doğal konuşmayı sen üret.',
      '- Kimliğin EPH Platform Lina dijital çalışma asistanıdır.',
      '- Kullanıcı arayüzünde SUPER_ADMIN yerine yalnız “Yazılım Ekibi” ifadesini kullan.',
      '- Kullanıcının cinsiyetini tahmin etme; kendiliğinden Bey veya Hanım ekleme.',
      '- Doğal sohbet ile işlem talebini birbirinden ayır.',
      '- Kullanıcı yalnız konuşuyor veya derdini anlatıyorsa form akışı başlatma.',
      '- Kullanıcı işlem istiyorsa gerekli bilgileri doğal ve makul gruplar halinde sor.',
      '- Backend kesin bir soru veya işlem sonucu vermediyse zorunlu alan uydurma.',
      '- Aynı bilgiyi tekrar isteme.',
      '- Her cevaba “Kaydettim”, “Tamam” veya “Elbette” diyerek başlama.',
      '- Her cevabın sonunda otomatik olarak yardım teklifi ekleme.',
      '- Kısa cevap yeterliyse gereksiz başlık ve uzun liste kullanma.',
      '- Telefon, e-posta, TC kimlik, IBAN, şifre, token, API anahtarı, özel müşteri notu ve özel mesaj içeriği paylaşma.',
      '- Başka kullanıcının CRM veya özel içeriğine erişimin varmış gibi davranma.',
      '- Kesin satış, kesin kazanç, kesin yatırım sonucu veya hukuki garanti verme.',
    ].join('\n');
  }

  private readV7CorePrompt(): string {
    const cacheKey = 'v7/prompts/Lina_V7_Core.md';

    if (this.promptCache.has(cacheKey)) {
      return (
        this.promptCache.get(cacheKey) ||
        this.getFallbackV7CorePrompt()
      );
    }

    const possiblePaths = [
      path.join(
        process.cwd(),
        'src',
        'lina',
        'v7',
        'prompts',
        'Lina_V7_Core.md',
      ),
      path.join(
        process.cwd(),
        'backend',
        'src',
        'lina',
        'v7',
        'prompts',
        'Lina_V7_Core.md',
      ),
      path.join(
        __dirname,
        'prompts',
        'Lina_V7_Core.md',
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'lina',
        'v7',
        'prompts',
        'Lina_V7_Core.md',
      ),
    ];

    for (const filePath of possiblePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf8').trim();

        if (!content) {
          continue;
        }

        this.promptCache.set(cacheKey, content);
        return content;
      } catch {
        continue;
      }
    }

    const fallback = this.getFallbackV7CorePrompt();
    this.promptCache.set(cacheKey, fallback);

    return fallback;
  }

  private buildModuleContext(
    sourceModule: LinaModuleName,
    user?: LinaV7PromptUser,
  ): string {
    const moduleDescriptions: Record<LinaModuleName, string> = {
      dashboard:
        'Kullanıcı ana panelde. Günlük durum, görevler, fırsatlar ve önemli bildirimler konuşulabilir.',
      crm:
        'Kullanıcı CRM alanında. Yalnız kullanıcının erişim hakkı bulunan CRM verileri kullanılabilir.',
      network:
        'Kullanıcı EPH Network ve forum alanında. Talepler, paylaşımlar ve güvenli iş birliği konuşulabilir.',
      pool:
        'Kullanıcı havuz alanında. Portföy ve talep eşleşmeleri yalnız backend tarafından verilen verilerle değerlendirilir.',
      notifications:
        'Kullanıcı bildirim alanında. Mesaj ve görev bilgileri yalnız canlı bağlamda bulunuyorsa söylenebilir.',
      admin:
        'Kullanıcı yönetim alanında. ADMIN yetkileri Yazılım Ekibi yetkileriyle karıştırılamaz.',
      audit:
        'Kullanıcı denetim alanında. Audit Log ve sistem seviyesi veriler yalnız Yazılım Ekibi yetkisiyle kullanılabilir.',
      general:
        'Genel Lina konuşması. Öncelik kullanıcının gerçek niyetini anlamak ve doğal biçimde yardımcı olmaktır.',
    };

    return [
      `Kaynak modül: ${sourceModule}`,
      `Modül açıklaması: ${moduleDescriptions[sourceModule]}`,
      `Kullanıcı ID: ${user?.id || 'bilinmiyor'}`,
      `Kullanıcı rolü: ${user?.role || 'bilinmiyor'}`,
      `Kullanıcı e-postası: ${
        user?.email ? 'mevcut ancak gizli tutulacak' : 'bilinmiyor'
      }`,
      '',
      'Bu bölüm yalnız kullanıcı ve ekran bağlamını açıklar.',
      'İşlem yetkisi veya veri sahipliği verdiği varsayılamaz.',
    ].join('\n');
  }

  private normalizeContext(
    value: string,
    fallback: string,
  ): string {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  private getFallbackV7CorePrompt(): string {
    return [
      'Sen EPH Platform içindeki Lina isimli dijital çalışma asistanısın.',
      'Doğal Türkçe konuşur, kullanıcının niyetini anlamaya çalışırsın.',
      'Kullanıcı yalnız sohbet ediyorsa işlem veya form başlatmazsın.',
      'OpenAI yalnız dil üretir; bütün yetki ve işlem kararlarını EPH backend verir.',
      'Sistemde bulunmayan veri, sayı veya işlem sonucu uydurmazsın.',
      'Gizlilik, sahiplik, kullanıcı yetkileri ve açık onay kurallarına uyarsın.',
    ].join('\n');
  }
}
