// Modal de gestion des factures avec situations
const { useState } = React;

window.FactureModal = ({ initialData, onClose, onSave, commandes = [], regies = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        numeroSituation: '',
        commandeId: '',
        regieId: '',
        fournisseur: '',
        dateFacturation: new Date().toISOString().split('T')[0],
        dateReception: '',
        delaiPaiement: 30,
        montantHT: '',
        tauxTVA: 8.1,
        montantTTC: '',
        statut: 'En attente',
        lienSharepoint: '',
        notes: ''
    });

    // Calcul automatique du montant TTC
    const calculerMontantTTC = () => {
        const ht = parseFloat(formData.montantHT) || 0;
        const tva = parseFloat(formData.tauxTVA) || 0;
        return ht * (1 + tva / 100);
    };

    // PrÃ©-remplir depuis la commande sÃ©lectionnÃ©e
    const handleCommandeChange = (commandeId) => {
        const commande = commandes.find(c => c.id === commandeId);
        if (commande) {
            setFormData({
                ...formData,
                commandeId: commandeId,
                fournisseur: commande.fournisseur,
                regieId: '' // Reset rÃ©gie si commande sÃ©lectionnÃ©e
            });
        } else {
            setFormData({
                ...formData,
                commandeId: commandeId
            });
        }
    };

    // PrÃ©-remplir depuis la rÃ©gie sÃ©lectionnÃ©e
    const handleRegieChange = (regieId) => {
        const regie = regies.find(r => r.id === regieId);
        if (regie) {
            const cmd = commandes.find(c => c.id === regie.commandeId);
            setFormData({
                ...formData,
                regieId: regieId,
                commandeId: regie.commandeId || '',
                fournisseur: cmd?.fournisseur || '',
                montantHT: regie.montantTotal?.toString() || ''
            });
        } else {
            setFormData({
                ...formData,
                regieId: regieId
            });
        }
    };

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montantHT) {
            alert('âš ï¸ Veuillez remplir tous les champs obligatoires (NÂ° Facture, Fournisseur, Montant HT)');
            return;
        }

        const facture = {
            ...formData,
            id: initialData?.id || `FACT-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montantHT: parseFloat(formData.montantHT) || 0,
            montantTTC: calculerMontantTTC(),
            tauxTVA: parseFloat(formData.tauxTVA) || 0,
            delaiPaiement: parseInt(formData.delaiPaiement) || 0
        };

        onSave(facture);
        onClose();
    };

    const montantTTC = calculerMontantTTC();

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
                                NÂ° Facture <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Ex: FACT-2024-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">NÂ° Situation (optionnel)</label>
                            <input
                                type="text"
                                value={formData.numeroSituation}
                                onChange={(e) => setFormData({...formData, numeroSituation: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Ex: SIT-01"
                            />
                            <p className="text-xs text-gray-500 mt-1">Pour les factures de situation</p>
                        </div>
                    </div>

                    {/* Liaisons */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Commande liÃ©e</label>
                            <select
                                value={formData.commandeId}
                                onChange={(e) => handleCommandeChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">-- Aucune --</option>
                                {commandes.map(cmd => (
                                    <option key={cmd.id} value={cmd.id}>
                                        {cmd.numero} - {cmd.fournisseur}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">RÃ©gie liÃ©e</label>
                            <select
                                value={formData.regieId}
                                onChange={(e) => handleRegieChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">-- Aucune --</option>
                                {regies.map(regie => (
                                    <option key={regie.id} value={regie.id}>
                                        {regie.numero} - {regie.montantTotal?.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </option>
                                ))}
                            </select>
                        </div>
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

                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date de facturation</label>
                            <input
                                type="date"
                                value={formData.dateFacturation}
                                onChange={(e) => setFormData({...formData, dateFacturation: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date de rÃ©ception</label>
                            <input
                                type="date"
                                value={formData.dateReception}
                                onChange={(e) => setFormData({...formData, dateReception: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">DÃ©lai de paiement (jours)</label>
                            <input
                                type="number"
                                value={formData.delaiPaiement}
                                onChange={(e) => setFormData({...formData, delaiPaiement: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="30"
                            />
                        </div>
                    </div>

                    {/* Montants */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
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
                            <input
                                type="number"
                                step="0.1"
                                value={formData.tauxTVA}
                                onChange={(e) => setFormData({...formData, tauxTVA: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="8.1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Montant TTC (CHF)</label>
                            <input
                                type="text"
                                value={montantTTC.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                                disabled
                            />
                            <p className="text-xs text-gray-500 mt-1">CalculÃ© automatiquement</p>
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
                            <option value="En attente">En attente</option>
                            <option value="ReÃ§ue">ReÃ§ue</option>
                            <option value="En contrÃ´le">En contrÃ´le</option>
                            <option value="ValidÃ©e">ValidÃ©e</option>
                            <option value="En retard">En retard</option>
                            <option value="ContestÃ©e">ContestÃ©e</option>
                            <option value="PayÃ©e">PayÃ©e</option>
                        </select>
                    </div>

                    {/* Lien SharePoint */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Lien SharePoint</label>
                        <input
                            type="url"
                            value={formData.lienSharepoint}
                            onChange={(e) => setFormData({...formData, lienSharepoint: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Lien vers le document dans SharePoint</p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Notes / Remarques</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Notes internes, remarques..."
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
                        {initialData ? 'Mettre Ã  jour' : 'CrÃ©er'}
                    </button>
                </div>
            </div>
        </div>
    );
};
