{
  "ARSA": {
    "requiredFields": ["adaNo","parselNo","alan","imarDurumu","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["roomCount","buildingAge","heating","dues","floor","totalFloors","grossArea","netArea"],
    "loadLibs": ["arsa","imar","tapu"]
  },
  "TARLA": {
    "requiredFields": ["adaNo","parselNo","alan","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["roomCount","buildingAge","heating","dues","floor","totalFloors"],
    "loadLibs": ["arsa","tapu"]
  },
  "DAIRE": {
    "requiredFields": ["city","district","neighborhood","address","projectName","grossArea","netArea","roomCount","floor","totalFloors","buildingAge","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["adaNo","parselNo","imarDurumu","emsal","gabari"],
    "loadLibs": ["daire","tapu"]
  },
  "VILLA": {
    "requiredFields": ["city","district","neighborhood","address","grossArea","netArea","roomCount","buildingAge","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["adaNo","parselNo","imarDurumu"],
    "loadLibs": ["villa","tapu"]
  },
  "OFIS": {
    "requiredFields": ["city","district","neighborhood","address","grossArea","netArea","floor","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["adaNo","parselNo","roomCount"],
    "loadLibs": ["daire","tapu"]
  },
  "DUKKAN": {
    "requiredFields": ["city","district","neighborhood","address","grossArea","netArea","floor","deedStatus","price","negotiable","authorityStatus"],
    "forbiddenFields": ["adaNo","parselNo","roomCount","buildingAge"],
    "loadLibs": ["daire","tapu"]
  }
}



# Emlak Terimleri SÃ¶zlÃ¼ÄŸÃ¼

## KullanÄ±cÄ± SÃ¶yler â†’ Lina Anlar
| KullanÄ±cÄ± | DoÄŸru Terim |
|-----------|-------------|
| %30 imar | TAKS = 0.30 |
| emsal | KAKS (Kat Alan KatsayÄ±sÄ±) |
| gabari | YÃ¼kseklik sÄ±nÄ±rÄ± |
| kÃ¶ÅŸe baÅŸÄ± | KÃ¶ÅŸe parsel |
| yola terk | Terk alanÄ± |
| ifrazlÄ± | Ä°fraz (parsel bÃ¶lme) |
| tevhid | Tevhit (parsel birleÅŸtirme) |
| iskan | YapÄ± kullanma izin belgesi |
| ruhsat | YapÄ± ruhsatÄ± |
| baÄŸÄ±msÄ±z bÃ¶lÃ¼m | Daire/dÃ¼kkan/ofis gibi baÄŸÄ±msÄ±z Ã¼nite |
| milton | Milyon |
| buÃ§uk | 0.5 |
| 3,5 oda | 3+1 |
| asma katlÄ± | Dubleks veya asma katlÄ± |
| bahÃ§eli | BahÃ§e kullanÄ±mÄ± var |
| bodrum+4 | Ä°mar: bodrum+4 normal kat |

## Alan Terimleri
- **BrÃ¼t Alan**: Duvarlar dahil toplam alan
- **Net Alan**: KullanÄ±labilir iÃ§ alan (duvarlar hariÃ§)
- **ARSA iÃ§in**: Sadece tek alan deÄŸeri (brÃ¼t/net ayrÄ±mÄ± YOK)

## Oda SayÄ±sÄ± FormatÄ±
- 1+1, 2+1, 3+1, 4+1, 5+2 vb.
- Dubleks: 4+1 Dubleks
- Tripleks: 5+2 Tripleks
# Emlak Jargon SÃ¶zlÃ¼ÄŸÃ¼

## SatÄ±ÅŸ BaskÄ±sÄ± / Acil SatÄ±lÄ±k JargonlarÄ±
| Jargon | GerÃ§ek Anlam |
|--------|-------------|
| kelepir | Piyasa altÄ± fiyat iddiasÄ± |
| acil satÄ±lÄ±k | HÄ±zlÄ± satÄ±ÅŸ ihtiyacÄ± |
| kaÃ§Ä±rma | Pazarlama baskÄ±sÄ± |
| kaÃ§Ä±rÄ±rsan Ã¼zÃ¼lÃ¼rsÃ¼n | Yapay fÄ±rsat algÄ±sÄ± |
| kapanÄ±n elinde kalÄ±r | Talep yÃ¼ksekmiÅŸ algÄ±sÄ± |
| son fÄ±rsat | Pazarlama cÃ¼mlesi |
| fÄ±rsat Ã¼rÃ¼nÃ¼ | Genelde hÄ±zlÄ± satÄ±ÅŸ |
| bedavadan biraz pahalÄ± | Mizahi ucuzluk iddiasÄ± |
| bu fiyata yok | Piyasa altÄ± vurgusu |
| yatÄ±rÄ±mcÄ±ya uygun | DeÄŸer artÄ±ÅŸÄ± beklentisi |
| prim yapacak | BÃ¶lgenin deÄŸerleneceÄŸi iddiasÄ± |
| tam yatÄ±rÄ±mlÄ±k | YatÄ±rÄ±mlÄ±k |
| ekmeklik arsa | Uzun vadeli kazanÃ§ beklentisi |
| Ã§ocuklara bÄ±rakmalÄ±k | Uzun vadeli yatÄ±rÄ±m |
| geleceÄŸin bÃ¶lgesi | GeliÅŸmekte olan lokasyon |
| yarÄ±n Ã§ok geÃ§ olabilir | Yapay aciliyet |

## Tapu / Ä°mar JargonlarÄ±
| Jargon | GerÃ§ek Anlam |
|--------|-------------|
| temiz tapu | Sorunsuz tapu iddiasÄ± |
| sÄ±kÄ±ntÄ±sÄ±z | Problem yok iddiasÄ± |
| sorunsuz | Hukuki problem olmadÄ±ÄŸÄ± iddiasÄ± |
| tek tapu | MÃ¼stakil tapu |
| mÃ¼stakil | Tek malik |
| hisseden yer | Hisseli tapu |
| ifraz olur | BÃ¶lÃ¼nebilir olabilir |
| yola yakÄ±n | UlaÅŸÄ±m avantajÄ± |
| yola cephe | Resmi yol baÄŸlantÄ±sÄ± |
| Ã¶nÃ¼ kapanmaz | Manzara riski az |
| villa imarlÄ± | Konut/villa yapÄ±laÅŸmasÄ±na uygun |
| imara yakÄ±n | Åu an imarsÄ±z olabilir |
| yakÄ±nda imar gelir | SpekÃ¼latif sÃ¶ylem |
| belediyeye yakÄ±n | Merkezi konum |
| kÃ¶ÅŸe baÅŸÄ± | KÃ¶ÅŸe parsel |
| Ã§ift cephe | Ä°ki yola cephe |
| ana yola sÄ±fÄ±r | Ana yol Ã¼stÃ¼ |
| kadastro yolu var | Resmi eriÅŸim yolu mevcut |

## Daire / Konut JargonlarÄ±
| Jargon | GerÃ§ek Anlam |
|--------|-------------|
| masrafsÄ±z | Tadilat gerekmiyor iddiasÄ± |
| oturuma hazÄ±r | Hemen taÅŸÄ±nÄ±labilir |
| yapÄ±lÄ± | Ä°Ã§ dekorasyon yapÄ±lmÄ±ÅŸ |
| full yapÄ±lÄ± | Komple yenilenmiÅŸ |
| anahtar teslim | HazÄ±r kullanÄ±m |
| lÃ¼ks yapÄ±lÄ± | Ãœst segment dekorasyon |
| ultra lÃ¼ks | AbartÄ±lÄ± pazarlama olabilir |
| sÄ±fÄ±r ayarÄ±nda | Eski ama temiz |
| yatÄ±rÄ±m fÄ±rsatÄ± | Kira/deÄŸer artÄ±ÅŸÄ± beklentisi |
| aile apartmanÄ± | Sessiz bina |
| geniÅŸ ferah | BÃ¼yÃ¼k metrekare algÄ±sÄ± |
| Ã¶nÃ¼ aÃ§Ä±k | Manzara kapanmÄ±yor |
| ara kat | Orta kat |
| yÃ¼ksek giriÅŸ | Kot farkÄ± olan giriÅŸ |
| bahÃ§e katÄ± | GiriÅŸ altÄ±/Ã¼stÃ¼ olabilir |
| krediye uygun | Banka ekspertizi geÃ§ebilir |
| iskanlÄ± | YapÄ± kullanÄ±m izni var |
| otopark sorunu yok | Park alanÄ± mevcut |

## BÃ¶lgesel / Sokak AÄŸzÄ± Ä°fadeleri
| Jargon | GerÃ§ek Anlam |
|--------|-------------|
| taÅŸ gibi bina | SaÄŸlam yapÄ± |
| baba lokasyon | Ã‡ok iyi konum |
| piyasanÄ±n altÄ±nda | Ucuz iddiasÄ± |
| deÄŸerinin altÄ±nda | PazarlÄ±k payÄ± olabilir |
| nokta konum | Ä°yi lokasyon |
| merkezi yerde | Åehir merkezine yakÄ±n |
| eli ayaÄŸÄ± dÃ¼zgÃ¼n | Dengeli Ã¶zellikler |
| kaÃ§maz | FÄ±rsat baskÄ±sÄ± |
| Ã¶lmeden alÄ±nacak yer | AÅŸÄ±rÄ± abartÄ± ğŸ™‚ |
| altÄ±n lokasyon | DeÄŸerli bÃ¶lge |
| altÄ±n fÄ±rsat | Pazarlama |
| tam kÃ¶ÅŸelik | KÃ¶ÅŸe parsel avantajÄ± |
| manzarasÄ± efsane | GÃ¼Ã§lÃ¼ manzara vurgusu |
| denizi gÃ¶rÃ¼yor | KÄ±smi manzara bile olabilir |
| doÄŸayla iÃ§ iÃ§e | KÄ±rsal/uzak olabilir |
# TÃ¼rkiye Emlak Dili - Ã–zel Terimler

## YapÄ± / Ä°nÅŸaat Dili
| Terim | Anlam |
|-------|-------|
| 3 kat imarlÄ± | 3 katlÄ± yapÄ± yapÄ±labilir |
| zemin artÄ± 4 | bodrum+zemin+4 normal kat |
| kat karÅŸÄ±lÄ±ÄŸÄ± | arsa karÅŸÄ±lÄ±ÄŸÄ± daire |
| arsa paylÄ± | hisseli arsa tapulu daire |
| yola terk | yol iÃ§in bÄ±rakÄ±lan alan |
| kÃ¶ÅŸe parsel | iki yola cepheli arsa |
| emsal harici | emsale sayÄ±lmayan alan (balkon vb.) |
| bodrum kat | zemin altÄ± |
| zemin kat | giriÅŸ seviyesi |
| yÃ¼ksek zemin | yarÄ± bodrum Ã¼stÃ¼ |
| asma kat | iki katlÄ± iÃ§ mekÃ¢n |

## BÃ¶lgesel DeÄŸer Profili (Denizli)
Mahalle karakterizasyonu:
- YatÄ±rÄ±m odaklÄ± bÃ¶lgeler
- Aile yoÄŸun bÃ¶lgeler  
- Ã–ÄŸrenci bÃ¶lgeleri
- Merkezi ticari bÃ¶lgeler

## TÃ¼rkiye'ye Ã–zgÃ¼ Riskler
- Kentsel dÃ¶nÃ¼ÅŸÃ¼m bÃ¶lgesi â†’ binanÄ±n yÄ±kÄ±lma riski olabilir
- Ä°mar barÄ±ÅŸÄ± yapÄ±sÄ± â†’ ruhsatsÄ±z olabilir
- Emsal hesabÄ± tartÄ±ÅŸmalÄ± â†’ avukat gerekebilir
- Kat karÅŸÄ±lÄ±ÄŸÄ± anlaÅŸma â†’ hukuki karmaÅŸÄ±klÄ±k
# Tapu TÃ¼rleri

## Konut/Ticari Ä°Ã§in
- **Kat MÃ¼lkiyeti**: Ä°skanÄ± alÄ±nmÄ±ÅŸ baÄŸÄ±msÄ±z bÃ¶lÃ¼m
- **Kat Ä°rtifakÄ±**: Ä°nÅŸaat aÅŸamasÄ±ndaki proje
- **Hisseli Tapu**: Birden fazla hissedar
- **MÃ¼stakil Tapu**: Tek kiÅŸiye ait

## Arsa/Tarla Ä°Ã§in
- **MÃ¼stakil Tapulu**: Tek kiÅŸiye ait arsa
- **Hisseli Tapu**: Birden fazla hissedar
- **Tarla VasfÄ±**: Tarla niteliÄŸinde tapu
- **Ä°frazlÄ±**: BÃ¶lÃ¼nmÃ¼ÅŸ parsel

## DÄ°KKAT
- Arsa ilanlarÄ±nda "Kat MÃ¼lkiyeti" veya "Kat Ä°rtifakÄ±" SORMA
- Konut ilanlarÄ±nda "Tarla VasfÄ±" SORMA
# Arsa KurallarÄ±

## ASLA Sorulmayanlar
- Oda sayÄ±sÄ± (roomCount) â†’ YOK
- Bina yaÅŸÄ± (buildingAge) â†’ YOK
- IsÄ±tma tipi (heating) â†’ YOK
- Aidat (dues) â†’ YOK
- BrÃ¼t/Net alan ayrÄ±mÄ± â†’ YOK (sadece tek alan)

## MUTLAKA Sorulacaklar
- Ada no (adaNo)
- Parsel no (parselNo)
- Ä°mar durumu (imarDurumu)
- Toplam alan (mÂ²) â†’ TEK deÄŸer
- Tapu tÃ¼rÃ¼ (deedStatus)
- Fiyat (price)

## Ada/Parsel Okuma
- "151 ada 3 parsel" â†’ adaNo=151, parselNo=3
- "151/3" â†’ adaNo=151, parselNo=3

## Ä°mar Bilgileri
- TAKS: Taban Alan KatsayÄ±sÄ± (Ã¶rn: 0.30 = %30)
- KAKS/Emsal: Kat Alan KatsayÄ±sÄ±
- Gabari: Maksimum bina yÃ¼ksekliÄŸi
- "bodrum+4 kat" â†’ imar bilgisi, bina katÄ± deÄŸil
