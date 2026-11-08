from pathlib import Path
p=Path('src/lina/eph90.spec.ts'); s=p.read_text(encoding='utf-8').replace('lina.generateOpenAiSpeech(', 'lina.askOpenAiSpeech('); p.write_text(s,encoding='utf-8')
p=Path('src/coordination/commercial-match-scan.service.spec.ts'); s=p.read_text(encoding='utf-8'); marker="  it('zero results still produce a paid report'"; i=s.index(marker)
s=s[:i]+'''  it.each(['Denizli Merkezefendi', 'DENİZLİ MERKEZEFENDİ', 'merkezefendi'])('EPH90 F10 normalized district finds candidate: %s', async district => {
    const t = setup(); t.interest.district = district;
    const result: any = await t.service.scan('CRM', 'interest', t.actor, t.input);
    expect(result.matches).toHaveLength(1); expect(result.matches[0].unitId).toBe('unit');
  });
  it('EPH90 F10 city-prefixed candidate district also matches bare demand', async () => {
    const t = setup(); t.unit.project.district = 'Denizli Merkezefendi';
    const result: any = await t.service.scan('CRM', 'interest', t.actor, t.input);
    expect(result.matches).toHaveLength(1);
  });
  it('EPH90 F10 kat karsiligi accepts an unpriced candidate', async () => {
    const t = setup(); t.interest.statuses = ['KAT_KARSILIGI']; t.interest.maxBudget = null as any;
    t.unit.status = 'KAT_KARSILIGI'; t.unit.price = null as any;
    const result: any = await t.service.scan('CRM', 'interest', t.actor, t.input);
    expect(result.matches).toHaveLength(1); expect(result.matches[0].unitId).toBe('unit');
  });
'''+s[i:]; p.write_text(s,encoding='utf-8')
