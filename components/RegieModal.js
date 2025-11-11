// Modal de gestion des régies
const { useState } = React;

window.RegieModal = ({ initialData, onClose, onSave, estimations = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        fournisseur: '',
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: '',
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        heures: '',
        tauxHoraire: '',
        montantTotal: '',
        statut: 'En cours',
        description: ''
    });

    // Handler pour le SmartSelector
    const handleSelectionChange = ({ lots, positions0, positions1 }) => {
        setFormData({
            ...formData,
            lots,
            positions0,
            positions1
        });
    };

    // Calculer automatiquement le montant total
    const calculerMontantTotal = () => {
        const heures = parseFloat(formData.heures) || 0;
        const taux = parseFloat(formData.tauxHoraire) || 0;
        return heures * taux;
    };

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur)');
            return;
        }

        const montantCalcule = calculerMontantTotal();

        const regie = {
            ...formData,
            id: initialData?.id || `REG-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            heures: parseFloat(formData.heures) || 0,
            tauxHoraire: parseFloat(formData.tauxHoraire) || 0,
            montantTotal: montantCalcule
        };

        onSave(regie);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier la régie' : 'Nouvelle régie'}
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
                                N° Régie <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="REG-2025-001"
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

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date de début</label>
                            <input
                                type="date"
                                value={formData.dateDebut}
                                onChange={(e) => setFormData({...formData, dateDebut: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date de fin</label>
                            <input
                                type="date"
                                value={formData.dateFin}
                                onChange={(e) => setFormData({...formData, dateFin: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
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

                    {/* Heures et taux */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Heures</label>
                            <input
                                type="number"
                                step="0.5"
                                value={formData.heures}
                                onChange={(e) => setFormData({...formData, heures: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Taux horaire (CHF)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.tauxHoraire}
                                onChange={(e) => setFormData({...formData, tauxHoraire: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Montant total (CHF)</label>
                            <input
                                type="text"
                                value={calculerMontantTotal().toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                disabled
                                className="w-full px-3 py-2 border rounded-lg bg-gray-100 font-semibold"
                            />
                        </div>
                    </div>

                    {/* Statut */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Statut</label>
                        <select
                            value={formData.statut}
                            onChange={(e) => setFormData({...formData, statut: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="En cours">En cours</option>
                            <option value="Terminée">Terminée</option>
                            <option value="Validée">Validée</option>
                            <option value="Annulée">Annulée</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Notes</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Détails des travaux en régie..."
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
