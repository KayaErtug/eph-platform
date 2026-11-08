import { createHash } from 'crypto';
import { Role } from '@prisma/client';
import { OfficeManagementService } from '../office/office-management.service';
import { ProjectSalesLaunchService } from '../project-sales/project-sales-launch.service';

function officeFixture() {
  // ODM-7F-D/N5: hedef alıcılı davet şeması (güncel davet kaydı + hash arama kaydı) gerçek invite() çıktısıyla aynı biçimde kurulur.
  const inviteHash = createHash('sha256').update('ABCDEF123456').digest('hex');
  const inviteExpiresAt = new Date(Date.now() + 60000).toISOString();
  let state: Record<string, any> = {
    EPH_OFFICE_INVITE_office_applicant: { hash: inviteHash, expiresAt: inviteExpiresAt, recipientUserId: 'applicant' },
    [`EPH_OFFICE_CODE_${inviteHash}`]: { officeId: 'office', expiresAt: inviteExpiresAt, recipientUserId: 'applicant' },
  };
  const users: any = {
    applicant: { id: 'applicant', role: Role.EMLAKCI, officeId: null },
    owner: {
      id: 'owner',
      role: Role.EMLAKCI,
      capabilities: [{ capability: 'OFFICE_OWNER' }],
    },
  };
  const db: any = {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn(async ({ where }) => users[where.id]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([{ id: 'applicant' }]),
    },
    office: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'office',
          ownerUserId: 'owner',
          isActive: true,
          name: 'Ofis',
        }),
      findFirst: jest.fn().mockResolvedValue(null), // doğrudan ofis kodu/ID eşleşmesi yok -> davet kodu yolu
      count: jest.fn().mockResolvedValue(0),
    },
    team: { findMany: jest.fn().mockResolvedValue([]) },
    adminActionLog: { create: jest.fn() },
  };
  db.systemSetting = {
    findUnique: jest.fn(async ({ where }) =>
      state[where.key] ? { key: where.key, valueJson: state[where.key] } : null,
    ),
    upsert: jest.fn(async ({ where, create, update }) => {
      state[where.key] = (state[where.key] ? update : create).valueJson;
    }),
    update: jest.fn(async ({ where, data }) => {
      state[where.key] = data.valueJson;
    }),
  };
  db.$transaction = jest.fn(async (run) => {
    const before = structuredClone(state);
    try {
      return await run(db);
    } catch (e) {
      state = before;
      throw e;
    }
  });
  const notifications = { notify: jest.fn().mockResolvedValue({}) };
  return {
    db,
    notifications,
    state: () => state,
    service: new OfficeManagementService(db, undefined, notifications as any),
  };
}

describe('EPH-38 transactional office and project hooks', () => {
  it('stores urgent office applications in the same transaction for the owner', async () => {
    const t = officeFixture();
    await t.service.requestJoin('applicant', 'office.ABCDEF123456');
    expect(t.notifications.notify).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({
        type: 'OFFICE_JOIN_REQUEST',
        priority: 'ACIL',
        actionUrl: '/office',
      }),
      t.db,
    );
  });
  it.each([true, false])(
    'notifies the applicant about the decision: %s',
    async (approve) => {
      const t = officeFixture();
      await t.service.requestJoin('applicant', 'office.ABCDEF123456');
      t.notifications.notify.mockClear();
      await t.service.decide('owner', 'office', 'applicant', approve);
      expect(t.notifications.notify).toHaveBeenCalledWith(
        'applicant',
        expect.objectContaining({
          type: 'OFFICE_JOIN_DECIDED',
          body: approve
            ? 'Ofis başvurunuz onaylandı.'
            : 'Ofis başvurunuz reddedildi.',
        }),
        t.db,
      );
    },
  );
  it('rolls back the office application when durable notification persistence fails', async () => {
    const t = officeFixture();
    t.notifications.notify.mockRejectedValue(new Error('inbox unavailable'));
    await expect(
      t.service.requestJoin('applicant', 'office.ABCDEF123456'),
    ).rejects.toThrow('inbox unavailable');
    expect(t.state().EPH_OFFICE_JOIN_office_applicant).toBeUndefined();
  });
  it('notifies only members whose effective office permission changed', async () => {
    const t = officeFixture();
    await t.service.updatePermissions('owner', 'office', {
      scanPermissions: { applicant: false },
    });
    expect(t.notifications.notify).toHaveBeenCalledWith(
      'applicant',
      expect.objectContaining({ type: 'ROLE_CHANGED' }),
      t.db,
    );
    t.notifications.notify.mockClear();
    await t.service.updatePermissions('owner', 'office', {
      scanPermissions: { applicant: false },
    });
    expect(t.notifications.notify).not.toHaveBeenCalled();
  });
  it.each([0, 1])(
    'queues project pool acceptance only for a new publication; prior visible count=%s',
    async (visibleCount) => {
      const tx = {
        unit: {
          count: jest.fn().mockResolvedValue(visibleCount),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const db = { $transaction: jest.fn((run) => run(tx)) };
      const notifications = { notify: jest.fn().mockResolvedValue({}) };
      const service: any = new ProjectSalesLaunchService(
        db as any,
        {} as any,
        notifications as any,
      );
      service.getAuthorizedProject = jest
        .fn()
        .mockResolvedValue({ id: 'p', ownerId: 'owner' });
      service.getProjectStats = jest.fn().mockReturnValue({});
      service.buildPublishReadiness = jest
        .fn()
        .mockReturnValue({ ready: true });
      service.getProject = jest.fn().mockResolvedValue({ id: 'p' });
      service.serializeProject = jest.fn().mockReturnValue({});
      await service.publishToPool('p', 'super', Role.SUPER_ADMIN);
      if (visibleCount) expect(notifications.notify).not.toHaveBeenCalled();
      else
        expect(notifications.notify).toHaveBeenCalledWith(
          'owner',
          expect.objectContaining({
            type: 'PROJECT_POOL_ACCEPTED',
            priority: 'ONEMLI',
            actionUrl: '/project-sales/p',
          }),
          tx,
        );
    },
  );
});
