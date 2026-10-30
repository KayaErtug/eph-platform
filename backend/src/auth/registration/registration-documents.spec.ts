import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PendingRegistrationService } from './pending-registration.service';
import { RegistrationV2Service } from './registration-v2.service';
import { ProfileService } from '../../profile/profile.service';

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('test-password-hash') }));
const email = 'registration@example.invalid';
const phone = '+90 533 123 45 67';
const file = { buffer: Buffer.from('test-pdf'), size: 8, mimetype: 'application/pdf', originalname: 'belge.pdf' } as any;
const input = { email, phone, role: Role.ADAY };

// İzole repository double'ı: üretim DB/storage çağrısı yok; transaction hata halinde geri alır.
function fixture() {
  let state: any = { pending: [], users: [], documents: [] };
  let nextId = 0;
  let failDocument = false;
  let failPendingCreate = false;
  const clone = (v: any) => structuredClone(v);
  const pendingMatches = (p: any, w: any) => w.OR
    ? w.OR.some((condition: any) => Object.entries(condition).every(([k, v]) => p[k] === v))
    : Object.entries(w).every(([k, v]: any) => v && typeof v === 'object' && 'not' in v ? p[k] != null : p[k] === v);
  const db: any = {
    pendingRegistration: {
      findMany: jest.fn(async ({ where }) => clone(state.pending.filter((p: any) => pendingMatches(p, where)))),
      findUnique: jest.fn(async ({ where }) => clone(state.pending.find((p: any) => p.id === where.id) || null)),
      findFirst: jest.fn(async ({ where }) => clone(state.pending.find((p: any) => pendingMatches(p, where)) || null)),
      deleteMany: jest.fn(async ({ where }) => { state.pending = state.pending.filter((p: any) => !pendingMatches(p, where)); }),
      create: jest.fn(async ({ data }) => {
        if (failPendingCreate) throw Error('pending insert failed');
        const p = { id: `pending-${++nextId}`, phoneVerified: false, emailVerified: false, completedAt: null, ...clone(data) };
        state.pending.push(p); return clone(p);
      }),
      update: jest.fn(async ({ where, data }) => {
        const p = state.pending.find((p: any) => p.id === where.id);
        if (!p) throw Error('pending not found');
        Object.assign(p, clone(data)); return clone(p);
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }) => {
        const user = state.users.find((u: any) => Object.entries(where).every(([k, v]) => u[k] === v));
        return user ? { ...clone(user), capabilities: user.capabilities || [], documents: clone(state.documents.filter((d: any) => d.userId === user.id)) } : null;
      }),
      findFirst: jest.fn(async ({ where }) => clone(state.users.find((u: any) => pendingMatches(u, where)) || null)),
      create: jest.fn(async ({ data }) => {
        const user = { id: `user-${++nextId}`, ...clone(data) };
        state.users.push(user); return clone(user);
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = state.users.find((u: any) => u.id === where.id);
        Object.assign(user, clone(data)); return clone(user);
      }),
    },
    document: {
      findFirst: jest.fn(async ({ where }) => clone(state.documents.find((d: any) => pendingMatches(d, where)) || null)),
      create: jest.fn(async ({ data }) => {
        if (failDocument) throw Error('document insert failed');
        const document = { id: `doc-${++nextId}`, status: 'PENDING', ...clone(data) };
        state.documents.push(document); return clone(document);
      }),
      update: jest.fn(async ({ where, data }) => {
        const document = state.documents.find((d: any) => d.id === where.id);
        Object.assign(document, clone(data)); return clone(document);
      }),
    },
    userCapability: { upsert: jest.fn() },
    referralCandidate: { updateMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  db.$transaction = jest.fn(async (fn: any) => {
    const before = clone(state);
    try { return await fn(db); } catch (error) { state = before; throw error; }
  });
  const storage = { uploadFile: jest.fn().mockResolvedValue({}), createSignedUrl: jest.fn().mockResolvedValue('https://example.invalid/signed') };
  const pending = new PendingRegistrationService(db);
  const registration = new RegistrationV2Service({} as any, db, pending, {} as any, storage as any, { sign: jest.fn().mockReturnValue('test-token') } as any);
  const profile = new ProfileService(db, storage as any);
  return { db, storage, pending, registration, profile, state: () => state,
    failDocument: () => { failDocument = true; }, failPendingCreate: () => { failPendingCreate = true; } };
}

async function uploadPending(f: ReturnType<typeof fixture>, data = input) {
  const pending = await f.pending.createOrReplace(data);
  await f.registration.uploadProfessionalDocument(pending.id, file);
  return f.state().pending[0];
}
const profileData = { companyName: 'Örnek Ofis', firstName: 'Test', lastName: 'Kişi', city: 'Denizli', role: Role.EMLAKCI, registrationType: 'EMLAK_DANISMANI', password: 'test123' };

describe('EPH-57 pending registration document retention', () => {
  it('restart preserves uploaded storage reference while resetting OTP verification', async () => {
    const f = fixture();
    const old = await uploadPending(f);
    old.phoneVerified = true; old.emailVerified = true;
    const restarted = await f.pending.createOrReplace(input);
    expect(restarted.id).not.toBe(old.id);
    expect(restarted.professionalDocumentUrl).toBe(old.professionalDocumentUrl);
    expect(restarted.professionalDocumentName).toBe('belge.pdf');
    expect(restarted.phoneVerified).toBe(false);
    expect(restarted.emailVerified).toBe(false);
    expect(f.storage.uploadFile).toHaveBeenCalledTimes(1);
  });

  it.each([{ ...input, phone: '+90 533 765 43 21' }, { ...input, email: 'other@example.invalid' }])('another identity pair cannot erase a pending upload: %j', async data => {
    const f = fixture(); await uploadPending(f);
    const before = structuredClone(f.state());
    await expect(f.pending.createOrReplace(data)).rejects.toThrow(BadRequestException);
    expect(f.state()).toEqual(before);
  });

  it('role change does not silently relabel or discard an uploaded document', async () => {
    const f = fixture(); await uploadPending(f);
    await expect(f.pending.createOrReplace({ ...input, role: Role.MUTEAHHIT })).rejects.toThrow(BadRequestException);
    expect(f.state().pending[0].professionalDocumentUrl).toBeTruthy();
  });

  it('replacement INSERT failure restores the previous pending row/reference', async () => {
    const f = fixture(); await uploadPending(f);
    const before = structuredClone(f.state()); f.failPendingCreate();
    await expect(f.pending.createOrReplace(input)).rejects.toThrow('pending insert failed');
    expect(f.state()).toEqual(before);
  });

  it('storage failure does not claim success or persist a nonexistent file reference', async () => {
    const f = fixture(); const p = await f.pending.createOrReplace(input);
    f.storage.uploadFile.mockRejectedValue(Error('storage failed'));
    await expect(f.registration.uploadProfessionalDocument(p.id, file)).rejects.toThrow('storage failed');
    expect(f.state().pending[0].professionalDocumentUrl).toBeNull();
  });
});

describe('EPH-57 complete registration and profile handoff', () => {
  it.each([
    [Role.EMLAKCI, 'EMLAK_DANISMANI', 'MYK_BELGESI'],
    [Role.EMLAKCI, 'EMLAK_OFISI', 'YETKI_BELGESI'],
    [Role.MUTEAHHIT, 'MUTEAHHIT', 'YAMBIS_BELGESI'],
    [Role.INSAAT_FIRMASI, 'INSAAT_FIRMASI', 'YAMBIS_BELGESI'],
  ])('new onboarding retains pending upload until %s/%s is known, then creates %s', async (role, registrationType, type) => {
    const f = fixture(); const p = await uploadPending(f);
    p.phoneVerified = true; p.emailVerified = true;
    const completed = await f.registration.completeRegistration(p.id);
    expect(completed.flow).toBe('PROFILE_ONBOARDING');
    expect(f.state().documents).toHaveLength(0); // ADAY aşamasında belge türü uydurulmaz.
    expect(f.state().pending[0].professionalDocumentUrl).toBeTruthy();
    await f.profile.completeInitialProfile(f.state().users[0].id, { ...profileData, role: role as Role, registrationType });
    expect(f.state().documents).toEqual([expect.objectContaining({ userId: f.state().users[0].id, type, status: 'PENDING', fileUrl: p.professionalDocumentUrl })]);
    expect(f.db.pendingRegistration.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ email, phone, phoneVerified: true, emailVerified: true, completedAt: { not: null } }) }));
    expect(f.storage.uploadFile).toHaveBeenCalledTimes(1); // Yeniden yükleme gerekmez.
  });

  it('profile handoff does not create a duplicate Document for the same storage reference', async () => {
    const f = fixture(); const p = await uploadPending(f); p.phoneVerified = true; p.emailVerified = true;
    await f.registration.completeRegistration(p.id);
    const id = f.state().users[0].id;
    f.state().documents.push({ id: 'existing', userId: id, type: 'MYK_BELGESI', fileUrl: p.professionalDocumentUrl });
    await f.profile.completeInitialProfile(id, profileData);
    expect(f.state().documents).toHaveLength(1);
  });

  it('failed handoff rolls back role/password writes and keeps the pending file for retry', async () => {
    const f = fixture(); const p = await uploadPending(f); p.phoneVerified = true; p.emailVerified = true;
    await f.registration.completeRegistration(p.id); f.failDocument();
    await expect(f.profile.completeInitialProfile(f.state().users[0].id, profileData)).rejects.toThrow('document insert failed');
    expect(f.state().users[0].role).toBe(Role.ADAY);
    expect(f.state().users[0].passwordHash).toBeNull();
    expect(f.state().pending[0].professionalDocumentUrl).toBe(p.professionalDocumentUrl);
  });

  it('new onboarding without an uploaded file completes identity/profile without fabricating a Document', async () => {
    const f = fixture(); const p = await f.pending.createOrReplace(input);
    f.state().pending[0].phoneVerified = true; f.state().pending[0].emailVerified = true;
    await f.registration.completeRegistration(p.id);
    await f.profile.completeInitialProfile(f.state().users[0].id, profileData);
    expect(f.state().documents).toHaveLength(0);
  });

  it.each(['EMLAK_DANISMANI', 'EMLAK_OFISI'])('legacy %s completes user/document/pending atomically with correct type', async registrationType => {
    const f = fixture();
    const p = await f.pending.createOrReplace({ ...input, role: Role.EMLAKCI, registrationType, passwordHash: 'hash', firstName: 'Test', lastName: 'Kişi' });
    await f.registration.uploadProfessionalDocument(p.id, file);
    f.state().pending[0].phoneVerified = true; f.state().pending[0].emailVerified = true;
    await f.registration.completeRegistration(p.id);
    expect(f.state().documents[0].type).toBe(registrationType === 'EMLAK_OFISI' ? 'YETKI_BELGESI' : 'MYK_BELGESI');
    expect(f.state().pending[0].status).toBe('COMPLETED');
    expect(f.db.$queryRaw).toHaveBeenCalled();
    await f.registration.completeRegistration(p.id);
    expect(f.state().users).toHaveLength(1);
    expect(f.state().documents).toHaveLength(1);
  });

  it('legacy Document INSERT failure rolls back User creation, allowing retry', async () => {
    const f = fixture();
    const p = await f.pending.createOrReplace({ ...input, role: Role.EMLAKCI, passwordHash: 'hash' });
    await f.registration.uploadProfessionalDocument(p.id, file);
    f.state().pending[0].phoneVerified = true; f.state().pending[0].emailVerified = true; f.failDocument();
    await expect(f.registration.completeRegistration(p.id)).rejects.toThrow('document insert failed');
    expect(f.state().users).toHaveLength(0);
    expect(f.state().pending[0].completedAt).toBeNull();
    expect(f.state().pending[0].professionalDocumentUrl).toBeTruthy();
  });

  it('unverified pending sessions cannot complete or attach their upload', async () => {
    const f = fixture(); const p = await uploadPending(f);
    await expect(f.registration.completeRegistration(p.id)).rejects.toThrow(BadRequestException);
    expect(f.state().users).toHaveLength(0);
    expect(f.state().documents).toHaveLength(0);
  });
});

describe('EPH-57 authenticated profile upload', () => {
  it('writes storage, Document and PENDING verification before returning success', async () => {
    const f = fixture();
    f.state().users.push({ id: 'owner', email, phone, role: Role.EMLAKCI, companyName: 'Örnek Ofis', professionalVerificationStatus: 'REVIEW_REQUIRED' });
    await expect(f.profile.uploadDocument('owner', 'MYK_BELGESI' as any, file)).resolves.toMatchObject({ status: 'PENDING' });
    expect(f.state().documents).toHaveLength(1);
    expect(f.state().users[0].professionalVerificationStatus).toBe('PENDING');
    expect(f.storage.uploadFile).toHaveBeenCalledWith('documents', expect.stringContaining('owner/MYK_BELGESI_'), file.buffer, file.mimetype);
  });

  it('a failed profile Document INSERT is surfaced instead of reporting upload success', async () => {
    const f = fixture();
    f.state().users.push({ id: 'owner', email, phone, role: Role.EMLAKCI, companyName: 'Örnek Ofis', professionalVerificationStatus: 'REVIEW_REQUIRED' });
    f.failDocument();
    await expect(f.profile.uploadDocument('owner', 'MYK_BELGESI' as any, file)).rejects.toThrow('document insert failed');
    expect(f.state().documents).toHaveLength(0);
    expect(f.state().users[0].professionalVerificationStatus).toBe('REVIEW_REQUIRED');
  });
});
