// Modal de gestion des offres avec versioning
const { useState } = React;

window.OffreModal = ({ initialData, onClose, onSave, estimations = [], appelOffres = [], offres = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        fournisseur: '',
        dateOffre: new Date().toISOString().split('T')[0],
        validite: '',
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        montant: '',
        budgetRegie: '',
        description: '',
        statut: 'En attente',
        version: 1,
        versions: [],
        appelOffreId: '',
        isFavorite: false
    });

    const [showVersions, setShowVersions] = useState(false);

    // Handler pour le SmartSelector
    const handleSelectionChange = ({ lots, positions0, positions1 }) => {
        setFormData({
            ...formData,
            lots,
            positions0,
            positions1
        });
    };

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montant) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur, Montant)');
            return;
        }

        const offre = {
            ...formData,
            id: initialData?.id || `OFF-${Date.now()}`,
            montant: parseFloat(formData.montant) || 0,
            budgetRegie: parseFloat(formData.budgetRegie) || 0,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montant: parseFloat(formData.montant) || 0
        };

        onSave(offre);
        onClose();
    };

    const createNewVersion = () => {
        if (!formData.montant) {
            alert('⚠️ Le montant est requis pour créer une version');
            return;
        }

        const currentVersion = {
            version: formData.version,
            date: new Date().toISOString(),
            montant: parseFloat(formData.montant),
            description: formData.description,
            validite: formData.validite
        };

        setFormData({
            ...formData,
            version: formData.version + 1,
            versions: [...(formData.versions || []), currentVersion],
            montant: '',
            description: '',
            validite: ''
        });

        alert(`✅ Version ${formData.version} sauvegardée ! Vous créez maintenant la version ${formData.version + 1}`);
    };

    // Gestion automatique de la favorite si liée à un AO
    const handleAppelOffreChange = (aoId) => {
            const appelOffre = appelOffres.find(ao => ao.id === aoId);
    
            const newFormData = {...formData, appelOffreId: aoId};
    
    // ✅ COPIE automatique des lots/positions
    if (appelOffre) {
        newFormData.lots = appelOffre.lots || [];
        newFormData.positions0 = appelOffre.positions0 || [];
        newFormData.positions1 = appelOffre.positions1 || [];
    }
    
    setFormData(newFormData);
        
        if (aoId && formData.montant) {
            const offresLiees = offres.filter(o => o.appelOffreId === aoId && o.id !== formData.id);
            const montantActuel = parseFloat(formData.montant);
            const estLaMoinsChère = offresLiees.every(o => montantActuel < (o.montant || Infinity));
            
            if (estLaMoinsChère && offresLiees.length > 0) {
                setFormData(prev => ({...prev, isFavorite: true, appelOffreId: aoId}));
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier l\'offre' : 'Nouvelle offre'}
                        <span className="text-sm text-gray-500 ml-3">Version {formData.version}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                {/* Versions précédentes */}
                {formData.versions && formData.versions.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                        <button 
                            onClick={() => setShowVersions(!showVersions)}
                            className="flex items-center gap-2 text-blue-600 font-medium w-full"
                        >
                            {showVersions ? <window.Icons.ChevronDown /> : <window.Icons.ChevronRight />}
                            {formData.versions.length} version(s) précédente(s)
                        </button>
                        
                        {showVersions && (
                            <div className="mt-3 space-y-2">
                                {formData.versions.map((v, idx) => (
                                    <div key={idx} className="p-2 bg-white rounded border text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-medium">Version {v.version}</span>
                                            <span className="text-gray-600">
                                                {new Date(v.date).toLocaleDateString('fr-CH')}
                                            </span>
                                        </div>
                                        <div className="mt-1">
                                            <span className="font-semibold">{v.montant.toLocaleString('fr-CH')} CHF</span>
                                            {v.validite && <span className="text-gray-600 ml-2">• Validité: {v.validite}</span>}
                                        </div>
                                        {v.description && (
                                            <p className="text-gray-600 mt-1">{v.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Formulaire */}
                <div className="space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Informations de base */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                N° Offre <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="OFF-2025-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Fournisseur <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.fournisseur}
                                onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Nom du fournisseur"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date de l'offre</label>
                            <input
                                type="date"
                                value={formData.dateOffre}
                                onChange={(e) => setFormData({...formData, dateOffre: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Validité</label>
                            <input
                                type="text"
                                value={formData.validite}
                                onChange={(e) => setFormData({...formData, validite: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="30 jours, 3 mois, etc."
                            />
                        </div>
                    </div>

                    {/* Appel d'Offres */}
                    {appelOffres.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Lier à un Appel d'Offres
                            </label>
                            <select
                                value={formData.appelOffreId || ''}
                                onChange={(e) => handleAppelOffreChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">-- Aucun (offre indépendante) --</option>
                                {appelOffres
                                    .filter(ao => ao.statut === 'En consultation')
                                    .map(ao => (
                                        <option key={ao.id} value={ao.id}>
                                            {ao.numero} - {ao.designation}
                                        </option>
                                    ))
                                }
                            </select>
                            {formData.appelOffreId && (
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 L'offre la moins chère sera automatiquement marquée comme favorite
                                </p>
                            )}
                        </div>
                    )}

                    {/* Smart Selector pour Lots/Positions */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-3">📦 Classification</h3>
                        <window.SmartSelector
                            estimations={estimations}
                            selectedLots={formData.lots}
                            selectedPos0={formData.positions0}
                            selectedPos1={formData.positions1}
                            onChange={handleSelectionChange}
                        />
                    </div>

                    {/* Étape */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Étape
                        </label>
                        <select
                            value={formData.etape}
                            onChange={(e) => setFormData({...formData, etape: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- Sélectionner --</option>
                            <option value="1">Étape 1</option>
                            <option value="2">Étape 2</option>
                        </select>
                    </div>

                    {/* Montant et Description */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Montant (CHF) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.montant}
                                onChange={(e) => setFormData({...formData, montant: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="0.00"
                            />
                        </div>
                        
                        {/* 🆕 NOUVEAU : Budget Régie */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Budget Régie (CHF)
                                <span className="text-xs text-gray-500 ml-2">(optionnel)</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.budgetRegie || ''}
                                onChange={(e) => setFormData({...formData, budgetRegie: e.target.value})}
                                className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-orange-50"
                                placeholder="0.00"
                            />
                            <p className="text-xs text-orange-600 mt-1">
                                💡 Montant prévu pour les travaux en régie
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Statut</label>
                            <select
                                value={formData.statut}
                                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="En attente">En attente</option>
                                <option value="Acceptée">Acceptée</option>
                                <option value="Refusée">Refusée</option>
                                <option value="Expirée">Expirée</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Notes</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Détails, conditions particulières, etc."
                        />
                    </div>

                    {/* Favorite (si lié à un AO) */}
                    {formData.appelOffreId && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isFavorite || false}
                                    onChange={(e) => setFormData({...formData, isFavorite: e.target.checked})}
                                    className="w-4 h-4"
                                />
                                <span className="font-medium">⭐ Marquer comme offre favorite</span>
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                                L'offre favorite sera utilisée pour créer la commande et sera comptabilisée dans le dashboard
                            </p>
                        </div>
                    )}
                </div>

                {/* Boutons */}
                <div className="flex justify-between mt-6 pt-4 border-t">
                    <div className="flex gap-2">
                        {initialData && (
                            <button
                                onClick={createNewVersion}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                title="Créer une nouvelle version de cette offre"
                            >
                                📋 Nouvelle version
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            {initialData ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
