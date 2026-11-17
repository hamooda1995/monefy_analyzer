/**
 * 🎨 إدارة المظهر (الثيم: مظلم / فاتح)
 */
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem("financial-app-theme") || "dark";
        document.documentElement.setAttribute("data-theme", savedTheme);
        const btn = document.getElementById("themeToggleBtn");
        if (btn) {
            btn.innerHTML = savedTheme === "dark" ? "☀️" : "🌙";
        }
    },
    toggle() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const targetTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", targetTheme);
        localStorage.setItem("financial-app-theme", targetTheme);
        const btn = document.getElementById("themeToggleBtn");
        if (btn) {
            btn.innerHTML = targetTheme === "dark" ? "☀️" : "🌙";
        }
    }
};

// ربط دالة الثيم العامة للاستدعاء من الـ HTML
window.toggleDarkModeFinancialApp = () => ThemeManager.toggle();
