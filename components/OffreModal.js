// Modal de gestion des offres avec versioning et lien aux appels d'offres
const { useState, useEffect } = React;

window.OffreModal = ({ initialData, onClose, onSave, estimations = [], appelOffres = [], offres = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        fournisseur: '',
        dateOffre: new Date().toISOString().split('T')[0],
        validite: '',
        lots: [],
        positions0: [],
        positions1: [],
        montant: '',
        description: '',
        statut: 'En attente',
        version: 1,
        versions: [],
        appelOffreId: '', // NOUVEAU
        isFavorite: false // NOUVEAU
    });

    const [showVersions, setShowVersions] = useState(false);

    const allLots = [...new Set(estimations.flatMap(e => e.lots || []))].sort();
    const allPos0 = [...new Set(estimations.flatMap(e => e.positions0 || []))].sort();
    const allPos1 = [...new Set(estimations.flatMap(e => e.positions1 || []))].sort();

    // NOUVEAU: Pré-remplir les lots/positions depuis l'appel d'offres sélectionné
    const handleAppelOffreChange = (aoId) => {
        const ao = appelOffres.find(a => a.id === aoId);
        if (ao) {
            setFormData({
                ...formData,
                appelOffreId: aoId,
                lots: ao.lots || [],
                positions0: ao.positions0 || [],
                positions1: ao.positions1 || []
            });
        } else {
            setFormData({
                ...formData,
                appelOffreId: aoId
            });
        }
    };

    // NOUVEAU: Déterminer automatiquement si c'est la favorite à la sauvegarde
    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montant) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur, Montant)');
            return;
        }

        const montant = parseFloat(formData.montant) || 0;
        
        // Si l'offre est liée à un AO, déterminer si c'est la favorite
        let isFavorite = formData.isFavorite;
        if (formData.appelOffreId) {
            // Trouver toutes les autres offres du même AO
            const offresMemeAO = offres.filter(o => 
                o.appelOffreId === formData.appelOffreId && 
                o.id !== initialData?.id // Exclure l'offre en cours d'édition
            );
            
            // Si c'est la seule offre OU si c'est la moins chère
            if (offresMemeAO.length === 0) {
                isFavorite = true; // Première offre = favorite par défaut
            } else {
                const montantMin = Math.min(...offresMemeAO.map(o => o.montant));
                isFavorite = montant <= montantMin; // Favorite si moins chère ou égale
            }
        }

        const offre = {
            ...formData,
            id: initialData?.id || `OFF-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montant: montant,
            isFavorite: isFavorite // NOUVEAU
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier l\'offre' : 'Nouvelle offre'}
                        <span className="text-sm text-gray-500 ml-3">Version {formData.version}</span>
                        {formData.isFavorite && (
                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                ⭐ Favorite
                            </span>
                        )}
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
                                        <div className="text-gray-700">
                                            Montant: {v.montant?.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                        </div>
                                        {v.validite && <div className="text-gray-600 text-xs">Validité: {v.validite}</div>}
                                        {v.description && <div className="text-gray-600 text-xs">{v.description}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* NOUVEAU: Appel d'offres */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <label className="block text-sm font-medium mb-2">
                            🎯 Lier à un Appel d'Offres (optionnel)
                        </label>
                        <select
                            value={formData.appelOffreId}
                            onChange={(e) => handleAppelOffreChange(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                            <option value="">-- Aucun appel d'offres --</option>
                            {appelOffres
                                .filter(ao => ao.statut === 'En consultation')
                                .map(ao => (
                                    <option key={ao.id} value={ao.id}>
                                        {ao.numero} - {ao.designation}
                                    </option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-600 mt-2">
                            {formData.appelOffreId ? (
                                <span className="text-purple-700">
                                    ✓ Cette offre sera liée à l'AO et participera à la sélection automatique de la favorite
                                </span>
                            ) : (
                                <span>
                                    Liez cette offre à un AO pour activer la sélection automatique de l'offre favorite
                                </span>
                            )}
                        </p>
                    </div>

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
                                placeholder="Ex: OFF-2024-001"
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
                                placeholder="Ex: 30 jours, 3 mois"
                            />
                        </div>
                    </div>

                    {/* Lots et Positions */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Lots</label>
                            <select
                                multiple
                                value={formData.lots}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    lots: Array.from(e.target.selectedOptions, option => option.value)
                                })}
                                className="w-full px-3 py-2 border rounded-lg h-24"
                            >
                                {allLots.map(lot => (
                                    <option key={lot} value={lot}>{lot}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélection multiple</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Positions Niveau 0</label>
                            <select
                                multiple
                                value={formData.positions0}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    positions0: Array.from(e.target.selectedOptions, option => option.value)
                                })}
                                className="w-full px-3 py-2 border rounded-lg h-24"
                            >
                                {allPos0.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Positions Niveau 1</label>
                            <select
                                multiple
                                value={formData.positions1}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    positions1: Array.from(e.target.selectedOptions, option => option.value)
                                })}
                                className="w-full px-3 py-2 border rounded-lg h-24"
                            >
                                {allPos1.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
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
                            {formData.appelOffreId && formData.montant && (
                                <p className="text-xs text-purple-600 mt-1">
                                    💡 Sélection automatique : cette offre sera favorite si elle est la moins chère
                                </p>
                            )}
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
                            placeholder="Description de l'offre, conditions particulières..."
                        />
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-between mt-6 pt-4 border-t">
                    <div>
                        {initialData && (
                            <button
                                onClick={createNewVersion}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                            >
                                🔄 Nouvelle version
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <window.Icons.Save />
                            {initialData ? 'Mettre à jour' : 'Créer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
