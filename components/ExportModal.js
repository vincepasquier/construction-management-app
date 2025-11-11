// Modal d'export avancé avec multiples formats
const { useState } = React;

window.ExportModal = ({ onClose, data }) => {
    const [exportFormat, setExportFormat] = useState('csv');
    const [exportType, setExportType] = useState('all');
    const [selectedModules, setSelectedModules] = useState({
        estimations: true,
        offres: true,
        commandes: true,
        offresComplementaires: true,
        regies: true,
        factures: true,
        appelOffres: true
    });
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const modules = [
        { key: 'estimations', label: 'Estimations', icon: '📋', count: data.estimations?.length || 0 },
        { key: 'appelOffres', label: 'Appels d\'Offres', icon: '🎯', count: data.appelOffres?.length || 0 },
        { key: 'offres', label: 'Offres', icon: '💼', count: data.offres?.length || 0 },
        { key: 'offresComplementaires', label: 'Offres Complémentaires', icon: '➕', count: data.offresComplementaires?.length || 0 },
        { key: 'commandes', label: 'Commandes', icon: '📦', count: data.commandes?.length || 0 },
        { key: 'regies', label: 'Régies', icon: '⏱️', count: data.regies?.length || 0 },
        { key: 'factures', label: 'Factures', icon: '💰', count: data.factures?.length || 0 }
    ];

    const toggleModule = (key) => {
        setSelectedModules(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const selectAll = () => {
        const allSelected = {};
        modules.forEach(m => allSelected[m.key] = true);
        setSelectedModules(allSelected);
    };

    const selectNone = () => {
        const noneSelected = {};
        modules.forEach(m => noneSelected[m.key] = false);
        setSelectedModules(noneSelected);
    };

    const handleExport = async () => {
        setIsExporting(true);

        try {
            if (exportType === 'all') {
                // Export complet JSON
                const exportData = {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    ...data
                };

                if (includeMetadata) {
                    exportData.metadata = {
                        totalEstimations: data.estimations?.length || 0,
                        totalOffres: data.offres?.length || 0,
                        totalCommandes: data.commandes?.length || 0,
                        totalBudget: data.estimations?.reduce((sum, e) => sum + (e.montant || 0), 0) || 0
                    };
                }

                window.exportToJSON(exportData, 'projet_construction_complet');
                alert('✅ Export JSON complet réussi !');
            } else {
                // Export sélectif
                const selectedData = {};
                Object.keys(selectedModules).forEach(key => {
                    if (selectedModules[key] && data[key]) {
                        selectedData[key] = data[key];
                    }
                });

                if (Object.keys(selectedData).length === 0) {
                    alert('⚠️ Veuillez sélectionner au moins un module à exporter');
                    setIsExporting(false);
                    return;
                }

                if (exportFormat === 'json') {
                    const exportData = {
                        exportDate: new Date().toISOString(),
                        ...selectedData
                    };
                    window.exportToJSON(exportData, 'export_selectif');
                    alert('✅ Export JSON réussi !');
                } else if (exportFormat === 'csv') {
                    // Export CSV pour chaque module sélectionné
                    let exportCount = 0;
                    Object.keys(selectedData).forEach(key => {
                        if (selectedData[key] && selectedData[key].length > 0) {
                            window.exportToCSV(selectedData[key], key);
                            exportCount++;
                        }
                    });
                    alert(`✅ ${exportCount} fichier(s) CSV exporté(s) !`);
                } else if (exportFormat === 'excel') {
                    alert('📊 Export Excel multi-onglets en cours de développement...');
                    // TODO: Implémenter export Excel
                }
            }

            // Sauvegarder dans l'historique
            saveExportHistory();
            
            setTimeout(() => {
                onClose();
            }, 500);

        } catch (error) {
            console.error('Erreur d\'export:', error);
            alert('❌ Erreur lors de l\'export : ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const saveExportHistory = () => {
        const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
        history.unshift({
            date: new Date().toISOString(),
            format: exportFormat,
            type: exportType,
            modules: Object.keys(selectedModules).filter(k => selectedModules[k])
        });
        localStorage.setItem('exportHistory', JSON.stringify(history.slice(0, 10)));
    };

    const getTotalItems = () => {
        return Object.keys(selectedModules)
            .filter(key => selectedModules[key])
            .reduce((sum, key) => sum + (data[key]?.length || 0), 0);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📤 Exporter les données</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                {/* Type d'export */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-3">Type d'export</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setExportType('all')}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                                exportType === 'all'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">📦</div>
                            <div className="font-semibold">Export complet</div>
                            <div className="text-sm text-gray-600">
                                Toutes les données en un seul fichier JSON
                            </div>
                        </button>

                        <button
                            onClick={() => setExportType('selective')}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                                exportType === 'selective'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">🎯</div>
                            <div className="font-semibold">Export sélectif</div>
                            <div className="text-sm text-gray-600">
                                Choisir les modules et le format
                            </div>
                        </button>
                    </div>
                </div>

                {/* Format (si export sélectif) */}
                {exportType === 'selective' && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-3">Format d'export</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setExportFormat('csv')}
                                className={`p-3 border-2 rounded-lg transition-all ${
                                    exportFormat === 'csv'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="text-2xl mb-1">📄</div>
                                <div className="font-semibold text-sm">CSV</div>
                                <div className="text-xs text-gray-600">Un fichier par module</div>
                            </button>

                            <button
                                onClick={() => setExportFormat('excel')}
                                className={`p-3 border-2 rounded-lg transition-all ${
                                    exportFormat === 'excel'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="text-2xl mb-1">📊</div>
                                <div className="font-semibold text-sm">Excel</div>
                                <div className="text-xs text-gray-600">Multi-onglets</div>
                            </button>

                            <button
                                onClick={() => setExportFormat('json')}
                                className={`p-3 border-2 rounded-lg transition-all ${
                                    exportFormat === 'json'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="text-2xl mb-1">📋</div>
                                <div className="font-semibold text-sm">JSON</div>
                                <div className="text-xs text-gray-600">Fichier unique</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Sélection des modules */}
                {exportType === 'selective' && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium">Modules à exporter</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Tout sélectionner
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={selectNone}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Tout désélectionner
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {modules.map(module => (
                                <label
                                    key={module.key}
                                    className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                        selectedModules[module.key]
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedModules[module.key]}
                                            onChange={() => toggleModule(module.key)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-xl">{module.icon}</span>
                                        <div>
                                            <div className="font-medium text-sm">{module.label}</div>
                                            <div className="text-xs text-gray-600">
                                                {module.count} élément(s)
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {exportType === 'selective' && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                    📊 Total à exporter : {getTotalItems()} élément(s)
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Options */}
                {exportType === 'all' && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={includeMetadata}
                                onChange={(e) => setIncludeMetadata(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">
                                Inclure les métadonnées (statistiques, totaux, etc.)
                            </span>
                        </label>
                    </div>
                )}

                {/* Informations */}
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex gap-2">
                        <span className="text-yellow-600">💡</span>
                        <div className="text-sm text-yellow-800">
                            {exportType === 'all' ? (
                                <>
                                    <p className="font-semibold mb-1">Export complet JSON</p>
                                    <p>Idéal pour la sauvegarde complète et la restauration. Tous les modules seront exportés dans un seul fichier.</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold mb-1">Export sélectif</p>
                                    <p>
                                        {exportFormat === 'csv' && 'Chaque module sélectionné sera exporté dans un fichier CSV séparé.'}
                                        {exportFormat === 'excel' && 'Tous les modules sélectionnés seront exportés dans un fichier Excel avec un onglet par module.'}
                                        {exportFormat === 'json' && 'Les modules sélectionnés seront exportés dans un seul fichier JSON.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting || (exportType === 'selective' && getTotalItems() === 0)}
                        className={`px-4 py-2 rounded-lg text-white ${
                            isExporting || (exportType === 'selective' && getTotalItems() === 0)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isExporting ? '⏳ Export en cours...' : '📤 Exporter'}
                    </button>
                </div>
            </div>
        </div>
    );
};
