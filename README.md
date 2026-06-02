# Akıllı Staj Programı

Öğrenciler (Stajyerler) ile şirketleri buluşturan, yapay zeka destekli eşleştirme algoritmasına sahip modern bir staj ilan portalı.

## 🚀 Proje Hakkında

Akıllı Staj Programı, öğrencilerin yeteneklerine en uygun staj ilanlarını bulmalarını ve şirketlerin ihtiyaç duydukları yeteneklere sahip stajyerleri keşfetmelerini sağlayan web tabanlı bir platformdur. 

Veritabanı işlemleri tarayıcı üzerinde çalışan **SQLite (sql.js)** ile yapılmakta ve veriler localStorage üzerinde kalıcı olarak (Base64 formatında) saklanmaktadır. Bu sayede hiçbir sunucu kurulumuna gerek kalmadan uygulamanın tüm özellikleri (Kayıt/Giriş, İlan Ekleme, Başvuru Yapma, Algoritmik Eşleştirme) test edilebilir.

## 🌟 Temel Özellikler

- **Çoklu Rol Sistemi:** Stajyer, Kurumsal ve Admin hesap türleri.
- **Güvenlik:** Kullanıcı şifreleri SHA-256 algoritması ile hashlenerek saklanır. XSS saldırılarına karşı önlemler alınmıştır.
- **Yapay Zeka Destekli Eşleştirme (Algoritma):** Öğrencinin biyografisi ve yetenekleri, ilan detayları ile eşleştirilir. En yüksek puana sahip ilanlar öğrenciye önerilir.
- **Gerçek Zamanlı Filtreleme:** Kategori, çalışma şekli, lokasyon ve kelime bazlı hızlı arama (Debounce optimizasyonu ile).
- **Veritabanı Yönetimi:** Admin paneli üzerinden SQLite veritabanı yedeğini bilgisayara indirme özelliği.
- **Responsive Tasarım:** Mobil, tablet ve masaüstü cihazlarla tam uyumlu modern UI.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** HTML5, Vanilla CSS3 (Custom Properties, Flexbox, CSS Grid), Vanilla JavaScript (ES6+).
- **Veritabanı:** sql.js (WebAssembly SQLite).
- **Şifreleme:** Web Crypto API (SHA-256).

## 📋 Kurulum ve Çalıştırma

Projede Node.js, PHP veya Python gibi bir backend sunucusu kullanılmamıştır. Her şey tarayıcı üzerinde çalışır.

1. Proje dosyalarını bilgisayarınıza indirin veya klonlayın.
2. `index.html` dosyasını modern bir web tarayıcısında (Chrome, Firefox, Edge, Safari vb.) açın.
3. Uygulama ilk açıldığında `api.js` veritabanını otomatik oluşturacak ve test verilerini yükleyecektir.

## 👨‍💻 Test Kullanıcıları

Yeni öğrenci (Stajyer) veya şirket (Kurumsal) hesaplarını "Kayıt Ol" sayfasından anında oluşturabilirsiniz.
