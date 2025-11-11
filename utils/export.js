// Fonctions d'export et d'import de données - VERSION FINALE

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

// Parser CSV avec support des guillemets
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
                alert('❌ Le fichier CSV est vide');
                return;
            }
            
            const separator = lines[0].includes(';') ? ';' : ',';
            const headers = parseCSVLine(lines[0], separator).map(h => h.replace(/^"|"$/g, '').trim());
            
            console.log('📋 En-têtes CSV:', headers);
            
            const imported = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = parseCSVLine(line, separator).map(v => v.replace(/^"|"$/g, '').trim());
                
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                
                // Transformation selon le type
                if (dataType === 'Estimations' || dataType === 'estimations') {
                    // Transformation GARANTIE en arrays pour estimations
                    row.lots = row['Lot'] ? [String(row['Lot'])] : [];
                    row.positions0 = (row['Position 0'] || row['Position Niv. 0']) ? [String(row['Position 0'] || row['Position Niv. 0'])] : [];
                    row.positions1 = (row['Position 1'] || row['Position Niv. 1']) ? [String(row['Position 1'] || row['Position Niv. 1'])] : [];
                    row.etape = row['Étape'] || row['Etape'] || '';
                    
                    const montantStr = row['Montant (CHF)'] || row['Montant CHF'] || row['Montant'] || '0';
                    row.montant = parseFloat(String(montantStr).replace(/[^0-9.-]/g, '')) || 0;
                    
                    row.id = row['id'] || row['ID'] || `est-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                } else if (dataType === 'Commandes' || dataType === 'commandes') {
                    // Transformation pour commandes
                    row.fournisseur = row['fournisseur'] || row['Fournisseur'] || '';
                    row.numero = row['numero'] || row['Numéro'] || row['numero_commande'] || '';
                    row.dateCommande = row['dateCommande'] || row['date_commande'] || row['Date'] || '';
                    row.statut = row['statut'] || row['Statut'] || 'En cours';
                    
                    const montantStr = row['montant'] || row['Montant'] || row['Montant cmdé HT'] || '0';
                    row.montant = parseFloat(String(montantStr).replace(/[^0-9.-]/g, '')) || 0;
                    
                    // Initialiser les champs optionnels vides
                    row.lots = row['lots'] || [];
                    row.positions0 = row['positions0'] || [];
                    row.positions1 = row['positions1'] || [];
                    row.source = row['source'] || 'Import CSV';
                    row.offreId = row['offreId'] || null;
                    
                    row.id = row['id'] || row['ID'] || `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                } else {
                    // Pour les autres types, transformation basique
                    row.lots = row['Lot'] ? [String(row['Lot'])] : [];
                    row.positions0 = (row['Position 0'] || row['Position Niv. 0']) ? [String(row['Position 0'] || row['Position Niv. 0'])] : [];
                    row.positions1 = (row['Position 1'] || row['Position Niv. 1']) ? [String(row['Position 1'] || row['Position Niv. 1'])] : [];
                    
                    if (row['Montant'] || row['montant']) {
                        const montantStr = row['Montant'] || row['montant'] || '0';
                        row.montant = parseFloat(String(montantStr).replace(/[^0-9.-]/g, '')) || 0;
                    }
                    
                    row.id = row['id'] || row['ID'] || `${dataType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                
                imported.push(row);
            }
            
            console.log('✅ Parsé:', imported.length, 'lignes');
            if (imported.length > 0) {
                console.log('📊 Première ligne:', imported[0]);
                console.log('🔍 Vérification types:', {
                    lots: Array.isArray(imported[0].lots),
                    positions0: Array.isArray(imported[0].positions0),
                    positions1: Array.isArray(imported[0].positions1)
                });
            }
            
            if (imported.length === 0) {
                alert('❌ Aucune donnée trouvée');
                return;
            }
            
            if (confirm(`Importer ${imported.length} ligne(s) ? Cela remplacera les données existantes.`)) {
                callback(imported);
            }
        } catch (error) {
            console.error('❌ Erreur import:', error);
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
};
