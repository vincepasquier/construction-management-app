// Composant RegieModal - Gestion des rÃ©gies
const { useState } = React;

window.RegieModal = ({ initialData, onClose, onSave, estimations, commandes }) => {
    const [formData, setFormData] = useState(initialData || {
        numero: '', 
        date: '', 
        commandeId: '', 
        lots: [], 
        positions0: [], 
        positions1: [], 
        heures: '', 
        tauxHoraire: '', 
        materiel: '', 
        description: '', 
        statut: 'En cours'
    });

    const lotsUniques = [...new Set(estimations.map(e => e.lot))].filter(Boolean);
    
    const getPositions0ForLot = (lot) => {
        return [...new Set(estimations.filter(e => e.lot === lot).map(e => e.position0))].filter(Boolean);
    };
    
    const getPositions1For = (lot, pos0) => {
        return [...new Set(estimations.filter(e => e.lot === lot && e.position0 === pos0).map(e => e.position1))].filter(Boolean);
    };
    
    const toggleLot = (lot) => {
        if (formData.lots.includes(lot)) {
            setFormData({
                ...formData,
                lots: formData.lots.filter(l => l !== lot),
                positions0: formData.positions0.filter(p => !p.startsWith(lot + '|')),
                positions1: formData.positions1.filter(p => !p.startsWith(lot + '|'))
            });
        } else {
            setFormData({...formData, lots: [...formData.lots, lot]});
        }
    };
    
    const togglePosition0 = (lot, pos0) => {
        const key = `${lot}|${pos0}`;
        if (formData.positions0.includes(key)) {
            setFormData({
                ...formData,
                positions0: formData.positions0.filter(p => p !== key),
                positions1: formData.positions1.filter(p => !p.startsWith(key + '|'))
            });
        } else {
            setFormData({...formData, positions0: [...formData.positions0, key]});
        }
    };
    
    const togglePosition1 = (lot, pos0, pos1) => {
        const key = `${lot}|${pos0}|${pos1}`;
        if (formData.positions1.includes(key)) {
            setFormData({...formData, positions1: formData.positions1.filter(p => p !== key)});
        } else {
            setFormData({...formData, positions1: [...formData.positions1, key]});
        }
    };
    
    const montantTotal = (parseFloat(formData.heures || 0) * parseFloat(formData.tauxHoraire || 0)) + parseFloat(formData.materiel || 0);

    const handleCommandeSelection = (commandeId) => {
        if (commandeId) {
            const cmd = commandes.find(c => c.id === commandeId);
            if (cmd) setFormData({...formData, commandeId, lots: cmd.lots || []});
        } else {
            setFormData({...formData, commandeId: ''});
        }
    };

    const handleSubmit = () => {
        if (!formData.numero || !formData.date || !formData.heures || !formData.tauxHoraire) {
            alert('Champs obligatoires manquants');
            return;
        }

        const regie = { 
            ...formData, 
            heures: parseFloat(formData.heures), 
            tauxHoraire: parseFloat(formData.tauxHoraire), 
            materiel: parseFloat(formData.materiel || 0), 
            montantTotal, 
            id: initialData?.id || `REG-${Date.now()}`, 
            dateCreation: initialData?.dateCreation || new Date().toISOString() 
        };
        
        onSave(regie);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
                <div className="flex justify-between mb-6">
                    <h2 className="text-2xl font-bold">{initialData ? 'Modifier' : 'Nouvelle'} rÃ©gie</h2>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">NÂ° RÃ©gie *</label>
                            <input 
                                type="text" 
                                value={formData.numero} 
                                onChange={(e) => setFormData({...formData, numero: e.target.value})} 
                                className="w-full border rounded-lg px-3 py-2" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Date *</label>
                            <input 
                                type="date" 
                                value={formData.date} 
                                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                                className="w-full border rounded-lg px-3 py-2" 
                            />
                        </div>
                    </div>
                    
                    <div className="border-t pt-4">
                        <label className="block text-sm mb-1">Lier Ã  une commande (optionnel)</label>
                        <select 
                            value={formData.commandeId} 
                            onChange={(e) => handleCommandeSelection(e.target.value)} 
                            className="w-full border rounded-lg px-3 py-2 bg-blue-50"
                        >
                            <option value="">Aucune commande</option>
                            {commandes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.numero} - {c.fournisseur || 'N/A'} - {c.montant.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold mb-2">Lots, Positions 0 et Positions 1</label>
                        <div className="border rounded-lg p-3 max-h-80 overflow-y-auto bg-gray-50">
                            {lotsUniques.map(lot => {
                                const positions0 = getPositions0ForLot(lot);
                                const lotSelected = formData.lots.includes(lot);
                                
                                return (
                                    <div key={lot} className="mb-3 bg-white rounded p-2 border">
                                        <label className="flex items-center gap-2 py-1 cursor-pointer font-semibold">
                                            <input 
                                                type="checkbox" 
                                                checked={lotSelected} 
                                                onChange={() => toggleLot(lot)} 
                                                className="w-4 h-4" 
                                            />
                                            <span className="text-sm">ðŸ“¦ {lot}</span>
                                        </label>
                                        
                                        {lotSelected && positions0.length > 0 && (
                                            <div className="ml-6 mt-2 space-y-2">
                                                {positions0.map(pos0 => {
                                                    const pos0Key = `${lot}|${pos0}`;
                                                    const pos0Selected = formData.positions0 && formData.positions0.includes(pos0Key);
                                                    const positions1 = getPositions1For(lot, pos0);
                                                    
                                                    return (
                                                        <div key={pos0Key} className="bg-blue-50 rounded p-2">
                                                            <label className="flex items-center gap-2 py-1 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={pos0Selected} 
                                                                    onChange={() => togglePosition0(lot, pos0)} 
                                                                    className="w-4 h-4" 
                                                                />
                                                                <span className="text-xs font-medium">ðŸ“‹ Position 0: {pos0}</span>
                                                            </label>
                                                            
                                                            {pos0Selected && positions1.length > 0 && (
                                                                <div className="ml-6 mt-1 space-y-1">
                                                                    {positions1.map(pos1 => {
                                                                        const pos1Key = `${lot}|${pos0}|${pos1}`;
                                                                        const pos1Selected = formData.positions1 && formData.positions1.includes(pos1Key);
                                                                        
                                                                        return (
                                                                            <label key={pos1Key} className="flex items-center gap-2 py-0.5 cursor-pointer">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={pos1Selected} 
                                                                                    onChange={() => togglePosition1(lot, pos0, pos1)} 
                                                                                    className="w-3 h-3" 
                                                                                />
                                                                                <span className="text-xs">ðŸ“„ Position 1: {pos1}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Heures *</label>
                            <input 
                                type="number" 
                                step="0.5" 
                                value={formData.heures} 
                                onChange={(e) => setFormData({...formData, heures: e.target.value})} 
                                className="w-full border rounded-lg px-3 py-2" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Taux horaire (CHF) *</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={formData.tauxHoraire} 
                                onChange={(e) => setFormData({...formData, tauxHoraire: e.target.value})} 
                                className="w-full border rounded-lg px-3 py-2" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">MatÃ©riel (CHF)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={formData.materiel} 
                                onChange={(e) => setFormData({...formData, materiel: e.target.value})} 
                                className="w-full border rounded-lg px-3 py-2" 
                            />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-semibold">
                            Montant total: {montantTotal.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                    
                    <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                            className="w-full border rounded-lg px-3 py-2" 
                            rows="3" 
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm mb-1">Statut</label>
                        <select 
                            value={formData.statut} 
                            onChange={(e) => setFormData({...formData, statut: e.target.value})} 
                            className="w-full border rounded-lg px-3 py-2"
                        >
                            <option value="En cours">En cours</option>
                            <option value="ValidÃ©e">ValidÃ©e</option>
                            <option value="FacturÃ©e">FacturÃ©e</option>
                        </select>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-2 border rounded-lg"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                        >
                            <Save />Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
