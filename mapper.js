/**
 * 🔗 ربط الأوصاف المتشابهة (Description Mapping)
 * ---------------------------------------------------------------
 * يتيح للمستخدم تجميع أوصاف مختلفة تحت اسم موحّد.
 * - تصنيفات افتراضية بالكود قابلة للتعديل من الواجهة
 * - حفظ الـ mappings في localStorage
 * - تطبيق الـ mappings على البيانات بعد التحليل
 */

// ============================================================
// 📋 التصنيفات الافتراضية — عدّلها من الواجهة أو من هنا
// كل تصنيف: اسم موحّد → مصفوفة كلمات/أوصاف تنتمي له
// ============================================================
const DEFAULT_CATEGORIES = {
    "مطاعم ووجبات جاهزة": [
        "مندي", "شاورما", "فروج", "فلافل", "فطاير", "صفيحة", "كريسبي", "كوك دور",
        "مطبخ الخانم", "مشاوي", "بيتزا", "اوزي", "بيكاتا", "سوسيت", "مكسيكي",
        "رود هاوس", "ايلدورادو", "ماليبو", "شاورما وكايزر", "القرية", "هاينيس",
        "بما انو", "فايرمان", "شام غريل", "الرضا", "فرانشيسكو", "صاج", "دجاجتي",
        "تيتة لطيفة", "بيت عربي", "هوكاباز", "كاربون"
    ],
    "بقالة ومونة وخضار ولحوم": [
        "خضرا", "فواكي", "زيت", "بهارات", "مي", "خبز", "اجبان", "لبن", "جبنة",
        "بيض", "حواضر", "مرتديلا", "حمص", "متبل", "توست", "سمنة", "لحمة", "سمك",
        "خيار", "بندورة", "بطاطا", "بطيخ", "موز", "تفاح", "جوز هند", "كريمة",
        "مي وزيت وخبز", "خبز وبيض ومي", "مول", "بيم", "محارم", "شوكولا",
        "منظفات", "بزاليا", "جوز", "سودا", "دوا غسيل", "مسبحة", "عصرونية",
        "بوظة وشيبس", "كاكاو", "حليب وسكر", "مي وخردل", "كمون", "معطر",
        "بف باف", "فول", "كزبرة", "عسل", "لين"
    ],
    "حلويات، تسالي، ومشروبات": [
        "كاتو", "نابلسية", "بيتفور", "كروسان", "غوفر", "هريسة", "حلويات", "بوظة",
        "شيبس", "شيبسات", "موالح", "كاجو", "مكسرات", "بزورية", "بسكوت", "علكة",
        "قهوة", "عصير", "كولا", "مشروبات", "تلج", "قهوة وفستق واكل",
        "راس بربيش بوظة", "جاك"
    ],
    "أركيلة ومعسل وفحم": [
        "اركيلة", "معسل", "فحم", "معسل وفحم", "معسل ومي", "فحم ومعسل",
        "بربيش", "قزازة", "راس"
    ],
    "فواتير واتصالات وطاقة": [
        "انترنت", "وحدات", "كهربا", "غاز", "ارضي", "انترنت حرستا", "ارضي برزة",
        "وحدات رفيف وحكيم", "فاتورة ارضي مرت عمو", "خطوط", "راوتر", "ماوس",
        "كبل", "كهربا عربين"
    ],
    "ترفيه، طلعات، ورياضة": [
        "سيران", "سواح", "منتزه", "سكي لاند", "سينما", "نادي", "ملعب", "طابة",
        "مباراة مهرجان", "دخولية مهرجان", "مشروبات مهرجان", "مونوبولي", "مزرعة",
        "جليلاتي", "الارض السعيدة", "ورد", "مسدس مي", "زينة", "تطريز الفن",
        "مكتبة", "براية", "الوان", "كتاب ولعبة", "العاب"
    ],
    "ملابس، أحذية، وإكسسوارات": [
        "تياب", "طواقي", "شناتي", "شنتاية", "بوط", "شحاطات", "قميص نوم", "بيجاما",
        "شورت", "شيال", "بوكسرات", "كنزة", "كندرة", "جاكيت", "قميص وجاكيت",
        "رموش", "خاتم لولو", "اساور", "تصليح دهب", "بكلات", "مكياج", "عطر",
        "توصيل شي ان", "شحاطة", "شي ان", "بيجاما حماتي", "داخلي", "قمطات"
    ],
    "صيانة المنزل، أجهزة، ومستلزمات": [
        "تركيب موتور", "تركيب موتور كهربجي", "موتور مي", "خزانة بلاستيك", "قزاز",
        "مراية", "صحون", "كهربجي", "تركيب مكيف", "مكيف", "جهاز مساج", "شراشف",
        "شكلات مفاتيح", "بخاخ", "غطاسة", "حلاقة ومفاتيح", "لمبة", "حنفية",
        "حنفية واكل", "فرن", "بواري", "صحية", "سجاد", "فناجين", "ستانلي",
        "شاحن", "سماعات", "وصلات", "وصلة", "كفر عيون", "معاملة بيت معربا",
        "خزانة احذية", "فواشة", "نيون", "طاولة", "قشاطة", "مزيتة", "شمينتو"
    ],
    "صحة وعناية شخصية": [
        "مضامد", "تحاليل", "لزقة", "دوا", "شامبو", "صيدلية", "حلاق", "شفرات ودوا",
        "دكتور", "فيتامين", "مرهم", "تحليل", "معجون اسنان", "تحاميل", "عضاضة", "ايكو"
    ],
    "سيارة ونقل": [
        "بنزين", "باركينغ", "دبرياج", "سيارة", "كراج"
    ]
};

const DescriptionMapper = {
    STORAGE_KEY: "hamouda-description-mappings",
    CATEGORIES_KEY: "hamouda-description-categories",

    // تحميل الـ mappings المحفوظة
    init() {
        // تحميل التصنيفات المحفوظة أو استخدام الافتراضية
        try {
            const saved = localStorage.getItem(this.CATEGORIES_KEY);
            AppState.descriptionCategories = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        } catch (e) {
            AppState.descriptionCategories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        }
        // توليد mappings من التصنيفات (التصنيفات هي المصدر الوحيد)
        this.generateMappingsFromCategories();
    },

    // توليد mappings من التصنيفات (كل كلمة → اسم التصنيف)
    generateMappingsFromCategories() {
        const categories = AppState.descriptionCategories || DEFAULT_CATEGORIES;
        const mappings = {};
        Object.entries(categories).forEach(([catName, keywords]) => {
            keywords.forEach((kw) => {
                const key = kw.toLowerCase().trim();
                if (key && !mappings[key]) {
                    mappings[key] = catName;
                }
            });
        });
        this.saveAll(mappings);
    },

    // حفظ التصنيفات
    saveCategories(categories) {
        AppState.descriptionCategories = categories;
        try {
            localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
        } catch (e) {
            console.log("تعذّر حفظ التصنيفات في التخزين المحلي");
        }
    },

    // الحصول على التصنيفات
    getCategories() {
        return AppState.descriptionCategories || DEFAULT_CATEGORIES;
    },

    // إضافة كلمة لتصنيف
    addKeywordToCategory(categoryName, keyword) {
        const categories = this.getCategories();
        if (!categories[categoryName]) categories[categoryName] = [];
        const key = keyword.toLowerCase().trim();
        if (!categories[categoryName].includes(key)) {
            categories[categoryName].push(key);
        }
        this.saveCategories(categories);
        this.generateMappingsFromCategories();
    },

    // حذف كلمة من تصنيف
    removeKeywordFromCategory(categoryName, keyword) {
        const categories = this.getCategories();
        if (!categories[categoryName]) return;
        categories[categoryName] = categories[categoryName].filter(
            (k) => k.toLowerCase().trim() !== keyword.toLowerCase().trim()
        );
        this.saveCategories(categories);
        this.generateMappingsFromCategories();
    },

    // إضافة تصنيف جديد
    addCategory(categoryName) {
        const categories = this.getCategories();
        if (!categories[categoryName]) {
            categories[categoryName] = [];
            this.saveCategories(categories);
        }
    },

    // حذف تصنيف كامل
    removeCategory(categoryName) {
        const categories = this.getCategories();
        delete categories[categoryName];
        this.saveCategories(categories);
        this.generateMappingsFromCategories();
    },

    // حفظ كل الـ mappings دفعة واحدة
    saveAll(mappings) {
        AppState.descriptionMappings = mappings;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
        } catch (e) {
            console.log("تعذّر حفظ ربط الأوصاف في التخزين المحلي");
        }
    },

    // الحصول على كل الـ mappings
    getMappings() {
        return AppState.descriptionMappings || {};
    },

    // إضافة/تحديث mapping واحد
    setMapping(original, canonical) {
        const mappings = this.getMappings();
        const key = (original || "").toLowerCase().trim();
        if (!key || !canonical) return;
        mappings[key] = canonical;
        this.saveAll(mappings);
    },

    // حذف mapping واحد
    removeMapping(original) {
        const mappings = this.getMappings();
        const key = (original || "").toLowerCase().trim();
        delete mappings[key];
        this.saveAll(mappings);
    },

    // تطبيق mapping على وصف واحد
    applyMapping(description) {
        // إذا التوحيد معطّل، رجّع الوصف الأصلي
        if (localStorage.getItem("hamouda-description-mapping-enabled") === "false") {
            return description;
        }
        const mappings = this.getMappings();
        const key = (description || "").toLowerCase().trim();
        return mappings[key] || description;
    },

    // تطبيق كل الـ mappings على كل الصفوف المحللة
    applyAllMappings() {
        if (!AppState.parsedRowsData || !AppState.parsedRowsData.length) return;
        AppState.parsedRowsData.forEach((row) => {
            if (!row.originalDescription) {
                row.originalDescription = row.description;
            }
            row.description = this.applyMapping(row.originalDescription);
        });
    },

    // ============================================================
    // 🧠 محرك الاقتراحات الذكي
    // ============================================================

    // تقسيم الوصف إلى كلمات مفتاحية (tokens)
    tokenize(text) {
        if (!text) return [];
        return text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, " ") // إزالة علامات الترقيم
            .split(/\s+/)
            .filter((t) => t.length > 1); // إزالة الأحرف المفردة
    },

    // حساب تشابه جاكار بين مجموعتين من الكلمات
    jaccardSimilarity(setA, setB) {
        if (!setA.size || !setB.size) return 0;
        let intersection = 0;
        setA.forEach((t) => { if (setB.has(t)) intersection++; });
        const union = new Set([...setA, ...setB]);
        return intersection / union.size;
    },

    // هل وصفان متشابهان؟
    areSimilar(descA, descB) {
        const tokensA = new Set(this.tokenize(descA.display));
        const tokensB = new Set(this.tokenize(descB.display));
        const jaccard = this.jaccardSimilarity(tokensA, tokensB);

        const strA = descA.display.toLowerCase();
        const strB = descB.display.toLowerCase();
        const prefixMatch = strA.startsWith(strB) || strB.startsWith(strA);

        // تشابه >= 0.3 أو تطابق بادئة
        return jaccard >= 0.3 || prefixMatch;
    },

    // اقتراح الاسم الموحّد الأنسب لمجموعة أوصاف
    suggestCanonicalName(members) {
        // نختار أقصر وصف (الأكثر عمومية) كاسم موحّد مقترح
        const sorted = [...members].sort((a, b) => a.display.length - b.display.length);
        return sorted[0].display;
    },

    // توليد اقتراحات التجميع بناءً على التشابه
    suggestGroups() {
        if (!AppState.parsedRowsData || !AppState.parsedRowsData.length) return [];

        // جمع الإحصائيات لكل وصف فريد
        const descStats = {};
        AppState.parsedRowsData.forEach((row) => {
            const desc = row.originalDescription || row.description;
            if (!desc || desc === "بدون وصف") return;
            const key = desc.toLowerCase().trim();
            if (!descStats[key]) {
                descStats[key] = {
                    display: desc,
                    count: 0,
                    total: 0,
                    category: row.category || ""
                };
            }
            descStats[key].count++;
            descStats[key].total += row.amount || 0;
        });

        const descriptions = Object.values(descStats);
        if (descriptions.length < 2) return [];

        // بناء رسم بياني للتشابه (Union-Find)
        const parent = descriptions.map((_, i) => i);
        const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
        const union = (a, b) => { parent[find(a)] = find(b); };

        for (let i = 0; i < descriptions.length; i++) {
            for (let j = i + 1; j < descriptions.length; j++) {
                if (this.areSimilar(descriptions[i], descriptions[j])) {
                    union(i, j);
                }
            }
        }

        // تجميع حسب الجذر
        const clusters = {};
        descriptions.forEach((d, i) => {
            const root = find(i);
            if (!clusters[root]) clusters[root] = [];
            clusters[root].push(d);
        });

        // فلترة المجموعات التي فيها وصفان على الأقل
        const existingMappings = this.getMappings();
        return Object.values(clusters)
            .filter((c) => c.length >= 2)
            // استبعاد المجموعات التي كل أعضائها مربوطة بالفعل بنفس الاسم
            .filter((c) => {
                const mappedNames = new Set(
                    c.map((m) => existingMappings[m.display.toLowerCase().trim()] || m.display)
                );
                return mappedNames.size > 1; // فيها أكثر من اسم → تحتاج ربط
            })
            .map((c) => ({
                members: c.sort((a, b) => b.total - a.total),
                suggestedName: this.suggestCanonicalName(c)
            }))
            .sort((a, b) => b.members.length - a.members.length);
    },

    // ============================================================
    // 🖥️ واجهة المستخدم — التصميم الجديد
    // ============================================================

    // فتح/إغلاق نافذة الـ mapping
    toggleModal(show) {
        const modal = document.getElementById("mappingModalOverlay");
        if (!modal) return;
        if (show) this.populateModal();
        modal.style.display = show ? "flex" : "none";
    },

    // جمع كل الأوصاف الفريدة مع إحصائياتها وتصنيفها
    getAllDescriptions() {
        if (!AppState.parsedRowsData || !AppState.parsedRowsData.length) return [];
        const descStats = {};
        AppState.parsedRowsData.forEach((row) => {
            const desc = row.originalDescription || row.description;
            if (!desc || desc === "بدون وصف") return;
            const key = desc.toLowerCase().trim();
            const cat = row.category || "بدون تصنيف";
            if (!descStats[key]) {
                descStats[key] = { display: desc, count: 0, total: 0, categories: {} };
            }
            descStats[key].count++;
            descStats[key].total += row.amount || 0;
            descStats[key].categories[cat] = (descStats[key].categories[cat] || 0) + (row.amount || 0);
        });
        // تحويل categories إلى التصنيف الأكثر إنفاقاً
        return Object.values(descStats).map((d) => {
            const catEntries = Object.entries(d.categories).sort((a, b) => b[1] - a[1]);
            d.primaryCategory = catEntries.length ? catEntries[0][0] : "بدون تصنيف";
            delete d.categories;
            return d;
        }).sort((a, b) => b.total - a.total);
    },

    // ملء النافذة: التصنيفات الموحدة + الأوصاف غير الموحدة
    populateModal() {
        const container = document.getElementById("mappingSuggestionsContainer");
        if (!container) return;

        const allDescs = this.getAllDescriptions();
        const categories = this.getCategories();
        const mappings = this.getMappings();

        // تحديد الأوصاف غير الموحدة (اللي ما إلها mapping)
        const unmapped = allDescs.filter((d) => {
            const key = d.display.toLowerCase().trim();
            return !mappings[key];
        });

        // تجميع الأوصاف غير الموحدة حسب التصنيف الأصلي
        const unmappedByCat = {};
        unmapped.forEach((d) => {
            const cat = d.primaryCategory;
            if (!unmappedByCat[cat]) unmappedByCat[cat] = [];
            unmappedByCat[cat].push(d);
        });
        const sortedUnmappedCats = Object.keys(unmappedByCat).sort((a, b) => {
            const totalA = unmappedByCat[a].reduce((s, d) => s + d.total, 0);
            const totalB = unmappedByCat[b].reduce((s, d) => s + d.total, 0);
            return totalB - totalA;
        });

        let html = "";

        // ============================================================
        // القسم 0: تفعيل/تعطيل التوحيد + تصدير
        // ============================================================
        const isEnabled = localStorage.getItem("hamouda-description-mapping-enabled") !== "false";
        html += `<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:10px; background:var(--kpi-bg); border-radius:8px; border:1px solid var(--glass-border-soft);">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600; font-size:13px;">
                <input type="checkbox" id="mappingEnabledToggle" ${isEnabled ? "checked" : ""} onchange="toggleMappingEnabled(this.checked)" style="width:16px; height:16px; cursor:pointer;" />
                ✅ تفعيل توحيد الأوصاف
            </label>
            <button class="mapping-mini-btn" onclick="exportCategoriesJSON()" title="نسخ التصنيفات الحالية كـ JSON">📋 تصدير التصنيفات</button>
        </div>`;

        // ============================================================
        // القسم 1: التصنيفات الموحدة (قابلة للتعديل)
        // ============================================================
        html += `<div class="mapping-section-title">🏷️ التصنيفات الموحدة (${Object.keys(categories).length})</div>`;
        html += `<div class="mapping-categories-list">`;

        Object.entries(categories).forEach(([catName, keywords]) => {
            const catId = `cat-${catName.replace(/[^\p{L}\p{N}]/gu, "_")}`;
            html += `<div class="mapping-category-card" id="${catId}">
                <div class="mapping-category-card-header" onclick="toggleCategoryCard('${catId}')">
                    <span class="mapping-category-card-name">📁 ${catName}</span>
                    <span class="mapping-category-card-count">${keywords.length} كلمة</span>
                    <span class="mapping-category-arrow" id="${catId}-arrow">▼</span>
                </div>
                <div class="mapping-category-card-body" id="${catId}-body" style="display:none;">
                    <div class="mapping-keywords-list">`;
            keywords.forEach((kw) => {
                html += `<span class="mapping-keyword-tag">
                    ${kw}
                    <button class="mapping-keyword-remove" onclick="removeKeywordFromCategory('${catName.replace(/'/g, "\\'")}', '${kw.replace(/'/g, "\\'")}')" title="حذف">✖</button>
                </span>`;
            });
            html += `</div>
                    <div class="mapping-add-keyword-area">
                        <input type="text" id="addKw-${catId}" placeholder="أضف كلمة جديدة..." class="mapping-input" style="flex:1; min-width:120px;" />
                        <button class="mapping-mini-btn" onclick="addKeywordToCategoryUI('${catName.replace(/'/g, "\\'")}', '${catId}')">➕ إضافة</button>
                    </div>
                    <button class="mapping-delete-btn" style="margin-top:8px;" onclick="removeCategoryUI('${catName.replace(/'/g, "\\'")}')">🗑️ حذف التصنيف</button>
                </div>
            </div>`;
        });

        html += `</div>`;

        // زر إضافة تصنيف جديد + إعادة تعيين
        html += `<div class="mapping-add-category-area" style="margin-top:10px;">
            <input type="text" id="newCategoryName" placeholder="اسم تصنيف جديد..." class="mapping-input" style="flex:1;" />
            <button class="mapping-add-btn" onclick="addNewCategoryUI()">➕ إضافة تصنيف</button>
            <button class="mapping-secondary-btn" onclick="resetCategoriesToDefault()" title="استعادة التصنيفات الافتراضية">🔄 إعادة تعيين</button>
        </div>`;

        // ============================================================
        // القسم 2: الأوصاف غير الموحدة
        // ============================================================
        html += `<div class="mapping-section-title" style="margin-top:20px;">📋 الأوصاف غير الموحدة (${unmapped.length})</div>`;

        if (unmapped.length) {
            html += `<div class="mapping-select-area">
                <div class="mapping-select-header">
                    <span class="mapping-select-title">اختر الأوصاف وأضفها لتصنيف موجود أو أنشئ تصنيف جديد</span>
                    <div class="mapping-select-actions">
                        <button class="mapping-mini-btn" onclick="selectAllMappings()">☑️ تحديد الكل</button>
                        <button class="mapping-mini-btn" onclick="deselectAllMappings()">⬜ إلغاء الكل</button>
                    </div>
                </div>
                <input type="text" id="mappingFilterInput" placeholder="🔍 فلترة الأوصاف..." class="mapping-filter-input" oninput="filterMappingList()" />
                <div class="mapping-list" id="mappingListContainer">`;

            sortedUnmappedCats.forEach((cat, catIdx) => {
                const descs = unmappedByCat[cat];
                const catTotal = descs.reduce((s, d) => s + d.total, 0);
                const catId = `unmapped-cat-${catIdx}`;
                html += `<div class="mapping-category-group" data-cat="${cat.toLowerCase().replace(/"/g, "&quot;")}">
                    <div class="mapping-category-header" onclick="toggleMappingCategory('${catId}')">
                        <span class="mapping-category-name">📁 ${cat}</span>
                        <span class="mapping-category-stats">${descs.length} وصف | $${formatMoney(catTotal)}</span>
                        <span class="mapping-category-arrow" id="${catId}-arrow">▼</span>
                    </div>
                    <div class="mapping-category-body" id="${catId}" style="display:none;">
                        ${descs.map((d) => `
                            <label class="mapping-list-item" data-desc="${d.display.toLowerCase().replace(/"/g, "&quot;")}">
                                <input type="checkbox" class="mapping-checkbox" value="${d.display.replace(/"/g, "&quot;")}" />
                                <span class="mapping-list-name">${d.display}</span>
                                <span class="mapping-list-stats">${d.count}× | $${formatMoney(d.total)}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>`;
            });

            html += `</div>
                <div class="mapping-bind-area">
                    <span class="mapping-bind-label">أضف المحدد إلى:</span>
                    <select id="mappingTargetCategory" class="mapping-input" style="flex:1; min-width:140px;">
                        ${Object.keys(categories).map((c) => `<option value="${c}">${c}</option>`).join("")}
                        <option value="__new__">➕ تصنيف جديد...</option>
                    </select>
                    <input type="text" id="mappingNewCategoryInput" placeholder="اسم التصنيف الجديد..." class="mapping-input" style="display:none; flex:1; min-width:120px;" />
                    <button onclick="bindSelectedToCategory()" class="mapping-add-btn">🔗 ربط المحدد</button>
                </div>
            </div>`;
        } else {
            html += `<p style="text-align:center; color:var(--text-muted); padding:15px;">كل الأوصاف موحدة بالفعل ✅</p>`;
        }

        container.innerHTML = html;

        // ربط حدث تغيير التصنيف المستهدف
        const targetSelect = document.getElementById("mappingTargetCategory");
        if (targetSelect) {
            targetSelect.addEventListener("change", function () {
                const newInput = document.getElementById("mappingNewCategoryInput");
                if (this.value === "__new__") {
                    newInput.style.display = "";
                } else {
                    newInput.style.display = "none";
                }
            });
        }
    },

    // ربط الأوصاف المحددة بتصنيف (موجود أو جديد)
    bindSelectedToCategory() {
        const targetSelect = document.getElementById("mappingTargetCategory");
        const newCatInput = document.getElementById("mappingNewCategoryInput");
        let targetCategory = targetSelect ? targetSelect.value : "";

        // إذا اختار "تصنيف جديد"، خذ الاسم من الحقل
        if (targetCategory === "__new__") {
            targetCategory = newCatInput ? newCatInput.value.trim() : "";
            if (!targetCategory) {
                alert("اكتب اسم التصنيف الجديد يا حمودة!");
                return;
            }
            this.addCategory(targetCategory);
        }

        if (!targetCategory) {
            alert("اختار تصنيفاً أولاً يا حمودة!");
            return;
        }

        const checkboxes = document.querySelectorAll(".mapping-checkbox:checked");
        if (!checkboxes.length) {
            alert("حدّد وصفاً واحداً على الأقل يا حمودة!");
            return;
        }

        checkboxes.forEach((cb) => {
            const original = cb.value;
            this.addKeywordToCategory(targetCategory, original);
        });

        this.populateModal();
        this.reapplyAndRender();
    },

    // حذف mapping
    removeMappingByOriginal(original) {
        this.removeMapping(original);
        this.populateModal();
        this.reapplyAndRender();
    },

    // إعادة تطبيق الـ mappings على البيانات وإعادة الرسم
    reapplyAndRender() {
        this.applyAllMappings();
        if (typeof recalculateAndRenderUI === "function") {
            recalculateAndRenderUI();
        }
    }
};

// ============================================================
// دوال مساعدة للـ UI (مكشوفة عالمياً)
// ============================================================

// تحديد/إلغاء تحديد كل الأوصاف
window.selectAllMappings = function () {
    document.querySelectorAll(".mapping-checkbox").forEach((cb) => { cb.checked = true; });
};
window.deselectAllMappings = function () {
    document.querySelectorAll(".mapping-checkbox").forEach((cb) => { cb.checked = false; });
};

// فلترة قائمة الأوصاف (تشمل التصنيفات)
window.filterMappingList = function () {
    const filter = (document.getElementById("mappingFilterInput").value || "").toLowerCase();
    document.querySelectorAll(".mapping-category-group").forEach((group) => {
        const cat = group.getAttribute("data-cat") || "";
        let hasVisibleDesc = false;
        group.querySelectorAll(".mapping-list-item").forEach((item) => {
            const desc = item.getAttribute("data-desc") || "";
            const match = desc.includes(filter) || cat.includes(filter);
            item.style.display = match ? "" : "none";
            if (match) hasVisibleDesc = true;
        });
        // إظهار/إخفاء مجموعة التصنيف
        if (!filter) {
            group.style.display = "";
        } else {
            group.style.display = (cat.includes(filter) || hasVisibleDesc) ? "" : "none";
        }
        // إذا فيه فلتر ونتائج، افتح المجموعة تلقائياً
        if (filter && (cat.includes(filter) || hasVisibleDesc)) {
            const body = group.querySelector(".mapping-category-body");
            const arrow = group.querySelector(".mapping-category-arrow");
            if (body) body.style.display = "block";
            if (arrow) arrow.textContent = "▲";
        }
    });
};

// فتح/إغلاق تصنيف في قائمة الأوصاف غير الموحدة
window.toggleMappingCategory = function (catId) {
    const body = document.getElementById(catId);
    const arrow = document.getElementById(catId + "-arrow");
    if (!body) return;
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    if (arrow) arrow.textContent = isOpen ? "▼" : "▲";
};

// فتح/إغلاق بطاقة تصنيف موحد
window.toggleCategoryCard = function (catId) {
    const body = document.getElementById(catId + "-body");
    const arrow = document.getElementById(catId + "-arrow");
    if (!body) return;
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    if (arrow) arrow.textContent = isOpen ? "▼" : "▲";
};

// ربط الأوصاف المحددة بتصنيف
window.bindSelectedToCategory = function () {
    DescriptionMapper.bindSelectedToCategory();
};

// حذف mapping
window.removeDescriptionMapping = function (orig) {
    DescriptionMapper.removeMappingByOriginal(orig);
};

// ============================================================
// دوال إدارة التصنيفات الموحدة
// ============================================================

// إضافة كلمة لتصنيف من الواجهة
window.addKeywordToCategoryUI = function (categoryName, catId) {
    const input = document.getElementById("addKw-" + catId);
    if (!input) return;
    const keyword = input.value.trim();
    if (!keyword) return;
    DescriptionMapper.addKeywordToCategory(categoryName, keyword);
    DescriptionMapper.populateModal();
    DescriptionMapper.reapplyAndRender();
};

// حذف كلمة من تصنيف
window.removeKeywordFromCategory = function (categoryName, keyword) {
    if (!confirm(`حذف "${keyword}" من تصنيف "${categoryName}"؟`)) return;
    DescriptionMapper.removeKeywordFromCategory(categoryName, keyword);
    DescriptionMapper.populateModal();
    DescriptionMapper.reapplyAndRender();
};

// حذف تصنيف كامل
window.removeCategoryUI = function (categoryName) {
    if (!confirm(`حذف تصنيف "${categoryName}" وكل كلماته؟`)) return;
    DescriptionMapper.removeCategory(categoryName);
    DescriptionMapper.populateModal();
    DescriptionMapper.reapplyAndRender();
};

// إضافة تصنيف جديد
window.addNewCategoryUI = function () {
    const input = document.getElementById("newCategoryName");
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
        alert("اكتب اسم التصنيف يا حمودة!");
        return;
    }
    DescriptionMapper.addCategory(name);
    DescriptionMapper.populateModal();
};

// إعادة تعيين التصنيفات للافتراضية
window.resetCategoriesToDefault = function () {
    if (!confirm("استعادة التصنيفات الافتراضية؟ هذا بيمسح كل تعديلاتك.")) return;
    DescriptionMapper.saveCategories(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
    DescriptionMapper.generateMappingsFromCategories();
    DescriptionMapper.populateModal();
    DescriptionMapper.reapplyAndRender();
};

// تفعيل/تعطيل توحيد الأوصاف
window.toggleMappingEnabled = function (enabled) {
    localStorage.setItem("hamouda-description-mapping-enabled", enabled ? "true" : "false");
    DescriptionMapper.reapplyAndRender();
};

// تصدير التصنيفات الحالية كـ JSON للنسخ
window.exportCategoriesJSON = function () {
    const categories = DescriptionMapper.getCategories();
    const json = JSON.stringify(categories, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        alert("✅ تم نسخ التصنيفات!\n\nالصقها هنا وأنا بحدّث DEFAULT_CATEGORIES");
    }).catch(() => {
        // fallback: عرض في prompt
        prompt("انسخ التصنيفات من هنا:", json);
    });
};

// فتح/إغلاق النافذة
window.toggleMappingModal = function (show) {
    DescriptionMapper.toggleModal(show);
};
