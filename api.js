/**
 * GERÇEK SQLITE VERİTABANI SERVİSİ (WebAssembly)
 * Veriler .sqlite formatında indirilebilir.
 */

let db = null;
let dbReadyPromise = null;

async function initDatabase() {
    const config = {
        locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${filename}`
    };
    
    const SQL = await initSqlJs(config);
    const savedDb = localStorage.getItem('real_sqlite_db');
    
    if (savedDb) {
        // Load existing
        const binaryString = atob(savedDb);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        db = new SQL.Database(bytes);
    } else {
        // Create new
        db = new SQL.Database();
        
        db.run(`CREATE TABLE kullanicilar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, email TEXT UNIQUE, sifre TEXT, rol TEXT);`);
        db.run(`CREATE TABLE ilanlar (id INTEGER PRIMARY KEY AUTOINCREMENT, sirket_adi TEXT, pozisyon TEXT, lokasyon TEXT, calisma_sekli TEXT, kategori TEXT, tarih TEXT, detay TEXT);`);
        db.run(`CREATE TABLE basvurular (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, jobId INTEGER, tarih TEXT, durum TEXT);`);
        
        const initialJobs = [
            { sirket_adi: 'Teknoloji A.Ş.', pozisyon: 'Yazılım Geliştirme Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Hibrit', kategori: 'Yazılım', tarih: '10 Mayıs 2026', detay: 'Modern web teknolojileri ile projeler geliştirecek stajyer arıyoruz.' },
            { sirket_adi: 'Okyanus Kolejleri', pozisyon: 'Web Geliştirme Stajyeri', lokasyon: 'İzmir', calisma_sekli: 'Uzaktan', kategori: 'Web', tarih: '08 Mayıs 2026', detay: 'Okulumuzun web altyapısına destek olacak, öğrenmeye hevesli stajyerler.' },
            { sirket_adi: 'Finans Bank', pozisyon: 'Veri Analitiği Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Ofis', kategori: 'Veri', tarih: '05 Mayıs 2026', detay: 'Büyük veri setleri üzerinde çalışacak ve raporlama yapacak ekip arkadaşları.' },
            { sirket_adi: 'Global Pazarlama', pozisyon: 'Dijital Pazarlama Stajyeri', lokasyon: 'Bursa', calisma_sekli: 'Uzaktan', kategori: 'Pazarlama', tarih: '01 Mayıs 2026', detay: 'Sosyal medya hesaplarımızı yönetecek ve kampanya kurgulayacak.' },
            { sirket_adi: 'Mavi Yazılım', pozisyon: 'Frontend Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Ofis', kategori: 'Web', tarih: '11 Mayıs 2026', detay: 'React ve Vue bilen veya öğrenmek isteyen stajyer arayışımız var.' },
            { sirket_adi: 'Kırmızı Kod', pozisyon: 'Backend Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Hibrit', kategori: 'Yazılım', tarih: '12 Mayıs 2026', detay: 'Node.js üzerinde API geliştirmemize yardım edecek stajyer aranıyor.' },
            { sirket_adi: 'Veri Bilişim', pozisyon: 'Veri Bilimi Stajyeri', lokasyon: 'Uzaktan', calisma_sekli: 'Uzaktan', kategori: 'Veri', tarih: '13 Mayıs 2026', detay: 'Python ve Pandas kütüphanelerine hakim veri stajyeri arıyoruz.' },
            { sirket_adi: 'Medya Ajans', pozisyon: 'SEO Stajyeri', lokasyon: 'İzmir', calisma_sekli: 'Ofis', kategori: 'Pazarlama', tarih: '14 Mayıs 2026', detay: 'Arama motoru optimizasyonu süreçlerini öğrenecek stajyer.' },
            { sirket_adi: 'Oyun Stüdyosu', pozisyon: 'Oyun Geliştirme Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Hibrit', kategori: 'Yazılım', tarih: '15 Mayıs 2026', detay: 'Unity veya Unreal Engine temel bilgisine sahip çalışma arkadaşı.' },
            { sirket_adi: 'Siber Güvenlik A.Ş.', pozisyon: 'Siber Güvenlik Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Ofis', kategori: 'Yazılım', tarih: '16 Mayıs 2026', detay: 'Sızma testleri ve ağ güvenliği alanında kendini geliştirmek isteyenler.' },
            { sirket_adi: 'E-Ticaret Ltd', pozisyon: 'UI/UX Tasarım Stajyeri', lokasyon: 'Bursa', calisma_sekli: 'Uzaktan', kategori: 'Web', tarih: '17 Mayıs 2026', detay: 'Figma kullanabilen ve kullanıcı deneyimi süreçlerinde aktif rol alacak.' },
            { sirket_adi: 'Data Center', pozisyon: 'Veritabanı Yöneticisi Stajyeri', lokasyon: 'Kocaeli', calisma_sekli: 'Ofis', kategori: 'Veri', tarih: '18 Mayıs 2026', detay: 'SQL ve NoSQL veritabanı bakımlarında görev alacak.' },
            { sirket_adi: 'Sosyal Ağ A.Ş.', pozisyon: 'İçerik Pazarlama Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Hibrit', kategori: 'Pazarlama', tarih: '19 Mayıs 2026', detay: 'Yaratıcı metin yazarlığı yapabilecek, içerik stratejisi üretecek stajyer.' },
            { sirket_adi: 'Mobil Dev', pozisyon: 'Flutter Stajyeri', lokasyon: 'Uzaktan', calisma_sekli: 'Uzaktan', kategori: 'Yazılım', tarih: '20 Mayıs 2026', detay: 'Çapraz platform mobil uygulama geliştirme süreçlerine destek olacak.' },
            { sirket_adi: 'Bulut Sistemler', pozisyon: 'DevOps Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Hibrit', kategori: 'Yazılım', tarih: '21 Mayıs 2026', detay: 'Docker ve Kubernetes teknolojilerine ilgi duyan öğrenci.' },
            { sirket_adi: 'Fintech Çözümleri', pozisyon: 'Blockchain Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Ofis', kategori: 'Yazılım', tarih: '22 Mayıs 2026', detay: 'Web3 teknolojileri ve akıllı kontrat yazımı konusunda hevesli.' },
            { sirket_adi: 'Eğitim Vadisi', pozisyon: 'Eğitim Teknolojileri Stajyeri', lokasyon: 'İzmir', calisma_sekli: 'Uzaktan', kategori: 'Web', tarih: '23 Mayıs 2026', detay: 'LMS sistemlerimize destek olacak, HTML/CSS bilen stajyer.' },
            { sirket_adi: 'Lojistik A.Ş.', pozisyon: 'İş Analisti Stajyeri', lokasyon: 'Mersin', calisma_sekli: 'Ofis', kategori: 'Veri', tarih: '24 Mayıs 2026', detay: 'Süreç analizleri yapacak ve raporlama araçlarını kullanacak.' },
            { sirket_adi: 'Global Ajans', pozisyon: 'Performans Pazarlama Stajyeri', lokasyon: 'Uzaktan', calisma_sekli: 'Uzaktan', kategori: 'Pazarlama', tarih: '25 Mayıs 2026', detay: 'Google Ads ve Meta Ads panellerini öğrenip yönetebilecek.' },
            { sirket_adi: 'Yapay Zeka Lab', pozisyon: 'Makine Öğrenmesi Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Hibrit', kategori: 'Veri', tarih: '26 Mayıs 2026', detay: 'Model eğitimi ve veri temizleme aşamalarında görev yapacak.' },
            { sirket_adi: 'Finansal Teknolojiler', pozisyon: 'React Native Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Uzaktan', kategori: 'Yazılım', tarih: '27 Mayıs 2026', detay: 'Mobil ödeme sistemleri arayüzleri geliştirecek takım arkadaşı.' },
            { sirket_adi: 'Eğitim Bilişim', pozisyon: 'Sistem Yöneticisi Stajyeri', lokasyon: 'İzmir', calisma_sekli: 'Ofis', kategori: 'Yazılım', tarih: '27 Mayıs 2026', detay: 'Linux sunucu yönetimi konusunda kendini geliştirmek isteyenler.' },
            { sirket_adi: 'Oto Sanayi A.Ş.', pozisyon: 'Gömülü Sistemler Stajyeri', lokasyon: 'Bursa', calisma_sekli: 'Ofis', kategori: 'Yazılım', tarih: '28 Mayıs 2026', detay: 'C/C++ bilen, otomotiv sistemlerine meraklı.' },
            { sirket_adi: 'Marka Yönetimi', pozisyon: 'Sosyal Medya Stajyeri', lokasyon: 'Antalya', calisma_sekli: 'Uzaktan', kategori: 'Pazarlama', tarih: '28 Mayıs 2026', detay: 'Instagram ve TikTok stratejilerimize destek olacak yaratıcı beyinler.' },
            { sirket_adi: 'Büyük Veri Ltd.', pozisyon: 'Data Engineer Stajyeri', lokasyon: 'Ankara', calisma_sekli: 'Hibrit', kategori: 'Veri', tarih: '29 Mayıs 2026', detay: 'Veri boru hatları (pipeline) tasarlamaya yardımcı olacak stajyer.' },
            { sirket_adi: 'GameX Stüdyo', pozisyon: '3D Artist Stajyeri', lokasyon: 'İstanbul', calisma_sekli: 'Ofis', kategori: 'Web', tarih: '29 Mayıs 2026', detay: 'Blender veya Maya kullanan, karakter ve çevre modelleme yapacak.' },
            { sirket_adi: 'E-İhracat Corp', pozisyon: 'E-Ticaret Uzmanı Stajyeri', lokasyon: 'Kocaeli', calisma_sekli: 'Uzaktan', kategori: 'Pazarlama', tarih: '30 Mayıs 2026', detay: 'Shopify ve Amazon altyapılarında mağaza yönetimine destek.' },
            { sirket_adi: 'Tech Hub', pozisyon: 'Fullstack Stajyeri', lokasyon: 'Eskişehir', calisma_sekli: 'Hibrit', kategori: 'Yazılım', tarih: '30 Mayıs 2026', detay: 'MERN stack kullanarak şirket içi araçlar geliştirecek.' },
            { sirket_adi: 'Siber Kalkan', pozisyon: 'Sızma Testi Stajyeri', lokasyon: 'Uzaktan', calisma_sekli: 'Uzaktan', kategori: 'Yazılım', tarih: '31 Mayıs 2026', detay: 'Web uygulamalarında zafiyet tespiti yapacak yetenekler.' },
            { sirket_adi: 'Turizm Acentesi', pozisyon: 'Web Master Stajyeri', lokasyon: 'Muğla', calisma_sekli: 'Ofis', kategori: 'Web', tarih: '31 Mayıs 2026', detay: 'WordPress tabanlı sitelerimizi güncelleyecek ve performansını artıracak.' }
        ];
        
        const stmt = db.prepare(`INSERT INTO ilanlar (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, tarih, detay) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        for (let job of initialJobs) {
            stmt.run([job.sirket_adi, job.pozisyon, job.lokasyon, job.calisma_sekli, job.kategori, job.tarih, job.detay]);
        }
        stmt.free();
    }

    // ŞEMA GÜNCELLEMELERİ (Yeni Sütunlar)
    try { db.run(`ALTER TABLE kullanicilar ADD COLUMN bio TEXT;`); } catch(e){}
    try { db.run(`ALTER TABLE kullanicilar ADD COLUMN yetenekler TEXT;`); } catch(e){}
    try { db.run(`ALTER TABLE kullanicilar ADD COLUMN link TEXT;`); } catch(e){}

    // VARSAYILAN ADMİN KONTROLÜ
    const adminCheck = db.exec("SELECT id FROM kullanicilar WHERE email='admin'");
    if (adminCheck.length === 0) {
        db.run("INSERT INTO kullanicilar (ad, email, sifre, rol) VALUES ('Sistem Yöneticisi', 'admin', 'admin', 'admin')");
    }

    saveDatabase();
}

function saveDatabase() {
    const data = db.export();
    const base64 = btoa(new Uint8Array(data).reduce((d, byte) => d + String.fromCharCode(byte), ''));
    localStorage.setItem('real_sqlite_db', base64);
}

// Tüm export edilen SQL sorgularını çalıştıran asıl obje
const API = {
    waitForInit: async () => {
        if (!dbReadyPromise) dbReadyPromise = initDatabase();
        await dbReadyPromise;
    },

    // SQLite Dosyasını İndir
    downloadSQLite: () => {
        const data = db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'akilli_staj.sqlite';
        a.click();
    },

    getIlanlar: async (filters = {}) => {
        await API.waitForInit();
        let query = "SELECT * FROM ilanlar WHERE 1=1";
        let params = [];
        
        if (filters.aramaMetni) {
            query += " AND (LOWER(pozisyon) LIKE ? OR LOWER(sirket_adi) LIKE ?)";
            params.push(`%${filters.aramaMetni.toLowerCase()}%`, `%${filters.aramaMetni.toLowerCase()}%`);
        }
        if (filters.kategori && filters.kategori !== 'Tümü') {
            query += " AND kategori = ?";
            params.push(filters.kategori);
        }
        if (filters.calismaSekli && filters.calismaSekli !== 'Tümü') {
            query += " AND calisma_sekli = ?";
            params.push(filters.calismaSekli);
        }
        if (filters.lokasyon && filters.lokasyon.trim() !== '') {
            query += " AND LOWER(lokasyon) LIKE ?";
            params.push(`%${filters.lokasyon.trim().toLowerCase()}%`);
        }
        query += " ORDER BY id DESC";

        const stmt = db.prepare(query);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    },

    getIlanDetay: async (id) => {
        await API.waitForInit();
        const stmt = db.prepare("SELECT * FROM ilanlar WHERE id = ?");
        stmt.bind([id]);
        if (stmt.step()) {
            const ilan = stmt.getAsObject();
            stmt.free();
            return ilan;
        }
        stmt.free();
        throw new Error('İlan bulunamadı');
    },

    register: async (ad, email, sifre, rol) => {
        await API.waitForInit();
        // Check exists
        let stmt = db.prepare("SELECT id FROM kullanicilar WHERE email = ?");
        stmt.bind([email]);
        if (stmt.step()) {
            stmt.free();
            throw new Error('Bu e-posta adresi zaten kayıtlı.');
        }
        stmt.free();

        stmt = db.prepare("INSERT INTO kullanicilar (ad, email, sifre, rol) VALUES (?, ?, ?, ?)");
        stmt.run([ad, email, sifre, rol]);
        stmt.free();
        
        saveDatabase();
        
        const user = { id: db.exec("SELECT last_insert_rowid()")[0].values[0][0], ad, email, sifre, rol };
        localStorage.setItem('aktif_kullanici', JSON.stringify(user));
        return user;
    },

    login: async (email, sifre) => {
        await API.waitForInit();
        const stmt = db.prepare("SELECT * FROM kullanicilar WHERE email = ? AND sifre = ?");
        stmt.bind([email, sifre]);
        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();
            localStorage.setItem('aktif_kullanici', JSON.stringify(user));
            return user;
        }
        stmt.free();
        throw new Error('E-posta veya şifre hatalı.');
    },

    logout: () => {
        localStorage.removeItem('aktif_kullanici');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('aktif_kullanici');
        return user ? JSON.parse(user) : null;
    },

    profilGuncelle: async (id, bio, yetenekler, link) => {
        await API.waitForInit();
        const stmt = db.prepare("UPDATE kullanicilar SET bio = ?, yetenekler = ?, link = ? WHERE id = ?");
        stmt.run([bio, yetenekler, link, id]);
        stmt.free();
        saveDatabase();
        
        // Güncel kullanıcıyı tekrar çekip session'ı güncelle
        const getStmt = db.prepare("SELECT * FROM kullanicilar WHERE id = ?");
        getStmt.bind([id]);
        if (getStmt.step()) {
            localStorage.setItem('aktif_kullanici', JSON.stringify(getStmt.getAsObject()));
        }
        getStmt.free();
    },

    basvuruYap: async (userId, jobId) => {
        await API.waitForInit();
        let stmt = db.prepare("SELECT id FROM basvurular WHERE userId = ? AND jobId = ?");
        stmt.bind([userId, jobId]);
        if (stmt.step()) {
            stmt.free();
            throw new Error('Bu ilana zaten başvuru yaptınız.');
        }
        stmt.free();

        const tarih = new Date().toLocaleDateString('tr-TR');
        stmt = db.prepare("INSERT INTO basvurular (userId, jobId, tarih, durum) VALUES (?, ?, ?, ?)");
        stmt.run([userId, jobId, tarih, 'Başvuru Alındı']);
        stmt.free();
        
        saveDatabase();
    },

    basvuruIptal: async (userId, jobId) => {
        await API.waitForInit();
        const stmt = db.prepare("DELETE FROM basvurular WHERE userId = ? AND jobId = ?");
        stmt.run([userId, jobId]);
        stmt.free();
        saveDatabase();
    },

    getKullaniciBasvurulari: async (userId) => {
        await API.waitForInit();
        const stmt = db.prepare(`
            SELECT b.durum, b.tarih, i.* 
            FROM basvurular b 
            JOIN ilanlar i ON b.jobId = i.id 
            WHERE b.userId = ?
            ORDER BY b.id DESC
        `);
        stmt.bind([userId]);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    },

    // Sadece Kurumsal Hesaplar İçin: İlan Ekle
    ilanEkle: async (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, detay) => {
        await API.waitForInit();
        const tarih = new Date().toLocaleDateString('tr-TR');
        const stmt = db.prepare("INSERT INTO ilanlar (sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, tarih, detay) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run([sirket_adi, pozisyon, lokasyon, calisma_sekli, kategori, tarih, detay]);
        stmt.free();
        saveDatabase();
    },
    
    // Kurumsal hesabın kendi açtığı ilanları getir
    getKurumsalIlanlari: async (sirket_adi) => {
        await API.waitForInit();
        const stmt = db.prepare("SELECT * FROM ilanlar WHERE sirket_adi = ? ORDER BY id DESC");
        stmt.bind([sirket_adi]);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    },

    // ADMİN METOTLARI
    ilanSil: async (id) => {
        await API.waitForInit();
        // İlanı sil
        const stmt = db.prepare("DELETE FROM ilanlar WHERE id = ?");
        stmt.run([id]);
        stmt.free();
        
        // İlana yapılmış başvuruları da sil (Cascade)
        const stmtBasvuru = db.prepare("DELETE FROM basvurular WHERE jobId = ?");
        stmtBasvuru.run([id]);
        stmtBasvuru.free();

        saveDatabase();
    }
};

dbReadyPromise = initDatabase();
