# Riskli İlan Tespiti

## Risk Sinyalleri
| Risk | Örnek |
|------|-------|
| aşırı ucuz | dolandırıcılık riski |
| eksik tapu bilgisi | hukuki risk |
| sürekli acil satılık | altta yatan problem |
| ada/parsel yok | belirsizlik |
| hisseli ama belirtilmemiş | bilgi saklama |
| imara yakın | imarsız olabilir |
| fotoğraf yok | güven düşük |

## Trust Score Sistemi
```json
{
  "trustScore": 0-100,
  "warnings": [
    "Tapu bilgisi eksik",
    "Piyasa altı fiyat",
    "Ada/parsel bilgisi yok"
  ]
}
```

## Düşük Trust Score Nedenleri
- Tapu türü belirtilmemiş → -20
- Fiyat piyasa altında → -15
- Ada/parsel yok (arsa) → -20
- Açıklama çok kısa → -10
- İletişim sadece WhatsApp → -10
