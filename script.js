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

    // ilanları çekme kısmı
    // not: async await kullandım çünkü verinin gelmesi uzun sürebiliyor hata vermesin diye
    async function loadIlanlar(filters = {}) {
        // Eğer div yoksa (mesela profil sayfasındaysak) boşuna çalıştırmayalım hata vermesin
        if (!listesiContainer) return; 

        // veri gelene kadar loading falan göstersin
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

    window.getDefaultSkills = function(kategori, pozisyon) {
        const text = ((kategori || '') + ' ' + (pozisyon || '')).toLowerCase();
        let skills = [];
        if (text.includes('veri')) skills.push('SQL', 'Python', 'Excel');
        if (text.includes('yazılım') || text.includes('backend') || text.includes('fullstack')) skills.push('Java', 'C#', 'SQL', 'Git');
        if (text.includes('web') || text.includes('frontend')) skills.push('HTML', 'CSS', 'JavaScript', 'React');
        if (text.includes('siber') || text.includes('sızma')) skills.push('Linux', 'Network', 'Siber Güvenlik');
        if (text.includes('pazarlama') || text.includes('seo')) skills.push('SEO', 'Google Analytics', 'Sosyal Medya');
        if (text.includes('tasarım') || text.includes('ui') || text.includes('ux')) skills.push('Figma', 'Photoshop', 'UI/UX');
        
        if (skills.length === 0) skills.push('İletişim', 'Takım Çalışması', 'Analitik Düşünme');
        return skills.join(', ');
    };

    // arayüzde ilanları gösterme (dom manipülasyonu)
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

            // Eski ilanlarda aranan_yetenekler yoksa otomatik türet (Geriye dönük uyumluluk)
            if (!ilan.aranan_yetenekler) {
                ilan.aranan_yetenekler = window.getDefaultSkills(ilan.kategori, ilan.pozisyon);
            }

            // eşleşme algoritması - yeteneklere göre simüle ediyoruz
            let matchRate = ilan.matchRate;
            
            if (matchRate === undefined && user && user.rol === 'stajyer') {
                const yetenekler = (user.yetenekler || '').toLowerCase();
                const jobSkills = ilan.aranan_yetenekler 
                    ? ilan.aranan_yetenekler.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) 
                    : [];

                // Yetenek boşsa → 15%
                if (!yetenekler || jobSkills.length === 0) {
                    matchRate = 15;
                } else {
                    const mySkills = yetenekler.split(',').map(y => y.trim()).filter(Boolean);
                    const matched = jobSkills.filter(js => mySkills.includes(js)).length;
                    
                    if (matched === 0) matchRate = 15;
                    else {
                        matchRate = Math.round(15 + (matched / jobSkills.length) * 84);
                        if (matchRate > 99) matchRate = 99;
                    }
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

            const jobSkillsHtml = ilan.aranan_yetenekler ? 
                `<div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:5px;">
                    ${ilan.aranan_yetenekler.split(',').map(y => `<span style="background:rgba(99,102,241,0.1); color:var(--accent-color); padding:2px 8px; border-radius:12px; font-size:0.75rem;">${y.trim()}</span>`).join('')}
                </div>` : '';

            card.innerHTML = `
                <div style="display:flex; gap:15px; align-items:flex-start; width:100%;">
                    ${avatarHtml}
                    <div class="job-info" style="flex:1;">
                        <h3>${ilan.pozisyon}</h3>
                        <p>${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})</p>
                        ${jobSkillsHtml}
                        ${matchHtml}
                        <span class="job-date" style="margin-top:8px;">Yayınlanma: ${ilan.tarih}</span>
                    </div>
                </div>
                <button class="btn-details" style="margin-top:15px;" onclick="openDetay(${ilan.id})">Detayları Gör</button>
            `;
            listesiContainer.appendChild(card);
        });
    }

    // ilana tıklanınca detayı çıksın (sadece giriş yapanlar için)
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
            
            // Eski ilanlarda aranan_yetenekler yoksa otomatik türet
            if (!ilan.aranan_yetenekler && window.getDefaultSkills) {
                ilan.aranan_yetenekler = window.getDefaultSkills(ilan.kategori, ilan.pozisyon);
            }

            modalTitle.textContent = ilan.pozisyon;
            modalCompany.textContent = `${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})`;
            
            const skillsHtml = ilan.aranan_yetenekler ? 
                `<div style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid var(--border-color);">
                    <h4 style="color:var(--text-primary); margin-bottom:8px; font-size:1rem;">Aranan Yetenekler</h4>
                    <div style="display:flex; flex-wrap:wrap; gap:5px;">
                        ${ilan.aranan_yetenekler.split(',').map(y => `<span style="background:rgba(99,102,241,0.1); color:var(--accent-color); padding:4px 10px; border-radius:12px; font-size:0.85rem;">${y.trim()}</span>`).join('')}
                    </div>
                </div>` : '';
                
            modalDetail.innerHTML = skillsHtml + `<div style="line-height:1.6; white-space:pre-wrap;">${ilan.detay}</div>`;
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

    // başvuru yapma butonu
    // try catch ile api'den istek atıyorum
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

    // debounce işlemi: her harfe basıldığında istek atmasın diye 300ms falan bekletiyorum
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
