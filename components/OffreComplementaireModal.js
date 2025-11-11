// Modal de gestion des offres complémentaires
const { useState } = React;

window.OffreComplementaireModal = ({ initialData, onClose, onSave, estimations = [], offres = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        offreOriginaleId: '',
        fournisseur: '',
        dateOffre: new Date().toISOString().split('T')[0],
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        montant: '',
        description: '',
        statut: 'En attente',
        motif: ''
    });

    // Pré-remplir les informations depuis l'offre originale
    const handleOffreOriginaleChange = (offreId) => {
        const offre = offres.find(o => o.id === offreId);
        if (offre) {
            setFormData({
                ...formData,
                offreOriginaleId: offreId,
                fournisseur: offre.fournisseur,
                lots: offre.lots || [],
                positions0: offre.positions0 || [],
                positions1: offre.positions1 || [],
                etape: offre.etape || ''
            });
        } else {
            setFormData({
                ...formData,
                offreOriginaleId: offreId
            });
        }
    };

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

        const offreComp = {
            ...formData,
            id: initialData?.id || `OC-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montant: parseFloat(formData.montant) || 0
        };

        onSave(offreComp);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier l\'offre complémentaire' : 'Nouvelle offre complémentaire'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Informations de base */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                N° Offre Complémentaire <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Ex: OC-2024-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Offre originale</label>
                            <select
                                value={formData.offreOriginaleId}
                                onChange={(e) => handleOffreOriginaleChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">-- Aucune --</option>
                                {offres.map(offre => (
                                    <option key={offre.id} value={offre.id}>
                                        {offre.numero} - {offre.fournisseur}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Sélectionner pour pré-remplir les informations
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                        <div>
                            <label className="block text-sm font-medium mb-1">Date de l'offre</label>
                            <input
                                type="date"
                                value={formData.dateOffre}
                                onChange={(e) => setFormData({...formData, dateOffre: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Motif de l'offre complémentaire */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Motif de l'offre complémentaire
                        </label>
                        <select
                            value={formData.motif}
                            onChange={(e) => setFormData({...formData, motif: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- Sélectionner --</option>
                            <option value="Travaux supplémentaires">Travaux supplémentaires</option>
                            <option value="Modification du projet">Modification du projet</option>
                            <option value="Imprévus">Imprévus</option>
                            <option value="Demande client">Demande client</option>
                            <option value="Mise à jour technique">Mise à jour technique</option>
                            <option value="Autre">Autre</option>
                        </select>
                    </div>

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
                        <label className="block text-sm font-medium mb-1">Étape</label>
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

                    {/* Montant et Statut */}
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

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Justification</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Détails des travaux supplémentaires, justification de l'offre complémentaire..."
                        />
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
    );
};
