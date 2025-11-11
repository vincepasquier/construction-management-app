// Fonctions d'export et d'import de données

// Export CSV avec en-têtes français
window.exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    // Mapping des noms de colonnes techniques vers noms affichés
    const headerMapping = {
        'lots': 'Lot',
        'positions0': 'Position 0',
        'positions1': 'Position 1',
        'phase': 'Phase',
        'etape': 'Etape',
        'montant': 'Montant CHF',
        'description': 'Description',
        'remarques': 'Remarques',
        'id': 'ID',
        'numero': 'Numero',
        'fournisseur': 'Fournisseur',
        'dateOffre': 'Date Offre',
        'dateCommande': 'Date Commande',
        'statut': 'Statut',
        'dateFacture': 'Date Facture',
        'montantHT': 'Montant HT',
        'montantTVA': 'Montant TVA',
        'montantTTC': 'Montant TTC',
        'source': 'Source'
    };
    
    // Obtenir les headers originaux
    const originalHeaders = Object.keys(data[0]);
    
    // Mapper vers les noms français
    const frenchHeaders = originalHeaders.map(h => headerMapping[h] || h);
    
    // Générer le CSV
    const csvContent = [
        frenchHeaders.join(';'),
        ...data.map(row => originalHeaders.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (Array.isArray(value)) return value.join(', ');
            return String(value).replace(/;/g, ',');
        }).join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Export JSON
window.exportToJSON = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Export complet de toutes les données
window.exportAllData = (data) => {
    const allData = {
        exportDate: new Date().toISOString(),
        ...data
    };
    window.exportToJSON(allData, 'projet_construction_complet');
    alert('✅ Toutes les données ont été exportées !');
};

// Import de données JSON complètes
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
            
            // Mapping COMPLET des noms de colonnes
            const headerMapping = {
                // ===== ESTIMATIONS =====
                'Lot': 'lots',
                'lot': 'lots',
                'lots': 'lots',
                'LOT': 'lots',
                
                'Position 0': 'positions0',
                'position 0': 'positions0',
                'Position0': 'positions0',
                'position0': 'positions0',
                'positions0': 'positions0',
                'POSITION 0': 'positions0',
                
                'Position 1': 'positions1',
                'position 1': 'positions1',
                'Position1': 'positions1',
                'position1': 'positions1',
                'positions1': 'positions1',
                'POSITION 1': 'positions1',
                
                'Montant CHF': 'montant',
                'montant chf': 'montant',
                'Montant': 'montant',
                'montant': 'montant',
                'MONTANT CHF': 'montant',
                'MONTANT': 'montant',
                
                'Etape': 'etape',
                'etape': 'etape',
                'Étape': 'etape',
                'étape': 'etape',
                'ETAPE': 'etape',
                
                'Phase': 'phase',
                'phase': 'phase',
                
                'Description': 'description',
                'description': 'description',
                
                'Remarques': 'remarques',
                'remarques': 'remarques',
                'remarques.': 'remarques',
                'Remarque': 'remarques',
                'remarque': 'remarques',
                
                'ID': 'id',
                'id': 'id',
                'Id': 'id',
                
                // ===== COMMANDES =====
                'Numero': 'numero',
                'numero': 'numero',
                'Numéro': 'numero',
                'numéro': 'numero',
                'N°': 'numero',
                'n°': 'numero',
                'N° Commande': 'numero',
                'Commande': 'numero',
                'commande': 'numero',
                
                'Fournisseur': 'fournisseur',
                'fournisseur': 'fournisseur',
                'FOURNISSEUR': 'fournisseur',
                
                'Date Commande': 'dateCommande',
                'date commande': 'dateCommande',
                'Date commande': 'dateCommande',
                'dateCommande': 'dateCommande',
                'datecommande': 'dateCommande',
                'Date': 'dateCommande',
                'date': 'dateCommande',
                
                'Statut': 'statut',
                'statut': 'statut',
                'STATUT': 'statut',
                'Status': 'statut',
                'status': 'statut',
                
                'Source': 'source',
                'source': 'source',
                
                // ===== OFFRES =====
                'Date Offre': 'dateOffre',
                'date offre': 'dateOffre',
                'dateOffre': 'dateOffre',
                
                // ===== FACTURES =====
                'Date Facture': 'dateFacture',
                'date facture': 'dateFacture',
                'dateFacture': 'dateFacture',
                
                'Montant HT': 'montantHT',
                'montant ht': 'montantHT',
                'montantHT': 'montantHT',
                
                'Montant TVA': 'montantTVA',
                'montant tva': 'montantTVA',
                'montantTVA': 'montantTVA',
                
                'Montant TTC': 'montantTTC',
                'montant ttc': 'montantTTC',
                'montantTTC': 'montantTTC'
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
                    
                    // Traiter le montant (pour estimations et commandes)
                    if (header === 'montant') {
                        value = value.replace(/[\s']/g, '').replace(',', '.');
                        const number = parseFloat(value);
                        row[header] = isNaN(number) ? 0 : number;
                    }
                    // Convertir les lots et positions en arrays (pour estimations)
                    else if (header === 'lots' || header === 'positions0' || header === 'positions1') {
                        if (value && value !== '-' && value !== '') {
                            if (value.includes(',')) {
                                row[header] = value.split(',').map(v => v.trim());
                            } else {
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
                    // Dates
                    else if (header === 'dateCommande' || header === 'dateOffre' || header === 'dateFacture') {
                        // Garder la date telle quelle si elle existe
                        row[header] = value || new Date().toISOString().split('T')[0];
                    }
                    else {
                        row[header] = value;
                    }
                });
                
                // Ajouter un ID unique si manquant
                if (!row.id) {
                    const prefix = dataType === 'estimations' ? 'EST' : 
                                 dataType === 'commandes' ? 'CMD' :
                                 dataType === 'offres' ? 'OFF' :
                                 dataType === 'factures' ? 'FACT' : 'DATA';
                    row.id = `${prefix}-${Date.now()}-${i}`;
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
