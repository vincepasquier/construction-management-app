// Modal de gestion des factures
const { useState } = React;

window.FactureModal = ({ initialData, onClose, onSave, commandes = [], regies = [], estimations = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        commandeId: '',
        regieId: '',
        fournisseur: '',
        dateFacture: new Date().toISOString().split('T')[0],
        dateEcheance: '',
        montantHT: '',
        tauxTVA: '7.7',
        montantTVA: '',
        montantTTC: '',
        statut: 'En attente',
        dateReglement: '',
        description: ''
    });

    // Pré-remplir depuis une commande
    const handleCommandeChange = (commandeId) => {
        const commande = commandes.find(c => c.id === commandeId);
        if (commande) {
            setFormData({
                ...formData,
                commandeId: commandeId,
                regieId: '',
                fournisseur: commande.fournisseur,
                montantHT: commande.montant || commande.calculatedMontant || ''
            });
        } else {
            setFormData({
                ...formData,
                commandeId: commandeId,
                regieId: ''
            });
        }
    };

    // Pré-remplir depuis une régie
    const handleRegieChange = (regieId) => {
        const regie = regies.find(r => r.id === regieId);
        if (regie) {
            setFormData({
                ...formData,
                regieId: regieId,
                commandeId: '',
                fournisseur: regie.fournisseur,
                montantHT: regie.montantTotal || ''
            });
        } else {
            setFormData({
                ...formData,
                regieId: regieId,
                commandeId: ''
            });
        }
    };

    // Calculer TVA et TTC automatiquement
    const calculerMontants = () => {
        const ht = parseFloat(formData.montantHT) || 0;
        const taux = parseFloat(formData.tauxTVA) || 0;
        const tva = (ht * taux) / 100;
        const ttc = ht + tva;
        return { tva, ttc };
    };

    const { tva, ttc } = calculerMontants();

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montantHT) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur, Montant HT)');
            return;
        }

        const facture = {
            ...formData,
            id: initialData?.id || `FACT-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montantHT: parseFloat(formData.montantHT) || 0,
            tauxTVA: parseFloat(formData.tauxTVA) || 0,
            montantTVA: tva,
            montantTTC: ttc
        };

        onSave(facture);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier la facture' : 'Nouvelle facture'}
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
                                N° Facture <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="FACT-2025-001"
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

                    {/* Lier à une commande ou régie */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Basée sur une commande
                            </label>
                            <select
                                value={formData.commandeId}
                                onChange={(e) => handleCommandeChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                disabled={!!formData.regieId}
                            >
                                <option value="">-- Aucune --</option>
                                {commandes.map(cmd => (
                                    <option key={cmd.id} value={cmd.id}>
                                        {cmd.numero} - {cmd.fournisseur} - {(cmd.montant || cmd.calculatedMontant || 0).toLocaleString('fr-CH')} CHF
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Basée sur une régie
                            </label>
                            <select
                                value={formData.regieId}
                                onChange={(e) => handleRegieChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                disabled={!!formData.commandeId}
                            >
                                <option value="">-- Aucune --</option>
                                {regies.map(reg => (
                                    <option key={reg.id} value={reg.id}>
                                        {reg.numero} - {reg.fournisseur} - {(reg.montantTotal || 0).toLocaleString('fr-CH')} CHF
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date de facture</label>
                            <input
                                type="date"
                                value={formData.dateFacture}
                                onChange={(e) => setFormData({...formData, dateFacture: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date d'échéance</label>
                            <input
                                type="date"
                                value={formData.dateEcheance}
                                onChange={(e) => setFormData({...formData, dateEcheance: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Montants */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">
                                Montant HT (CHF) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.montantHT}
                                onChange={(e) => setFormData({...formData, montantHT: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Taux TVA (%)</label>
                            <select
                                value={formData.tauxTVA}
                                onChange={(e) => setFormData({...formData, tauxTVA: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="0">0% (Exonéré)</option>
                                <option value="2.5">2.5% (Réduit)</option>
                                <option value="7.7">7.7% (Normal)</option>
                                <option value="3.7">3.7% (Hébergement)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Montant TVA</label>
                            <input
                                type="text"
                                value={tva.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                disabled
                                className="w-full px-3 py-2 border rounded-lg bg-gray-100 font-medium"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Montant TTC (CHF)</span>
                            <span className="text-2xl font-bold text-blue-600">
                                {ttc.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                            </span>
                        </div>
                    </div>

                    {/* Statut et règlement */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Statut</label>
                            <select
                                value={formData.statut}
                                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="En attente">En attente</option>
                                <option value="Payée">Payée</option>
                                <option value="En retard">En retard</option>
                                <option value="Annulée">Annulée</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date de règlement</label>
                            <input
                                type="date"
                                value={formData.dateReglement}
                                onChange={(e) => setFormData({...formData, dateReglement: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
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
                            placeholder="Détails de la facture, conditions de paiement..."
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
