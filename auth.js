/**
 * auth.js
 * Sayfalardaki oturum yönetimini ve navbar güncellemelerini sağlar.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // API nesnesi api.js içinde başlatıldığında bu çalışır.
    if (typeof API !== 'undefined' && API.waitForInit) {
        await API.waitForInit();
    }
    
    const navLinks = document.querySelector('.nav-links');
    const user = API.getCurrentUser();

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

            document.getElementById('btnLogout').addEventListener('click', (e) => {
                e.preventDefault();
                API.logout();
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
