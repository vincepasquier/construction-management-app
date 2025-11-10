// Modal de gestion des appels d'offres
const { useState } = React;

window.AppelOffreModal = ({ initialData, onClose, onSave, estimations = [] }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '',
        designation: '',
        dateCreation: new Date().toISOString().split('T')[0],
        dateLimite: '',
        lots: [],
        positions0: [],
        positions1: [],
        description: '',
        statut: 'En consultation', // En consultation, Attribué, Annulé
        criteres: {
            prix: true,
            delai: false,
            qualite: false
        }
    });

    const allLots = [...new Set(estimations.flatMap(e => e.lots || []))].sort();
    const allPos0 = [...new Set(estimations.flatMap(e => e.positions0 || []))].sort();
    const allPos1 = [...new Set(estimations.flatMap(e => e.positions1 || []))].sort();

    const handleSubmit = () => {
        if (!formData.numero || !formData.designation) {
            alert('⚠️ Veuillez remplir tous les champs obligatoires (N°, Désignation)');
            return;
        }

        if (formData.lots.length === 0) {
            alert('⚠️ Veuillez sélectionner au moins un lot');
            return;
        }

        const appelOffre = {
            ...formData,
            id: initialData?.id || `AO-${Date.now()}`,
            dateCreation: initialData?.dateCreation || new Date().toISOString()
        };

        onSave(appelOffre);
        onClose();
    };

    const handleMultiSelect = (field, value) => {
        const current = formData[field] || [];
        const updated = current.includes(value) 
            ? current.filter(v => v !== value)
            : [...current, value];
        setFormData({...formData, [field]: updated});
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {initialData ? 'Modifier l\'appel d\'offres' : 'Nouvel appel d\'offres'}
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
                                N° Appel d'Offres <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Ex: AO-2025-001"
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
                                placeholder="Ex: Menuiserie extérieure"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date création</label>
                            <input
                                type="date"
                                value={formData.dateCreation}
                                onChange={(e) => setFormData({...formData, dateCreation: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Date limite réponse</label>
                            <input
                                type="date"
                                value={formData.dateLimite}
                                onChange={(e) => setFormData({...formData, dateLimite: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Lots et Positions */}
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Périmètre de l'appel d'offres</h3>
                        
                        <div className="grid grid-cols-3 gap-4">
                            {/* Lots */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Lots <span className="text-red-500">*</span>
                                </label>
                                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                    {allLots.map(lot => (
                                        <label key={lot} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.lots.includes(lot)}
                                                onChange={() => handleMultiSelect('lots', lot)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{lot}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.lots.length} sélectionné(s)
                                </p>
                            </div>

                            {/* Positions 0 */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Position niveau 0</label>
                                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                    {allPos0.map(pos => (
                                        <label key={pos} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.positions0.includes(pos)}
                                                onChange={() => handleMultiSelect('positions0', pos)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{pos}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.positions0.length} sélectionné(s)
                                </p>
                            </div>

                            {/* Positions 1 */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Position niveau 1</label>
                                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                    {allPos1.map(pos => (
                                        <label key={pos} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.positions1.includes(pos)}
                                                onChange={() => handleMultiSelect('positions1', pos)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{pos}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.positions1.length} sélectionné(s)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Critères de sélection */}
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Critères de sélection</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.criteres.prix}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        criteres: {...formData.criteres, prix: e.target.checked}
                                    })}
                                    className="rounded"
                                />
                                <span className="text-sm">Prix (sélection automatique de l'offre la moins chère)</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.criteres.delai}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        criteres: {...formData.criteres, delai: e.target.checked}
                                    })}
                                    className="rounded"
                                />
                                <span className="text-sm">Délai de réalisation</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.criteres.qualite}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        criteres: {...formData.criteres, qualite: e.target.checked}
                                    })}
                                    className="rounded"
                                />
                                <span className="text-sm">Qualité / Références</span>
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description / Cahier des charges</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="4"
                            placeholder="Décrivez les travaux attendus..."
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
                            <option value="En consultation">En consultation</option>
                            <option value="Attribué">Attribué</option>
                            <option value="Annulé">Annulé</option>
                        </select>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {initialData ? 'Modifier' : 'Créer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
