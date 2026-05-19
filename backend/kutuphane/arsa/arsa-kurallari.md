# Arsa Kuralları

## ASLA Sorulmayanlar
- Oda sayısı (roomCount) → YOK
- Bina yaşı (buildingAge) → YOK
- Isıtma tipi (heating) → YOK
- Aidat (dues) → YOK
- Brüt/Net alan ayrımı → YOK (sadece tek alan)

## MUTLAKA Sorulacaklar
- Ada no (adaNo)
- Parsel no (parselNo)
- İmar durumu (imarDurumu)
- Toplam alan (m²) → TEK değer
- Tapu türü (deedStatus)
- Fiyat (price)

## Ada/Parsel Okuma
- "151 ada 3 parsel" → adaNo=151, parselNo=3
- "151/3" → adaNo=151, parselNo=3

## İmar Bilgileri
- TAKS: Taban Alan Katsayısı (örn: 0.30 = %30)
- KAKS/Emsal: Kat Alan Katsayısı
- Gabari: Maksimum bina yüksekliği
- "bodrum+4 kat" → imar bilgisi, bina katı değil
