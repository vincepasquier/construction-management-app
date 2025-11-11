// Composant de sélection intelligente en cascade pour Lots/Positions
const { useState, useEffect, useMemo } = React;

window.SmartSelector = ({ estimations, selectedLots, selectedPos0, selectedPos1, onChange }) => {
    // Construire la hiérarchie des données disponibles
    const hierarchy = useMemo(() => {
        const result = {};
        
        estimations.forEach(est => {
            (est.lots || []).forEach(lot => {
                if (!result[lot]) {
                    result[lot] = { positions0: {} };
                }
                
                (est.positions0 || []).forEach(pos0 => {
                    if (!result[lot].positions0[pos0]) {
                        result[lot].positions0[pos0] = { positions1: new Set() };
                    }
                    
                    (est.positions1 || []).forEach(pos1 => {
                        result[lot].positions0[pos0].positions1.add(pos1);
                    });
                });
            });
        });
        
        // Convertir les Sets en Arrays et trier
        Object.keys(result).forEach(lot => {
            Object.keys(result[lot].positions0).forEach(pos0 => {
                result[lot].positions0[pos0].positions1 = 
                    [...result[lot].positions0[pos0].positions1].sort();
            });
        });
        
        return result;
    }, [estimations]);

    const allLots = Object.keys(hierarchy).sort();

    // Filtrer les positions 0 disponibles selon les lots sélectionnés
    const availablePos0 = useMemo(() => {
        if (selectedLots.length === 0) {
            // Si aucun lot sélectionné, montrer toutes les positions 0
            const allPos0 = new Set();
            Object.values(hierarchy).forEach(lot => {
                Object.keys(lot.positions0).forEach(pos0 => allPos0.add(pos0));
            });
            return [...allPos0].sort();
        }
        
        // Sinon, montrer uniquement les positions 0 des lots sélectionnés
        const pos0Set = new Set();
        selectedLots.forEach(lot => {
            if (hierarchy[lot]) {
                Object.keys(hierarchy[lot].positions0).forEach(pos0 => pos0Set.add(pos0));
            }
        });
        return [...pos0Set].sort();
    }, [selectedLots, hierarchy]);

    // Filtrer les positions 1 disponibles selon les positions 0 sélectionnées
    const availablePos1 = useMemo(() => {
        if (selectedPos0.length === 0) {
            if (selectedLots.length === 0) {
                // Aucune sélection : montrer toutes les positions 1
                const allPos1 = new Set();
                Object.values(hierarchy).forEach(lot => {
                    Object.values(lot.positions0).forEach(pos0Data => {
                        pos0Data.positions1.forEach(pos1 => allPos1.add(pos1));
                    });
                });
                return [...allPos1].sort();
            } else {
                // Lots sélectionnés mais pas de pos0 : montrer toutes les pos1 des lots
                const pos1Set = new Set();
                selectedLots.forEach(lot => {
                    if (hierarchy[lot]) {
                        Object.values(hierarchy[lot].positions0).forEach(pos0Data => {
                            pos0Data.positions1.forEach(pos1 => pos1Set.add(pos1));
                        });
                    }
                });
                return [...pos1Set].sort();
            }
        }
        
        // Sinon, montrer uniquement les positions 1 des positions 0 sélectionnées
        const pos1Set = new Set();
        
        if (selectedLots.length === 0) {
            // Chercher dans tous les lots
            Object.values(hierarchy).forEach(lot => {
                selectedPos0.forEach(pos0 => {
                    if (lot.positions0[pos0]) {
                        lot.positions0[pos0].positions1.forEach(pos1 => pos1Set.add(pos1));
                    }
                });
            });
        } else {
            // Chercher uniquement dans les lots sélectionnés
            selectedLots.forEach(lot => {
                if (hierarchy[lot]) {
                    selectedPos0.forEach(pos0 => {
                        if (hierarchy[lot].positions0[pos0]) {
                            hierarchy[lot].positions0[pos0].positions1.forEach(pos1 => pos1Set.add(pos1));
                        }
                    });
                }
            });
        }
        
        return [...pos1Set].sort();
    }, [selectedLots, selectedPos0, hierarchy]);

    // Nettoyer les sélections invalides quand la hiérarchie change
    useEffect(() => {
        // Nettoyer les pos0 qui ne sont plus disponibles
        const validPos0 = selectedPos0.filter(pos0 => availablePos0.includes(pos0));
        if (validPos0.length !== selectedPos0.length) {
            onChange({ 
                lots: selectedLots, 
                positions0: validPos0, 
                positions1: selectedPos1.filter(pos1 => availablePos1.includes(pos1))
            });
        }
        
        // Nettoyer les pos1 qui ne sont plus disponibles
        const validPos1 = selectedPos1.filter(pos1 => availablePos1.includes(pos1));
        if (validPos1.length !== selectedPos1.length) {
            onChange({ 
                lots: selectedLots, 
                positions0: selectedPos0, 
                positions1: validPos1
            });
        }
    }, [availablePos0, availablePos1]);

    const handleLotChange = (e) => {
        const newLots = Array.from(e.target.selectedOptions, option => option.value);
        onChange({ lots: newLots, positions0: selectedPos0, positions1: selectedPos1 });
    };

    const handlePos0Change = (e) => {
        const newPos0 = Array.from(e.target.selectedOptions, option => option.value);
        onChange({ lots: selectedLots, positions0: newPos0, positions1: selectedPos1 });
    };

    const handlePos1Change = (e) => {
        const newPos1 = Array.from(e.target.selectedOptions, option => option.value);
        onChange({ lots: selectedLots, positions0: selectedPos0, positions1: newPos1 });
    };

    const resetSelection = () => {
        onChange({ lots: [], positions0: [], positions1: [] });
    };

    return (
        <div className="space-y-4">
            {/* Indicateur de filtrage actif */}
            {(selectedLots.length > 0 || selectedPos0.length > 0) && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-800">
                            🔍 Filtrage actif
                        </span>
                        {selectedLots.length > 0 && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                {selectedLots.length} lot(s)
                            </span>
                        )}
                        {selectedPos0.length > 0 && (
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                {selectedPos0.length} pos. 0
                            </span>
                        )}
                    </div>
                    <button
                        onClick={resetSelection}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        ✖ Tout effacer
                    </button>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                {/* Lots */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Lots ({allLots.length})
                    </label>
                    <select
                        multiple
                        value={selectedLots}
                        onChange={handleLotChange}
                        className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                    >
                        {allLots.map(lot => (
                            <option key={lot} value={lot}>{lot}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Ctrl+clic pour multi-sélection
                    </p>
                </div>

                {/* Positions 0 */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Positions Niv. 0 ({availablePos0.length})
                        {selectedLots.length > 0 && (
                            <span className="ml-1 text-blue-600">filtrées</span>
                        )}
                    </label>
                    <select
                        multiple
                        value={selectedPos0}
                        onChange={handlePos0Change}
                        className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                        disabled={availablePos0.length === 0}
                    >
                        {availablePos0.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                        ))}
                    </select>
                    {availablePos0.length === 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                            Sélectionnez un lot d'abord
                        </p>
                    )}
                </div>

                {/* Positions 1 */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Positions Niv. 1 ({availablePos1.length})
                        {selectedPos0.length > 0 && (
                            <span className="ml-1 text-green-600">filtrées</span>
                        )}
                    </label>
                    <select
                        multiple
                        value={selectedPos1}
                        onChange={handlePos1Change}
                        className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                        disabled={availablePos1.length === 0}
                    >
                        {availablePos1.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                        ))}
                    </select>
                    {availablePos1.length === 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                            Sélectionnez une position 0 d'abord
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
