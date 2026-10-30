import { PortfolioDocumentsService } from './portfolio-documents.service';

describe('PortfolioDocumentsService - isDocumentAiEnabled', () => {
  const findUnique = jest.fn();
  const service = new PortfolioDocumentsService({ systemSetting: { findUnique } } as any, {} as any, {} as any);
  const enabled = () => (service as any).isDocumentAiEnabled() as Promise<boolean>;

  beforeEach(() => findUnique.mockReset());

  it('ayar yoksa KAPALI', async () => {
    findUnique.mockResolvedValue(null);
    expect(await enabled()).toBe(false);
  });

  it('0 KAPALI, 1 ve {value:1} AÇIK', async () => {
    findUnique.mockResolvedValue({ valueJson: 0 });
    expect(await enabled()).toBe(false);
    findUnique.mockResolvedValue({ valueJson: 1 });
    expect(await enabled()).toBe(true);
    findUnique.mockResolvedValue({ valueJson: { value: 1 } });
    expect(await enabled()).toBe(true);
  });

  it('okuma hatasında KAPALI', async () => {
    findUnique.mockRejectedValue(new Error('db'));
    expect(await enabled()).toBe(false);
  });
});
