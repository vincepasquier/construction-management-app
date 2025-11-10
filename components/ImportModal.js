// Modal d'import de données CSV et JSON
const { useState } = React;

window.ImportModal = ({ onClose, onImport }) => {
    const [importFile, setImportFile] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
        }
    };

    const handleImportJSON = () => {
        if (!importFile) {
            alert('⚠️ Veuillez sélectionner un fichier JSON');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Sauvegarder toutes les données
                if (data.estimations) window.saveData('estimations', data.estimations);
                if (data.offres) window.saveData('offres', data.offres);
                if (data.offresComplementaires) window.saveData('offresComplementaires', data.offresComplementaires);
                if (data.commandes) window.saveData('commandes', data.commandes);
                if (data.regies) window.saveData('regies', data.regies);
                if (data.factures) window.saveData('factures', data.factures);
                if (data.appelOffres) window.saveData('appelOffres', data.appelOffres);
                
                alert('✅ Données importées avec succès !');
                onImport?.();
                onClose();
            } catch (error) {
                alert('❌ Erreur lors de l\'import : ' + error.message);
            }
        };
        reader.readAsText(importFile);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📥 Import de données</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Import JSON global */}
                    <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50">
                        <h3 className="font-semibold text-lg mb-2">📦 Import JSON complet</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Importer un fichier JSON contenant toutes les données (export global)
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="flex-1 text-sm border rounded px-3 py-2"
                            />
                            <button
                                onClick={handleImportJSON}
                                disabled={!importFile}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                📥 Importer JSON
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            ⚠️ Attention : Cela remplacera TOUTES vos données actuelles
                        </p>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">📋 Format du fichier</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li>• <strong>Format</strong> : JSON généré par l'export global</li>
                            <li>• <strong>Encodage</strong> : UTF-8</li>
                            <li>• <strong>Source</strong> : Utilisez le bouton "💾 Exporter tout" de l'application</li>
                        </ul>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};
