// Modal d'import de donnÃ©es CSV et JSON
const { useState } = React;

window.ImportModal = ({ onClose, onImportComplete, estimations, offres, offresComplementaires, commandes, regies, factures, setEstimations, setOffres, setOffresComplementaires, setCommandes, setRegies, setFactures }) => {
    const [selectedType, setSelectedType] = useState('');
    const [importFile, setImportFile] = useState(null);

    const dataTypes = [
        { value: 'estimations', label: 'Estimations', callback: setEstimations },
        { value: 'offres', label: 'Offres', callback: setOffres },
        { value: 'offresComplementaires', label: 'Offres ComplÃ©mentaires', callback: setOffresComplementaires },
        { value: 'commandes', label: 'Commandes', callback: setCommandes },
        { value: 'regies', label: 'RÃ©gies', callback: setRegies },
        { value: 'factures', label: 'Factures', callback: setFactures }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
        }
    };

    const handleImportCSV = () => {
        if (!importFile || !selectedType) {
            alert('âš ï¸ Veuillez sÃ©lectionner un type de donnÃ©es et un fichier');
            return;
        }

        const typeInfo = dataTypes.find(t => t.value === selectedType);
        if (!typeInfo) return;

        window.importCSVData(importFile, typeInfo.label, (data) => {
            typeInfo.callback(data);
            window.saveData(selectedType, data);
            onImportComplete?.();
            onClose();
        });
    };

    const handleImportJSON = () => {
        if (!importFile) {
            alert('âš ï¸ Veuillez sÃ©lectionner un fichier JSON');
            return;
        }

        const callbacks = {
            estimations: setEstimations,
            offres: setOffres,
            offresComplementaires: setOffresComplementaires,
            commandes: setCommandes,
            regies: setRegies,
            factures: setFactures
        };

        window.importAllData(importFile, callbacks);
        onImportComplete?.();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Import de donnÃ©es</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Import JSON global */}
                    <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50">
                        <h3 className="font-semibold text-lg mb-2">ðŸ“¦ Import JSON complet</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Importer un fichier JSON contenant toutes les donnÃ©es (export global)
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="flex-1 text-sm"
                            />
                            <button
                                onClick={handleImportJSON}
                                disabled={!importFile}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                ðŸ“¥ Importer JSON
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            âš ï¸ Attention : Cela remplacera TOUTES vos donnÃ©es actuelles
                        </p>
                    </div>

                    {/* SÃ©parateur */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 border-t"></div>
                        <span className="text-gray-500 text-sm">OU</span>
                        <div className="flex-1 border-t"></div>
                    </div>

                    {/* Import CSV par type */}
                    <div className="p-4 border-2 border-dashed rounded-lg bg-green-50">
                        <h3 className="font-semibold text-lg mb-2">ðŸ“Š Import CSV par type</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Importer un fichier CSV pour un type de donnÃ©es spÃ©cifique
                        </p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Type de donnÃ©es <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">-- SÃ©lectionner un type --</option>
                                    {dataTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="flex-1 text-sm"
                                />
                                <button
                                    onClick={handleImportCSV}
                                    disabled={!importFile || !selectedType}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    ðŸ“¥ Importer CSV
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            â„¹ï¸ Le CSV doit avoir les colonnes correspondant aux champs du type sÃ©lectionnÃ©
                        </p>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">ðŸ“‹ Format des fichiers</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li>â€¢ <strong>CSV</strong> : SÃ©parateur point-virgule (;) ou virgule (,)</li>
                            <li>â€¢ <strong>JSON</strong> : Format gÃ©nÃ©rÃ© par l'export global</li>
                            <li>â€¢ <strong>Encodage</strong> : UTF-8 recommandÃ©</li>
                            <li>â€¢ <strong>Colonnes CSV</strong> : Doivent correspondre aux noms des champs</li>
                        </ul>
                    </div>

                    {/* Stats actuelles */}
                    <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">ðŸ“Š DonnÃ©es actuelles</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><strong>Estimations:</strong> {estimations.length}</div>
                            <div><strong>Offres:</strong> {offres.length}</div>
                            <div><strong>OC:</strong> {offresComplementaires.length}</div>
                            <div><strong>Commandes:</strong> {commandes.length}</div>
                            <div><strong>RÃ©gies:</strong> {regies.length}</div>
                            <div><strong>Factures:</strong> {factures.length}</div>
                        </div>
                    </div>
                </div>

                {/* Bouton fermer */}
                <div className="flex justify-end mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};
