// Modal d'import - VERSION FINALE CORRIGÉE
const { useState } = React;

window.ImportModal = ({ onClose, onImport }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [importType, setImportType] = useState('estimations');
    const [isProcessing, setIsProcessing] = useState(false);

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

        setIsProcessing(true);

        // Utiliser window.importCSVData qui fait tout le parsing
        window.importCSVData(selectedFile, importType, (data) => {
            console.log('📥 Données reçues du parser:', data.length, 'lignes');
            
            // IMPORTANT : SAUVEGARDER dans localStorage
            window.saveData(importType, data);
            console.log('💾 Données sauvegardées dans localStorage');
            
            // Vérifier immédiatement
            const verify = JSON.parse(localStorage.getItem(importType) || '[]');
            console.log('✅ Vérification:', verify.length, 'lignes en localStorage');
            
            if (verify.length > 0) {
                console.log('✅ Exemple:', {
                    lots: verify[0].lots,
                    positions0: verify[0].positions0,
                    isArray: Array.isArray(verify[0].lots)
                });
            }
            
            alert(`✅ ${data.length} ligne(s) importée(s) et sauvegardées !`);
            
            setIsProcessing(false);
            
            // Recharger les données dans React
            if (onImport) {
                onImport();
            }
            
            onClose();
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📥 Importer des données</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
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
                            disabled={isProcessing}
                        >
                            <option value="estimations">Estimations</option>
                            <option value="offres">Offres</option>
                            <option value="commandes">Commandes</option>
                            <option value="offresComplementaires">Offres Complémentaires</option>
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
                            disabled={isProcessing}
                        />
                    </div>

                    {selectedFile && (
                        <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📄</span>
                                <div>
                                    <div className="font-medium">{selectedFile.name}</div>
                                    <div className="text-gray-600">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <div className="font-medium mb-1">⚠️ Attention</div>
                        <div className="text-gray-700">
                            L'import remplacera toutes les données existantes du type sélectionné.
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        disabled={isProcessing}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!selectedFile || isProcessing}
                        className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                            !selectedFile || isProcessing
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>Import en cours...</span>
                            </>
                        ) : (
                            <>
                                <span>📥</span>
                                <span>Importer</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
