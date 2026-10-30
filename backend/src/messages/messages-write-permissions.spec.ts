import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MessagesService } from './messages.service';

describe('MessagesService EPH-06 write permissions', () => {
  const otherRoles = Object.values(Role).filter(role => role !== Role.SUPER_ADMIN);
  let service: MessagesService;
  let db: any;
  let notifications: any;

  beforeEach(() => {
    const participants = [{ userId: 'owner' }, { userId: 'peer' }];
    db = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'conversation', NetworkPost: null, ConversationParticipant: participants }),
        update: jest.fn().mockResolvedValue({}),
      },
      userBlock: { findFirst: jest.fn().mockResolvedValue(null) },
      kontorHareketi: { findFirst: jest.fn().mockResolvedValue(null) },
      message: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: data.id, body: data.body, createdAt: new Date(),
          User: { id: data.User.connect.id, role: Role.EMLAKCI, firstName: 'User' },
          Conversation: { ConversationParticipant: participants },
        })),
      },
    };
    notifications = { notify: jest.fn().mockResolvedValue({}) };
    service = new MessagesService(db, notifications);
  });

  it('allows a non-participant super admin and persists their own identity', async () => {
    db.conversation.findUnique.mockResolvedValue({ id: 'conversation', NetworkPost: { id: 'post', userId: 'owner' }, ConversationParticipant: [{ userId: 'owner' }, { userId: 'peer' }] });
    const result = await service.sendMessage('conversation', { body: 'Merhaba', senderId: 'super' }, 'super', Role.SUPER_ADMIN);
    expect(db.message.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      User: { connect: { id: 'super' } }, Conversation: { connect: { id: 'conversation' } }, body: 'Merhaba',
    }) }));
    expect(result).toMatchObject({ senderId: 'super' });
    expect(db.kontorHareketi.findFirst).not.toHaveBeenCalled();
    expect(notifications.notify.mock.calls.map(([id]) => id)).toEqual(['owner', 'peer']);
  });

  it.each(otherRoles)('rejects non-participant %s before writing', async role => {
    await expect(service.sendMessage('conversation', { body: 'Merhaba' }, 'outsider', role)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.message.create).not.toHaveBeenCalled();
    expect(db.conversation.update).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it.each(otherRoles)('preserves participant access for %s', async role => {
    await expect(service.sendMessage('conversation', { body: 'Merhaba' }, 'owner', role)).resolves.toMatchObject({ senderId: 'owner' });
    expect(db.userBlock.findFirst).toHaveBeenCalled();
  });

  it.each(Object.values(Role))('rejects sender impersonation for %s', async role => {
    await expect(service.sendMessage('conversation', { body: 'Merhaba', senderId: 'peer' }, 'owner', role)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it.each(otherRoles)('preserves blocking for participant %s', async role => {
    db.userBlock.findFirst.mockResolvedValue({ id: 'block' });
    await expect(service.sendMessage('conversation', { body: 'Merhaba' }, 'owner', role)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it('keeps missing conversations as not found for super admin', async () => {
    db.conversation.findUnique.mockResolvedValue(null);
    await expect(service.sendMessage('missing', { body: 'Merhaba' }, 'super', Role.SUPER_ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.message.create).not.toHaveBeenCalled();
  });
});
