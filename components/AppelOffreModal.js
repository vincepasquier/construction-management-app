// Modal de gestion des appels d'offres
const { useState, useEffect, useMemo } = React;

window.AppelOffreModal = ({ initialData, onClose, onSave, estimations = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        designation: '',
        dateCreation: new Date().toISOString().split('T')[0],
        dateLimite: '',
        lots: [],
        positions0: [],
        positions1: [],
        etape: '',
        budget: '',
        description: '',
        statut: 'En consultation',
        fournisseursInvites: []
    });

    const [budgetManuel, setBudgetManuel] = useState(false);

    // Calculer le budget automatiquement depuis les estimations
    const budgetCalcule = useMemo(() => {
        if (budgetManuel) return null;

        let total = 0;

        estimations.forEach(est => {
            // Vérifier si cette estimation correspond à la sélection
            const matchLots = formData.lots.length === 0 || 
                              (est.lots && est.lots.some(lot => formData.lots.includes(lot)));
            
            const matchPos0 = formData.positions0.length === 0 || 
                             (est.positions0 && est.positions0.some(pos => formData.positions0.includes(pos)));
            
            const matchPos1 = formData.positions1.length === 0 || 
                             (est.positions1 && est.positions1.some(pos => formData.positions1.includes(pos)));
            
            const matchEtape = !formData.etape || est.etape === formData.etape;

            // Si tous les critères correspondent, ajouter le montant
            if (matchLots && matchPos0 && matchPos1 && matchEtape) {
                total += est.montant || 0;
            }
        });

        return total;
    }, [formData.lots, formData.positions0, formData.positions1, formData.etape, estimations, budgetManuel]);

    // Mettre à jour le budget automatiquement
    useEffect(() => {
        if (!budgetManuel && budgetCalcule !== null) {
            setFormData(prev => ({
                ...prev,
                budget: budgetCalcule.toString()
            }));
        }
    }, [budgetCalcule, budgetManuel]);

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
        if (!formData.numero || !formData.designation) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Désignation)');
            return;
        }

        const appelOffre = {
            ...formData,
            id: initialData?.id || `AO-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString(),
            budget: parseFloat(formData.budget) || 0
        };

        onSave(appelOffre);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier l\'appel d\'offres' : 'Nouvel appel d\'offres'}
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
                                N° Appel d'Offres <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="AO-2025-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Désignation <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.designation}
                                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Description courte de l'AO"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date de création</label>
                            <input
                                type="date"
                                value={formData.dateCreation}
                                onChange={(e) => setFormData({...formData, dateCreation: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date limite de réponse</label>
                            <input
                                type="date"
                                value={formData.dateLimite}
                                onChange={(e) => setFormData({...formData, dateLimite: e.target.value})}
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
                        <label className="block text-sm font-medium mb-1">
                            Étape
                            <span className="text-xs text-gray-500 ml-2">(influence le calcul du budget)</span>
                        </label>
                        <select
                            value={formData.etape}
                            onChange={(e) => setFormData({...formData, etape: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- Toutes les étapes --</option>
                            <option value="1">Étape 1</option>
                            <option value="2">Étape 2</option>
                        </select>
                    </div>

                    {/* Budget calculé automatiquement */}
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-blue-900">💰 Budget Estimé</h3>
                                <button
                                    onClick={() => setBudgetManuel(!budgetManuel)}
                                    className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                                    title={budgetManuel ? "Revenir au calcul automatique" : "Saisir manuellement"}
                                >
                                    {budgetManuel ? '🔄 Auto' : '✏️ Manuel'}
                                </button>
                            </div>
                            {!budgetManuel && (
                                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                    Calculé automatiquement
                                </span>
                            )}
                        </div>

                        {budgetManuel ? (
                            <div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg text-lg font-semibold"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    Mode manuel activé - Le budget ne sera pas recalculé automatiquement
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {budgetCalcule !== null ? 
                                        budgetCalcule.toLocaleString('fr-CH', {minimumFractionDigits: 2}) : 
                                        '0.00'
                                    } CHF
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    {formData.lots.length === 0 && formData.positions0.length === 0 && formData.positions1.length === 0 ? (
                                        '💡 Sélectionnez des lots/positions pour calculer le budget'
                                    ) : (
                                        `Basé sur ${estimations.filter(est => {
                                            const matchLots = formData.lots.length === 0 || 
                                                            (est.lots && est.lots.some(lot => formData.lots.includes(lot)));
                                            const matchPos0 = formData.positions0.length === 0 || 
                                                            (est.positions0 && est.positions0.some(pos => formData.positions0.includes(pos)));
                                            const matchPos1 = formData.positions1.length === 0 || 
                                                            (est.positions1 && est.positions1.some(pos => formData.positions1.includes(pos)));
                                            const matchEtape = !formData.etape || est.etape === formData.etape;
                                            return matchLots && matchPos0 && matchPos1 && matchEtape;
                                        }).length} estimation(s) correspondante(s)`
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Statut */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Statut</label>
                        <select
                            value={formData.statut}
                            onChange={(e) => setFormData({...formData, statut: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="En consultation">En consultation</option>
                            <option value="Attribué">Attribué</option>
                            <option value="Annulé">Annulé</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Cahier des charges</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="4"
                            placeholder="Description détaillée de l'appel d'offres, exigences, conditions..."
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
