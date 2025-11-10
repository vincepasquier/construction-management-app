// Modal de gestion des commandes
const { useState } = React;

window.CommandeModal = ({ initialData, onClose, onSave, estimations = [], offres = [], offresComplementaires = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        offreId: '',
        offreComplementaireId: '',
        offresComplementairesIds: [],
        fournisseur: '',
        dateCommande: new Date().toISOString().split('T')[0],
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        montant: '',
        statut: 'En cours',
        source: 'Manuel',
        description: ''
    });

    const allLots = [...new Set(estimations.flatMap(e => e.lots || []))].sort();
    const allPos0 = [...new Set(estimations.flatMap(e => e.positions0 || []))].sort();
    const allPos1 = [...new Set(estimations.flatMap(e => e.positions1 || []))].sort();

    // Pré-remplir depuis une offre
    const handleOffreChange = (offreId) => {
        const offre = offres.find(o => o.id === offreId);
        if (offre) {
            setFormData({
                ...formData,
                offreId: offreId,
                fournisseur: offre.fournisseur,
                lots: offre.lots || [],
                positions0: offre.positions0 || [],
                positions1: offre.positions1 || [],
                etape: offre.etape || '',
                montant: offre.montant || '',
                source: 'Offre'
            });
        } else {
            setFormData({
                ...formData,
                offreId: offreId
            });
        }
    };

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montant) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur, Montant)');
            return;
        }

        const commande = {
            ...formData,
            id: initialData?.id || `CMD-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montant: parseFloat(formData.montant) || 0,
            calculatedMontant: parseFloat(formData.montant) || 0
        };

        onSave(commande);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier la commande' : 'Nouvelle commande'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Informations de base */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                N° Commande <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="CMD-2025-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date de commande</label>
                            <input
                                type="date"
                                value={formData.dateCommande}
                                onChange={(e) => setFormData({...formData, dateCommande: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Lier à une offre */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Basée sur une offre
                        </label>
                        <select
                            value={formData.offreId}
                            onChange={(e) => handleOffreChange(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- Aucune (commande manuelle) --</option>
                            {offres
                                .filter(o => o.statut === 'En attente' || o.id === formData.offreId)
                                .map(offre => (
                                    <option key={offre.id} value={offre.id}>
                                        {offre.numero} - {offre.fournisseur} - {offre.montant?.toLocaleString('fr-CH')} CHF
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Sélectionner pour pré-remplir les informations
                        </p>
                    </div>

                    {/* Fournisseur */}
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
                                <option value="En cours">En cours</option>
                                <option value="Terminée">Terminée</option>
                                <option value="Annulée">Annulée</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Notes</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Détails de la commande, conditions particulières..."
                        />
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
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {initialData ? 'Modifier' : 'Créer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
