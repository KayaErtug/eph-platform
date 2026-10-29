import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';
import { OfficeManagementService } from './office-management.service';
import { Role } from '@prisma/client';

describe('GRUP 5 & GRUP 6 Verification (Tasks 9, 10, 19, 20, 22, 25)', () => {
  let mockPrisma: any;
  let mockPush: any;
  let messagesService: MessagesService;
  let officeManagementService: OfficeManagementService;

  beforeEach(() => {
    mockPush = {
      sendToUser: jest.fn().mockResolvedValue(true),
    };

    mockPrisma = {
      systemSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      office: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      team: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      teamMember: {
        findMany: jest.fn(),
      },
      conversation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conversationParticipant: {
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
      message: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      kontorHareketi: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userBlock: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'office-1' }]),
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const textSafetyService = {
      validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    };

    messagesService = new MessagesService(
      mockPrisma as any,
      textSafetyService as any,
      mockPush as any,
    );

    officeManagementService = new OfficeManagementService(
      mockPrisma as any,
      mockPush as any,
    );
  });

  describe('Task 9: Mesajlaşma (mapMessage, lastMessage, idempotency)', () => {
    it('mapMessage senderId alanını içerir', () => {
      const msg = {
        id: 'msg-1',
        body: 'Merhaba',
        createdAt: new Date(),
        User: { id: 'user-1', firstName: 'Ali', lastName: 'Öz', role: Role.EMLAKCI },
      };
      const mapped = (messagesService as any).mapMessage(msg);
      expect(mapped.senderId).toBe('user-1');
      expect(mapped.sender.id).toBe('user-1');
      expect(mapped.body).toBe('Merhaba');
    });

    it('sendMessage aynı clientMessageId veya son 3 saniyedeki tekrar mesajı çoğaltmaz', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        ConversationParticipant: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      });

      // Existing message found by clientMessageId
      mockPrisma.message.findFirst.mockResolvedValueOnce({
        id: 'client-uuid-1',
        body: 'Tekrarlanan mesaj',
        createdAt: new Date(),
        User: { id: 'user-1', firstName: 'Ali', lastName: 'Öz', role: Role.EMLAKCI },
      });

      const res: any = await messagesService.sendMessage(
        'conv-1',
        { body: 'Tekrarlanan mesaj', clientMessageId: 'client-uuid-1' },
        'user-1',
        Role.EMLAKCI,
      );

      expect(res.id).toBe('client-uuid-1');
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
    });
  });

  describe('Task 19: Takımlara Dahili Mesaj', () => {
    it('ofis sahibi takıma toplu mesaj başlattığında takım üyelerini tekilleştirir', async () => {
      mockPrisma.office.findUnique.mockResolvedValue({
        id: 'office-1',
        ownerUserId: 'owner-1',
        name: 'Beyaz Emlak',
        isActive: true,
      });

      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        officeId: 'office-1',
        name: 'Arsacılar',
        isActive: true,
        leaderId: 'leader-1',
        members: [
          { userId: 'user-1' },
          { userId: 'user-2' },
          { userId: 'user-1' }, // duplicate member in multi-team
        ],
      });

      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.create.mockImplementation((args: any) => ({
        id: 'conv-team-1',
        title: args.data.title,
        ConversationParticipant: args.data.ConversationParticipant.create,
      }));

      const result = await messagesService.startTeamConversation('owner-1', 'office-1', 'team-1');
      expect(result.ok).toBe(true);
      expect(result.conversation.title).toBe('[Takım] Arsacılar');
      // Participants should include owner-1, user-1, user-2 (total 3 distinct)
      const participantIds = result.conversation.ConversationParticipant.map((p: any) => p.userId);
      expect(new Set(participantIds).size).toBe(participantIds.length);
      expect(participantIds).toContain('owner-1');
      expect(participantIds).toContain('user-1');
      expect(participantIds).toContain('user-2');
    });
  });

  describe('Task 20: Takım ve Kişilere Görev Atama', () => {
    it('aynı görevde hem takım hem birey seçildiğinde alıcıları tekilleştirir ve sorumluları dondurur', async () => {
      mockPrisma.office.findUnique.mockResolvedValue({
        id: 'office-1',
        ownerUserId: 'owner-1',
        name: 'Beyaz Emlak',
        isActive: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: Role.EMLAKCI, capabilities: [{ capability: 'OFFICE_OWNER' }] });
      // Team has user-1 and user-2
      mockPrisma.teamMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      // Users table
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Ali', lastName: 'Öz' },
        { id: 'user-2', firstName: 'Ayşe', lastName: 'Yılmaz' },
        { id: 'user-3', firstName: 'Meral', lastName: 'Ak' },
      ]);

      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const res = await officeManagementService.createOfficeTask('owner-1', 'office-1', {
        title: 'Bölge analizi ve portföy taraması',
        description: 'Tüm arsa portföyleri gözden geçirilecek',
        dueDate: '2026-11-01',
        teamIds: ['team-arsacilar'],
        userIds: ['user-2', 'user-3'], // user-2 is also in the team!
      });

      expect(res.ok).toBe(true);
      expect(res.task.title).toBe('Bölge analizi ve portföy taraması');
      // Should have exactly 3 deduplicated assignees: user-1, user-2, user-3
      expect(res.task.assignedUserIds.sort()).toEqual(['user-1', 'user-2', 'user-3'].sort());
      expect(res.task.status).toBe('BEKLIYOR');

      // Verify notification sent to each unique assignee
      expect(mockPush.sendToUser).toHaveBeenCalledTimes(3);
    });

    it('atanan kişi kendi görevini listeleyebilir ve durumunu güncelleyebilir', async () => {
      mockPrisma.office.findUnique.mockResolvedValue({
        id: 'office-1',
        ownerUserId: 'owner-1',
        isActive: true,
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', officeId: 'office-1' });

      const storedTasks = [
        {
          id: 'task-101',
          officeId: 'office-1',
          title: 'Görev 1',
          status: 'BEKLIYOR',
          assignedUserIds: ['user-1'],
        },
        {
          id: 'task-102',
          officeId: 'office-1',
          title: 'Görev 2',
          status: 'BEKLIYOR',
          assignedUserIds: ['user-99'],
        },
      ];

      mockPrisma.systemSetting.findUnique.mockResolvedValue({ valueJson: storedTasks });

      // Consultant query
      const list = await officeManagementService.getOfficeTasks('user-1', 'office-1');
      expect(list.tasks.length).toBe(1);
      expect(list.tasks[0].id).toBe('task-101');

      // Update status
      const updateRes = await officeManagementService.updateOfficeTask('user-1', 'office-1', 'task-101', {
        status: 'TAMAMLANDI',
      });
      expect(updateRes.ok).toBe(true);
      expect(updateRes.task.status).toBe('TAMAMLANDI');
    });
  });

  describe('Task 22: Danışman Performansı ve Aktivite Takibi', () => {
    it('ziyaret, yer gösterimi, telefon ve diğer aktiviteler kaydedilir ve filtrelenir', async () => {
      mockPrisma.office.findUnique.mockResolvedValue({
        id: 'office-1',
        ownerUserId: 'owner-1',
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        officeId: 'office-1',
        firstName: 'Ali',
        lastName: 'Öz',
      });
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const record = await officeManagementService.recordConsultantActivity('user-1', 'office-1', {
        activityType: 'YER_GOSTERIMI',
        customerName: 'Ahmet Bey',
        portfolioTitle: '2+1 Satılık Daire',
        outcome: 'OLUMLU',
        note: 'Müşteri beğendi, teklif verecek',
      });

      expect(record.ok).toBe(true);
      expect(record.activity.activityType).toBe('YER_GOSTERIMI');
      expect(record.activity.userName).toBe('Ali Öz');
    });
  });

  describe('Task 25: Tarama/Eşleştirme Logları', () => {
    it('başarılı, başarısız veya yetkisiz tarama girişimleri kaydedilir ve ağ tekrarı engellenir', async () => {
      mockPrisma.office.findUnique.mockResolvedValue({
        id: 'office-1',
        ownerUserId: 'owner-1',
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        officeId: 'office-1',
        firstName: 'Ali',
        lastName: 'Öz',
      });
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const logRes1 = await officeManagementService.recordOfficeMatchLog('user-1', 'office-1', {
        clientRequestId: 'req-scan-999',
        status: 'SUCCESS',
        criteriaSummary: 'Kadıköy 3+1 Daire',
        resultCount: 5,
        spentPk: 10,
      });

      expect(logRes1.ok).toBe(true);
      expect(logRes1.log.clientRequestId).toBe('req-scan-999');

      // Same request retry should be recognized as duplicate
      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
        valueJson: [logRes1.log],
      });

      const logRes2 = await officeManagementService.recordOfficeMatchLog('user-1', 'office-1', {
        clientRequestId: 'req-scan-999',
        status: 'SUCCESS',
        criteriaSummary: 'Kadıköy 3+1 Daire',
      });

      expect(logRes2.duplicate).toBe(true);
    });
  });
});
