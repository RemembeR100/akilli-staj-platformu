/**
 * api.js - Supabase Veritabanı ve Uygulama Servis Katmanı
 *
 * Bu dosya Supabase (PostgreSQL) kullanarak bulut tabanlı bir veritabanı
 * üzerinde CRUD işlemleri gerçekleştirir. Kimlik doğrulama Supabase Auth
 * ile yapılır (bcrypt + JWT).
 *
 * Modüller:
 *   - API nesnesi : Tüm CRUD ve iş mantığı metodları
 *   - Supabase Auth : Kayıt, giriş, çıkış ve oturum yönetimi
 */

// Veritabanı hazır sözü (uyumluluk için)
let dbReadyPromise = null;

// Dışarıdan erişilen tüm veritabanı işlemleri bu nesnede toplanıyor
const API = {
    // Veritabanının hazır olmasını bekle (Supabase her zaman hazır, uyumluluk için bırakıldı)
    waitForInit: async () => {
        // Supabase client zaten supabase-config.js'de oluşturuluyor.
        // Burada oturum kontrolü yapıyoruz.
        return true;
    },

    // İlanları filtrelerle getir - arama metni, kategori, çalışma şekli ve lokasyona göre
    getIlanlar: async (filters = {}) => {
        let query = supabase.from('ilanlar').select('*');

        if (filters.aramaMetni) {
            const aranan = `%${filters.aramaMetni}%`;
            query = query.or(`pozisyon.ilike.${aranan},sirket_adi.ilike.${aranan}`);
        }
        if (filters.kategori && filters.kategori !== 'Tümü') {
            query = query.eq('kategori', filters.kategori);
        }
        if (filters.calismaSekli && filters.calismaSekli !== 'Tümü') {
            query = query.eq('calisma_sekli', filters.calismaSekli);
        }
        if (filters.lokasyon && filters.lokasyon.trim() !== '') {
            query = query.ilike('lokasyon', `%${filters.lokasyon.trim()}%`);
        }

        query = query.order('id', { ascending: false });

        const limit = filters.limit || 50;
        query = query.limit(limit);

        if (filters.offset) {
            query = query.range(filters.offset, filters.offset + limit - 1);
        }

        const { data, error } = await query;
        if (error) throw new Error('İlanlar yüklenirken hata: ' + error.message);
        return data || [];
    },

    getIlanDetay: async (id) => {
        const { data, error } = await supabase
            .from('ilanlar')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error('İlan bulunamadı');
        return data;
    },

    // Kullanıcı Kaydı (Supabase Auth + kullanicilar tablosu)
    register: async (ad, email, sifre, rol, telefon = '') => {
        // Basit XSS Koruması
        const guvenliAd = ad.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const guvenliTelefon = telefon ? telefon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        // Supabase Auth ile kayıt
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: sifre,
            options: {
                data: {
                    ad: guvenliAd,
                    rol: rol
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error('Bu e-posta adresi zaten kayıtlı.');
            }
            throw new Error('Kayıt hatası: ' + authError.message);
        }

        // Telefon numarasını kullanicilar tablosuna kaydet (tetikleyici tabloyu oluşturmuşsa)
        if (guvenliTelefon && authData.user) {
            await supabase
                .from('kullanicilar')
                .update({ telefon: guvenliTelefon })
                .eq('id', authData.user.id);
        }

        // Kullanıcı bilgilerini döndür
        const user = {
            id: authData.user.id,
            ad: guvenliAd,
            email: email,
            rol: rol,
            telefon: guvenliTelefon
        };

        return user;
    },

    // Giriş Yap (Supabase Auth)
    login: async (email, sifre) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: sifre
        });

        if (error) {
            throw new Error('E-posta veya şifre hatalı.');
        }

        // kullanicilar tablosundan profil bilgilerini çek
        const { data: profil, error: profilError } = await supabase
            .from('kullanicilar')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profilError) {
            throw new Error('Profil bilgileri alınamadı.');
        }

        return profil;
    },

    // Çıkış Yap
    logout: async () => {
        await supabase.auth.signOut();
    },

    // Aktif Kullanıcıyı Getir (Async - Supabase session'dan)
    getCurrentUser: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data: profil } = await supabase
            .from('kullanicilar')
            .select('*')
            .eq('id', session.user.id)
            .single();

        return profil || null;
    },

    // Profil Güncelle
    profilGuncelle: async (id, ad, bio, yetenekler, link, telefon) => {
        // XSS Koruması
        const guvenliAd = ad ? ad.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliBio = bio ? bio.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliLink = link ? link.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliTelefon = telefon ? telefon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const { error } = await supabase
            .from('kullanicilar')
            .update({
                ad: guvenliAd,
                bio: guvenliBio,
                yetenekler: yetenekler,
                link: guvenliLink,
                telefon: guvenliTelefon
            })
            .eq('id', id);

        if (error) throw new Error('Profil güncellenirken hata: ' + error.message);
    },

    // Başvuru Yap
    basvuruYap: async (userId, jobId) => {
        // Önce aynı başvuru var mı kontrol et
        const { data: mevcut } = await supabase
            .from('basvurular')
            .select('id')
            .eq('user_id', userId)
            .eq('job_id', jobId);

        if (mevcut && mevcut.length > 0) {
            throw new Error('Bu ilana zaten başvuru yaptınız.');
        }

        const tarih = new Date().toLocaleDateString('tr-TR');
        const { error } = await supabase
            .from('basvurular')
            .insert({
                user_id: userId,
                job_id: jobId,
                tarih: tarih,
                durum: 'Başvuru Alındı'
            });

        if (error) throw new Error('Başvuru yapılırken hata: ' + error.message);
    },

    // Başvuru İptal
    basvuruIptal: async (userId, jobId) => {
        const { error } = await supabase
            .from('basvurular')
            .delete()
            .eq('user_id', userId)
            .eq('job_id', jobId);

        if (error) throw new Error('Başvuru iptal edilirken hata: ' + error.message);
    },

    // Kullanıcının Başvurularını Getir (JOIN ile ilan bilgileriyle birlikte)
    getKullaniciBasvurulari: async (userId, limit = 50) => {
        const { data, error } = await supabase
            .from('basvurular')
            .select(`
                durum,
                tarih,
                job_id,
                ilanlar (*)
            `)
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(limit);

        if (error) throw new Error('Başvurular yüklenirken hata: ' + error.message);

        // Mevcut yapıyla uyumlu formata dönüştür
        return (data || []).map(b => ({
            ...b.ilanlar,
            durum: b.durum,
            tarih: b.tarih,
            jobId: b.job_id
        }));
    },

    // Sadece Kurumsal Hesaplar İçin: İlan Ekle
    ilanEkle: async (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, detay) => {
        const tarih = new Date().toLocaleDateString('tr-TR');

        // XSS Koruması
        const gPozisyon = pozisyon ? pozisyon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const gDetay = detay ? detay.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const { error } = await supabase
            .from('ilanlar')
            .insert({
                sirket_adi,
                pozisyon: gPozisyon,
                lokasyon,
                calisma_sekli,
                kategori,
                tarih,
                detay: gDetay
            });

        if (error) throw new Error('İlan eklenirken hata: ' + error.message);
    },

    // Kurumsal hesabın kendi açtığı ilanları getir
    getKurumsalIlanlari: async (sirket_adi, limit = 50) => {
        const { data, error } = await supabase
            .from('ilanlar')
            .select('*')
            .eq('sirket_adi', sirket_adi)
            .order('id', { ascending: false })
            .limit(limit);

        if (error) throw new Error('Kurumsal ilanlar yüklenirken hata: ' + error.message);
        return data || [];
    },

    // Kişiselleştirilmiş eşleştirme algoritması
    getEslesmeSkorlu: async (userId) => {
        // Kullanıcı bilgilerini çek
        const { data: user } = await supabase
            .from('kullanicilar')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user) return [];

        // Kullanıcı keyword listesi: yetenekler + bio
        const userKeywords = [];
        if (user.yetenekler) {
            user.yetenekler.split(',').map(y => y.trim().toLowerCase()).filter(Boolean).forEach(y => userKeywords.push(y));
        }
        if (user.bio) {
            const stopwords = ['ve', 'bir', 'bu', 'ile', 'da', 'de', 'için', 'olan', 'olan', 'benim', 'ama', 'daha', 'gibi', 'olarak'];
            user.bio.toLowerCase().split(/[\s,;.!?]+/).filter(w => w.length >= 4 && !stopwords.includes(w)).forEach(w => userKeywords.push(w));
        }

        // Kategori -> anahtar kelime haritası
        const catMap = {
            'Yazılım': ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'node', 'nodejs', 'react', 'vue', 'angular', 'backend', 'fullstack', 'api', 'rest', 'graphql', 'git', 'docker', 'kubernetes', 'linux', 'ruby', 'golang', 'rust', 'spring', 'django', 'flask', 'express', 'next', 'php', 'laravel', 'microservice', 'aws', 'devops', 'yazılım', 'kod', 'programlama', 'geliştirme'],
            'Web': ['web', 'html', 'css', 'react', 'vue', 'angular', 'frontend', 'tasarım', 'figma', 'ui', 'ux', 'wordpress', 'bootstrap', 'tailwind', 'sass', 'scss', 'webflow', 'next', 'nuxt', 'jquery', 'responsive', 'animasyon', 'svg', 'canva', 'sketch', 'adobexd', 'kullanıcı deneyimi', 'arayüz'],
            'Veri': ['python', 'pandas', 'numpy', 'sql', 'nosql', 'mysql', 'postgresql', 'mongodb', 'excel', 'tableau', 'powerbi', 'veri', 'data', 'analiz', 'analitik', 'istatistik', 'makine öğrenmesi', 'ml', 'tensorflow', 'pytorch', 'scikit', 'spark', 'hadoop', 'etl', 'pipeline', 'rapor', 'görselleştirme', 'keras', 'r dili'],
            'Pazarlama': ['pazarlama', 'marketing', 'seo', 'sem', 'sosyal medya', 'instagram', 'tiktok', 'google ads', 'meta ads', 'facebook', 'reklam', 'kampanya', 'dijital', 'içerik', 'content', 'copywriting', 'email', 'influencer', 'marka', 'marka yönetimi', 'analitik', 'crm', 'hubspot']
        };

        // Tüm ilanları çek
        const { data: ilanlar } = await supabase
            .from('ilanlar')
            .select('*')
            .order('id', { ascending: false })
            .limit(100);

        if (!ilanlar || ilanlar.length === 0) return [];

        // Profil boşsa uyarı veren ilanları döndür
        if (userKeywords.length === 0) {
            return ilanlar.slice(0, 6).map(i => ({ ...i, eslesme: 15, eslesme_label: 'Profilini Doldur' }));
        }

        const skorluIlanlar = ilanlar.map(ilan => {
            const ilanText = [ilan.pozisyon, ilan.detay, ilan.kategori, ilan.sirket_adi].join(' ').toLowerCase();
            const catKeys = catMap[ilan.kategori] || [];

            // FAKTÖR 1 - Metin Eşleşmesi (max 65 puan)
            const matchedInText = userKeywords.filter(uk => uk.length >= 2 && ilanText.includes(uk));
            const textScore = Math.min(65, matchedInText.length * 25);

            // FAKTÖR 2 - Kategori Uyumu (max 35 puan)
            const catMatchedSkills = userKeywords.filter(uk =>
                catKeys.some(kw => kw === uk || kw.includes(uk) || uk.includes(kw))
            ).length;
            const catScore = Math.min(35, catMatchedSkills * 18);

            // Toplam puan ve etiket
            const eslesme = Math.min(99, Math.max(12, textScore + catScore));

            let eslesme_label;
            if (eslesme >= 75) eslesme_label = 'En İyi Eşleşme';
            else if (eslesme >= 50) eslesme_label = 'Yeteneklerinle Uyumlu';
            else if (eslesme >= 28) eslesme_label = 'İlginizi Çekebilir';
            else eslesme_label = 'Keşfet';

            return { ...ilan, eslesme, eslesme_label };
        });

        return skorluIlanlar.sort((a, b) => b.eslesme - a.eslesme).slice(0, 6);
    },

    // İŞVEREN METOTLARI
    getIlanBasvurulari: async (ilanId) => {
        const { data, error } = await supabase
            .from('basvurular')
            .select(`
                id,
                durum,
                tarih,
                user_id,
                kullanicilar ( ad, email, telefon, yetenekler, link )
            `)
            .eq('job_id', ilanId)
            .order('id', { ascending: false });

        if (error) throw new Error('Başvurular yüklenirken hata: ' + error.message);
        return data || [];
    },

    basvuruDurumGuncelle: async (basvuruId, yeniDurum) => {
        const { error } = await supabase
            .from('basvurular')
            .update({ durum: yeniDurum })
            .eq('id', basvuruId);

        if (error) throw new Error('Başvuru durumu güncellenirken hata: ' + error.message);
    },

    // ADMİN METOTLARI
    ilanSil: async (id) => {
        // Önce ilana yapılmış başvuruları sil
        await supabase
            .from('basvurular')
            .delete()
            .eq('job_id', id);

        // İlanı sil
        const { error } = await supabase
            .from('ilanlar')
            .delete()
            .eq('id', id);

        if (error) throw new Error('İlan silinirken hata: ' + error.message);
    }
};

// Uyumluluk: dbReadyPromise
dbReadyPromise = API.waitForInit();
