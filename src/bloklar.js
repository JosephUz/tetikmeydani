// Blok türleri: sunucu da istemci de bu dosyayı okur. Renk sırası [üst, yan, alt].
export const B = { BUZ: 44, BUZ_ACIK: 45, BUZ_DUVAR: 46, HAVA: 0, CIM: 1, TOPRAK: 2, TAS: 3, YOL: 4, KUM: 5, TAHTA: 6, TUGLA: 7, SIVA: 8, YAPRAK: 9, KUTUK: 10, CAM: 11, KIRMIZI: 12, MAVI: 13, SARI: 14, SU: 15, KAYA: 16, CAKIL: 17, ALTIN: 18, MERMER: 19, KIREMIT: 20, FENER: 21, YESIL: 22, MOR: 23, PLAKA: 24, PLAKA_KENAR: 25, BUGDAY: 26, CEVHER: 27, KURU: 28, KAPI: 29, MASA: 30, SANDALYE: 31, YATAK: 32, KITAPLIK: 33, HALI: 34, SANCAK: 35, AVIZE: 36, HEYKEL: 37, HAZINE: 38, TAHT: 39, KRISTAL_AVIZE: 40, ALTIN_CESME: 41, EJDER_HEYKEL: 42, YILDIZ_TAHT: 43 };
export const BLOK = [];
const tanim = (id, ad, ust, yan = ust, alt = yan, ek = {}) => { BLOK[id] = { id, ad, renk: [ust, yan, alt], kati: true, saydam: false, ...ek }; };
tanim(B.HAVA, 'Hava', 0, 0, 0, { kati: false, saydam: true });
tanim(B.CIM, 'Çim', 0x86b552, 0x8f7a4e, 0x7a5c3a);
tanim(B.TOPRAK, 'Toprak', 0x86663f);
tanim(B.TAS, 'Taş', 0x9a9c92, 0x8d8f86);
tanim(B.YOL, 'Kaldırım', 0xc9b88e, 0xa99a76);
tanim(B.KUM, 'Kum', 0xe3d29a);
tanim(B.TAHTA, 'Tahta', 0xb88a52, 0xa77a45);
tanim(B.TUGLA, 'Tuğla', 0xb5573c, 0xa84e36);
tanim(B.SIVA, 'Sıva', 0xefe8d8, 0xe4dccb);
tanim(B.YAPRAK, 'Yaprak', 0x4f8a3c, 0x497f37, 0x497f37, { kati: false }); // içinden geçilir (ağaç gölgeliği, çit)
tanim(B.KUTUK, 'Kütük', 0xa3824f, 0x6b4c2e);
tanim(B.CAM, 'Cam', 0xcdeaf2, 0xbfe2ec, 0xbfe2ec, { saydam: true });
tanim(B.KIRMIZI, 'Kırmızı', 0xc8453a);
tanim(B.MAVI, 'Mavi', 0x3f7fc9);
tanim(B.SARI, 'Sarı', 0xe8c547);
tanim(B.SU, 'Su', 0x3f8fc6, 0x3a84b8, 0x3a84b8, { kati: false, saydam: true, sivi: true });
tanim(B.KAYA, 'Ana kaya', 0x55574f);
tanim(B.CAKIL, 'Çakıl', 0xb4ab95, 0xa39a85);
// Dükkândan alınan bloklar (Faz 3): bkz. esyalar.js.
tanim(B.ALTIN, 'Altın', 0xf0c84a, 0xdcb23c);
tanim(B.MERMER, 'Mermer', 0xf1efe9, 0xe1ddd3);
tanim(B.KIREMIT, 'Kiremit', 0xc4643f, 0xad5434);
tanim(B.FENER, 'Fener', 0xfff3b8, 0xffe58a);
tanim(B.YESIL, 'Yeşil', 0x4f9a55);
tanim(B.MOR, 'Mor', 0x7d4fb0);
// Yörünge Arenası adaları (Faz 4)
tanim(B.PLAKA, 'Plaka', 0x5d7189, 0x46576b);
tanim(B.PLAKA_KENAR, 'Plaka kenarı', 0x8fe6ff, 0x5fc7e8);
// Faz 6 iş alanları ve haydut ovası. Buğdayın içinden yürünür.
tanim(B.BUGDAY, 'Buğday', 0xe6c65a, 0xd4b04a, 0xd4b04a, { kati: false, saydam: true });
tanim(B.CEVHER, 'Altın cevheri', 0xb9a46a, 0x9c916f);
tanim(B.KURU, 'Kuru toprak', 0xa48a5c, 0x8c7550);
// Faz 8: ev eşyası. Kapının içinden geçilir (açık kapı).
tanim(B.KAPI, 'Kapı', 0x6b4a28, 0x7a5532, 0x6b4a28, { kati: false });
tanim(B.MASA, 'Masa', 0xc49a62, 0x8a6238);
tanim(B.SANDALYE, 'Sandalye', 0x9a6b3a, 0x7a5532);
tanim(B.YATAK, 'Yatak', 0xd8d4c8, 0xb5423a);
tanim(B.KITAPLIK, 'Kitaplık', 0x7a5532, 0x9c4a3a);
// Faz 22: değerli ev eşyaları; Faz 46'dan beri kullanılmıyor (evler kalktı), blok numaraları kaymasın diye duruyor.
tanim(B.HALI, 'Nakışlı halı', 0xb8323a, 0xd9a441, 0x8a2a2a);
tanim(B.SANCAK, 'Sancak', 0x2f5fa8, 0xe8c547, 0x2f5fa8);
tanim(B.AVIZE, 'Avize', 0xfff1b0, 0xf0c84a, 0xfff1b0);
tanim(B.HEYKEL, 'Heykel', 0xf6f2e6, 0xd8d0bc, 0xb9b09a);
tanim(B.HAZINE, 'Hazine sandığı', 0xf0c84a, 0x7a4f22, 0x5a3a18);
tanim(B.TAHT, 'Taht', 0xf0c84a, 0x7d2fb0, 0x5a2080);
// Faz 25: lüks ev koleksiyonu; Faz 46'dan beri kullanılmıyor (numaralar kaymasın diye duruyor).
tanim(B.KRISTAL_AVIZE, 'Kristal avize', 0xe6fbff, 0x9fe8ff, 0xe6fbff);
tanim(B.ALTIN_CESME, 'Altın çeşme', 0x6fd3ff, 0xf0c84a, 0xc9a23a);
tanim(B.EJDER_HEYKEL, 'Ejder heykeli', 0x2fbf71, 0x1f8a52, 0xf0c84a);
tanim(B.YILDIZ_TAHT, 'Yıldız tahtı', 0xfff6c8, 0xff4f6d, 0xffd36b);
// Faz 64: Tetik Meydanı'nın ilk sürümündeki buz zemin ve duvar; artık kullanılmıyor, numaralar kaymasın diye duruyor.
tanim(B.BUZ, 'Buz', 0xcfe6f0, 0xbcd8e4);
tanim(B.BUZ_ACIK, 'Açık buz', 0xe2f2f8, 0xcfe6f0);
tanim(B.BUZ_DUVAR, 'Buz duvar', 0x9ac4da, 0x8fbcd4);

export const opak = t => t !== B.HAVA && !BLOK[t].saydam;
export const kati = t => BLOK[t].kati;
