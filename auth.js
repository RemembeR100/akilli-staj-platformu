/**
 * auth.js
 * Sayfalardaki oturum yönetimini ve navbar güncellemelerini sağlar.
 * Ayrıca SCRUM-62 kapsamında modern UX bildirim, onay penceresi ve form doğrulama sistemlerini tanımlar.
 * Supabase Auth entegrasyonu ile çalışır.
 */

// ==========================================================================
// GLOBAL UX UTILITIES (SCRUM-62)
// ==========================================================================

/**
 * Modern Toast Bildirimi Gösterir
 * @param {string} message - Gösterilecek mesaj metni
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - Ekranda kalma süresi (ms)
 */
window.showToast = function(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close">&times;</button>
        <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    container.appendChild(toast);
    
    // Geçiş efekti için
    setTimeout(() => toast.classList.add('show'), 50);

    const closeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeToast();
    });
    
    const autoCloseTimeout = setTimeout(closeToast, duration);
    
    // Üzerine gelince progress barı ve silinmeyi duraklat
    toast.addEventListener('mouseenter', () => {
        clearTimeout(autoCloseTimeout);
        const progress = toast.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
    });
};

/**
 * Modern Asenkron Onay (Confirm) Modalı Gösterir
 * @param {string} title - Başlık
 * @param {string} message - Soru metni
 * @param {boolean} isDanger - Tehlikeli (Kırmızı) buton olsun mu?
 * @returns {Promise<boolean>}
 */
window.showConfirm = function(title, message, isDanger = false) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        
        const confirmBtnClass = isDanger ? 'custom-modal-btn-danger' : 'custom-modal-btn-confirm';
        
        overlay.innerHTML = `
            <div class="custom-modal-box">
                <div class="custom-modal-title">
                    <span>${isDanger ? '⚠️' : '❓'}</span>
                    <span>${title}</span>
                </div>
                <div class="custom-modal-body">${message}</div>
                <div class="custom-modal-actions">
                    <button class="custom-modal-btn custom-modal-btn-cancel" id="confirm-cancel-btn">İptal</button>
                    <button class="custom-modal-btn ${confirmBtnClass}" id="confirm-ok-btn">Onayla</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Açılış efekti
        setTimeout(() => overlay.classList.add('show'), 50);
        
        const closeConfirm = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };
        
        overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => closeConfirm(false));
        overlay.querySelector('#confirm-ok-btn').addEventListener('click', () => closeConfirm(true));
        
        // Overlay dışına basınca da iptal et
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeConfirm(false);
            }
        });
    });
};

/**
 * Form Giriş Kontrolü ve Form İçi Anlık Hata Bildirimi (Field Validation)
 */
window.FormValidation = {
    /**
     * İlgili input alanında hata gösterir
     */
    showError: function(inputElement, errorMessage) {
        this.clearError(inputElement);
        
        inputElement.classList.add('input-invalid');
        
        const errorMsgDiv = document.createElement('div');
        errorMsgDiv.className = 'input-error-msg';
        errorMsgDiv.innerHTML = `⚠️ ${errorMessage}`;
        
        // Inputun hemen altına ekleyelim
        if (inputElement.nextSibling) {
            inputElement.parentNode.insertBefore(errorMsgDiv, inputElement.nextSibling);
        } else {
            inputElement.parentNode.appendChild(errorMsgDiv);
        }
    },
    
    /**
     * İlgili input alanındaki hatayı temizler
     */
    clearError: function(inputElement) {
        inputElement.classList.remove('input-invalid');
        const parent = inputElement.parentNode;
        const existingError = parent.querySelector('.input-error-msg');
        if (existingError) {
            existingError.remove();
        }
    },
    
    /**
     * Tüm formdaki hata mesajlarını ve kırmızı çizgileri temizler
     */
    clearFormErrors: function(formElement) {
        const invalidInputs = formElement.querySelectorAll('.input-invalid');
        invalidInputs.forEach(input => input.classList.remove('input-invalid'));
        
        const errorMsgs = formElement.querySelectorAll('.input-error-msg');
        errorMsgs.forEach(msg => msg.remove());
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // API nesnesi api.js içinde başlatıldığında bu çalışır.
    if (typeof API !== 'undefined' && API.waitForInit) {
        await API.waitForInit();
    }
    
    const navLinks = document.querySelector('.nav-links');
    
    // getCurrentUser artık async
    const user = await API.getCurrentUser();

    if (navLinks) {
        if (user) {
            let roleLinks = '';
            
            if (user.rol === 'admin') {
                roleLinks += `<li><a href="admin.html" style="color:#ef4444; font-weight:bold;">Admin Paneli</a></li>`;
            } else if (user.rol === 'kurumsal') {
                roleLinks += `<li><a href="ilan_ekle.html" style="color:#10b981; font-weight:bold;">+ İlan Yayınla</a></li>`;
            }

            // Giriş yapılmışsa menüyü değiştir
            navLinks.innerHTML = `
                <li><a href="index.html">İlanlar</a></li>
                ${roleLinks}
                <li><a href="profil.html">Profilim</a></li>
                <li><a href="#" id="btnLogout" class="btn-nav" style="background:#ef4444; color:white!important;">Çıkış Yap</a></li>
            `;

            document.getElementById('btnLogout').addEventListener('click', async (e) => {
                e.preventDefault();
                await API.logout();
                window.location.href = 'index.html';
            });
            
        } else {
            // Giriş yapılmamışsa
            navLinks.innerHTML = `
                <li><a href="index.html">İlanlar</a></li>
                <li><a href="login.html">Giriş Yap</a></li>
                <li><a href="register.html" class="btn-nav">Kayıt Ol</a></li>
            `;
        }
    }
});
