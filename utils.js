/**
 * 🛠️ دوال مساعدة عامة (Helper Functions)
 * ---------------------------------------------------------------
 * دوال صغيرة يستخدمها أكثر من ملف. لا تعتمد على أي حالة.
 */

// تنظيف نص من علامات الاقتباس والمسافات الزائدة
function clean(text) {
    return text ? text.replace(/"/g, "").trim() : "";
}

// تحويل تاريخ بصيغة M/D/YYYY (Java) إلى كائن Date
function parseJavaDate(dateStr) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

// تنسيق مبلغ رقمي إلى نص بكسور عشرية (0.00)
function formatMoney(amount) {
    let num = parseFloat(amount);
    if (isNaN(num) || !isFinite(num)) {
        return "0.00";
    }
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// --- حفظ الإضافات اليدوية لكل شهر في localStorage ---
const MONTH_ADDITIONS_STORAGE_KEY = "hamouda-month-additions";

function getAllStoredMonthAdditions() {
    try {
        return JSON.parse(localStorage.getItem(MONTH_ADDITIONS_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

// استرجاع إضافة شهر معيّن (0 إذا لم تُحفظ من قبل)
function getStoredMonthAddition(monthKey) {
    return getAllStoredMonthAdditions()[monthKey] || 0;
}

// حفظ إضافة شهر واحد دون المساس ببقية الأشهر
function saveMonthAddition(monthKey, value) {
    const all = getAllStoredMonthAdditions();
    all[monthKey] = value;
    try {
        localStorage.setItem(MONTH_ADDITIONS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.log("تعذّر حفظ الإضافة اليدوية في التخزين المحلي");
    }
}

// فلترة صفوف جدول البحث السريع
function filterTableRows(searchInputId, tableBodyId) {
    const input = document.getElementById(searchInputId);
    const filter = input.value.toLowerCase();
    const tbody = document.getElementById(tableBodyId);
    const rows = tbody.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        if (row.classList.contains("category-header-row") || row.classList.contains("category-total-row")) continue;
        let text = row.textContent || row.innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}
