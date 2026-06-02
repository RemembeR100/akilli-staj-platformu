-- ============================================================
-- Akıllı Staj Platformu - Supabase Veritabanı Kurulum Scripti
-- ============================================================
-- Bu dosyanın tamamını Supabase Dashboard → SQL Editor'a yapıştırıp çalıştırın.
-- Sırasıyla: Tablolar → Index'ler → RLS Politikaları → Seed Data

-- ============================================================
-- 1) TABLOLAR
-- ============================================================

-- Kullanıcı profil bilgileri (Supabase Auth ile bağlantılı)
CREATE TABLE IF NOT EXISTS kullanicilar (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL DEFAULT 'stajyer' CHECK (rol IN ('stajyer', 'kurumsal')),
    bio TEXT,
    yetenekler TEXT,
    link TEXT,
    telefon TEXT,
    profil_resmi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staj ilanları
CREATE TABLE IF NOT EXISTS ilanlar (
    id BIGSERIAL PRIMARY KEY,
    sirket_adi TEXT NOT NULL,
    pozisyon TEXT NOT NULL,
    lokasyon TEXT NOT NULL,
    calisma_sekli TEXT NOT NULL,
    kategori TEXT NOT NULL,
    tarih TEXT NOT NULL,
    detay TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Başvurular (kullanıcı ↔ ilan ilişki tablosu)
CREATE TABLE IF NOT EXISTS basvurular (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES ilanlar(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'Başvuru Alındı',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- ============================================================
-- 2) INDEX'LER (Performans Optimizasyonu)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ilanlar_kategori ON ilanlar(kategori);
CREATE INDEX IF NOT EXISTS idx_ilanlar_calisma ON ilanlar(calisma_sekli);
CREATE INDEX IF NOT EXISTS idx_ilanlar_lokasyon ON ilanlar(lokasyon);
CREATE INDEX IF NOT EXISTS idx_basvurular_user_id ON basvurular(user_id);
CREATE INDEX IF NOT EXISTS idx_basvurular_job_id ON basvurular(job_id);

-- ============================================================
-- 3) ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ============================================================

-- --- kullanicilar tablosu ---
ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;

-- Herkes profil bilgilerini okuyabilir (ilan detayında şirket adı gösterilir)
CREATE POLICY "Herkes profilleri okuyabilir"
    ON kullanicilar FOR SELECT
    USING (true);

-- Kullanıcı sadece kendi profilini güncelleyebilir
CREATE POLICY "Kullanici kendi profilini guncelleyebilir"
    ON kullanicilar FOR UPDATE
    USING (auth.uid() = id);

-- Yeni kayıt olurken profil oluşturulabilir
CREATE POLICY "Kullanici kendi profilini olusturabilir"
    ON kullanicilar FOR INSERT
    WITH CHECK (auth.uid() = id);

-- --- ilanlar tablosu ---
ALTER TABLE ilanlar ENABLE ROW LEVEL SECURITY;

-- Herkes ilanları okuyabilir
CREATE POLICY "Herkes ilanlari okuyabilir"
    ON ilanlar FOR SELECT
    USING (true);

-- Giriş yapmış kullanıcılar ilan ekleyebilir
CREATE POLICY "Giris yapmis kullanicilar ilan ekleyebilir"
    ON ilanlar FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Giriş yapmış kullanıcılar ilan silebilir (yetki kontrolü uygulama katmanında)
CREATE POLICY "Giris yapmis kullanicilar ilan silebilir"
    ON ilanlar FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- --- basvurular tablosu ---
ALTER TABLE basvurular ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi başvurularını görebilir
CREATE POLICY "Kullanici kendi basvurularini gorebilir"
    ON basvurular FOR SELECT
    USING (auth.uid() = user_id);

-- Kurumsal: Kendi ilanlarına yapılan başvuruları görebilir
CREATE POLICY "Kurumsal ilan basvurularini gorebilir"
    ON basvurular FOR SELECT
    USING (
        job_id IN (
            SELECT id FROM ilanlar
            WHERE sirket_adi = (
                SELECT ad FROM kullanicilar WHERE id = auth.uid()
            )
        )
    );

-- Kullanıcı başvuru yapabilir
CREATE POLICY "Kullanici basvuru yapabilir"
    ON basvurular FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Kullanıcı kendi başvurusunu silebilir (iptal)
CREATE POLICY "Kullanici kendi basvurusunu silebilir"
    ON basvurular FOR DELETE
    USING (auth.uid() = user_id);

-- Kurumsal: Kendi ilanlarına yapılan başvuruların durumunu güncelleyebilir (Onay/Red)
CREATE POLICY "Kurumsal basvuru durumunu guncelleyebilir"
    ON basvurular FOR UPDATE
    USING (
        job_id IN (
            SELECT id FROM ilanlar
            WHERE sirket_adi = (
                SELECT ad FROM kullanicilar WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (true);

-- ============================================================
-- 4) TRIGGER: Auth kaydında otomatik profil oluşturma
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.kullanicilar (id, ad, email, rol)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'ad', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'rol', 'stajyer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eğer daha önce oluşturulduysa kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5) BAŞLANGIÇ VERİLERİ (Seed Data - 30 İlan)
-- ============================================================

INSERT INTO ilanlar (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, tarih, detay) VALUES
('Teknoloji A.Ş.', 'Yazılım Geliştirme Stajyeri', 'İstanbul', 'Hibrit', 'Yazılım', '10 Mayıs 2026', 'Modern web teknolojileri ile projeler geliştirecek stajyer arıyoruz.'),
('Okyanus Kolejleri', 'Web Geliştirme Stajyeri', 'İzmir', 'Uzaktan', 'Web', '08 Mayıs 2026', 'Okulumuzun web altyapısına destek olacak, öğrenmeye hevesli stajyerler.'),
('Finans Bank', 'Veri Analitiği Stajyeri', 'Ankara', 'Ofis', 'Veri', '05 Mayıs 2026', 'Büyük veri setleri üzerinde çalışacak ve raporlama yapacak ekip arkadaşları.'),
('Global Pazarlama', 'Dijital Pazarlama Stajyeri', 'Bursa', 'Uzaktan', 'Pazarlama', '01 Mayıs 2026', 'Sosyal medya hesaplarımızı yönetecek ve kampanya kurgulayacak.'),
('Mavi Yazılım', 'Frontend Stajyeri', 'İstanbul', 'Ofis', 'Web', '11 Mayıs 2026', 'React ve Vue bilen veya öğrenmek isteyen stajyer arayışımız var.'),
('Kırmızı Kod', 'Backend Stajyeri', 'Ankara', 'Hibrit', 'Yazılım', '12 Mayıs 2026', 'Node.js üzerinde API geliştirmemize yardım edecek stajyer aranıyor.'),
('Veri Bilişim', 'Veri Bilimi Stajyeri', 'Uzaktan', 'Uzaktan', 'Veri', '13 Mayıs 2026', 'Python ve Pandas kütüphanelerine hakim veri stajyeri arıyoruz.'),
('Medya Ajans', 'SEO Stajyeri', 'İzmir', 'Ofis', 'Pazarlama', '14 Mayıs 2026', 'Arama motoru optimizasyonu süreçlerini öğrenecek stajyer.'),
('Oyun Stüdyosu', 'Oyun Geliştirme Stajyeri', 'İstanbul', 'Hibrit', 'Yazılım', '15 Mayıs 2026', 'Unity veya Unreal Engine temel bilgisine sahip çalışma arkadaşı.'),
('Siber Güvenlik A.Ş.', 'Siber Güvenlik Stajyeri', 'Ankara', 'Ofis', 'Yazılım', '16 Mayıs 2026', 'Sızma testleri ve ağ güvenliği alanında kendini geliştirmek isteyenler.'),
('E-Ticaret Ltd', 'UI/UX Tasarım Stajyeri', 'Bursa', 'Uzaktan', 'Web', '17 Mayıs 2026', 'Figma kullanabilen ve kullanıcı deneyimi süreçlerinde aktif rol alacak.'),
('Data Center', 'Veritabanı Yöneticisi Stajyeri', 'Kocaeli', 'Ofis', 'Veri', '18 Mayıs 2026', 'SQL ve NoSQL veritabanı bakımlarında görev alacak.'),
('Sosyal Ağ A.Ş.', 'İçerik Pazarlama Stajyeri', 'İstanbul', 'Hibrit', 'Pazarlama', '19 Mayıs 2026', 'Yaratıcı metin yazarlığı yapabilecek, içerik stratejisi üretecek stajyer.'),
('Mobil Dev', 'Flutter Stajyeri', 'Uzaktan', 'Uzaktan', 'Yazılım', '20 Mayıs 2026', 'Çapraz platform mobil uygulama geliştirme süreçlerine destek olacak.'),
('Bulut Sistemler', 'DevOps Stajyeri', 'Ankara', 'Hibrit', 'Yazılım', '21 Mayıs 2026', 'Docker ve Kubernetes teknolojilerine ilgi duyan öğrenci.'),
('Fintech Çözümleri', 'Blockchain Stajyeri', 'İstanbul', 'Ofis', 'Yazılım', '22 Mayıs 2026', 'Web3 teknolojileri ve akıllı kontrat yazımı konusunda hevesli.'),
('Eğitim Vadisi', 'Eğitim Teknolojileri Stajyeri', 'İzmir', 'Uzaktan', 'Web', '23 Mayıs 2026', 'LMS sistemlerimize destek olacak, HTML/CSS bilen stajyer.'),
('Lojistik A.Ş.', 'İş Analisti Stajyeri', 'Mersin', 'Ofis', 'Veri', '24 Mayıs 2026', 'Süreç analizleri yapacak ve raporlama araçlarını kullanacak.'),
('Global Ajans', 'Performans Pazarlama Stajyeri', 'Uzaktan', 'Uzaktan', 'Pazarlama', '25 Mayıs 2026', 'Google Ads ve Meta Ads panellerini öğrenip yönetebilecek.'),
('Yapay Zeka Lab', 'Makine Öğrenmesi Stajyeri', 'Ankara', 'Hibrit', 'Veri', '26 Mayıs 2026', 'Model eğitimi ve veri temizleme aşamalarında görev yapacak.'),
('Finansal Teknolojiler', 'React Native Stajyeri', 'İstanbul', 'Uzaktan', 'Yazılım', '27 Mayıs 2026', 'Mobil ödeme sistemleri arayüzleri geliştirecek takım arkadaşı.'),
('Eğitim Bilişim', 'Sistem Yöneticisi Stajyeri', 'İzmir', 'Ofis', 'Yazılım', '27 Mayıs 2026', 'Linux sunucu yönetimi konusunda kendini geliştirmek isteyenler.'),
('Oto Sanayi A.Ş.', 'Gömülü Sistemler Stajyeri', 'Bursa', 'Ofis', 'Yazılım', '28 Mayıs 2026', 'C/C++ bilen, otomotiv sistemlerine meraklı.'),
('Marka Yönetimi', 'Sosyal Medya Stajyeri', 'Antalya', 'Uzaktan', 'Pazarlama', '28 Mayıs 2026', 'Instagram ve TikTok stratejilerimize destek olacak yaratıcı beyinler.'),
('Büyük Veri Ltd.', 'Data Engineer Stajyeri', 'Ankara', 'Hibrit', 'Veri', '29 Mayıs 2026', 'Veri boru hatları (pipeline) tasarlamaya yardımcı olacak stajyer.'),
('GameX Stüdyo', '3D Artist Stajyeri', 'İstanbul', 'Ofis', 'Web', '29 Mayıs 2026', 'Blender veya Maya kullanan, karakter ve çevre modelleme yapacak.'),
('E-İhracat Corp', 'E-Ticaret Uzmanı Stajyeri', 'Kocaeli', 'Uzaktan', 'Pazarlama', '30 Mayıs 2026', 'Shopify ve Amazon altyapılarında mağaza yönetimine destek.'),
('Tech Hub', 'Fullstack Stajyeri', 'Eskişehir', 'Hibrit', 'Yazılım', '30 Mayıs 2026', 'MERN stack kullanarak şirket içi araçlar geliştirecek.'),
('Siber Kalkan', 'Sızma Testi Stajyeri', 'Uzaktan', 'Uzaktan', 'Yazılım', '31 Mayıs 2026', 'Web uygulamalarında zafiyet tespiti yapacak yetenekler.'),
('Turizm Acentesi', 'Web Master Stajyeri', 'Muğla', 'Ofis', 'Web', '31 Mayıs 2026', 'WordPress tabanlı sitelerimizi güncelleyecek ve performansını artıracak.');

-- ============================================================
-- BİTTİ! Artık Supabase veritabanınız hazır.
-- supabase-config.js dosyasına URL ve anon key'inizi yazın.
-- ============================================================
