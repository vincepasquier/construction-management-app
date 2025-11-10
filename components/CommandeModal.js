// Composant CommandeModal - Gestion des commandes
const { useState, useEffect } = React;

window.CommandeModal = ({ initialData, onClose, onSave, estimations, offres, offresComplementaires }) => {
    const [formData, setFormData] = useState({
        id: initialData?.id || `cmd-${Date.now()}`,
        numero: initialData?.numero || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        offreId: initialData?.offreId || '',
        offreComplementaireId: initialData?.offreComplementaireId || '',
        offresComplementairesIds: initialData?.offresComplementairesIds || [],
        fournisseur: initialData?.fournisseur || '',
        lot: initialData?.lot || '',
        position0: initialData?.position0 || '',
        position1: initialData?.position1 || '',
        montant: initialData?.montant || '',
        description: initialData?.description || '',
        statut: initialData?.statut || 'En cours'
    });

    const [lots, setLots] = useState([]);
    const [positions0, setPositions0] = useState([]);
    const [positions1, setPositions1] = useState([]);

    useEffect(() => {
        const uniqueLots = [...new Set(estimations.map(e => e.lot))].filter(Boolean);
        setLots(uniqueLots);

        if (formData.lot) {
            const pos0 = [...new Set(
                estimations.filter(e => e.lot === formData.lot).map(e => e.position0)
            )].filter(Boolean);
            setPositions0(pos0);
        }

        if (formData.lot && formData.position0) {
            const pos1 = [...new Set(
                estimations.filter(e => e.lot === formData.lot && e.position0 === formData.position0)
                    .map(e => e.position1)
            )].filter(Boolean);
            setPositions1(pos1);
        }
    }, [estimations, formData.lot, formData.position0]);

    // Pré-remplir depuis l'offre sélectionnée
    useEffect(() => {
        if (formData.offreId && offres) {
            const offre = offres.find(o => o.id === formData.offreId);
            if (offre) {
                setFormData(prev => ({
                    ...prev,
                    fournisseur: offre.fournisseur || prev.fournisseur,
                    lot: offre.lot || prev.lot,
                    position0: offre.position0 || prev.position0,
                    position1: offre.position1 || prev.position1,
                    montant: offre.montant || prev.montant
                }));
            }
        }
    }, [formData.offreId, offres]);

    // Calculer le montant total avec OCs
    const calculateTotalMontant = () => {
        let total = parseFloat(formData.montant) || 0;
        
        if (formData.offresComplementairesIds && offresComplementaires) {
            formData.offresComplementairesIds.forEach(ocId => {
                const oc = offresComplementaires.find(o => o.id === ocId);
                if (oc) {
                    total += parseFloat(oc.montant) || 0;
                }
            });
        }
        
        return total;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.numero || !formData.fournisseur || !formData.lot || !formData.montant) {
            alert('Veuillez remplir tous les champs obligatoires (*)');
            return;
        }

        onSave(formData);
        onClose();
    };

    const statuts = ['En cours', 'Validée', 'Annulée', 'Terminée'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {initialData ? '✏️ Modifier Commande' : '➕ Nouvelle Commande'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Numéro */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Numéro de Commande *
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="CMD-2024-001"
                                required
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Offre Source */}
                        {offres && offres.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Offre Source (optionnel)
                                </label>
                                <select
                                    value={formData.offreId}
                                    onChange={(e) => setFormData({...formData, offreId: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Aucune offre</option>
                                    {offres.filter(o => o.statut === 'Acceptée' || o.statut === 'En attente').map(offre => (
                                        <option key={offre.id} value={offre.id}>
                                            {offre.fournisseur} - {offre.lot} - {parseFloat(offre.montant).toLocaleString('fr-CH')} CHF
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Fournisseur */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fournisseur *
                            </label>
                            <input
                                type="text"
                                value={formData.fournisseur}
                                onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Nom du fournisseur"
                                required
                            />
                        </div>

                        {/* Lot */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Lot *
                            </label>
                            <select
                                value={formData.lot}
                                onChange={(e) => setFormData({...formData, lot: e.target.value, position0: '', position1: ''})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Sélectionner un lot</option>
                                {lots.map(lot => (
                                    <option key={lot} value={lot}>{lot}</option>
                                ))}
                            </select>
                        </div>

                        {/* Position 0 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position Niveau 0
                            </label>
                            <select
                                value={formData.position0}
                                onChange={(e) => setFormData({...formData, position0: e.target.value, position1: ''})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!formData.lot}
                            >
                                <option value="">Sélectionner une position</option>
                                {positions0.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                        {/* Position 1 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position Niveau 1
                            </label>
                            <select
                                value={formData.position1}
                                onChange={(e) => setFormData({...formData, position1: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!formData.position0}
                            >
                                <option value="">Sélectionner une position</option>
                                {positions1.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>

                        {/* Montant */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Montant (CHF) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.montant}
                                onChange={(e) => setFormData({...formData, montant: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="10000.00"
                                required
                            />
                        </div>

                        {/* Statut */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Statut
                            </label>
                            <select
                                value={formData.statut}
                                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {statuts.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Offres Complémentaires */}
                        {offresComplementaires && offresComplementaires.length > 0 && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Offres Complémentaires (optionnel)
                                </label>
                                <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                                    {offresComplementaires.filter(oc => oc.statut === 'En attente' || oc.statut === 'Acceptée').map(oc => (
                                        <label key={oc.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.offresComplementairesIds.includes(oc.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({
                                                            ...formData,
                                                            offresComplementairesIds: [...formData.offresComplementairesIds, oc.id]
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            offresComplementairesIds: formData.offresComplementairesIds.filter(id => id !== oc.id)
                                                        });
                                                    }
                                                }}
                                            />
                                            <span className="text-sm">
                                                {oc.fournisseur} - {oc.motif} - {parseFloat(oc.montant).toLocaleString('fr-CH')} CHF
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Montant Total */}
                        {formData.offresComplementairesIds.length > 0 && (
                            <div className="md:col-span-2">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-700">
                                        <strong>Montant de base :</strong> {parseFloat(formData.montant || 0).toLocaleString('fr-CH')} CHF
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <strong>Offres complémentaires :</strong> {(calculateTotalMontant() - parseFloat(formData.montant || 0)).toLocaleString('fr-CH')} CHF
                                    </p>
                                    <p className="text-lg font-bold text-blue-600 mt-2">
                                        <strong>TOTAL :</strong> {calculateTotalMontant().toLocaleString('fr-CH')} CHF
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                placeholder="Détails de la commande..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <window.Icons.Save />
                            {initialData ? 'Mettre à jour' : 'Créer la Commande'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
