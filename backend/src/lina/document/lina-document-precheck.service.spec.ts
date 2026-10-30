import { LinaDocumentPrecheckService } from './lina-document-precheck.service';

describe('LinaDocumentPrecheckService - DOCUMENT_AI_ANALYSIS_ENABLED', () => {
  const tkgm = { verifyParcel: jest.fn().mockResolvedValue({ status: 'UNAVAILABLE', matched: false, source: 'NONE', message: 'x' }) };
  const config = { get: jest.fn((key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined)) };
  const input = { fileName: 'tapu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'), authorityType: 'TAPU' };
  let fetchMock: jest.Mock;
  let service: LinaDocumentPrecheckService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' });
    (global as any).fetch = fetchMock;
    service = new LinaDocumentPrecheckService(config as any, tkgm as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('aiEnabled verilmezse OpenAI çağrılmaz, hata vermez', async () => {
    const result = await service.analyze(input);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.documentType).toBe('TAPU');
    expect(result.linaSummary).toBeTruthy();
  });

  it('aiEnabled=false iken OpenAI çağrılmaz', async () => {
    await service.analyze({ ...input, aiEnabled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aiEnabled=true iken OpenAI çağrılır', async () => {
    await service.analyze({ ...input, aiEnabled: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
