import { Controller, Post, Body } from '@nestjs/common';

@Controller('parsel-validate')
export class ParselController {
  @Post()
  async validate(@Body() body: { adaNo: string; parselNo: string; city?: string }) {
    try {
      const url = `https://adres.denizli.bel.tr/arcgis/rest/services/yayinlar/sorgu/MapServer/0/query?where=ADANO=${body.adaNo}+AND+PARSELNO=${body.parselNo}&outFields=ADANO,PARSELNO,TapuMahalle,TapuIlce&f=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        const attr = data.features[0].attributes;
        return {
          found: true,
          adaNo: attr.ADANO,
          parselNo: attr.PARSELNO,
          mahalle: attr.TapuMahalle,
          ilce: attr.TapuIlce,
        };
      }
      return { found: false };
    } catch (err) {
      return { found: false, error: 'CBS servisi yanıt vermedi' };
    }
  }
}
