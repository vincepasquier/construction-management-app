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
            if (Array.isArray(value)) return `"${value.join(', ')}"`;
            const strValue = String(value);
            // Mettre entre guillemets si contient séparateur, virgule ou guillemet
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
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
};

window.importCSVData = (file, dataType, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result.trim();
            const lines = text.split('\n');
            
            if (lines.length < 2) {
                alert('❌ Le fichier CSV est vide ou invalide');
                return;
            }
            
            // Détecter le séparateur
            const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
            
            // Parser les en-têtes
            const headers = parseCSVLine(lines[0], separator).map(h => h.replace(/^"|"$/g, '').trim());
            
            console.log('📋 En-têtes détectés:', headers);
            
            const imported = [];
            
            // Parser chaque ligne
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = parseCSVLine(line, separator).map(v => v.replace(/^"|"$/g, '').trim());
                
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                
                // Transformation immédiate pour le format attendu
                const transformed = { ...row };
                
                // Transformer Lot en array lots
                if (row['Lot']) {
                    transformed.lots = [row['Lot']];
                }
                
                // Transformer Position 0 en array positions0
                const pos0Value = row['Position 0'] || row['Position Niv. 0'];
                if (pos0Value) {
                    transformed.positions0 = [pos0Value];
                }
                
                // Transformer Position 1 en array positions1
                const pos1Value = row['Position 1'] || row['Position Niv. 1'];
                if (pos1Value) {
                    transformed.positions1 = [pos1Value];
                }
                
                // Transformer Étape
                if (row['Étape'] || row['Etape']) {
                    transformed.etape = row['Étape'] || row['Etape'];
                }
                
                // Transformer montant en nombre
                const montantValue = row['Montant (CHF)'] || row['Montant CHF'] || row['Montant'];
                if (montantValue) {
                    transformed.montant = parseFloat(String(montantValue).replace(/[^0-9.-]/g, '')) || 0;
                }
                
                // Ajouter un ID si manquant
                if (!transformed.id && dataType === 'Estimations') {
                    transformed.id = row['id'] || row['ID'] || `est-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                
                imported.push(transformed);
            }
            
            console.log('✅ Données parsées:', imported.length, 'lignes');
            console.log('📊 Première ligne:', imported[0]);
            
            if (imported.length === 0) {
                alert('❌ Aucune donnée valide trouvée dans le CSV');
                return;
            }
            
            if (confirm(`Importer ${imported.length} ligne(s) de ${dataType} ? Cela remplacera les données existantes.`)) {
                callback(imported);
                alert(`✅ ${imported.length} ligne(s) importée(s) !`);
            }
        } catch (error) {
            console.error('❌ Erreur import CSV:', error);
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
};
