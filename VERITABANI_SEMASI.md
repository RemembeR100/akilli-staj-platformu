# Akıllı Staj Programı - Veritabanı Şeması

Projenin veritabanı altyapısı tarayıcı tarafında çalışan ilişkisel **SQLite (sql.js)** üzerine kuruludur.

Aşağıda sistemdeki tablolar ve sütun bilgileri yer almaktadır. Bu dökümanı projenizin teknik ekler (technical appendix) kısmına doğrudan ekleyebilirsiniz.

## Tablolar

### 1. `kullanicilar` Tablosu
Sisteme kayıt olan Stajyer, Kurumsal ve Admin hesaplarının bilgilerini tutar.

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Kullanıcının benzersiz kimliği |
| `ad` | TEXT | | Kullanıcı veya şirket adı |
| `email` | TEXT | UNIQUE | Giriş yapmak için kullanılan benzersiz e-posta adresi |
| `sifre` | TEXT | | SHA-256 algoritması ile hashlenmiş şifre |
| `rol` | TEXT | | `stajyer`, `kurumsal` veya `admin` rolleri |
| `bio` | TEXT | NULL | Kullanıcının kendini anlattığı kısa metin (Stajyerler için) |
| `yetenekler`| TEXT | NULL | Virgülle ayrılmış yetenek listesi (örn: "HTML, CSS, Python") |
| `link` | TEXT | NULL | Kullanıcının portfolyo veya LinkedIn bağlantısı |

---

### 2. `ilanlar` Tablosu
Kurumsal hesaplar tarafından sisteme eklenen staj ilanlarını barındırır.

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | İlanın benzersiz kimliği |
| `sirket_adi` | TEXT | | İlanı açan şirketin adı |
| `pozisyon` | TEXT | | Aranan stajyer pozisyonu (örn: "Frontend Stajyeri") |
| `lokasyon` | TEXT | | İlanın konumu (örn: "İstanbul") |
| `calisma_sekli`| TEXT | | "Ofis", "Uzaktan", "Hibrit" gibi seçenekler |
| `kategori` | TEXT | | "Yazılım", "Web", "Veri", "Pazarlama" kategorileri |
| `tarih` | TEXT | | İlanın yayınlanma tarihi (DD.MM.YYYY formatında) |
| `detay` | TEXT | | İlanın detaylı iş tanımı ve gereksinimleri |

**Not:** Hızlı arama ve eşleştirme motoru için `kategori`, `calisma_sekli` ve `lokasyon` sütunlarında SQL Index'leri (B-Tree) tanımlanmıştır.

---

### 3. `basvurular` Tablosu
Öğrencilerin (Stajyerlerin) ilanlara yaptıkları başvuruları tutan bağlantı (ilişki) tablosudur. Öğrenci ile İlan arasında **Many-to-Many (Çoka Çok)** ilişkiyi sağlar.

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Başvurunun benzersiz kimliği |
| `userId` | INTEGER | FOREIGN KEY | Başvuru yapan kullanıcının ID'si (`kullanicilar.id`) |
| `jobId` | INTEGER | FOREIGN KEY | Başvurulan ilanın ID'si (`ilanlar.id`) |
| `tarih` | TEXT | | Başvurunun yapıldığı tarih |
| `durum` | TEXT | | Başvurunun güncel durumu (Varsayılan: "Başvuru Alındı") |

**Not:** Çift başvuru yapılmasını engellemek ve kullanıcının başvurularını hızlı çekebilmek için uygulamanın iş mantığında `userId` ve `jobId` alanları üzerinden optimizasyon yapılmıştır. İlan silindiğinde o ilana ait başvurular da temizlenmektedir (Cascade).

## Entity-Relationship (ER) Bağıntıları
- Bir Kullanıcı (Stajyer) **birden fazla** Başvuru yapabilir. (1:N)
- Bir İlan **birden fazla** Başvuru alabilir. (1:N)
- Bir Kullanıcı (Kurumsal) **birden fazla** İlan açabilir. Ancak bu ilişkide `kullanici_id` ilanlar tablosunda tutulmak yerine basitlik açısından `sirket_adi` baz alınmıştır.
