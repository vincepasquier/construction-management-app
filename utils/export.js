// Import CSV amélioré avec conversion automatique des arrays
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
            
            // Lire les en-têtes et nettoyer
            const rawHeaders = lines[0].split(separator).map(h => h.trim().replace(/\s+/g, ' '));
            
            console.log('🔍 Headers bruts:', rawHeaders);
            
            // Mapping des noms de colonnes
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
                'remarques': 'remarques',
                'remarques.': 'remarques',
                'ID': 'id',
                'id': 'id'
            };
            
            // Mapper les en-têtes
            const headers = rawHeaders.map((h, idx) => {
                const cleaned = h.trim();
                const mapped = headerMapping[cleaned] || cleaned.toLowerCase().replace(/\s+/g, '_');
                console.log(`📌 Colonne ${idx}: "${h}" → "${mapped}"`);
                return mapped;
            });
            
            console.log('✅ Headers mappés:', headers);
            
            const imported = [];

            // Traiter chaque ligne
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(separator);
                const row = {};
                
                headers.forEach((header, idx) => {
                    if (idx >= values.length) return;
                    
                    let value = values[idx] ? values[idx].trim() : '';
                    
                    // Traiter le montant
                    if (header === 'montant') {
                        value = value.replace(/[\s']/g, '').replace(',', '.');
                        const number = parseFloat(value);
                        row[header] = isNaN(number) ? 0 : number;
                    }
                    // 🆕 CORRECTION : Convertir les lots et positions en arrays
                    else if (header === 'lots' || header === 'positions0' || header === 'positions1') {
                        if (value && value !== '-' && value !== '') {
                            // Si la valeur contient des virgules, c'est déjà une liste
                            if (value.includes(',')) {
                                row[header] = value.split(',').map(v => v.trim());
                            } else {
                                // Sinon, mettre dans un array
                                row[header] = [value];
                            }
                        } else {
                            row[header] = [];
                        }
                    }
                    // Étape : garder comme string
                    else if (header === 'etape') {
                        row[header] = value;
                    }
                    else {
                        row[header] = value;
                    }
                });
                
                // Ajouter un ID unique si manquant
                if (!row.id) {
                    row.id = `EST-${Date.now()}-${i}`;
                }
                
                // Log première ligne pour debug
                if (i === 1) {
                    console.log('✅ Première ligne importée:', row);
                }
                
                imported.push(row);
            }

            console.log(`✅ Total lignes importées: ${imported.length}`);
            console.log('📊 Aperçu des 3 premières lignes:', imported.slice(0, 3));

            if (imported.length === 0) {
                alert('❌ Aucune donnée valide trouvée dans le CSV');
                return;
            }

            if (confirm(`Importer ${imported.length} ligne(s) de ${dataType} ?\n\nCela remplacera les données existantes de type "${dataType}".`)) {
                callback(imported);
                window.saveData(dataType, imported);
                console.log('💾 Données sauvegardées dans localStorage');
                alert(`✅ ${imported.length} ligne(s) importée(s) avec succès !`);
            }
        } catch (error) {
            console.error('❌ Erreur import CSV:', error);
            alert('❌ Erreur lors de l\'import CSV: ' + error.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
};
