/**
 * 📥 تصدير بيانات التحليل إلى ملف CSV متوافق مع Excel
 */
function exportAnalysisToCSV() {
    if (!AppState.isDataAnalyzed || AppState.parsedRowsData.length === 0) {
        alert("يا حمودة، لا توجد بيانات محللة حالياً لتصديرها! يرجى رفع الملف وتحليله أولاً.");
        return;
    }

    // ترويسة الأعمدة للملف الصادر
    let csvContent = "\uFEFFالتاريخ,التصنيف,الوصف,المبلغ ($)\n";

    AppState.parsedRowsData.forEach(row => {
        let dateFormatted = `${row.date.getDate()}/${row.date.getMonth() + 1}/${row.date.getFullYear()}`;
        let cleanDesc = row.description ? row.description.replace(/"/g, '""') : "بدون وصف";
        let cleanCat = row.category ? row.category.replace(/"/g, '""') : "أخرى";
        let amount = row.amount.toFixed(2);

        csvContent += `"${dateFormatted}","${cleanCat}","${cleanDesc}",${amount}\n`;
    });

    // إنشاء رابط تحميل وهمي وتفعيل الضغط عليه برمجياً
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Monefy_Analysis_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
