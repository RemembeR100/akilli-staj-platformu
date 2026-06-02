# Akıllı Staj Programı - Veritabanı Şeması

Projenin veritabanı altyapısı **Supabase (PostgreSQL)** üzerine kuruludur. Kimlik doğrulama işlemleri **Supabase Auth** üzerinden yapılmaktadır.

Aşağıda sistemdeki tablolar ve sütun bilgileri yer almaktadır.

## Tablolar

### 1. `kullanicilar` Tablosu
Sisteme kayıt olan Stajyer, Kurumsal ve Admin hesaplarının profil bilgilerini tutar. (Auth ile ilişkilidir)

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Supabase Auth `users` tablosundaki id ile eşleşir (`auth.users(id) ON DELETE CASCADE`) |
| `ad` | TEXT | NOT NULL | Kullanıcı veya şirket adı |
| `email` | TEXT | UNIQUE, NOT NULL | Giriş yapmak için kullanılan benzersiz e-posta adresi |
| `rol` | TEXT | DEFAULT 'stajyer' | `stajyer`, `kurumsal` veya `admin` rolleri |
| `bio` | TEXT | NULL | Kullanıcının kendini anlattığı kısa metin (Stajyerler için) |
| `yetenekler`| TEXT | NULL | Virgülle ayrılmış yetenek listesi (örn: "HTML, CSS, Python") |
| `link` | TEXT | NULL | Kullanıcının portfolyo veya LinkedIn bağlantısı |
| `telefon` | TEXT | NULL | Kullanıcının iletişim telefon numarası |
| `created_at`| TIMESTAMPTZ | DEFAULT NOW() | Oluşturulma tarihi |

---

### 2. `ilanlar` Tablosu
Kurumsal hesaplar tarafından sisteme eklenen staj ilanlarını barındırır.

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | İlanın benzersiz kimliği |
| `sirket_adi` | TEXT | NOT NULL | İlanı açan şirketin adı |
| `pozisyon` | TEXT | NOT NULL | Aranan stajyer pozisyonu (örn: "Frontend Stajyeri") |
| `lokasyon` | TEXT | NOT NULL | İlanın konumu (örn: "İstanbul") |
| `calisma_sekli`| TEXT | NOT NULL | "Ofis", "Uzaktan", "Hibrit" gibi seçenekler |
| `kategori` | TEXT | NOT NULL | "Yazılım", "Web", "Veri", "Pazarlama" kategorileri |
| `tarih` | TEXT | NOT NULL | İlanın yayınlanma tarihi (DD.MM.YYYY formatında) |
| `detay` | TEXT | NULL | İlanın detaylı iş tanımı ve gereksinimleri |
| `created_at`| TIMESTAMPTZ | DEFAULT NOW() | Oluşturulma tarihi |

**Not:** Hızlı arama ve eşleştirme motoru için `kategori`, `calisma_sekli` ve `lokasyon` sütunlarında SQL Index'leri tanımlanmıştır.

---

### 3. `basvurular` Tablosu
Öğrencilerin (Stajyerlerin) ilanlara yaptıkları başvuruları tutan bağlantı (ilişki) tablosudur. Öğrenci ile İlan arasında **Many-to-Many (Çoka Çok)** ilişkiyi sağlar.

| Sütun Adı | Veri Tipi | Özellikler | Açıklama |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | Başvurunun benzersiz kimliği |
| `user_id` | UUID | FOREIGN KEY, NOT NULL | Başvuru yapan kullanıcının ID'si (`kullanicilar.id` ON DELETE CASCADE) |
| `job_id` | BIGINT | FOREIGN KEY, NOT NULL | Başvurulan ilanın ID'si (`ilanlar.id` ON DELETE CASCADE) |
| `tarih` | TEXT | NOT NULL | Başvurunun yapıldığı tarih |
| `durum` | TEXT | DEFAULT 'Başvuru Alındı' | Başvurunun güncel durumu |
| `created_at`| TIMESTAMPTZ| DEFAULT NOW() | Oluşturulma tarihi |

**Not:** Aynı kullanıcı aynı ilana iki kez başvuramaması için `(user_id, job_id)` çifti üzerinde `UNIQUE` kısıtlaması mevcuttur.

## Row Level Security (RLS)

Veritabanı güvenliği için tüm tablolarda RLS aktif edilmiştir:
- **Kullanıcılar**: Herkes profilleri okuyabilir, sadece kendi profilini güncelleyebilir.
- **İlanlar**: Herkes ilanları okuyabilir, sadece giriş yapmış kullanıcılar ilan ekleyip silebilir.
- **Başvurular**: Kullanıcılar sadece kendi başvurularını görebilir, kendi adlarına başvuru yapabilir veya iptal edebilirler.

## Entity-Relationship (ER) Bağıntıları
- Bir Kullanıcı (Stajyer) **birden fazla** Başvuru yapabilir. (1:N)
- Bir İlan **birden fazla** Başvuru alabilir. (1:N)
- Bir Kullanıcı (Kurumsal) **birden fazla** İlan açabilir.
