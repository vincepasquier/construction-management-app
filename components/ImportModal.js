// Modal d'import avancé avec drag & drop et prévisualisation
const { useState, useRef } = React;

window.ImportModal = ({ onClose, onImport }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileType, setFileType] = useState('');
    const [importType, setImportType] = useState('estimations');
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importHistory, setImportHistory] = useState([]);
    const fileInputRef = useRef(null);

    // Charger l'historique depuis localStorage
    useState(() => {
        const history = JSON.parse(localStorage.getItem('importHistory') || '[]');
        setImportHistory(history.slice(0, 5)); // Garder les 5 derniers
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        const fileName = file.name.toLowerCase();
        let type = '';

        if (fileName.endsWith('.csv')) {
            type = 'csv';
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            type = 'excel';
        } else if (fileName.endsWith('.json')) {
            type = 'json';
        } else {
            alert('❌ Format non supporté. Utilisez CSV, Excel (.xlsx, .xls) ou JSON');
            return;
        }

        setSelectedFile(file);
        setFileType(type);
        
        // Prévisualiser le fichier
        previewFile(file, type);
    };

    const previewFile = async (file, type) => {
        setIsProcessing(true);

        try {
            if (type === 'csv') {
                const text = await file.text();
                const lines = text.trim().split('\n').slice(0, 6); // 5 premières lignes + header
                const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
                
                const preview = lines.map(line => 
                    line.split(separator).map(cell => cell.trim())
                );
                
                setPreviewData({
                    headers: preview[0],
                    rows: preview.slice(1),
                    totalRows: text.split('\n').length - 1
                });
            } else if (type === 'json') {
                const text = await file.text();
                const data = JSON.parse(text);
                const dataArray = Array.isArray(data) ? data : [data];
                
                setPreviewData({
                    headers: Object.keys(dataArray[0] || {}),
                    rows: dataArray.slice(0, 5).map(obj => Object.values(obj)),
                    totalRows: dataArray.length
                });
            } else if (type === 'excel') {
                // Pour Excel, on affiche juste les infos du fichier
                setPreviewData({
                    headers: ['Fichier Excel détecté'],
                    rows: [['Le fichier sera traité lors de l\'import']],
                    totalRows: '?'
                });
            }
        } catch (error) {
            console.error('Erreur de prévisualisation:', error);
            alert('❌ Erreur lors de la lecture du fichier');
            setSelectedFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            alert('⚠️ Veuillez sélectionner un fichier');
            return;
        }

        setIsProcessing(true);

        try {
            if (fileType === 'csv') {
                await window.importCSVData(selectedFile, importType, (data) => {
                    saveImportHistory(selectedFile.name, importType, data.length);
                    alert(`✅ ${data.length} ligne(s) importée(s) !`);
                    onImport();
                    onClose();
                });
            } else if (fileType === 'json') {
                await window.importAllData(selectedFile, {
                    estimations: (data) => {
                        window.saveData('estimations', data);
                    },
                    offres: (data) => {
                        window.saveData('offres', data);
                    },
                    commandes: (data) => {
                        window.saveData('commandes', data);
                    },
                    offresComplementaires: (data) => {
                        window.saveData('offresComplementaires', data);
                    },
                    regies: (data) => {
                        window.saveData('regies', data);
                    },
                    factures: (data) => {
                        window.saveData('factures', data);
                    },
                    appelOffres: (data) => {
                        window.saveData('appelOffres', data);
                    }
                });
                saveImportHistory(selectedFile.name, 'Données complètes', '?');
                onImport();
                onClose();
            } else if (fileType === 'excel') {
                alert('⚠️ Import Excel en cours de développement. Utilisez CSV pour le moment.');
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('Erreur d\'import:', error);
            alert('❌ Erreur lors de l\'import : ' + error.message);
            setIsProcessing(false);
        }
    };

    const saveImportHistory = (fileName, type, count) => {
        const entry = {
            fileName,
            type,
            count,
            date: new Date().toISOString()
        };
        
        const history = JSON.parse(localStorage.getItem('importHistory') || '[]');
        history.unshift(entry);
        localStorage.setItem('importHistory', JSON.stringify(history.slice(0, 10)));
    };

    const getFileIcon = (type) => {
        switch(type) {
            case 'csv': return '📄';
            case 'excel': return '📊';
            case 'json': return '📋';
            default: return '📁';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📥 Importer des données</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                {/* Type d'import */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Type de données à importer</label>
                    <select
                        value={importType}
                        onChange={(e) => setImportType(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={fileType === 'json'}
                    >
                        <option value="estimations">Estimations</option>
                        <option value="offres">Offres</option>
                        <option value="commandes">Commandes</option>
                        <option value="offresComplementaires">Offres Complémentaires</option>
                        <option value="regies">Régies</option>
                        <option value="factures">Factures</option>
                        <option value="appelOffres">Appels d'Offres</option>
                    </select>
                    {fileType === 'json' && (
                        <p className="text-xs text-blue-600 mt-1">
                            Les fichiers JSON importent toutes les données automatiquement
                        </p>
                    )}
                </div>

                {/* Zone de drag & drop */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        dragActive 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {!selectedFile ? (
                        <>
                            <div className="text-6xl mb-4">📁</div>
                            <h3 className="text-lg font-semibold mb-2">
                                Glissez votre fichier ici
                            </h3>
                            <p className="text-gray-600 mb-4">
                                ou cliquez pour parcourir
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Parcourir les fichiers
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".csv,.xlsx,.xls,.json"
                                onChange={handleFileInput}
                            />
                            <div className="mt-4 text-sm text-gray-500">
                                <p>Formats supportés :</p>
                                <p>📄 CSV • 📊 Excel (.xlsx, .xls) • 📋 JSON</p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-6xl">{getFileIcon(fileType)}</div>
                            <div>
                                <p className="font-semibold text-lg">{selectedFile.name}</p>
                                <p className="text-sm text-gray-600">
                                    {(selectedFile.size / 1024).toFixed(2)} KB • {fileType.toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreviewData(null);
                                }}
                                className="text-sm text-red-600 hover:underline"
                            >
                                ✖ Changer de fichier
                            </button>
                        </div>
                    )}
                </div>

                {/* Prévisualisation */}
                {previewData && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-3">
                            👁️ Aperçu ({previewData.totalRows} ligne(s) au total)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-200">
                                    <tr>
                                        {previewData.headers.map((header, idx) => (
                                            <th key={idx} className="px-3 py-2 text-left font-medium">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.rows.map((row, idx) => (
                                        <tr key={idx} className="border-t">
                                            {row.map((cell, cellIdx) => (
                                                <td key={cellIdx} className="px-3 py-2">
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {previewData.rows.length < previewData.totalRows && (
                            <p className="text-xs text-gray-500 mt-2">
                                Affichage des 5 premières lignes...
                            </p>
                        )}
                    </div>
                )}

                {/* Historique récent */}
                {importHistory.length > 0 && !selectedFile && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-3">📜 Imports récents</h3>
                        <div className="space-y-2">
                            {importHistory.map((entry, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-white rounded">
                                    <div>
                                        <span className="font-medium">{entry.fileName}</span>
                                        <span className="text-gray-600 ml-2">• {entry.type}</span>
                                    </div>
                                    <span className="text-gray-500">
                                        {new Date(entry.date).toLocaleDateString('fr-CH')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!selectedFile || isProcessing}
                        className={`px-4 py-2 rounded-lg text-white ${
                            !selectedFile || isProcessing
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isProcessing ? '⏳ Traitement...' : '📥 Importer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
