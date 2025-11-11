// Fonctions d'export et d'import de données

window.exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(';'),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (Array.isArray(value)) return value.join(',');
            // Échapper les valeurs contenant des séparateurs avec des guillemets
            const strValue = String(value);
            if (strValue.includes(';') || strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
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
    alert('✅ Toutes les données ont été exportées !');
};

window.importAllData = (file, callbacks) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('⚠️ Cela va remplacer toutes vos données actuelles. Continuer ?')) {
                Object.keys(callbacks).forEach(key => {
                    if (data[key] && callbacks[key]) {
                        callbacks[key](data[key]);
                    }
                });
                alert('✅ Données importées avec succès !');
            }
        } catch (error) {
            alert('❌ Erreur lors de l\'import: ' + error.message);
        }
    };
    reader.readAsText(file);
};

// Fonction pour parser correctement une ligne CSV en respectant les guillemets
const parseCSVLine = (line, separator) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            // Gestion des guillemets doublés (échappement)
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Sauter le prochain guillemet
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            // Séparateur trouvé en dehors des guillemets
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Ajouter la dernière valeur
    result.push(current.trim());
    
    return result;
};

window.importCSVData = (file, dataType, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const lines = e.target.result.trim().split('\n');
            const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
            
            // Utiliser parseCSVLine au lieu de split simple
            const headers = parseCSVLine(lines[0], separator).map(h => h.replace(/^"|"$/g, '').trim());
            const imported = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                // Utiliser parseCSVLine pour respecter les guillemets
                const values = parseCSVLine(lines[i], separator).map(v => v.replace(/^"|"$/g, '').trim());
                const row = {};
                headers.forEach((h, idx) => row[h] = values[idx] || '');
                imported.push(row);
            }

            if (confirm(`Importer ${imported.length} ligne(s) de ${dataType} ? Cela remplacera les données existantes.`)) {
                callback(imported);
                alert(`✅ ${imported.length} ligne(s) importée(s) !`);
            }
        } catch (error) {
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file);
};
