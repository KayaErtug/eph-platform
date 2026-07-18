import { LinaV7PromptService } from './lina-v7-prompt.service';

describe('LinaV7PromptService', () => {
  let service: LinaV7PromptService;

  beforeEach(() => {
    service = new LinaV7PromptService();
  });

  it('Lina V7 sistem promptunu oluşturur', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'general',
      user: {
        id: 'user-1',
        role: 'EMLAKCI',
        email: 'user@example.com',
      },
      liveDatabaseContext: 'Canlı veri bulunmuyor.',
      memoryContext: 'Kullanıcı hafızası bulunmuyor.',
    });

    expect(prompt).toContain('# LINA V7 SYSTEM PROMPT');
    expect(prompt).toContain('# 1) LINA V7 CORE');
    expect(prompt).toContain('Doğrulanmış ana rol: EMLAKCI');
    expect(prompt).toContain('OpenAI yalnız doğal dil ve konuşma üretir.');
  });

  it('eski V5 ana prompt başlığını üretmez', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'general',
      user: {
        id: 'user-1',
        role: 'EMLAKCI',
      },
      liveDatabaseContext: '',
      memoryContext: '',
    });

    expect(prompt).not.toContain('# LINA V5 SYSTEM PROMPT');
    expect(prompt).not.toContain('# 3) LINA V5 CONSTITUTION');
    expect(prompt).not.toContain('# 5) ROLE PROMPT');
  });

  it('bilinmeyen rolü EMLAKCI olarak kabul etmez', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'general',
      user: {
        id: 'user-1',
        role: 'UNKNOWN_ROLE',
      },
      liveDatabaseContext: '',
      memoryContext: '',
    });

    expect(prompt).toContain('Doğrulanmış ana rol: BILINMIYOR');
    expect(prompt).toContain(
      'Rol doğrulanamadı. Yetki gerektiren işlem başlatma.',
    );
  });

  it('aktif portföy bağlamını backend kararı olarak ekler', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'pool',
      user: {
        id: 'user-1',
        role: 'EMLAKCI',
      },
      liveDatabaseContext: '',
      memoryContext: '',
      portfolioRuntimeContext: [
        'PORTFOLIO_SESSION_ACTIVE=true',
        'PORTFOLIO_REQUIRED_FIELD=city',
      ].join('\n'),
    });

    expect(prompt).toContain(
      'Aktif portföy işlem bağlamı bulunmaktadır.',
    );
    expect(prompt).toContain('PORTFOLIO_SESSION_ACTIVE=true');
    expect(prompt).toContain('PORTFOLIO_REQUIRED_FIELD=city');
  });

  it('portföy bağlamı yokken form akışını kendiliğinden başlatmaz', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'general',
      user: {
        id: 'user-1',
        role: 'MUTEAHHIT',
      },
      liveDatabaseContext: '',
      memoryContext: '',
    });

    expect(prompt).toContain(
      'Aktif portföy işlem bağlamı bulunmamaktadır.',
    );
    expect(prompt).toContain(
      'Kullanıcı açıkça portföy veya ilan oluşturmak istemedikçe portföy form akışı başlatma.',
    );
  });

  it('canlı veritabanı ve hafıza bağlamını korur', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'dashboard',
      user: {
        id: 'user-1',
        role: 'INSAAT_FIRMASI',
      },
      liveDatabaseContext: 'Aktif portföy sayısı: 3',
      memoryContext: 'Kullanıcı kısa cevap tercih ediyor.',
    });

    expect(prompt).toContain('Aktif portföy sayısı: 3');
    expect(prompt).toContain('Kullanıcı kısa cevap tercih ediyor.');
  });

  it('SUPER_ADMIN ifadesini kullanıcı arayüzü için Yazılım Ekibi olarak sınırlar', () => {
    const prompt = service.buildSystemPrompt({
      sourceModule: 'audit',
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
      },
      liveDatabaseContext: '',
      memoryContext: '',
    });

    expect(prompt).toContain('Doğrulanmış ana rol: SUPER_ADMIN');
    expect(prompt).toContain(
      'Kullanıcı arayüzünde SUPER_ADMIN yerine yalnız “Yazılım Ekibi” ifadesini kullan.',
    );
  });
});
