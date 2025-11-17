// Modal de gestion des régies - VERSION SIMPLIFIÉE avec liaison commandes
const { useState } = React;

window.RegieModal = ({ initialData, onClose, onSave, commandes = [], regies = [], estimations = [] }) => {
    
    // 🔍 DEBUG
    console.log('RegieModal props:', {
        commandes: commandes?.length || 0,
        regies: regies?.length || 0,
        estimations: estimations?.length || 0
    });
    
    // ✅ useState DOIT ÊTRE ICI - PAS PLUS BAS
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        commandeId: '',
        numeroIncrement: '',
        fournisseur: '',
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: '',
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        montantTotal: '',
        statut: 'En cours',
        description: ''
    });
    
    // Pré-remplir depuis une commande
    const handleCommandeChange = (commandeId) => {
    if (!commandeId) {
        setFormData({
            ...formData,
            commandeId: '',
            numeroIncrement: '',
            fournisseur: '',
            lots: [],
            positions0: [],
            positions1: []
        });
        return;
    }

    const commande = commandes && commandes.find(c => c.id === commandeId);
    if (commande) {
        // Calculer le prochain numéro incrémental
        const regiesCommande = regies && Array.isArray(regies) 
            ? regies.filter(r => r.commandeId === commandeId) 
            : [];
        const nextIncrement = regiesCommande.length + 1;

        setFormData({
            ...formData,
            commandeId: commandeId,
            numeroIncrement: nextIncrement.toString(),
            fournisseur: commande.fournisseur,
            lots: commande.lots || [],
            positions0: commande.positions0 || [],
            positions1: commande.positions1 || [],
            etape: commande.etape || ''
        });
    }
};

            // Handler pour le SmartSelector
            const handleSelectionChange = ({ lots, positions0, positions1 }) => {
                setFormData({
                    ...formData,
                    lots: lots || [],
                    positions0: positions0 || [],
                    positions1: positions1 || []
                });
            };

    const handleSubmit = () => {
        if (!formData.numero || !formData.fournisseur || !formData.montantTotal) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Fournisseur, Montant)');
            return;
        }

        if (!formData.commandeId) {
            alert('⚠️ Veuillez sélectionner une commande');
            return;
        }

        const regie = {
            ...formData,
            id: initialData?.id || `REG-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            montantTotal: parseFloat(formData.montantTotal) || 0  // ← CHANGÉ
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
                                Commande <span className="text-red-500">*</span>
                            </label>
                                <select
                                    value={formData.commandeId}
                                    onChange={(e) => handleCommandeChange(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">-- Sélectionner une commande --</option>
                                    {commandes && Array.isArray(commandes) && commandes
                                        .filter(c => c.statut !== 'Annulée')
                                        .map(commande => {
                                            const regiesCount = regies.filter(r => r.commandeId === commande.id).length;
                                            return (
                                                <option key={commande.id} value={commande.id}>
                                                    {commande.numero} - {commande.fournisseur} 
                                                    {regiesCount > 0 ? ` (${regiesCount} régie${regiesCount > 1 ? 's' : ''})` : ''}
                                                </option>
                                            );
                                        })
                                    }
                                </select>
                            {formData.commandeId && formData.numeroIncrement && (
                                <p className="text-xs text-blue-600 mt-1">
                                    📋 Cette régie sera le n° <strong>REG-{formData.numeroIncrement}</strong> pour cette commande
                                </p>
                            )}
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
                            disabled={formData.commandeId}
                        />
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

                    {/* Smart Selector */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-3">📦 Classification</h3>
                        <window.SmartSelector
                            estimations={estimations || []}
                            selectedLots={formData?.lots || []}
                            selectedPos0={formData?.positions0 || []}
                            selectedPos1={formData?.positions1 || []}
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

                    {/* montantTotal */}
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <label className="block text-sm font-medium mb-1">
                            Montant (CHF) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.montantTotal}
                            onChange={(e) => setFormData({...formData, montantTotal: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-lg font-semibold"
                            placeholder="0.00"
                        />
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

                    {/* Résumé */}
                    {formData.commandeId && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2">✅ Résumé</h4>
                            <div className="text-sm space-y-1">
                                <p><strong>Commande :</strong> {commandes.find(c => c.id === formData.commandeId)?.numero}</p>
                                <p><strong>Fournisseur :</strong> {formData.fournisseur}</p>
                                <p><strong>Régie n° :</strong> REG-{formData.numeroIncrement}</p>
                                {formData.montantTotal && (
                                    <p className="text-lg font-bold text-green-700 mt-2">
                                        Montant : {parseFloat(formData.montantTotal).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 🆕 Alerte budget régie */}
                    {formData.commandeId && (() => {
                        const commande = commandes.find(c => c.id === formData.commandeId);
                        if (!commande || !commande.budgetRegie) return null;
                        
                        const regiesExistantes = regies.filter(r => r.commandeId === formData.commandeId);
                        const regieConsommee = regiesExistantes.reduce((sum, r) => sum + (r.montantTotal || 0), 0);
                        const montantActuel = parseFloat(formData.montantTotal) || 0;
                        const totalAvecNouvelle = regieConsommee + montantActuel;
                        const budgetRegie = commande.budgetRegie;
                        const resteRegie = budgetRegie - totalAvecNouvelle;
                        const pourcentage = ((totalAvecNouvelle / budgetRegie) * 100).toFixed(0);
                        
                        return (
                            <div className={`p-4 border-2 rounded-lg ${
                                resteRegie < 0 ? 'bg-red-50 border-red-300' : 
                                pourcentage > 80 ? 'bg-orange-50 border-orange-300' : 
                                'bg-blue-50 border-blue-300'
                            }`}>
                                <h4 className={`font-semibold mb-2 ${
                                    resteRegie < 0 ? 'text-red-800' : 
                                    pourcentage > 80 ? 'text-orange-800' : 
                                    'text-blue-800'
                                }`}>
                                    {resteRegie < 0 ? '⚠️ Dépassement du budget régie !' : 
                                     pourcentage > 80 ? '⚠️ Budget régie bientôt épuisé' : 
                                     'ℹ️ Budget régie'}
                                </h4>
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span>Budget régie alloué :</span>
                                        <span className="font-semibold">{budgetRegie.toLocaleString('fr-CH')} CHF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Déjà consommé :</span>
                                        <span className="font-semibold">{regieConsommee.toLocaleString('fr-CH')} CHF</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Cette régie :</span>
                                        <span className="font-semibold">+{montantActuel.toLocaleString('fr-CH')} CHF</span>
                                    </div>
                                    <div className="border-t pt-1 mt-1"></div>
                                    <div className="flex justify-between font-bold">
                                        <span>Total après création :</span>
                                        <span>{totalAvecNouvelle.toLocaleString('fr-CH')} CHF</span>
                                    </div>
                                    <div className={`flex justify-between font-bold text-lg ${
                                        resteRegie < 0 ? 'text-red-700' : 'text-green-700'
                                    }`}>
                                        <span>Reste disponible :</span>
                                        <span>{resteRegie.toLocaleString('fr-CH')} CHF</span>
                                    </div>
                                    
                                    {/* Barre de progression */}
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div 
                                                className={`h-3 rounded-full ${
                                                    resteRegie < 0 ? 'bg-red-600' : 
                                                    pourcentage > 80 ? 'bg-orange-500' : 
                                                    'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(pourcentage, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-center mt-1">{pourcentage}% du budget régie</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
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
