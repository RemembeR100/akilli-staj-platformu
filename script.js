document.addEventListener('DOMContentLoaded', () => {
    const listesiContainer = document.getElementById('ilan-listesi');
    
    // Modal Elementleri
    const modal = document.getElementById('ilanModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalTitle = document.getElementById('modalTitle');
    const modalCompany = document.getElementById('modalCompany');
    const modalDetail = document.getElementById('modalDetail');
    const btnApply = document.getElementById('btnApply');
    
    let currentJobId = null;

    // İlanları Yükle ve Ekrana Bas (Burada filtreleme falan da var)
    // Hoca Sorarsa: Bu fonksiyon asenkron (async) çalışır çünkü veritabanından verilerin
    // gelmesi zaman alabilir. 'await API.getIlanlar' ile verilerin gelmesini bekliyoruz.
    async function loadIlanlar(filters = {}) {
        // Eğer div yoksa (mesela profil sayfasındaysak) boşuna çalıştırmayalım hata vermesin
        if (!listesiContainer) return; 

        // Yükleniyor yazısı, hoca "veri geç gelirse ne oluyor" derse burayı gösterirsin
        listesiContainer.innerHTML = '<div class="loading">İlanlar aranıyor...</div>';

        // Filtreleri toparlıyoruz. Eğer boş gelirse varsayılan olarak 'Tümü' alıyor
        const finalFilters = {
            aramaMetni: filters.aramaMetni || '',
            kategori: filters.kategori || 'Tümü',
            calismaSekli: filters.calismaSekli || 'Tümü',
            lokasyon: filters.lokasyon || ''
        };

        try {
            // api.js'teki getIlanlar fonksiyonunu çağırıp veritabanından ilanları çekiyoruz
            const ilanlar = await API.getIlanlar(finalFilters);
            await renderIlanlar(ilanlar);
        } catch (error) {
            listesiContainer.innerHTML = '<div class="loading">İlanlar yüklenirken bir hata oluştu.</div>';
            console.error(error);
        }
    }

    // İlan HTML'ini oluştur
    // Hoca Sorarsa: Veritabanından gelen her ilan objesini alıp ekranda bir div kartı (job-card)
    // içerisine yerleştiriyoruz (DOM Manipülasyonu).
    async function renderIlanlar(ilanlar) {
        listesiContainer.innerHTML = '';
        const user = await API.getCurrentUser();

        if (ilanlar.length === 0) {
            listesiContainer.innerHTML = '<div class="loading">Kriterlerinize uygun ilan bulunamadı.</div>';
            return;
        }

        ilanlar.forEach(ilan => {
            const card = document.createElement('div');
            card.className = 'job-card';

            // Eşleşme Oranı Hesaplama/Simülasyonu (SCRUM-25)
            // Backend'den matchRate gelirse onu kullanır, gelmezse kullanıcı yeteneklerine göre simüle eder
            let matchRate = ilan.matchRate;
            
            if (matchRate === undefined && user && user.rol === 'stajyer') {
                const yetenekler = (user.yetenekler || '').toLowerCase();
                const ilanIcerik = (ilan.pozisyon + ' ' + (ilan.detay || '') + ' ' + (ilan.kategori || '') + ' ' + (ilan.sirket_adi || '')).toLowerCase();

                // Yetenek boşsa → 15%
                if (!yetenekler) {
                    matchRate = 15;
                } else {
                    const keywords = yetenekler.split(',').map(y => y.trim()).filter(y => y.length >= 2);
                    // Metin eşleşmesi
                    const matched = keywords.filter(k => ilanIcerik.includes(k)).length;
                    
                    // Basit algoritma (her yetenek için +25, taban puan 15)
                    if (matched === 0) matchRate = 15;
                    else matchRate = Math.min(99, 15 + (matched * 25));
                }
            }

            let matchHtml = '';
            if (user && user.rol === 'stajyer' && matchRate !== undefined) {
                matchHtml = `
                    <div class="match-rate-container" title="Yetenekleriniz ve profil bilgileriniz bu ilanla karşılaştırıldı.">
                        <div class="match-progress-bg">
                            <div class="match-progress-fill" style="width: ${matchRate}%"></div>
                        </div>
                        <span class="match-rate-label">Yetenekleriniz bu ilanla <span class="match-rate-value">%${matchRate}</span> uyuşuyor</span>
                    </div>
                `;
            }

            const avatarHtml = ilan.profil_resmi 
                ? `<img src="${ilan.profil_resmi}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:2px solid var(--border-color);flex-shrink:0;">`
                : `<div style="width:45px;height:45px;border-radius:50%;background:linear-gradient(135deg, var(--accent-color), #8b5cf6);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.2rem;flex-shrink:0;">${ilan.sirket_adi.charAt(0).toUpperCase()}</div>`;

            card.innerHTML = `
                <div style="display:flex; gap:15px; align-items:flex-start; width:100%;">
                    ${avatarHtml}
                    <div class="job-info" style="flex:1;">
                        <h3>${ilan.pozisyon}</h3>
                        <p>${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})</p>
                        ${matchHtml}
                        <span class="job-date">Yayınlanma: ${ilan.tarih}</span>
                    </div>
                </div>
                <button class="btn-details" style="margin-top:15px;" onclick="openDetay(${ilan.id})">Detayları Gör</button>
            `;
            listesiContainer.appendChild(card);
        });
    }

    // İlan Detayını Aç (Modalı gösteren kısım)
    // Hoca Sorarsa: Sadece giriş yapanlar ilan detayını görebilsin diye burada auth (kimlik) kontrolü yapıyorum.
    window.openDetay = async function(id) {
        const user = await API.getCurrentUser();
        if (!user) {
            showToast('İlan detaylarını görebilmek için önce giriş yapmanız veya kayıt olmanız gerekmektedir.', 'warning', 3000);
            // Giriş yapılmadığı için kayıt sayfasına yönlendiriyorum
            setTimeout(() => {
                window.location.href = 'register.html';
            }, 1500);
            return;
        }

        try {
            // İlanın detay bilgilerini DB'den çekiyoruz
            const ilan = await API.getIlanDetay(id);
            modalTitle.textContent = ilan.pozisyon;
            modalCompany.textContent = `${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})`;
            modalDetail.textContent = ilan.detay;
            currentJobId = id; // Hangi ilana başvuru yapılacağını bilmek için id'yi global değişkende tutuyorum
            
            // Şirket İletişim Bilgilerini Getir
            const employerInfoDiv = document.getElementById('modalEmployerInfo');
            if (employerInfoDiv) {
                const sirketBilgi = await API.getSirketBilgileri(ilan.sirket_adi);
                if (sirketBilgi) {
                    document.getElementById('modalEmpEmail').innerHTML = `✉️ <strong>E-posta:</strong> ${sirketBilgi.email}`;
                    document.getElementById('modalEmpPhone').innerHTML = sirketBilgi.telefon ? `📱 <strong>Telefon:</strong> ${sirketBilgi.telefon}` : '';
                    
                    const linkEl = document.getElementById('modalEmpLink');
                    if (sirketBilgi.link) {
                        const safeLink = sirketBilgi.link.startsWith('http') ? sirketBilgi.link : 'https://' + sirketBilgi.link;
                        linkEl.innerHTML = `🔗 <strong>Bağlantı:</strong> <a href="${safeLink}" target="_blank" style="color:var(--accent-color);">${sirketBilgi.link}</a>`;
                    } else {
                        linkEl.innerHTML = '';
                    }
                    employerInfoDiv.style.display = 'block';
                } else {
                    employerInfoDiv.style.display = 'none';
                }
            }
            
            // Kullanıcı bu ilana daha önce başvurmuş mu? Onu kontrol ediyorum
            const basvurular = await API.getKullaniciBasvurulari(user.id);
            const alreadyApplied = basvurular.some(b => b.id === id || b.jobId === id);
            
            if (btnApply) {
                // Kurumsal hesaplar başvuru yapamasın diye butonu gizliyorum
                if (user.rol === 'kurumsal') {
                    btnApply.style.display = 'none'; 
                } else {
                    btnApply.style.display = 'block';
                    btnApply.classList.add('btn-apply'); // Animasyonlar için (SCRUM-49)
                    
                    // Önceden başvurduysa butonu pasifleştiriyorum
                    if (alreadyApplied) {
                        btnApply.textContent = "Başvuru Yapıldı";
                        btnApply.classList.add('success');
                        btnApply.disabled = true;
                    } else {
                        btnApply.textContent = "Bu İlana Başvur";
                        btnApply.classList.remove('success', 'loading');
                        btnApply.disabled = false;
                    }
                }
            }
            
            // Son olarak modalı görünür yapıyorum (display: flex css'te ortalamak için)
            modal.style.display = 'flex';
        } catch (error) {
            showToast('İlan detayı yüklenemedi: ' + error.message, 'error');
        }
    };

    // Başvuru Yapma Olayı (SCRUM-49 & SCRUM-51)
    // Hoca Sorarsa: Burada bir Event Listener var. Butona tıklanınca try-catch bloğu içinde
    // api.js'teki basvuruYap metodunu çağırıyor. Animasyon sınıflarını (loading, success) burada ekliyoruz.
    if (btnApply) {
        btnApply.addEventListener('click', async () => {
            if (!currentJobId) return;
            const user = await API.getCurrentUser();
            if (!user) return;
            
            try {
                // Yükleniyor animasyonunu başlat (Spinner CSS'ini tetikler)
                btnApply.textContent = "";
                btnApply.classList.add('loading');
                btnApply.disabled = true;
                
                // İş mantığı: Veritabanına kaydet
                await API.basvuruYap(user.id, currentJobId);
                
                // Animasyonu başarı durumuna geçir (Yeşil buton)
                setTimeout(() => {
                    btnApply.classList.remove('loading');
                    btnApply.classList.add('success');
                    btnApply.textContent = "Başvuru Yapıldı";
                    showToast('Başvurunuz başarıyla alındı! Profilinizdeki Başvurular kısmından takip edebilirsiniz.', 'success', 4000);
                }, 800); // Gerçekçi hissettirmek için 800ms bekletiyoruz
                
            } catch (error) {
                showToast(error.message, 'error');
                btnApply.classList.remove('loading');
                btnApply.textContent = "Bu İlana Başvur";
                btnApply.disabled = false;
            }
        });
    }

    // Modal Kapatma Olayları
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Arama ve Filtreleme İşlemleri 
    // Hoca "Debounce nedir?" derse: Kullanıcı her harf yazdığında sürekli veritabanına sorgu atmasın diye, 
    // yazmayı bitirdikten 300 milisaniye sonra sorgu atmasını sağlayan performans optimizasyonu.
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');
    const kategoriFilter = document.getElementById('kategoriFilter');
    const calismaFilter = document.getElementById('calismaFilter');
    const lokasyonFilter = document.getElementById('lokasyonFilter');

    function debouncedSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            // Filtreleri toplayıp loadIlanlar fonksiyonuna gönderiyorum
            const filters = {
                aramaMetni: searchInput ? searchInput.value : '',
                kategori: kategoriFilter ? kategoriFilter.value : 'Tümü',
                calismaSekli: calismaFilter ? calismaFilter.value : 'Tümü',
                lokasyon: lokasyonFilter ? lokasyonFilter.value : ''
            };
            loadIlanlar(filters);
        }, 300); // 300ms bekleme süresi
    }

    if (searchInput) searchInput.addEventListener('input', debouncedSearch);
    if (kategoriFilter) kategoriFilter.addEventListener('change', debouncedSearch);
    if (calismaFilter) calismaFilter.addEventListener('change', debouncedSearch);
    if (lokasyonFilter) lokasyonFilter.addEventListener('input', debouncedSearch);

    // Sayfa Yüklendiğinde İlanları Çek + URL'de ilan_id varsa o ilanı aç
    if (typeof API !== 'undefined' && API.waitForInit) {
        API.waitForInit().then(async () => {
            if (document.getElementById('ilan-listesi')) {
                await loadIlanlar({});

                // Profil sayfasından gelen ilan yönlendirmesi
                const urlParams = new URLSearchParams(window.location.search);
                const ilanId = urlParams.get('ilan_id');
                if (ilanId) {
                    // URL'yi temizle (geri tuşu sorun çıkarmasın)
                    window.history.replaceState({}, document.title, window.location.pathname);
                    // Kısa gecikmeyle modalı aç (DOM hazır olsun)
                    setTimeout(() => openDetay(parseInt(ilanId)), 300);
                }
            }
        });
    }
});
