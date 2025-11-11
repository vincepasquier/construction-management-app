// Modal d'import simplifié - VERSION CORRIGÉE
const { useState } = React;

window.ImportModal = ({ onClose, onImport }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [importType, setImportType] = useState('estimations');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!selectedFile) {
            alert('⚠️ Veuillez sélectionner un fichier');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result.trim();
                const lines = text.split('\n');
                
                if (lines.length < 2) {
                    alert('❌ Le fichier CSV est vide');
                    return;
                }
                
                // Détecter le séparateur
                const separator = lines[0].includes(';') ? ';' : ',';
                
                // Parser les en-têtes
                const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
                
                console.log('📋 En-têtes:', headers);
                
                const imported = [];
                
                // Parser chaque ligne
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const values = line.split(separator).map(v => v.replace(/^"|"$/g, '').trim());
                    
                    const row = {};
                    headers.forEach((h, idx) => {
                        row[h] = values[idx] || '';
                    });
                    
                    // Transformation
                    if (row['Lot']) {
                        row.lots = [row['Lot']];
                    }
                    
                    const pos0 = row['Position 0'] || row['Position Niv. 0'];
                    if (pos0) {
                        row.positions0 = [pos0];
                    }
                    
                    const pos1 = row['Position 1'] || row['Position Niv. 1'];
                    if (pos1) {
                        row.positions1 = [pos1];
                    }
                    
                    const etape = row['Étape'] || row['Etape'];
                    if (etape) {
                        row.etape = etape;
                    }
                    
                    const montant = row['Montant (CHF)'] || row['Montant CHF'] || row['Montant'];
                    if (montant) {
                        row.montant = parseFloat(String(montant).replace(/[^0-9.-]/g, '')) || 0;
                    }
                    
                    if (!row.id) {
                        row.id = row['id'] || row['ID'] || `est-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    }
                    
                    imported.push(row);
                }
                
                console.log('✅ Données parsées:', imported.length);
                console.log('📊 Première ligne:', imported[0]);
                
                if (imported.length === 0) {
                    alert('❌ Aucune donnée trouvée');
                    return;
                }
                
                if (confirm(`Importer ${imported.length} ligne(s) ? Cela remplacera les données existantes.`)) {
                    // SAUVEGARDER dans localStorage
                    window.saveData(importType, imported);
                    
                    console.log('💾 Données sauvegardées dans localStorage');
                    
                    // Vérifier immédiatement
                    const saved = JSON.parse(localStorage.getItem(importType) || '[]');
                    console.log('✅ Vérification:', saved.length, 'lignes sauvegardées');
                    
                    alert(`✅ ${imported.length} ligne(s) importée(s) !`);
                    
                    // Recharger les données dans l'app
                    if (onImport) onImport();
                    onClose();
                }
            } catch (error) {
                console.error('❌ Erreur:', error);
                alert('❌ Erreur lors de l\'import: ' + error.message);
            }
        };
        
        reader.readAsText(selectedFile, 'UTF-8');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📥 Importer CSV</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✖
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Type de données
                        </label>
                        <select
                            value={importType}
                            onChange={(e) => setImportType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="estimations">Estimations</option>
                            <option value="offres">Offres</option>
                            <option value="commandes">Commandes</option>
                            <option value="regies">Régies</option>
                            <option value="factures">Factures</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Fichier CSV
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    {selectedFile && (
                        <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!selectedFile}
                        className={`px-4 py-2 rounded-lg text-white ${
                            selectedFile ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                        }`}
                    >
                        📥 Importer
                    </button>
                </div>
            </div>
        </div>
    );
};
