// Modal pour créer un ajustement/prévision
const { useState } = React;

window.AjustementModal = ({ onClose, onSave, availableLots = [], availablePos0 = [] }) => {
    const [formData, setFormData] = useState({
        type: 'aleas',
        description: '',
        montant: '',
        lots: [],
        positions0: [],
        statut: 'previsionnel',
        commentaire: ''
    });

    const handleSubmit = () => {
        if (!formData.description || !formData.montant) {
            alert('⚠️ Veuillez renseigner la description et le montant');
            return;
        }

        const ajustement = {
            id: `adj_${Date.now()}`,
            ...formData,
            montant: parseFloat(formData.montant) || 0,
            dateCreation: new Date().toISOString()
        };

        onSave(ajustement);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📊 Nouvel Ajustement</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Type d'ajustement *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="aleas">⚡ Aléas / Imprévus</option>
                            <option value="economies">💰 Économies prévues</option>
                            <option value="autre">📝 Autre</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Ex: Provision pour aléas météo"
                        />
                    </div>

                    {/* Montant */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Montant (CHF) * 
                            <span className="text-xs text-gray-500 ml-2">
                                (Positif = augmentation, Négatif = économie)
                            </span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.montant}
                            onChange={(e) => setFormData({...formData, montant: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Ex: 50000"
                        />
                    </div>

                    {/* Lots */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Lots concernés (optionnel)
                        </label>
                        <select
                            multiple
                            value={formData.lots}
                            onChange={(e) => setFormData({...formData, lots: Array.from(e.target.selectedOptions, o => o.value)})}
                            className="w-full px-3 py-2 border rounded-lg h-24"
                        >
                            {availableLots.map(lot => (
                                <option key={lot} value={lot}>{lot}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Laisser vide pour impacter tous les lots. Ctrl+clic pour multi-sélection.
                        </p>
                    </div>

                    {/* Positions 0 */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Positions Niv. 0 (optionnel)
                        </label>
                        <select
                            multiple
                            value={formData.positions0}
                            onChange={(e) => setFormData({...formData, positions0: Array.from(e.target.selectedOptions, o => o.value)})}
                            className="w-full px-3 py-2 border rounded-lg h-24"
                        >
                            {availablePos0.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    {/* Statut */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Statut</label>
                        <select
                            value={formData.statut}
                            onChange={(e) => setFormData({...formData, statut: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="previsionnel">⏳ Prévisionnel</option>
                            <option value="confirme">✅ Confirmé</option>
                        </select>
                    </div>

                    {/* Commentaire */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Commentaire</label>
                        <textarea
                            value={formData.commentaire}
                            onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="3"
                            placeholder="Notes complémentaires..."
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
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Créer l'ajustement
                    </button>
                </div>
            </div>
        </div>
    );
};
