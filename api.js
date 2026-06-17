// api işlemleri burda yapılıyor. veritabanı olarak supabase kullandık.
// crud işlemleri ve auth falan burada

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

    // anasayfadaki ilanları falan çekmek için filtreleme de var
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
        
        let ilanlar = data || [];
        
        // Şirket profillerini (profil_resmi) çekip ilanlara ekle
        if (ilanlar.length > 0) {
            const sirketAdlari = [...new Set(ilanlar.map(i => i.sirket_adi))];
            const { data: sirketler } = await supabase
                .from('kullanicilar')
                .select('ad, profil_resmi')
                .in('ad', sirketAdlari)
                .eq('rol', 'kurumsal');
                
            if (sirketler) {
                const sirketMap = {};
                sirketler.forEach(s => sirketMap[s.ad] = s.profil_resmi);
                ilanlar = ilanlar.map(i => ({ ...i, profil_resmi: sirketMap[i.sirket_adi] }));
            }
        }
        
        return ilanlar;
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

    // sisteme kayıt olma yeri
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

    // normal giriş yapma
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

    // profili güncellemek için metod
    profilGuncelle: async (id, ad, bio, yetenekler, link, telefon, profil_resmi) => {
        // XSS Koruması
        const guvenliAd = ad ? ad.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliBio = bio ? bio.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliLink = link ? link.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliTelefon = telefon ? telefon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const guvenliProfilResmi = profil_resmi ? profil_resmi.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const { error } = await supabase
            .from('kullanicilar')
            .update({
                ad: guvenliAd,
                bio: guvenliBio,
                yetenekler: yetenekler,
                link: guvenliLink,
                telefon: guvenliTelefon,
                profil_resmi: guvenliProfilResmi
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

        let basvurular = (data || []).map(b => ({
            ...b.ilanlar,
            durum: b.durum,
            tarih: b.tarih,
            jobId: b.job_id
        }));

        // Şirket profillerini (profil_resmi) çekip ilanlara ekle
        if (basvurular.length > 0) {
            const sirketAdlari = [...new Set(basvurular.map(i => i.sirket_adi))];
            const { data: sirketler } = await supabase
                .from('kullanicilar')
                .select('ad, profil_resmi')
                .in('ad', sirketAdlari)
                .eq('rol', 'kurumsal');
                
            if (sirketler) {
                const sirketMap = {};
                sirketler.forEach(s => sirketMap[s.ad] = s.profil_resmi);
                basvurular = basvurular.map(i => ({ ...i, profil_resmi: sirketMap[i.sirket_adi] }));
            }
        }

        return basvurular;
    },

    // Sadece Kurumsal Hesaplar İçin: İlan Ekle
    ilanEkle: async (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, detay, aranan_yetenekler = '') => {
        const tarih = new Date().toLocaleDateString('tr-TR');

        // XSS Koruması
        const gPozisyon = pozisyon ? pozisyon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const gDetay = detay ? detay.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const gArananYetenekler = aranan_yetenekler ? aranan_yetenekler.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const { error } = await supabase
            .from('ilanlar')
            .insert({
                sirket_adi,
                pozisyon: gPozisyon,
                lokasyon,
                calisma_sekli,
                kategori,
                tarih,
                detay: gDetay,
                aranan_yetenekler: gArananYetenekler
            });

        if (error) throw new Error('İlan eklenirken hata: ' + error.message);
    },

    ilanGuncelle: async (id, pozisyon, lokasyon, calisma_sekli, kategori, detay, aranan_yetenekler = '') => {
        const gPozisyon = pozisyon ? pozisyon.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const gDetay = detay ? detay.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const gArananYetenekler = aranan_yetenekler ? aranan_yetenekler.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const { error } = await supabase
            .from('ilanlar')
            .update({
                pozisyon: gPozisyon,
                lokasyon,
                calisma_sekli,
                kategori,
                detay: gDetay,
                aranan_yetenekler: gArananYetenekler
            })
            .eq('id', id);

        if (error) throw new Error('İlan güncellenirken hata: ' + error.message);
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

    // yeteneklere göre kimin ne kadar uygun olduğunu hesaplayan algoritma kısmı
    getEslesmeSkorlu: async (userId) => {
        // Kullanıcı bilgilerini çek
        const { data: user } = await supabase
            .from('kullanicilar')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user) return [];

        // Kullanıcı keyword listesi: SADECE yetenekler
        const userKeywords = [];
        if (user.yetenekler) {
            user.yetenekler.split(',').map(y => y.trim().toLowerCase()).filter(Boolean).forEach(y => userKeywords.push(y));
        }

        // Tüm ilanları çek
        const { data: dataIlanlar } = await supabase
            .from('ilanlar')
            .select('*')
            .order('id', { ascending: false })
            .limit(100);

        let ilanlar = dataIlanlar || [];

        // Şirket profillerini (profil_resmi) çekip ilanlara ekle
        if (ilanlar.length > 0) {
            const sirketAdlari = [...new Set(ilanlar.map(i => i.sirket_adi))];
            const { data: sirketler } = await supabase
                .from('kullanicilar')
                .select('ad, profil_resmi')
                .in('ad', sirketAdlari)
                .eq('rol', 'kurumsal');
                
            if (sirketler) {
                const sirketMap = {};
                sirketler.forEach(s => sirketMap[s.ad] = s.profil_resmi);
                ilanlar = ilanlar.map(i => ({ ...i, profil_resmi: sirketMap[i.sirket_adi] }));
            }
        }

        if (ilanlar.length === 0) return [];

        // Yetenek boşsa 15 dön
        if (userKeywords.length === 0) {
            return ilanlar.slice(0, 6).map(i => ({ ...i, eslesme: 15, eslesme_label: 'Yetenek Ekle' }));
        }

        const skorluIlanlar = ilanlar.map(ilan => {
            const jobSkills = ilan.aranan_yetenekler 
                ? ilan.aranan_yetenekler.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) 
                : [];

            let matchedCount = 0;
            if (jobSkills.length > 0) {
                matchedCount = jobSkills.filter(js => userKeywords.includes(js)).length;
            }

            // Akıllı Eşleştirme Algoritması
            let eslesme = 0;
            if (jobSkills.length === 0) {
                eslesme = 15; // Eski ilanlar veya yetenek girilmemiş ilanlar için standart 15
            } else if (matchedCount === 0) {
                eslesme = 15; // Ortak yetenek yoksa 15
            } else {
                // Eşleşen yetenek oranına göre 15 ile 99 arası skor
                eslesme = Math.round(15 + (matchedCount / jobSkills.length) * 84);
                if (eslesme > 99) eslesme = 99;
            }

            let eslesme_label;
            if (eslesme >= 75) eslesme_label = 'En İyi Eşleşme';
            else if (eslesme >= 50) eslesme_label = 'Yeteneklerinle Uyumlu';
            else if (eslesme >= 28) eslesme_label = 'İlginizi Çekebilir';
            else eslesme_label = 'Keşfet';

            return { ...ilan, eslesme, eslesme_label };
        });

        return skorluIlanlar.sort((a, b) => b.eslesme - a.eslesme).slice(0, 6);
    },

    getSirketBilgileri: async (sirketAdi) => {
        const { data, error } = await supabase
            .from('kullanicilar')
            .select('ad, email, telefon, link, profil_resmi')
            .eq('ad', sirketAdi)
            .eq('rol', 'kurumsal')
            .single();

        if (error) return null;
        return data;
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
                kullanicilar ( ad, email, telefon, yetenekler, link, profil_resmi )
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
    }
};

// Uyumluluk: dbReadyPromise
dbReadyPromise = API.waitForInit();
