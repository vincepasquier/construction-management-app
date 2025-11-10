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

// 🆕 FONCTION AMÉLIORÉE pour gérer le format CSV spécifique
window.importCSVData = (file, dataType, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // Supprimer le BOM UTF-8 si présent
            let text = e.target.result.replace(/^\ufeff/, '');
            
            const lines = text.trim().split('\n');
            if (lines.length === 0) {
                alert('❌ Le fichier CSV est vide');
                return;
            }
            
            // Détecter le séparateur
            const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
            
            // Lire les en-têtes et nettoyer AGRESSIVEMENT
            const rawHeaders = lines[0].split(separator).map(h => h.trim().replace(/\s+/g, ' '));
            
            console.log('Headers bruts:', rawHeaders); // Pour debug
            
            // 🆕 MAPPING AMÉLIORÉ des noms de colonnes
            const headerMapping = {
                // Variations de "Lot"
                'Lot': 'lots',
                'lot': 'lots',
                'lots': 'lots',
                'LOT': 'lots',
                
                // Variations de "Position 0"
                'Position 0': 'positions0',
                'position 0': 'positions0',
                'Position0': 'positions0',
                'position0': 'positions0',
                'positions0': 'positions0',
                'POSITION 0': 'positions0',
                
                // Variations de "Position 1"
                'Position 1': 'positions1',
                'position 1': 'positions1',
                'Position1': 'positions1',
                'position1': 'positions1',
                'positions1': 'positions1',
                'POSITION 1': 'positions1',
                
                // Variations de "Montant"
                'Montant CHF': 'montant',
                'montant chf': 'montant',
                'Montant': 'montant',
                'montant': 'montant',
                'MONTANT CHF': 'montant',
                'MONTANT': 'montant',
                
                // Variations de "Etape"
                'Etape': 'etape',
                'etape': 'etape',
                'Étape': 'etape',
                'étape': 'etape',
                'ETAPE': 'etape',
                
                // Autres champs
                'Phase': 'phase',
                'phase': 'phase',
                'Description': 'description',
                'description': 'description',
                'Remarques': 'remarques',
                'remarques': 'remarques'
            };
            
            // Mapper les en-têtes avec LOG pour debug
            const headers = rawHeaders.map((h, idx) => {
                const cleaned = h.trim();
                const mapped = headerMapping[cleaned] || cleaned.toLowerCase().replace(/\s+/g, '_');
                console.log(`Colonne ${idx}: "${h}" → "${cleaned}" → "${mapped}"`);
                return mapped;
            });
            
            console.log('Headers mappés:', headers);
            
            const imported = [];

            // Traiter chaque ligne
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(separator);
                const row = {};
                
                headers.forEach((header, idx) => {
                    if (idx >= values.length) return;
                    
                    let value = values[idx] ? values[idx].trim() : '';
                    
                    // 🆕 Traiter spécialement le montant
                    if (header === 'montant') {
                        // Supprimer TOUS les espaces, apostrophes, et convertir en nombre
                        value = value.replace(/[\s']/g, '').replace(',', '.');
                        const number = parseFloat(value);
                        row[header] = isNaN(number) ? 0 : number;
                    }
                    // 🆕 Convertir les lots et positions en tableaux
                    else if (header === 'lots' || header === 'positions0' || header === 'positions1') {
                        if (value && value !== '-') {
                            row[header] = [value];
                        } else {
                            row[header] = [];
                        }
                    }
                    // 🆕 Étape : garder comme string
                    else if (header === 'etape') {
                        row[header] = value;
                    }
                    else {
                        row[header] = value;
                    }
                });
                
                // 🆕 Ajouter un ID unique
                if (!row.id) {
                    row.id = `EST-${Date.now()}-${i}`;
                }
                
                // Log première ligne pour debug
                if (i === 1) {
                    console.log('Première ligne importée:', row);
                }
                
                imported.push(row);
            }

            console.log(`Total lignes importées: ${imported.length}`);
            console.log('Aperçu des 3 premières lignes:', imported.slice(0, 3));

            if (imported.length === 0) {
                alert('❌ Aucune donnée valide trouvée dans le CSV');
                return;
            }

            if (confirm(`Importer ${imported.length} ligne(s) de ${dataType} ?\n\nCela remplacera les données existantes de type "${dataType}".`)) {
                callback(imported);
                console.log('Données sauvegardées dans localStorage');
            }
        } catch (error) {
            console.error('Erreur import CSV:', error);
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
};
