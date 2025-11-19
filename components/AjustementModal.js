// Modal de création/modification d'ajustements budgétaires
const { useState, useEffect, useMemo } = React;

window.AjustementModal = ({ initialData, onClose, onSave, estimations = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        id: null,
        type: 'aleas',
        description: '',
        montant: 0,
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        statut: 'previsionnel',
        commentaire: '',
        dateCreation: new Date().toISOString().split('T')[0]
    });

    // Extraire les listes uniques depuis les estimations
    const availableLots = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.lots || []))].sort();
    }, [estimations]);

    const availablePos0 = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.positions0 || []))].sort();
    }, [estimations]);

    const availablePos1 = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.positions1 || []))].sort();
    }, [estimations]);

    // Calculer le montant suggéré basé sur la sélection
    const montantSuggere = useMemo(() => {
        if (formData.lots.length === 0 && formData.positions0.length === 0 && formData.positions1.length === 0) {
            return null;
        }

        let total = 0;
        estimations.forEach(est => {
            const matchLots = formData.lots.length === 0 || 
                              (est.lots && est.lots.some(lot => formData.lots.includes(lot)));
            const matchPos0 = formData.positions0.length === 0 || 
                             (est.positions0 && est.positions0.some(pos => formData.positions0.includes(pos)));
            const matchPos1 = formData.positions1.length === 0 || 
                             (est.positions1 && est.positions1.some(pos => formData.positions1.includes(pos)));
            const matchEtape = !formData.etape || est.etape === formData.etape;

            if (matchLots && matchPos0 && matchPos1 && matchEtape) {
                total += est.montant || 0;
            }
        });

        return total;
    }, [formData.lots, formData.positions0, formData.positions1, formData.etape, estimations]);

    // Handler pour SmartSelector
    const handleSelectionChange = ({ lots, positions0, positions1 }) => {
        setFormData({
            ...formData,
            lots,
            positions0,
            positions1
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.description || formData.montant === 0) {
            alert('⚠️ Veuillez renseigner une description et un montant');
            return;
        }

        const ajustement = {
            ...formData,
            id: formData.id || `ADJ-${Date.now()}`,
            montant: parseFloat(formData.montant),
            dateCreation: formData.dateCreation || new Date().toISOString().split('T')[0]
        };

        onSave(ajustement);
    };

    const appliquerMontantSuggere = (pourcentage) => {
        if (montantSuggere !== null) {
            const montant = (montantSuggere * pourcentage) / 100;
            setFormData({ ...formData, montant: montant.toFixed(2) });
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    {/* En-tête */}
                    <div className="flex justify-between items-center p-6 border-b">
                        <h2 className="text-2xl font-bold">
                            {initialData ? '✏️ Modifier l\'ajustement' : '➕ Nouvel ajustement budgétaire'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <window.Icons.X size={24} />
                        </button>
                    </div>

                    {/* Corps */}
                    <div className="p-6 space-y-6">
                        
                        {/* Ligne 1: Type et Description */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Type d'ajustement <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="aleas">⚡ Aléas / Dépassement</option>
                                    <option value="economies">💰 Économies</option>
                                    <option value="provision">📝 Provision / Prévision</option>
                                    <option value="modification">🔄 Modification projet</option>
                                    <option value="supplement">➕ Supplément client</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Statut
                                </label>
                                <select
                                    value={formData.statut}
                                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="previsionnel">⏳ Prévisionnel</option>
                                    <option value="confirme">✅ Confirmé</option>
                                    <option value="facture">💰 Facturé</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Ex: Surcoût terrassement, Économie matériaux, Modification façade..."
                                required
                            />
                        </div>

                        {/* Smart Selector */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium">📦 Périmètre de l'ajustement</h3>
                                {montantSuggere !== null && (
                                    <span className="text-xs text-gray-600">
                                        Budget concerné: {montantSuggere.toLocaleString('fr-CH')} CHF
                                    </span>
                                )}
                            </div>
                            <window.SmartSelector
                                estimations={estimations}
                                selectedLots={formData.lots}
                                selectedPos0={formData.positions0}
                                selectedPos1={formData.positions1}
                                onChange={handleSelectionChange}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                💡 Laisser vide pour appliquer à l'ensemble du projet
                            </p>
                        </div>

                        {/* Étape */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Étape concernée
                            </label>
                            <select
                                value={formData.etape}
                                onChange={(e) => setFormData({ ...formData, etape: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">-- Toutes les étapes --</option>
                                <option value="1">Étape 1</option>
                                <option value="2">Étape 2</option>
                            </select>
                        </div>

                        {/* Montant avec suggestions */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium">
                                Montant (CHF) <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-500 ml-2">
                                    (Positif = augmentation, Négatif = économie)
                                </span>
                            </label>
                            
                            <input
                                type="number"
                                step="0.01"
                                value={formData.montant}
                                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-lg font-semibold"
                                placeholder="Ex: 50000 ou -20000"
                                required
                            />

                            {/* Suggestions de pourcentages */}
                            {montantSuggere !== null && montantSuggere > 0 && (
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs font-medium text-blue-900 mb-2">
                                        💡 Suggestions basées sur le budget sélectionné:
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {[5, 10, 15, 20].map(pct => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => appliquerMontantSuggere(pct)}
                                                className="px-3 py-1 text-xs bg-white border border-blue-300 rounded hover:bg-blue-100"
                                            >
                                                +{pct}% ({(montantSuggere * pct / 100).toLocaleString('fr-CH')} CHF)
                                            </button>
                                        ))}
                                        {[-5, -10, -15].map(pct => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => appliquerMontantSuggere(pct)}
                                                className="px-3 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-100"
                                            >
                                                {pct}% ({(montantSuggere * pct / 100).toLocaleString('fr-CH')} CHF)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Commentaire */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Commentaire / Justification
                            </label>
                            <textarea
                                value={formData.commentaire}
                                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
                                placeholder="Notes complémentaires, justification de l'ajustement..."
                            />
                        </div>

                        {/* Aperçu de l'impact */}
                        <div className={
                            'p-4 rounded-lg border-2 ' + (
                                parseFloat(formData.montant) > 0 
                                    ? 'bg-red-50 border-red-200' 
                                    : parseFloat(formData.montant) < 0 
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                            )
                        }>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">📊 Impact budgétaire:</span>
                                <span className={
                                    'text-2xl font-bold ' + (
                                        parseFloat(formData.montant) > 0 
                                            ? 'text-red-600' 
                                            : parseFloat(formData.montant) < 0 
                                                ? 'text-green-600'
                                                : 'text-gray-600'
                                    )
                                }>
                                    {parseFloat(formData.montant) > 0 ? '+' : ''}
                                    {(parseFloat(formData.montant) || 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                </span>
                            </div>
                            <div className="text-sm">
                                {parseFloat(formData.montant) > 0 
                                    ? '⚠️ Augmentation du coût du projet'
                                    : parseFloat(formData.montant) < 0 
                                        ? '✅ Réduction du coût du projet'
                                        : 'ℹ️ Aucun impact'
                                }
                                {montantSuggere !== null && montantSuggere > 0 && parseFloat(formData.montant) !== 0 && (
                                    <span className="ml-2 text-xs">
                                        ({Math.abs((parseFloat(formData.montant) / montantSuggere) * 100).toFixed(1)}% du budget sélectionné)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pied de page */}
                    <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            {initialData ? 'Modifier' : 'Créer l\'ajustement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
