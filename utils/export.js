// Fonctions d'export et d'import de donnÃ©es

window.exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        alert('Aucune donnÃ©e Ã  exporter');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(';'),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (Array.isArray(value)) return value.join(',');
            return String(value).replace(/;/g, ',');
        }).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.exportToJSON = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.exportAllData = (data) => {
    const allData = {
        exportDate: new Date().toISOString(),
        ...data
    };
    window.exportToJSON(allData, 'projet_construction_complet');
    alert('âœ… Toutes les donnÃ©es ont Ã©tÃ© exportÃ©es !');
};

window.importAllData = (file, callbacks) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('âš ï¸ Cela va remplacer toutes vos donnÃ©es actuelles. Continuer ?')) {
                Object.keys(callbacks).forEach(key => {
                    if (data[key] && callbacks[key]) {
                        callbacks[key](data[key]);
                    }
                });
                alert('âœ… DonnÃ©es importÃ©es avec succÃ¨s !');
            }
        } catch (error) {
            alert('âŒ Erreur lors de l\'import: ' + error.message);
        }
    };
    reader.readAsText(file);
};

window.importCSVData = (file, dataType, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const lines = e.target.result.trim().split('\n');
            const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
            const headers = lines[0].split(separator).map(h => h.trim());
            const imported = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(separator).map(v => v.trim());
                const row = {};
                headers.forEach((h, idx) => row[h] = values[idx] || '');
                imported.push(row);
            }

            if (confirm(`Importer ${imported.length} ligne(s) de ${dataType} ? Cela remplacera les donnÃ©es existantes.`)) {
                callback(imported);
                alert(`âœ… ${imported.length} ligne(s) importÃ©e(s) !`);
            }
        } catch (error) {
            alert('âŒ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file);
};
