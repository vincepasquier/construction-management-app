// Modal de gestion des factures avec système de situations
const { useState, useMemo } = React;

window.FactureModal = ({ initialData, onClose, onSave, commandes = [], regies = [], estimations = [], factures = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        commandeId: '',
        regieId: '',
        fournisseur: '',
        dateFacture: new Date().toISOString().split('T')[0],
        dateEcheance: '',
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        montantHT: '',
        tauxTVA: '8.1',
        montantTVA: '',
        montantTTC: '',
        statut: 'En attente',
        dateReglement: '',
        description: '',
        numeroSituation: null
    });

    // Calculer les informations de situation pour la commande sélectionnée
    const situationInfo = useMemo(() => {
        if (!formData.commandeId) return null;

        const commande = commandes.find(c => c.id === formData.commandeId);
        if (!commande) return null;

        const montantCommande = commande.montant || commande.calculatedMontant || 0;

        // Trouver toutes les factures existantes pour cette commande (sauf la facture en cours d'édition)
        const facturesCommande = factures.filter(f => 
            f.commandeId === formData.commandeId && 
            f.id !== initialData?.id
        );

        // Calculer le total déjà facturé
        const totalFacture = facturesCommande.reduce((sum, f) => sum + (f.montantHT || 0), 0);

        // Calculer le prochain numéro de situation
        const prochaineSituation = initialData?.numeroSituation || 
            (facturesCommande.length > 0 ? Math.max(...facturesCommande.map(f => f.numeroSituation || 0)) + 1 : 1);

        // Calculer le pourcentage de cette facture
        const montantActuel = parseFloat(formData.montantHT) || 0;
        const pourcentageActuel = montantCommande > 0 ? (montantActuel / montantCommande * 100) : 0;

        // Calculer le total avec cette facture
        const totalAvecActuelle = totalFacture + montantActuel;
        const pourcentageTotal = montantCommande > 0 ? (totalAvecActuelle / montantCommande * 100) : 0;

        // Calculer le reste
        const reste = montantCommande - totalAvecActuelle;
        const pourcentageReste = montantCommande > 0 ? (reste / montantCommande * 100) : 0;

        return {
            commande,
            montantCommande,
            facturesExistantes: facturesCommande,
            nombreSituations: facturesCommande.length,
            prochaineSituation,
            totalFacture,
            pourcentageFacture: (totalFacture / montantCommande * 100) || 0,
            montantActuel,
            pourcentageActuel,
            totalAvecActuelle,
            pourcentageTotal,
            reste,
            pourcentageReste,
            depassement: pourcentageTotal > 100
        };
    }, [formData.commandeId, formData.montantHT, commandes, factures, initialData]);

    // Pré-remplir depuis une commande (SANS le montant)
    const handleCommandeChange = (commandeId) => {
        const commande = commandes.find(c => c.id === commandeId);
        if (commande) {
            // Calculer le prochain numéro de situation
            const facturesCommande = factures.filter(f => f.commandeId === commandeId);
            const prochaineSituation = facturesCommande.length > 0 
                ? Math.max(...facturesCommande.map(f => f.numeroSituation || 0)) + 1 
                : 1;

            setFormData({
                ...formData,
                commandeId: commandeId,
                regieId: '',
                fournisseur: commande.fournisseur,
                lots: commande.lots || [],
                positions0: commande.positions0 || [],
                positions1: commande.positions1 || [],
                etape: commande.etape || '',
                numeroSituation: prochaineSituation,
                montantHT: '' // ✅ Reste vide - l'utilisateur saisit manuellement
            });
        } else {
            setFormData({
                ...formData,
                commandeId: commandeId,
                regieId: '',
                numeroSituation: null
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
                lots: regie.lots || [],
                positions0: regie.positions0 || [],
                positions1: regie.positions1 || [],
                etape: regie.etape || '',
                numeroSituation: null,
                montantHT: '' // ✅ Reste vide aussi pour les régies
            });
        } else {
            setFormData({
                ...formData,
                regieId: regieId,
                commandeId: '',
                numeroSituation: null
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

        // Vérifier le dépassement si lié à une commande
        if (situationInfo && situationInfo.depassement) {
            if (!confirm(`⚠️ ATTENTION : Le total facturé dépassera 100% de la commande (${situationInfo.pourcentageTotal.toFixed(1)}%).\n\nVoulez-vous continuer ?`)) {
                return;
            }
        }

        const facture = {
            ...formData,
            id: initialData?.id || `FACT-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montantHT: parseFloat(formData.montantHT) || 0,
            tauxTVA: parseFloat(formData.tauxTVA) || 0,
            montantTVA: tva,
            montantTTC: ttc,
            numeroSituation: formData.numeroSituation || null
        };

        onSave(facture);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier la facture' : 'Nouvelle facture'}
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

                    {/* Récapitulatif des situations - NOUVEAU */}
                    {situationInfo && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                📊 Commande {situationInfo.commande.numero} - {situationInfo.montantCommande.toLocaleString('fr-CH')} CHF
                            </h3>

                            {situationInfo.facturesExistantes.length > 0 && (
                                <div className="mb-3 space-y-1">
                                    <p className="text-sm font-medium text-blue-800">Factures existantes :</p>
                                    {situationInfo.facturesExistantes
                                        .sort((a, b) => (a.numeroSituation || 0) - (b.numeroSituation || 0))
                                        .map(f => (
                                            <div key={f.id} className="text-sm text-blue-700 pl-4">
                                                • Situation {f.numeroSituation} : {(f.montantHT || 0).toLocaleString('fr-CH')} CHF 
                                                ({((f.montantHT / situationInfo.montantCommande) * 100).toFixed(1)}%)
                                            </div>
                                        ))
                                    }
                                    <div className="text-sm font-semibold text-blue-800 pl-4 pt-2 border-t border-blue-300 mt-2">
                                        Total facturé : {situationInfo.totalFacture.toLocaleString('fr-CH')} CHF 
                                        ({situationInfo.pourcentageFacture.toFixed(1)}%)
                                    </div>
                                    <div className="text-sm text-blue-700 pl-4">
                                        Reste à facturer : {situationInfo.reste.toLocaleString('fr-CH')} CHF 
                                        ({situationInfo.pourcentageReste.toFixed(1)}%)
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 p-3 bg-white rounded border-2 border-blue-300">
                                <span className="text-2xl">➜</span>
                                <div>
                                    <p className="font-bold text-blue-900">
                                        Cette facture sera : Situation {situationInfo.prochaineSituation}
                                    </p>
                                    {situationInfo.montantActuel > 0 && (
                                        <p className="text-sm text-blue-700 mt-1">
                                            {situationInfo.montantActuel.toLocaleString('fr-CH')} CHF = {situationInfo.pourcentageActuel.toFixed(1)}% de la commande
                                        </p>
                                    )}
                                    {situationInfo.depassement && (
                                        <p className="text-sm text-red-600 font-semibold mt-1">
                                            ⚠️ Dépassement : Total sera de {situationInfo.pourcentageTotal.toFixed(1)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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
                            {situationInfo && situationInfo.montantActuel > 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Représente {situationInfo.pourcentageActuel.toFixed(1)}% de la commande
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Taux TVA (%)</label>
                            <select
                                value={formData.tauxTVA}
                                onChange={(e) => setFormData({...formData, tauxTVA: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="0">0% (Exonéré)</option>
                                <option value="8.1">8.1% (Normal)</option>
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
