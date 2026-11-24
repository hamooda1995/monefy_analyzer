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

// فتح/إغلاق نافذة نتائج البحث العامة — مع مسح النتائج عند الإغلاق
function toggleSearchModal(show) {
    const modal = document.getElementById("searchModalOverlay");
    if (!modal) return;
    modal.style.display = show ? "flex" : "none";
    if (!show) {
        const input = document.getElementById("globalSearchInput");
        const tbody = document.getElementById("searchResultsBody");
        const countEl = document.getElementById("searchResultsCount");
        if (input) input.value = "";
        if (countEl) countEl.textContent = "";
        if (tbody) tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'>اكتب كلمة للبحث أولاً...</td></tr>";
    }
}

// البحث العام بحسب الوصف أو التصنيف عبر كل البيانات المحللة وعرض النتائج في modal
function openSearchResults() {
    const query = (document.getElementById("globalSearchInput").value || "").trim().toLowerCase();
    const tbody = document.getElementById("searchResultsBody");
    const countEl = document.getElementById("searchResultsCount");

    if (!query) {
        countEl.textContent = "";
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'>اكتب كلمة للبحث أولاً...</td></tr>";
        toggleSearchModal(true);
        return;
    }

    const results = AppState.parsedRowsData
        .filter((r) =>
            (r.description || "").toLowerCase().includes(query) ||
            (r.category || "").toLowerCase().includes(query)
        )
        .sort((a, b) => a.date - b.date);

    countEl.textContent = `عدد النتائج: ${results.length}`;

    if (!results.length) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'>لا توجد نتائج مطابقة 🔍</td></tr>";
    } else {
        const total = results.reduce((sum, r) => sum + (r.amount || 0), 0);
        const rowsHtml = results.map((r) => {
            const d = r.date;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${day}`;
            return `<tr><td>${dateStr}</td><td>${r.monthKey}</td><td>${r.category}</td><td>${r.description}</td><td style='font-weight:bold;'>$${formatMoney(r.amount)}</td></tr>`;
        }).join("");
        tbody.innerHTML = rowsHtml +
            `<tr class="search-total-row"><td colspan="4" style="text-align:left; padding-right:20px;">💰 المجموع الكلي للنتائج</td><td style="font-weight:bold; color: var(--accent);">$${formatMoney(total)}</td></tr>`;
    }

    toggleSearchModal(true);
}

// ===============================================================
// 🧭 شريط التنقل العلوي (Top Navigation)
// ===============================================================

// بناء تبويبات أقسام التقرير في الشريط المنفصل بعد كل تحليل
function buildTopNav() {
    const bar = document.getElementById("reportTabsBar");
    if (!bar) return;

    const links = [
        { id: "kpi-section",        label: "📊 نظرة عامة" },
        { id: "months-group-section", label: "📅 الأشهر" },
        { id: "global-chart-section", label: "👑 الشامل" }
    ];
    ReportSectionsRegistry.forEach((s) => {
        links.push({ id: "section-" + s.key, label: s.label });
    });

    bar.innerHTML = links
        .map((l) => `<button class="top-nav-link" data-tab="${l.id}" onclick="switchReportTab('${l.id}')">${l.label}</button>`)
        .join("");

    bar.style.display = "";

    // إظهار تبويب "نظرة عامة" افتراضياً وإخفاء باقي الأقسام لتقليل الـ scroll
    switchReportTab("kpi-section", true);
}

// مسح تبويبات التقرير وإخفاء الشريط (عند عدم وجود بيانات)
function clearTopNav() {
    const bar = document.getElementById("reportTabsBar");
    if (bar) {
        bar.innerHTML = "";
        bar.style.display = "none";
    }
}

// طي/فتح نموذج الإدخال يدوياً
function toggleFormCollapse() {
    const body = document.getElementById("formCollapseBody");
    const icon = document.getElementById("formCollapseIcon");
    if (!body) return;
    const willShow = body.style.display === "none";
    body.style.display = willShow ? "" : "none";
    if (icon) icon.innerHTML = willShow ? "▲" : "▼";
}

// طي نموذج الإدخال تلقائياً بعد التحليل لعرض النتائج مباشرة
function collapseInputForm() {
    const body = document.getElementById("formCollapseBody");
    const icon = document.getElementById("formCollapseIcon");
    if (!body) return;
    body.style.display = "none";
    if (icon) icon.innerHTML = "▼";
}

// فتح أول قسم مطوي داخل الهدف (لتحسين تجربة التنقل)
function openFirstCollapsed(root) {
    const candidates = root.querySelectorAll(
        ".global-block-wrapper > div[id], .month-block-wrapper [id^='total_month_container_']"
    );
    for (const c of candidates) {
        if (c.style.display === "none") {
            c.style.display = "";
            const wrapper = c.closest(".global-block-wrapper, .month-block-wrapper");
            const icon = wrapper ? wrapper.querySelector(".collapse-icon") : null;
            if (icon) icon.innerHTML = "▲";
            break;
        }
    }
}

// التبديل بين تبويبات التقرير — إظهار قسم واحد فقط لتقليل الـ scroll
function switchReportTab(id, skipScroll) {
    const container = document.getElementById("resultsContainer");
    if (!container) return;

    container.querySelectorAll(".nav-section").forEach((panel) => {
        panel.style.display = panel.id === id ? "" : "none";
    });

    document.querySelectorAll("#reportTabsBar .top-nav-link").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === id);
    });

    if (skipScroll) return;

    const el = document.getElementById(id);
    if (el) {
        openFirstCollapsed(el);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// التمرير السلس إلى قسم معيّن + فتحه إذا كان مطوياً + تمييزه مؤقتاً
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    openFirstCollapsed(el);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("nav-flash");
    setTimeout(() => el.classList.remove("nav-flash"), 1400);
}

// العودة إلى أعلى الصفحة
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}
