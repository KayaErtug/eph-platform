import { MailService } from '../mail.service';

const nodemailer = require('nodemailer');

describe('Central admin email routing', () => {
  let sendMail: jest.Mock;
  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ accepted: ['info@emlakportfoyhavuzu.com'] });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
  });
  afterEach(() => jest.restoreAllMocks());
  it.each(['sendNewApplication', 'sendNewNomination', 'sendNewLead'] as const)('suppresses the legacy info mailbox for %s once the durable queue exists, including while paused', async method => {
    const db: any = { $queryRaw: jest.fn().mockResolvedValue([{ recipient: 'ephplatform@gmail.com' }]) };
    const mail = new MailService(db);
    await mail[method]({} as any);
    expect(sendMail).not.toHaveBeenCalled();
  });
  it('preserves the legacy behavior before the queue schema is installed', async () => {
    const db: any = { $queryRaw: jest.fn().mockRejectedValue(new Error('missing schema')) };
    await new MailService(db).sendNewLead({} as any);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
  it('preserves verification and password email routing independently of admin alerts', async () => {
    const db: any = { $queryRaw: jest.fn().mockResolvedValue([{ recipient: 'ephplatform@gmail.com' }]) };
    await new MailService(db).sendPasswordResetCode({ email: 'fixture@example.invalid', firstName: 'Fixture', code: '000000', expiresMinutes: 10 } as any);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'fixture@example.invalid' }));
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
