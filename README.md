# 🌍 Dünya Küresi - 3D Globe with Country Labels

React Native ve Three.js kullanarak geliştirilmiş interaktif 3D dünya projesi. Yakınlaştırma yapıldıkça ülke ve bölge isimlerinin dinamik olarak gösterildiği Expo Go uyumlu mobil uygulama.

## ✨ Özellikler

- **3D İnteraktif Dünya**: Three.js ile gerçekçi dünya küresi
- **Dinamik Ülke Etiketleri**: Zoom seviyesine göre ülke isimlerinin görünümü
- **iOS Optimizasyonu**: iOS mobil cihazlar için özel performans iyileştirmeleri
- **Smooth Zoom**: Yumuşak yakınlaştırma ve uzaklaştırma
- **Mesafe Hesaplama**: İki nokta arasında havayolu mesafe hesaplaması
- **Expo Go Uyumlu**: Development sırasında Expo Go ile test edilebilir

## 🚀 Kurulum

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. Uygulamayı başlatın:

   ```bash
   npx expo start
   ```

3. QR kodu ile Expo Go'dan açın veya:
   - iOS Simulator: `i` tuşuna basın
   - Android Emulator: `a` tuşuna basın

## 📱 Platform Desteği

- ✅ **iOS**: Tam optimizasyon ve smooth performans
- ✅ **Android**: Destekleniyor
- ✅ **Expo Go**: Development ve test için tam uyumlu
- ✅ **Web**: Tarayıcı desteği

## 🎮 Kullanım

### Temel Kontroller
- **Pan (Kaydırma)**: Dünyayı döndürmek için parmağınızla kaydırın
- **Pinch to Zoom**: İki parmakla yakınlaştırın/uzaklaştırın
- **Bottom Sheet**: Alt menü için üst kısımdaki ≡ simgesine dokunun

### Ülke Etiketleri
Zoom seviyesine göre farklı katmanlarda ülke isimleri görünür:
- **Tier 1** (Uzak zoom): Türkiye, ABD, Çin, Rusya gibi büyük ülkeler
- **Tier 2** (Orta zoom): Almanya, Fransa, İngiltere, Japonya vb.
- **Tier 3** (Yakın zoom): Tüm desteklenen ülkeler

### Mesafe Hesaplama
1. Başlangıç noktasını seçin
2. Varış noktasını seçin  
3. "Mesafe Hesapla" butonuna dokunun
4. Havayolu mesafesini km cinsinden görün

## 🛠 Teknik Detaylar

### Ana Teknolojiler
- **React Native**: Mobil uygulama framework'ü
- **Three.js**: 3D grafik rendering
- **Expo**: Development ve deployment platformu
- **@react-three/fiber**: React için Three.js renderer
- **expo-gl**: WebGL integration

### Performans Optimizasyonları

#### iOS Özel İyileştirmeler:
- Düşük polygon sayısı (iOS: 20, diğer: 24 segment)
- Optimized pixel ratio (max 1.5 iOS için)
- Canvas polyfill ile uyumluluk
- Düşük wireframe çizgi sayısı (iOS: 150, diğer: 200)
- Gesture sensitivity ayarları

#### Genel Optimizasyonlar:
- LOD (Level of Detail) sistemli etiketler
- Debounced zoom güncellemeleri
- Memory-efficient texture yönetimi
- Platform-specific rendering ayarları

### Dosya Yapısı
```
app/
├── (tabs)/
│   ├── index.tsx          # Ana dünya komponenti
│   └── explore.tsx        # İkincil sayfa
utils/
├── canvasPolyfill.ts      # iOS canvas polyfill
assets/
├── custom.geo.json        # Ülke sınırları GeoJSON
├── 2k_earth_nightmap.jpg  # Dünya texture'ı
└── 8k_stars.jpg          # Yıldız arkaplanı
```

## 🌟 Öne Çıkan Özellikler

### Smart Label System
- Zoom seviyesine göre akıllı etiket filtreleme
- Öncelik tabanlı görünürlük (3 tier sistem)
- Performance-optimized text rendering

### iOS Compatibility
- Canvas polyfill ile tam iOS desteği
- Platform-specific performance tuning
- Smooth gesture handling

### Interactive Experience
- Real-time zoom-based label updates
- Smooth rotation with momentum
- Distance calculation between any two points

## 🐛 Bilinen Sınırlamalar

- Çok yüksek zoom seviyelerinde bazı iOS cihazlarda performance düşüşü olabilir
- Text rendering için canvas desteği gereklidir
- GeoJSON dosyası büyük olduğu için ilk yükleme biraz zaman alabilir

## 🔧 Geliştirme

### Development build oluşturma:
```bash
npx expo run:ios
npx expo run:android
```

### Production build:
```bash
npx expo build:ios
npx expo build:android
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.
