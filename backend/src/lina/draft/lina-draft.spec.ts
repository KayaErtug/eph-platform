import { LinaCrmExtractionService } from "./lina-crm-extraction.service";
import { LinaDraftFlowService } from "./lina-draft-flow.service";
import {
  guardWriteClaims,
  mergeDraft,
  missingRequired,
  NO_WRITE_NOTICE,
  validName,
} from "./lina-draft-logic";
import { bosAlanlar, HamCikarim } from "./lina-draft.types";
import { fuzzyEqual, LinaLocationValidatorService } from "./lina-location-validator.service";
import { emptyMaskState, LinaMaskingService } from "./lina-masking.service";
import { LinaModelSettingsService } from "../lina-model-settings.service";

process.env.LINA_MASK_KEY = "test-anahtar";

const ham = (patch: Partial<HamCikarim> = {}): HamCikarim => ({
  niyet: "crm_kayit", adSoyad: null, telefon: null, email: null, rol: null, mulkTipi: null, il: null, ilce: null,
  mahalleler: [], mahalleDegistir: false, butceMin: null, butceMax: null, m2Min: null, m2Max: null, odaSayisi: null,
  odaEnAz: null, ozellikler: [], ozellikCikar: [], not: null, ...patch,
});

describe("LinaMaskingService", () => {
  const masking = new LinaMaskingService();

  it("telefonu numaralı jetonla maskeler, önündeki boşluğu yutmaz ve geri çözer", () => {
    const { text, state } = masking.mask("Adı: Melissa Vargas tlf numarası 533 123 45 67", emptyMaskState());
    expect(text).toBe("Adı: Melissa Vargas tlf numarası [TEL_1]");
    expect(masking.unmask(text, state)).toContain("533 123 45 67");
    expect(masking.resolveToken("[TEL_1]", "TEL", state)).toBe("533 123 45 67");
  });

  it("aynı değer aynı jetonu, farklı değer yeni jetonu alır; e-posta ve IBAN jetonlanır", () => {
    const a = masking.mask("0533 123 45 67 ve a@b.com", emptyMaskState());
    const b = masking.mask("0533 123 45 67 ile 0544 111 22 33, TR33 0006 1005 1978 6457 8413 26", a.state);
    expect(a.text).toBe("[TEL_1] ve [EPOSTA_1]");
    expect(b.text).toBe("[TEL_1] ile [TEL_2], [IBAN_1]");
  });

  it("tutarlar telefon sanılmaz", () => {
    for (const t of ["Bütçe 550 000 00 00 TL", "Bütçe 550.000.000 TL", "bütçesi 20.000.000-TL"]) {
      expect(masking.mask(t, emptyMaskState()).text).toBe(t);
    }
  });

  it("modelin uydurduğu rakam kabul edilmez, yalnız mevcut jeton çözülür", () => {
    const { state } = masking.mask("tel 533 123 45 67", emptyMaskState());
    expect(masking.resolveToken("0555 999 88 77", "TEL", state)).toBeNull();
    expect(masking.resolveToken("[TEL_9]", "TEL", state)).toBeNull();
    expect(masking.resolveToken("[EPOSTA_1]", "TEL", state)).toBeNull();
  });

  it("eşleme şifreli saklanır ve geri okunur", () => {
    const { state } = masking.mask("tel 533 123 45 67", emptyMaskState());
    const enc = masking.encrypt(state);
    expect(enc).not.toContain("533");
    expect(masking.decrypt(enc).esleme["[TEL_1]"]).toBe("533 123 45 67");
  });
});

describe("taslak mantığı", () => {
  it("cümle parçaları ve mülk tipi isim olamaz", () => {
    expect(validName("Datılık Daire Arıyor")).toBeNull();
    expect(validName("Satılık daire")).toBeNull();
    expect(validName("Melissa Vargas")).toBe("Melissa Vargas");
  });

  it("mesajlar arası birleşir; null eskiyi silmez; düzeltme alanı günceller", () => {
    let a = mergeDraft(bosAlanlar(), ham({ adSoyad: "Melissa Vargas", rol: "alıcı" }), { telefon: "533 123 45 67", email: null, konum: null });
    a = mergeDraft(a, ham({ butceMax: 20000000, odaSayisi: "4+1", odaEnAz: true }), { telefon: null, email: null, konum: null });
    a = mergeDraft(a, ham({ odaSayisi: "3+1", odaEnAz: false }), { telefon: null, email: null, konum: null });
    expect(a).toMatchObject({ adSoyad: "Melissa Vargas", telefon: "533 123 45 67", butceMax: 20000000, odaSayisi: "3+1", odaEnAz: false });
  });

  it("konumda mahalleler birleşir, mahalleDegistir değiştirir", () => {
    const k = (m: string[]) => ({ il: "Denizli", ilce: "Merkezefendi", mahalleler: m, dogrulanamayan: [], belirsiz: [] });
    let a = mergeDraft(bosAlanlar(), ham({ mahalleler: ["Servergazi"] }), { telefon: null, email: null, konum: k(["Servergazi"]) });
    a = mergeDraft(a, ham({ mahalleler: ["Gerzele"] }), { telefon: null, email: null, konum: k(["Gerzele"]) });
    expect(a.mahalleler).toEqual(["Servergazi", "Gerzele"]);
    a = mergeDraft(a, ham({ mahalleler: ["Sırakapılar"], mahalleDegistir: true }), { telefon: null, email: null, konum: k(["Sırakapılar"]) });
    expect(a.mahalleler).toEqual(["Sırakapılar"]);
  });

  it("zorunlu alanlar: ad+soyad, rol, talep/iletişim", () => {
    expect(missingRequired(bosAlanlar())).toHaveLength(3);
    const a = { ...bosAlanlar(), adSoyad: "Melissa", rol: "alıcı" as const, telefon: "5331234567" };
    expect(missingRequired(a)).toEqual(["müşterinin soyadı"]);
    expect(missingRequired({ ...a, adSoyad: "Melissa Vargas" })).toEqual([]);
  });

  it("yazma sonucu yokken 'not ettim' iddiası düzeltilir", () => {
    expect(guardWriteClaims("Talebinizi not ettim.")).toContain(NO_WRITE_NOTICE);
    expect(guardWriteClaims("Hangi mahalle?")).toBe("Hangi mahalle?");
  });
});

describe("LinaCrmExtractionService", () => {
  it("şemalı (strict) çıkarım ve çıkarım modeliyle çağırır, bozuk alanları null'a indirir", async () => {
    const client = {
      createResponse: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({ ...ham({ adSoyad: "Melissa Vargas" }), rol: "bilinmeyen", butceMax: -5, mulkTipi: "UCAN_HALI" }),
      }),
    };
    const settings = { getExtractionModel: jest.fn().mockResolvedValue("gpt-4.1") };
    const service = new LinaCrmExtractionService(client as never, settings as never);
    const out = await service.extract("mesaj", null);
    const request = client.createResponse.mock.calls[0][0];
    expect(request.model).toBe("gpt-4.1");
    expect(request.jsonSchema.name).toBe("crm_taslak_cikarim");
    expect(out).toMatchObject({ adSoyad: "Melissa Vargas", rol: null, butceMax: null, mulkTipi: null });
  });
});

describe("LinaModelSettingsService", () => {
  const make = (rows: Record<string, unknown>) =>
    new LinaModelSettingsService({
      systemSetting: { findUnique: async ({ where }: { where: { key: string } }) => (where.key in rows ? { valueJson: { value: rows[where.key] } } : null) },
    } as never);

  it("varsayılanlar: çıkarım gpt-4.1, sohbet gpt-4.1-mini", async () => {
    const s = make({});
    expect(await s.getExtractionModel()).toBe("gpt-4.1");
    expect(await s.getChatModel()).toBe("gpt-4.1-mini");
  });

  it("ayar izin listesindeyse kullanılır, değilse varsayılana döner", async () => {
    expect(await make({ LINA_EXTRACTION_MODEL: "gpt-4o" }).getExtractionModel()).toBe("gpt-4o");
    expect(await make({ LINA_CHAT_MODEL: "bilinmeyen-model" }).getChatModel()).toBe("gpt-4.1-mini");
    expect(await make({ LINA_CHAT_MODEL: "x-yeni", LINA_MODEL_ALLOWLIST: ["x-yeni"] }).getChatModel()).toBe("x-yeni");
  });
});

describe("LinaLocationValidatorService", () => {
  const regions = Array.from({ length: 81 }, (_, i) => (i === 0 ? "Denizli" : `İl${i}`));
  const make = (resolve: (q: string) => unknown) =>
    new LinaLocationValidatorService({
      listRegions: (c: string) => (c === "TR" ? regions : ["Girne", "Lefkoşa"]),
      resolveLocationFromMessage: async (q: string) => resolve(q),
    } as never);
  const ok = (province: string, district: string, neighborhood?: string) => ({
    success: true, verificationLevel: neighborhood ? "NEIGHBORHOOD" : "DISTRICT", province, district, neighborhood,
  });

  it("bulanık eşleşme", () => {
    expect(fuzzyEqual("Servergazi", "servergazi mah")).toBe(false);
    expect(fuzzyEqual("Merkezefendi", "Merkezefendı")).toBe(true);
    expect(fuzzyEqual("yon", "Denizli")).toBe(false);
  });

  it("il/ilçe/mahalle doğrulanır; il ilçeden tamamlanır", async () => {
    const v = make((q) =>
      q === "Merkezefendi" ? ok("Denizli", "Merkezefendi")
        : q === "Servergazi" ? ok("Denizli", "Merkezefendi", "Servergazi")
        : { success: false, alternatives: [] });
    const r = await v.validate({ il: null, ilce: "Merkezefendi", mahalleler: ["Servergazi Mahallesi", "Zzyyxx"] });
    expect(r).toMatchObject({ il: "Denizli", ilce: "Merkezefendi", mahalleler: ["Servergazi"], dogrulanamayan: ["Zzyyxx"] });
  });

  it("'yon' gibi katalogda olmayan il kaydedilmez", async () => {
    const r = await make(() => ({ success: false, alternatives: [] })).validate({ il: "yon", ilce: null, mahalleler: [] });
    expect(r.il).toBeNull();
    expect(r.dogrulanamayan).toEqual(["yon"]);
  });

  it("çoklu eşleşme il/ilçe ile daraltılır; daraltılamazsa belirsiz", async () => {
    const alt = { success: false, alternatives: ["Denizli / Merkezefendi / Yenişehir", "Mersin / Yenişehir / Yenişehir"] };
    const v = make(() => alt);
    expect((await v.validate({ il: "Denizli", ilce: null, mahalleler: ["Yenişehir"] })).mahalleler).toEqual(["Yenişehir"]);
    expect((await v.validate({ il: null, ilce: null, mahalleler: ["Yenişehir"] })).belirsiz).toEqual(["Yenişehir"]);
  });
});

describe("LinaDraftFlowService (kalıcı taslak)", () => {
  // Bellekteki sahte DB: servis örneği yeniden oluşturulsa da (PM2 restart) taslak kalır.
  const makeDb = () => {
    const rows: Array<Record<string, any>> = [];
    let n = 0;
    const match = (row: Record<string, any>, where: Record<string, any>) =>
      Object.entries(where).every(([k, v]) => {
        if (v && typeof v === "object" && "in" in v) return v.in.includes(row[k]);
        if (v && typeof v === "object" && "gt" in v) return row[k] > v.gt;
        return row[k] === v;
      });
    return {
      rows,
      linaTaslak: {
        findFirst: async ({ where }: any) => rows.filter((r) => match(r, where)).slice(-1)[0] ?? null,
        create: async ({ data }: any) => { const r = { id: `t${++n}`, sonSonuc: null, ...data }; rows.push(r); return r; },
        update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id)!; Object.assign(r, data); return r; },
      },
      customer: { findFirst: async () => null },
    };
  };

  const build = (db: ReturnType<typeof makeDb>, extractions: HamCikarim[], crm: any = {}) => {
    const queue = [...extractions];
    const masking = new LinaMaskingService();
    return new LinaDraftFlowService(
      db as never,
      masking,
      { extract: jest.fn(async () => queue.shift()!) } as never,
      {
        validate: async (i: any) => ({
          il: i.il ? "Denizli" : null, ilce: i.ilce ? "Merkezefendi" : null,
          mahalleler: i.mahalleler, dogrulanamayan: [], belirsiz: [],
        }),
      } as never,
      { checkModuleAccess: () => ({ allowed: true }) } as never,
      crm as never,
    );
  };
  const user = { id: "u1", role: "EMLAKCI" };
  const chat = (flow: LinaDraftFlowService, message: string) => flow.handle({ message } as never, user, "crm");

  it("boş komut taslak hazır sayılmaz; eksikler tek mesajda sorulur; Onayla kayıt yapmaz", async () => {
    const createCustomer = jest.fn();
    const flow = build(makeDb(), [ham()], { createCustomer });
    const first = await chat(flow, "Crm/müşteri kaydı oluştur");
    expect(first.requiresConfirmation).toBe(false);
    expect(first.message).toContain("Henüz kayıt oluşturulmadı");
    const confirm = await chat(flow, "Onayla");
    expect(confirm.message).toContain("Eksik");
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("mesajlar birleşir, telefon gerçek değerle kaydedilir, PM2 restart taslağı kaybettirmez", async () => {
    const db = makeDb();
    const createCustomer = jest.fn().mockResolvedValue({ id: "c1", interests: [{ id: "i1" }] });
    const e1 = ham({ adSoyad: "Melissa Vargas", telefon: "[TEL_1]", rol: "alıcı" });
    const e2 = ham({ butceMax: 20000000, il: "Denizli", ilce: "Merkezefendi", mahalleler: ["Servergazi", "Gerzele"], m2Min: 200, ozellikler: ["havuz", "otopark"], mulkTipi: "DAIRE" });

    const r1 = await chat(build(db, [e1]), "Adı: Melissa Vargas tlf numarası 533 123 45 67, alıcı");
    expect(r1.requiresConfirmation).toBe(true);
    expect(db.rows[0].maskeEsleme).not.toContain("533");

    const flow2 = build(db, [e2], { createCustomer }); // yeni servis örneği = yeniden başlatma
    const r2 = await chat(flow2, "Bütçe max 20 milyon, Denizli Merkezefendi Servergazi veya Gerzele, min 200 m2 havuz otopark daire");
    expect(r2.message).toContain("Bütçe: en fazla 20.000.000 TL");
    expect(r2.message).toContain("Mahalle: Servergazi, Gerzele");

    const done = await chat(flow2, "Onayla");
    expect(done.success).toBe(true);
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createCustomer.mock.calls[0][1]).toMatchObject({
      firstName: "Melissa", lastName: "Vargas", phone: "533 123 45 67", city: "Denizli", maxBudget: 20000000, minArea: 200,
      features: ["havuz", "otopark"], roles: ["ALICI"], propertyTypes: ["DAIRE"],
    });
    expect(createCustomer.mock.calls[0][1].interestAreas).toHaveLength(2);
    expect(db.rows[0].durum).toBe("KAYDEDILDI");
    expect(db.rows[0].maskeEsleme).toBeNull();
  });

  it("CRM ile ilgisiz mesaj ve taslaksız 'diger' niyet taslağı etkilemez", async () => {
    const db = makeDb();
    const flow = build(db, [ham({ niyet: "diger" })]);
    expect((await chat(flow, "Müşterilerimi listele")).handled).toBe(false);
    expect(db.rows).toHaveLength(0);
    expect((await chat(flow, "Merhaba nasılsın")).handled).toBe(false);
  });

  it("'İptal' taslağı kapatır", async () => {
    const db = makeDb();
    const flow = build(db, [ham({ adSoyad: "Ali Veli", rol: "alıcı", telefon: null, il: "Denizli" })]);
    await chat(flow, "yeni müşteri Ali Veli alıcı Denizli");
    const r = await chat(flow, "İptal");
    expect(r.message).toContain("iptal edildi");
    expect(db.rows[0].durum).toBe("IPTAL");
  });
});
