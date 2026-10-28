import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MessagesService } from './messages.service';

describe('MessagesService Talep paid-access boundary', () => {
  let service: MessagesService;
  let db: any;
  let post: any;
  beforeEach(() => {
    post = { id: 'post', userId: 'owner', isActive: true, expiresAt: new Date('2099-01-01') };
    const conversation = { id: 'conversation', postId: 'post', NetworkPost: post,
      ConversationParticipant: [{ userId: 'viewer' }, { userId: 'owner' }], Message: [] };
    db = { userBlock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, networkPost: { findUnique: jest.fn().mockResolvedValue(post) },
      kontorHareketi: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      conversation: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(conversation), findMany: jest.fn().mockResolvedValue([conversation]), create: jest.fn().mockResolvedValue({ id: 'new' }) },
      message: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), count: jest.fn().mockResolvedValue(0) } };
    service = new MessagesService(db, {} as any);
  });
  it('rejects free post-linked conversation creation before writing', async () => {
    await expect(service.startConversation({ postId: 'post', participantId: 'owner' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.conversation.create).not.toHaveBeenCalled();
  });
  it('allows paid post-linked conversation creation', async () => {
    db.kontorHareketi.findFirst.mockResolvedValue({ id: 'movement' });
    await expect(service.startConversation({ postId: 'post', participantId: 'owner' }, 'viewer', Role.EMLAKCI)).resolves.toEqual({ id: 'new' });
  });
  it('requires the request owner to be a conversation participant', async () => {
    db.kontorHareketi.findFirst.mockResolvedValue({ id: 'movement' });
    await expect(service.startConversation({ postId: 'post', participantId: 'someone' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('blocks legacy unpaid conversation detail, messages and send', async () => {
    await expect(service.getConversation('conversation', 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getMessages('conversation', 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.sendMessage('conversation', { body: 'Hello' }, 'viewer', Role.EMLAKCI)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.message.findMany).not.toHaveBeenCalled(); expect(db.message.create).not.toHaveBeenCalled();
  });
  it('hides unpaid post conversations from inbox', async () => {
    expect(await service.getConversations('viewer', Role.EMLAKCI)).toEqual([]);
  });
  it('keeps ordinary non-post conversation creation available', async () => {
    await expect(service.startConversation({ participantId: 'owner' }, 'viewer', Role.EMLAKCI)).resolves.toEqual({ id: 'new' });
    expect(db.kontorHareketi.findFirst).not.toHaveBeenCalled();
  });
});
