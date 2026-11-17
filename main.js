/**
 * 🚀 نقطة تشغيل التطبيق (Main Entry Point)
 * ---------------------------------------------------------------
 * يُحمَّل آخراً. يهيّئ التاريخ الافتراضي، الثيم، والـ Service Worker.
 */

// تهيئة التطبيق عند تحميل الصفحة
window.addEventListener("DOMContentLoaded", () => {
    // تحديد تاريخ النهاية الافتراضي ليومنا الحالي
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    const endDateEl = document.getElementById("endDate");
    if (endDateEl && !endDateEl.value) {
        endDateEl.value = formattedDate;
    }

    // تهيئة الثيم (الوضع المظلم/الفاتح)
    ThemeManager.init();

    // إدارة الـ Service Worker
    setupServiceWorker();
});

// --- إدارة الـ Service Worker والـ PWA ---
function setupServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister().then(function () {
                    console.log("تم تدمير الـ Service Worker بنجاح لضمان تحديث الكاش التلقائي!");
                });
            }
        });

        if (window.caches) {
            caches.keys().then(function (names) {
                for (let name of names) caches.delete(name);
            });
        }
    }

    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
        installBtn.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            installBtn.style.display = "none";
            deferredPrompt.prompt();
            deferredPrompt = null;
        });
    }
}
