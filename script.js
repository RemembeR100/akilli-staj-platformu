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

    // İlanları Yükle ve Ekrana Bas (SCRUM-19, SCRUM-21)
    async function loadIlanlar(filters = {}) {
        if (!listesiContainer) return; // Eğer giriş sayfasındaysa çalışmasın

        listesiContainer.innerHTML = '<div class="loading">İlanlar aranıyor...</div>';

        const finalFilters = {
            aramaMetni: filters.aramaMetni || '',
            kategori: filters.kategori || 'Tümü',
            calismaSekli: filters.calismaSekli || 'Tümü',
            lokasyon: filters.lokasyon || ''
        };

        try {
            const ilanlar = await API.getIlanlar(finalFilters);
            renderIlanlar(ilanlar);
        } catch (error) {
            listesiContainer.innerHTML = '<div class="loading">İlanlar yüklenirken bir hata oluştu.</div>';
            console.error(error);
        }
    }

    // İlan HTML'ini oluştur
    function renderIlanlar(ilanlar) {
        listesiContainer.innerHTML = '';

        if (ilanlar.length === 0) {
            listesiContainer.innerHTML = '<div class="loading">Kriterlerinize uygun ilan bulunamadı.</div>';
            return;
        }

        ilanlar.forEach(ilan => {
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <div class="job-info">
                    <h3>${ilan.pozisyon}</h3>
                    <p>${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})</p>
                    <span class="job-date">Yayınlanma: ${ilan.tarih}</span>
                </div>
                <button class="btn-details" onclick="openDetay(${ilan.id})">Detayları Gör</button>
            `;
            listesiContainer.appendChild(card);
        });
    }

    // İlan Detayını Aç (SCRUM-21)
    window.openDetay = async function(id) {
        // AUTH KONTROLÜ
        const user = API.getCurrentUser();
        if (!user) {
            alert('İlan detaylarını görmek için kayıt olmanız veya giriş yapmanız gerekmektedir.');
            window.location.href = 'register.html';
            return;
        }

        try {
            const ilan = await API.getIlanDetay(id);
            modalTitle.textContent = ilan.pozisyon;
            modalCompany.textContent = `${ilan.sirket_adi} • ${ilan.lokasyon} (${ilan.calisma_sekli})`;
            modalDetail.textContent = ilan.detay;
            currentJobId = id;
            
            // Kullanıcı bu ilana daha önce başvurdu mu kontrol et
            const basvurular = await API.getKullaniciBasvurulari(user.id);
            const alreadyApplied = basvurular.some(b => b.jobId === id);
            
            if (btnApply) {
                if (user.rol === 'kurumsal') {
                    btnApply.style.display = 'none'; // Kurumsal başvuru yapamaz
                } else {
                    btnApply.style.display = 'block';
                    if (alreadyApplied) {
                        btnApply.textContent = "Başvuru Yapıldı";
                        btnApply.disabled = true;
                    } else {
                        btnApply.textContent = "Bu İlana Başvur";
                        btnApply.disabled = false;
                    }
                }
            }
            
            modal.style.display = 'flex';
        } catch (error) {
            alert('İlan detayı yüklenemedi: ' + error.message);
        }
    };

    // Başvuru Yapma Olayı
    if (btnApply) {
        btnApply.addEventListener('click', async () => {
            if (!currentJobId) return;
            const user = API.getCurrentUser();
            if (!user) return;
            
            try {
                btnApply.textContent = "Başvuruluyor...";
                btnApply.disabled = true;
                
                await API.basvuruYap(user.id, currentJobId);
                
                alert('Başvurunuz başarıyla alındı!');
                btnApply.textContent = "Başvuru Yapıldı";
                
            } catch (error) {
                alert(error.message);
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

    // Arama ve Filtreleme İşlemleri (Debounce ile)
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');
    const kategoriFilter = document.getElementById('kategoriFilter');
    const calismaFilter = document.getElementById('calismaFilter');
    const lokasyonFilter = document.getElementById('lokasyonFilter');

    function debouncedSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const filters = {
                aramaMetni: searchInput ? searchInput.value : '',
                kategori: kategoriFilter ? kategoriFilter.value : 'Tümü',
                calismaSekli: calismaFilter ? calismaFilter.value : 'Tümü',
                lokasyon: lokasyonFilter ? lokasyonFilter.value : ''
            };
            loadIlanlar(filters);
        }, 300);
    }

    if (searchInput) searchInput.addEventListener('input', debouncedSearch);
    if (kategoriFilter) kategoriFilter.addEventListener('change', debouncedSearch);
    if (calismaFilter) calismaFilter.addEventListener('change', debouncedSearch);
    if (lokasyonFilter) lokasyonFilter.addEventListener('input', debouncedSearch);

    // Sayfa Yüklendiğinde İlanları Çek
    if (typeof API !== 'undefined' && API.waitForInit) {
        API.waitForInit().then(() => {
            if (document.getElementById('ilan-listesi')) {
                loadIlanlar({});
            }
        });
    }
});
