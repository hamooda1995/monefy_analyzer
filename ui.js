/**
 * 🖱️ دوال واجهة المستخدم (UI Interactions)
 * ---------------------------------------------------------------
 * دوال الطي/التوسيع للأقسام والجداول، وتحديث الإضافات اليدوية.
 */

// دالة طي/توسيع موحدة لكل الأقسام القابلة للطي
// @param boxId معرف العنصر المراد إظهاره/إخفائه
// @param headerEl العنصر الذي تم النقر عليه (يبحث داخله عن .collapse-icon)
function toggleSectionBox(boxId, headerEl) {
    let el = document.getElementById(boxId);
    if (!el) return;
    // نبحث عن الأيقونة داخل العنصر أو أحد آبائه المباشرين (مرونة أكبر للنقر)
    let icon = null;
    if (headerEl) {
        icon = headerEl.querySelector(".collapse-icon");
        if (!icon && headerEl.parentElement) {
            icon = headerEl.parentElement.querySelector(".collapse-icon");
        }
    }
    let isHidden = el.style.display === "none";
    el.style.display = isHidden ? "" : "none";
    if (icon) icon.innerHTML = isHidden ? "▲" : "▼";
}

// طي/توسيع تصنيف فرعي داخل جدول شهر (يستخدم name attribute)
function toggleCategorySection(cl, row) {
    let rows = document.getElementsByName(cl);
    let icon = row.querySelector(".collapse-icon");
    let isH = rows[0].style.display === "none";
    rows.forEach((r) => (r.style.display = isH ? "" : "none"));
    icon.innerHTML = isH ? "▲" : "▼";
}

// طي/توسيع كل التصنيفات داخل شهر معيّن
function toggleAllCategoriesInMonth(id, e) {
    e.stopPropagation();
    let tb = document.getElementById(id);
    let hdrs = Array.from(tb.querySelectorAll(".category-header-row"));
    if (!hdrs.length) return;

    // نحدد الحالة من أول تصنيف: إذا كان مفتوحاً نطوي الكل، والعكس
    let firstRows = document.getElementsByName(hdrs[0].getAttribute("data-target-class"));
    let shouldHide = firstRows.length > 0 && firstRows[0].style.display !== "none";

    hdrs.forEach((h) => {
        let rows = document.getElementsByName(h.getAttribute("data-target-class"));
        rows.forEach((r) => (r.style.display = shouldHide ? "none" : ""));
        let icon = h.querySelector(".collapse-icon");
        if (icon) icon.innerHTML = shouldHide ? "▼" : "▲";
    });
}

// إعادة الحساب عند تغيير حقل "مبلغ مدوّر من الشهر السابق" (بدون إعادة قراءة الملف)
function triggerConditionalCalculation() {
    if (AppState.isFileAlreadyLoaded) {
        recalculateAndRenderUI();
    }
}

// حفظ الإضافة اليدوية للشهر (ذاكرة + تخزين محلي) وإعادة الحساب
function updateAdditionsMemory(monthKey, inputElement) {
    const value = parseFloat(inputElement.value) || 0;
    AppState.monthAdditions[monthKey] = value;
    saveMonthAddition(monthKey, value);
    recalculateAndRenderUI();
}
