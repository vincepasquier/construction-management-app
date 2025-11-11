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

// Fonction pour transformer les données CSV en format attendu par l'application
const transformImportedData = (data, dataType) => {
    return data.map(row => {
        const transformed = { ...row };
        
        // Transformer 'Lot' en array 'lots'
        if (row['Lot'] && !transformed.lots) {
            transformed.lots = [row['Lot']];
        }
        
        // Transformer 'Position 0' ou 'Position Niv. 0' en array 'positions0'
        const pos0Key = row['Position 0'] ? 'Position 0' : 
                        row['Position Niv. 0'] ? 'Position Niv. 0' : null;
        if (pos0Key && row[pos0Key] && !transformed.positions0) {
            // Ne pas splitter sur les virgules car c'est déjà une valeur unique
            transformed.positions0 = [row[pos0Key]];
        }
        
        // Transformer 'Position 1' ou 'Position Niv. 1' en array 'positions1'
        const pos1Key = row['Position 1'] ? 'Position 1' : 
                        row['Position Niv. 1'] ? 'Position Niv. 1' : null;
        if (pos1Key && row[pos1Key] && !transformed.positions1) {
            // Ne pas splitter sur les virgules car c'est déjà une valeur unique
            transformed.positions1 = [row[pos1Key]];
        }
        
        // Convertir les montants en nombres
        if (row['Montant (CHF)']) {
            transformed.montant = parseFloat(String(row['Montant (CHF)']).replace(/[^0-9.-]/g, '')) || 0;
        } else if (row['Montant']) {
            transformed.montant = parseFloat(String(row['Montant']).replace(/[^0-9.-]/g, '')) || 0;
        }
        
        // Pour les estimations, ajouter un ID unique si manquant
        if (dataType === 'Estimations' && !transformed.id) {
            transformed.id = `est-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        return transformed;
    });
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

            // Transformer les données importées pour correspondre au format attendu
            const transformedData = transformImportedData(imported, dataType);

            if (confirm(`Importer ${transformedData.length} ligne(s) de ${dataType} ? Cela remplacera les données existantes.`)) {
                callback(transformedData);
                alert(`✅ ${transformedData.length} ligne(s) importée(s) !`);
            }
        } catch (error) {
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
            console.error('Erreur détaillée:', error);
        }
    };
    reader.readAsText(file);
};
