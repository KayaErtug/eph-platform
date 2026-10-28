import { resolveSharedProjectLocation } from './shared-project-location';

describe('Paylaşılan harita konumu',()=>{
  it('kısa Google bağlantısını gerçek pine çözer',async()=>{
    const redirect=jest.fn(async()=> 'https://www.google.com/maps/place/ev/data=!3d37.78!4d29.09');
    await expect(resolveSharedProjectLocation('https://maps.app.goo.gl/example',redirect)).resolves.toEqual({latitude:37.78,longitude:29.09});
    expect(redirect).toHaveBeenCalledTimes(1);
  });
  it('izin dışı yönlendirmeye istek göndermez',async()=>{
    const redirect=jest.fn(async()=> 'https://127.0.0.1/private');
    await expect(resolveSharedProjectLocation('https://maps.app.goo.gl/example',redirect)).rejects.toThrow('Yalnız HTTPS');
    expect(redirect).toHaveBeenCalledTimes(1);
  });
  it('yönlendirme döngüsünü sınırlar',async()=>{
    const redirect=jest.fn(async()=> 'https://maps.app.goo.gl/example');
    await expect(resolveSharedProjectLocation('https://maps.app.goo.gl/example',redirect)).rejects.toThrow('Konum okunamadı');
    expect(redirect).toHaveBeenCalledTimes(5);
  });
  it.each(['http://maps.google.com?q=37,29','https://maps.google.com:8443?q=37,29','https://user@maps.google.com?q=37,29','https://evil.test?q=37,29'])('izin dışı adresi reddeder: %s',async url=>{
    const redirect=jest.fn();await expect(resolveSharedProjectLocation(url,redirect)).rejects.toThrow();expect(redirect).not.toHaveBeenCalled();
  });
});
