// EstimationBuilder.js - Constructeur d'estimations hiérarchiques
const { useState } = React;

window.EstimationBuilder = ({ initialData, onClose, onSave }) => {
    const [estimation, setEstimation] = useState(initialData || {
        id: `EST-${Date.now()}`,
        designation: '',
        dateCreation: new Date().toISOString(),
        lots: []
    });

    const [expandedLots, setExpandedLots] = useState({});
    const [expandedPos0, setExpandedPos0] = useState({});
    const [expandedPos1, setExpandedPos1] = useState({});

    // ==========================================
    // CALCULS AUTOMATIQUES
    // ==========================================
    
    const calculerTotalLigne = (lignes) => {
        return lignes.reduce((sum, ligne) => sum + (parseFloat(ligne.montant) || 0), 0);
    };

    const calculerTotalPos1 = (pos1) => {
        return calculerTotalLigne(pos1.lignes || []);
    };

    const calculerTotalPos0 = (pos0) => {
        return (pos0.positions1 || []).reduce((sum, pos1) => sum + calculerTotalPos1(pos1), 0);
    };

    const calculerTotalLot = (lot) => {
        return (lot.positions0 || []).reduce((sum, pos0) => sum + calculerTotalPos0(pos0), 0);
    };

    const calculerTotalGeneral = () => {
        return (estimation.lots || []).reduce((sum, lot) => sum + calculerTotalLot(lot), 0);
    };

    // ==========================================
    // GESTION DES LOTS
    // ==========================================
    
    const ajouterLot = () => {
        const nouveauLot = {
            id: `lot-${Date.now()}`,
            numero: (estimation.lots.length + 1).toString(),
            nom: '',
            positions0: []
        };
        setEstimation(prev => ({
            ...prev,
            lots: [...prev.lots, nouveauLot]
        }));
        setExpandedLots(prev => ({ ...prev, [nouveauLot.id]: true }));
    };

    const modifierLot = (lotId, champ, valeur) => {
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? { ...lot, [champ]: valeur } : lot
            )
        }));
    };

    const supprimerLot = (lotId) => {
        if (confirm('Supprimer ce lot et tout son contenu ?')) {
            setEstimation(prev => ({
                ...prev,
                lots: prev.lots.filter(lot => lot.id !== lotId)
            }));
        }
    };

    // ==========================================
    // GESTION DES POSITIONS 0
    // ==========================================
    
    const ajouterPosition0 = (lotId) => {
        const nouvellePos0 = {
            id: `pos0-${Date.now()}`,
            nom: '',
            positions1: []
        };
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: [...lot.positions0, nouvellePos0]
                } : lot
            )
        }));
        setExpandedPos0(prev => ({ ...prev, [nouvellePos0.id]: true }));
    };

    const modifierPosition0 = (lotId, pos0Id, valeur) => {
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? { ...pos0, nom: valeur } : pos0
                    )
                } : lot
            )
        }));
    };

    const supprimerPosition0 = (lotId, pos0Id) => {
        if (confirm('Supprimer cette position et tout son contenu ?')) {
            setEstimation(prev => ({
                ...prev,
                lots: prev.lots.map(lot => 
                    lot.id === lotId ? {
                        ...lot,
                        positions0: lot.positions0.filter(pos0 => pos0.id !== pos0Id)
                    } : lot
                )
            }));
        }
    };

    // ==========================================
    // GESTION DES POSITIONS 1
    // ==========================================
    
    const ajouterPosition1 = (lotId, pos0Id) => {
        const nouvellePos1 = {
            id: `pos1-${Date.now()}`,
            nom: '',
            lignes: []
        };
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? {
                            ...pos0,
                            positions1: [...pos0.positions1, nouvellePos1]
                        } : pos0
                    )
                } : lot
            )
        }));
        setExpandedPos1(prev => ({ ...prev, [nouvellePos1.id]: true }));
    };

    const modifierPosition1 = (lotId, pos0Id, pos1Id, valeur) => {
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? {
                            ...pos0,
                            positions1: pos0.positions1.map(pos1 =>
                                pos1.id === pos1Id ? { ...pos1, nom: valeur } : pos1
                            )
                        } : pos0
                    )
                } : lot
            )
        }));
    };

    const supprimerPosition1 = (lotId, pos0Id, pos1Id) => {
        if (confirm('Supprimer cette position et toutes ses lignes ?')) {
            setEstimation(prev => ({
                ...prev,
                lots: prev.lots.map(lot => 
                    lot.id === lotId ? {
                        ...lot,
                        positions0: lot.positions0.map(pos0 =>
                            pos0.id === pos0Id ? {
                                ...pos0,
                                positions1: pos0.positions1.filter(pos1 => pos1.id !== pos1Id)
                            } : pos0
                        )
                    } : lot
                )
            }));
        }
    };

    // ==========================================
    // GESTION DES LIGNES DE CHIFFRAGE
    // ==========================================
    
    const ajouterLigne = (lotId, pos0Id, pos1Id) => {
        const nouvelleLigne = {
            id: `ligne-${Date.now()}`,
            etape: '',
            montant: 0
        };
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? {
                            ...pos0,
                            positions1: pos0.positions1.map(pos1 =>
                                pos1.id === pos1Id ? {
                                    ...pos1,
                                    lignes: [...pos1.lignes, nouvelleLigne]
                                } : pos1
                            )
                        } : pos0
                    )
                } : lot
            )
        }));
    };

    const modifierLigne = (lotId, pos0Id, pos1Id, ligneId, champ, valeur) => {
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? {
                            ...pos0,
                            positions1: pos0.positions1.map(pos1 =>
                                pos1.id === pos1Id ? {
                                    ...pos1,
                                    lignes: pos1.lignes.map(ligne =>
                                        ligne.id === ligneId ? { ...ligne, [champ]: valeur } : ligne
                                    )
                                } : pos1
                            )
                        } : pos0
                    )
                } : lot
            )
        }));
    };

    const supprimerLigne = (lotId, pos0Id, pos1Id, ligneId) => {
        setEstimation(prev => ({
            ...prev,
            lots: prev.lots.map(lot => 
                lot.id === lotId ? {
                    ...lot,
                    positions0: lot.positions0.map(pos0 =>
                        pos0.id === pos0Id ? {
                            ...pos0,
                            positions1: pos0.positions1.map(pos1 =>
                                pos1.id === pos1Id ? {
                                    ...pos1,
                                    lignes: pos1.lignes.filter(ligne => ligne.id !== ligneId)
                                } : pos1
                            )
                        } : pos0
                    )
                } : lot
            )
        }));
    };

    // ==========================================
    // GESTION DES ACCORDÉONS
    // ==========================================
    
    const toggleLot = (lotId) => {
        setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }));
    };

    const togglePos0 = (pos0Id) => {
        setExpandedPos0(prev => ({ ...prev, [pos0Id]: !prev[pos0Id] }));
    };

    const togglePos1 = (pos1Id) => {
        setExpandedPos1(prev => ({ ...prev, [pos1Id]: !prev[pos1Id] }));
    };

    // ==========================================
    // SAUVEGARDE
    // ==========================================
    
    const handleSave = () => {
        if (!estimation.designation.trim()) {
            alert('⚠️ Veuillez saisir une désignation');
            return;
        }

        const estimationAvecTotal = {
            ...estimation,
            montantTotal: calculerTotalGeneral()
        };

        onSave(estimationAvecTotal);
    };

    // ==========================================
    // RENDU
    // ==========================================

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] flex flex-col">
                {/* EN-TÊTE */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">
                            {initialData ? '✏️ Modifier l\'estimation' : '➕ Nouvelle estimation'}
                        </h2>
                        <input
                            type="text"
                            value={estimation.designation}
                            onChange={(e) => setEstimation(prev => ({ ...prev, designation: e.target.value }))}
                            placeholder="Désignation du projet..."
                            className="w-full px-4 py-2 border rounded-lg text-lg font-medium"
                        />
                    </div>
                    <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
                        <window.Icons.X size={24} />
                    </button>
                </div>

                {/* CONTENU PRINCIPAL */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Bouton ajouter lot */}
                    <button
                        onClick={ajouterLot}
                        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <window.Icons.Plus size={20} />
                        Ajouter un lot
                    </button>

                    {/* LISTE DES LOTS */}
                    <div className="space-y-4">
                        {estimation.lots.map(lot => (
                            <LotItem
                                key={lot.id}
                                lot={lot}
                                isExpanded={expandedLots[lot.id]}
                                onToggle={() => toggleLot(lot.id)}
                                onModifier={(champ, valeur) => modifierLot(lot.id, champ, valeur)}
                                onSupprimer={() => supprimerLot(lot.id)}
                                onAjouterPos0={() => ajouterPosition0(lot.id)}
                                // Props pour les positions 0
                                expandedPos0={expandedPos0}
                                togglePos0={togglePos0}
                                modifierPosition0={(pos0Id, valeur) => modifierPosition0(lot.id, pos0Id, valeur)}
                                supprimerPosition0={(pos0Id) => supprimerPosition0(lot.id, pos0Id)}
                                ajouterPosition1={(pos0Id) => ajouterPosition1(lot.id, pos0Id)}
                                // Props pour les positions 1
                                expandedPos1={expandedPos1}
                                togglePos1={togglePos1}
                                modifierPosition1={(pos0Id, pos1Id, valeur) => modifierPosition1(lot.id, pos0Id, pos1Id, valeur)}
                                supprimerPosition1={(pos0Id, pos1Id) => supprimerPosition1(lot.id, pos0Id, pos1Id)}
                                ajouterLigne={(pos0Id, pos1Id) => ajouterLigne(lot.id, pos0Id, pos1Id)}
                                // Props pour les lignes
                                modifierLigne={(pos0Id, pos1Id, ligneId, champ, valeur) => modifierLigne(lot.id, pos0Id, pos1Id, ligneId, champ, valeur)}
                                supprimerLigne={(pos0Id, pos1Id, ligneId) => supprimerLigne(lot.id, pos0Id, pos1Id, ligneId)}
                                // Calculs
                                calculerTotalLot={calculerTotalLot}
                                calculerTotalPos0={calculerTotalPos0}
                                calculerTotalPos1={calculerTotalPos1}
                            />
                        ))}

                        {estimation.lots.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-lg">Aucun lot créé</p>
                                <p className="text-sm">Cliquez sur "Ajouter un lot" pour commencer</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PIED DE PAGE */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold text-blue-600">
                            Total général : {calculerTotalGeneral().toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                💾 Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// COMPOSANT LOT
// ==========================================

const LotItem = ({ lot, isExpanded, onToggle, onModifier, onSupprimer, onAjouterPos0, ...props }) => {
    return (
        <div className="border border-gray-300 rounded-lg bg-white">
            {/* En-tête du lot */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 border-b">
                <button onClick={onToggle} className="text-gray-600 hover:text-gray-800">
                    {isExpanded ? <window.Icons.ChevronDown size={20} /> : <window.Icons.ChevronRight size={20} />}
                </button>
                
                <div className="font-bold text-blue-600">Lot</div>
                
                <input
                    type="text"
                    value={lot.numero}
                    onChange={(e) => onModifier('numero', e.target.value)}
                    placeholder="N°"
                    className="w-16 px-2 py-1 border rounded text-center font-bold"
                />
                
                <input
                    type="text"
                    value={lot.nom}
                    onChange={(e) => onModifier('nom', e.target.value)}
                    placeholder="Nom du lot..."
                    className="flex-1 px-3 py-1 border rounded"
                />
                
                <div className="font-bold text-gray-700">
                    {props.calculerTotalLot(lot).toLocaleString('fr-CH')} CHF
                </div>
                
                <button
                    onClick={onSupprimer}
                    className="text-red-600 hover:text-red-800"
                    title="Supprimer le lot"
                >
                    <window.Icons.Trash2 size={18} />
                </button>
            </div>

            {/* Contenu du lot */}
            {isExpanded && (
                <div className="p-4 pl-12 space-y-3">
                    <button
                        onClick={onAjouterPos0}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                        <window.Icons.Plus size={16} />
                        Ajouter Position 0
                    </button>

                    {/* Liste des positions 0 */}
                    {lot.positions0.map(pos0 => (
                        <Position0Item
                            key={pos0.id}
                            pos0={pos0}
                            lotId={lot.id}
                            isExpanded={props.expandedPos0[pos0.id]}
                            onToggle={() => props.togglePos0(pos0.id)}
                            onModifier={(valeur) => props.modifierPosition0(pos0.id, valeur)}
                            onSupprimer={() => props.supprimerPosition0(pos0.id)}
                            onAjouterPos1={() => props.ajouterPosition1(pos0.id)}
                            {...props}
                        />
                    ))}

                    {lot.positions0.length === 0 && (
                        <div className="text-sm text-gray-500 italic">Aucune position 0</div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPOSANT POSITION 0
// ==========================================

const Position0Item = ({ pos0, lotId, isExpanded, onToggle, onModifier, onSupprimer, onAjouterPos1, ...props }) => {
    return (
        <div className="border border-gray-300 rounded-lg bg-gray-50">
            {/* En-tête position 0 */}
            <div className="flex items-center gap-3 p-3">
                <button onClick={onToggle} className="text-gray-600 hover:text-gray-800">
                    {isExpanded ? <window.Icons.ChevronDown size={18} /> : <window.Icons.ChevronRight size={18} />}
                </button>
                
                <div className="font-semibold text-green-600">Pos 0</div>
                
                <input
                    type="text"
                    value={pos0.nom}
                    onChange={(e) => onModifier(e.target.value)}
                    placeholder="Nom de la position 0..."
                    className="flex-1 px-3 py-1 border rounded bg-white"
                />
                
                <div className="font-semibold text-gray-700">
                    {props.calculerTotalPos0(pos0).toLocaleString('fr-CH')} CHF
                </div>
                
                <button
                    onClick={onSupprimer}
                    className="text-red-600 hover:text-red-800"
                    title="Supprimer la position"
                >
                    <window.Icons.Trash2 size={16} />
                </button>
            </div>

            {/* Contenu position 0 */}
            {isExpanded && (
                <div className="p-3 pl-10 space-y-2">
                    <button
                        onClick={onAjouterPos1}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                    >
                        <window.Icons.Plus size={14} />
                        Ajouter Position 1
                    </button>

                    {/* Liste des positions 1 */}
                    {pos0.positions1.map(pos1 => (
                        <Position1Item
                            key={pos1.id}
                            pos1={pos1}
                            lotId={lotId}
                            pos0Id={pos0.id}
                            isExpanded={props.expandedPos1[pos1.id]}
                            onToggle={() => props.togglePos1(pos1.id)}
                            onModifier={(valeur) => props.modifierPosition1(pos0.id, pos1.id, valeur)}
                            onSupprimer={() => props.supprimerPosition1(pos0.id, pos1.id)}
                            onAjouterLigne={() => props.ajouterLigne(pos0.id, pos1.id)}
                            modifierLigne={(ligneId, champ, valeur) => props.modifierLigne(pos0.id, pos1.id, ligneId, champ, valeur)}
                            supprimerLigne={(ligneId) => props.supprimerLigne(pos0.id, pos1.id, ligneId)}
                            calculerTotalPos1={props.calculerTotalPos1}
                        />
                    ))}

                    {pos0.positions1.length === 0 && (
                        <div className="text-sm text-gray-500 italic">Aucune position 1</div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPOSANT POSITION 1
// ==========================================

const Position1Item = ({ pos1, isExpanded, onToggle, onModifier, onSupprimer, onAjouterLigne, modifierLigne, supprimerLigne, calculerTotalPos1 }) => {
    return (
        <div className="border border-gray-300 rounded-lg bg-white">
            {/* En-tête position 1 */}
            <div className="flex items-center gap-3 p-2">
                <button onClick={onToggle} className="text-gray-600 hover:text-gray-800">
                    {isExpanded ? <window.Icons.ChevronDown size={16} /> : <window.Icons.ChevronRight size={16} />}
                </button>
                
                <div className="font-medium text-purple-600 text-sm">Pos 1</div>
                
                <input
                    type="text"
                    value={pos1.nom}
                    onChange={(e) => onModifier(e.target.value)}
                    placeholder="Nom de la position 1..."
                    className="flex-1 px-2 py-1 border rounded text-sm"
                />
                
                <div className="font-medium text-gray-700 text-sm">
                    {calculerTotalPos1(pos1).toLocaleString('fr-CH')} CHF
                </div>
                
                <button
                    onClick={onSupprimer}
                    className="text-red-600 hover:text-red-800"
                    title="Supprimer la position"
                >
                    <window.Icons.Trash2 size={14} />
                </button>
            </div>

            {/* Contenu position 1 - Lignes de chiffrage */}
            {isExpanded && (
                <div className="p-2 pl-8 space-y-1 bg-gray-50">
                    <button
                        onClick={onAjouterLigne}
                        className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center gap-1"
                    >
                        <window.Icons.Plus size={12} />
                        Ajouter ligne
                    </button>

                    {/* Liste des lignes */}
                    {pos1.lignes.map(ligne => (
                        <LigneItem
                            key={ligne.id}
                            ligne={ligne}
                            onModifier={(champ, valeur) => modifierLigne(ligne.id, champ, valeur)}
                            onSupprimer={() => supprimerLigne(ligne.id)}
                        />
                    ))}

                    {pos1.lignes.length === 0 && (
                        <div className="text-xs text-gray-500 italic">Aucune ligne de chiffrage</div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPOSANT LIGNE DE CHIFFRAGE
// ==========================================

const LigneItem = ({ ligne, onModifier, onSupprimer }) => {
    return (
        <div className="flex items-center gap-2 p-2 bg-white border rounded">
            <div className="text-xs text-gray-500 w-12">Étape</div>
            <input
                type="text"
                value={ligne.etape}
                onChange={(e) => onModifier('etape', e.target.value)}
                placeholder="1, 2, ou texte..."
                className="w-32 px-2 py-1 border rounded text-sm"
            />
            
            <div className="text-xs text-gray-500 w-16">Montant</div>
            <input
                type="number"
                value={ligne.montant}
                onChange={(e) => onModifier('montant', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-32 px-2 py-1 border rounded text-sm text-right"
                step="0.01"
            />
            <div className="text-xs text-gray-500">CHF</div>
            
            <button
                onClick={onSupprimer}
                className="ml-auto text-red-600 hover:text-red-800"
                title="Supprimer la ligne"
            >
                <window.Icons.X size={14} />
            </button>
        </div>
    );
};
