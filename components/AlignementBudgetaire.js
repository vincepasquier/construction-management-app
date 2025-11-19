// Alignement Budgétaire - Vue hiérarchique avec ventilation au prorata ET ajustements
const { useState, useMemo, useEffect } = React;

window.AlignementBudgetaire = ({ estimations, offres, offresComplementaires, commandes, regies, factures }) => {
    const [expandedLots, setExpandedLots] = useState({});
    const [expandedPos0, setExpandedPos0] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    
    // 🆕 États pour les ajustements
    const [ajustements, setAjustements] = useState([]);
    const [showAjustementModal, setShowAjustementModal] = useState(false);
    const [editingAjustement, setEditingAjustement] = useState(null);
    const [showAjustementsSection, setShowAjustementsSection] = useState(true);

    // 🆕 Charger les ajustements depuis localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ajustements');
        if (saved) {
            try {
                setAjustements(JSON.parse(saved));
            } catch (e) {
                console.error('Erreur chargement ajustements:', e);
            }
        }
    }, []);

    // 🆕 Sauvegarder les ajustements
    const saveAjustements = (newAjustements) => {
        setAjustements(newAjustements);
        localStorage.setItem('ajustements', JSON.stringify(newAjustements));
    };

    // 🆕 Handler pour sauvegarder un ajustement
    const handleSaveAjustement = (ajustement) => {
        const updated = editingAjustement
            ? ajustements.map(a => a.id === editingAjustement.id ? ajustement : a)
            : [...ajustements, ajustement];
        
        saveAjustements(updated);
        setShowAjustementModal(false);
        setEditingAjustement(null);
        alert(editingAjustement ? '✅ Ajustement modifié' : '✅ Ajustement créé');
    };

    // 🆕 Handler pour supprimer un ajustement
    const handleDeleteAjustement = (id) => {
        if (confirm('Supprimer cet ajustement ?')) {
            const updated = ajustements.filter(a => a.id !== id);
            saveAjustements(updated);
        }
    };

    // 🆕 Calculer le total des ajustements
    const totalAjustements = useMemo(() => {
        return ajustements.reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);
    }, [ajustements]);

    // Construction de la hiérarchie avec ventilation ET ajustements
    const hierarchyData = useMemo(() => {
        const hierarchy = {};

        // Fonction pour ventiler le montant au prorata des estimations
        const addToHierarchy = (lots, pos0s, pos1s, montant, type) => {
            if (!lots || lots.length === 0) return;
            
            // Calculer les estimations totales pour cette combinaison
            const estimationsMap = {};
            let totalEstimation = 0;
            
            lots.forEach(lot => {
                (pos0s || []).forEach(pos0 => {
                    (pos1s || []).forEach(pos1 => {
                        const key = `${lot}|${pos0}|${pos1}`;
                        
                        // Trouver l'estimation correspondante
                        const est = estimations.find(e => 
                            e.lots?.includes(lot) && 
                            e.positions0?.includes(pos0) && 
                            e.positions1?.includes(pos1)
                        );
                        
                        const estMontant = est ? (est.montant || 0) : 0;
                        estimationsMap[key] = estMontant;
                        totalEstimation += estMontant;
                    });
                });
            });
            
            // Si pas d'estimations pour cette combinaison, ne rien ajouter
            if (totalEstimation === 0) {
                console.warn(`Aucune estimation trouvée pour lots=${lots}, pos0=${pos0s}, pos1=${pos1s}. Montant de ${montant} CHF non ventilé.`);
                return;
            }
            
            // Ventiler au prorata des estimations
            lots.forEach(lot => {
                // Vérifier que le lot existe dans hierarchy
                if (!hierarchy[lot]) return;
                
                (pos0s || []).forEach(pos0 => {
                    // Vérifier que pos0 existe dans ce lot
                    if (!hierarchy[lot].positions0[pos0]) return;
                    
                    (pos1s || []).forEach(pos1 => {
                        // Vérifier que pos1 existe dans ce pos0
                        if (!hierarchy[lot].positions0[pos0].positions1[pos1]) return;
                        
                        const key = `${lot}|${pos0}|${pos1}`;
                        const estMontant = estimationsMap[key];
                        
                        // Si pas d'estimation pour cette combinaison précise, passer
                        if (estMontant === 0) return;
                        
                        // Calculer le montant ventilé
                        const montantVentile = montant * (estMontant / totalEstimation);
                        
                        // Ajouter le montant ventilé aux 3 niveaux
                        hierarchy[lot].positions0[pos0].positions1[pos1][type] += montantVentile;
                        hierarchy[lot].positions0[pos0][type] += montantVentile;
                        hierarchy[lot][type] += montantVentile;
                    });
                });
            });
        };

        // Ajouter les estimations (pas de ventilation, montant direct)
        estimations.forEach(est => {
            (est.lots || []).forEach(lot => {
                if (!hierarchy[lot]) {
                    hierarchy[lot] = { 
                        estimation: 0, 
                        offres: 0, 
                        offresComp: 0,
                        commandes: 0, 
                        regies: 0, 
                        factures: 0,
                        ajustements: 0, // 🆕 NOUVEAU
                        positions0: {} 
                    };
                }
                hierarchy[lot].estimation += est.montant || 0;

                (est.positions0 || []).forEach(pos0 => {
                    if (!hierarchy[lot].positions0[pos0]) {
                        hierarchy[lot].positions0[pos0] = { 
                            estimation: 0, 
                            offres: 0, 
                            offresComp: 0,
                            commandes: 0, 
                            regies: 0, 
                            factures: 0,
                            ajustements: 0, // 🆕 NOUVEAU
                            positions1: {} 
                        };
                    }
                    hierarchy[lot].positions0[pos0].estimation += est.montant || 0;

                    (est.positions1 || []).forEach(pos1 => {
                        if (!hierarchy[lot].positions0[pos0].positions1[pos1]) {
                            hierarchy[lot].positions0[pos0].positions1[pos1] = { 
                                estimation: 0, 
                                offres: 0, 
                                offresComp: 0,
                                commandes: 0, 
                                regies: 0, 
                                factures: 0,
                                ajustements: 0 // 🆕 NOUVEAU
                            };
                        }
                        hierarchy[lot].positions0[pos0].positions1[pos1].estimation += est.montant || 0;
                    });
                });
            });
        });

        // Ajouter les offres (avec ventilation) - Ne compter que les favorites ou sans AO
        offres.forEach(off => {
            if (off.isFavorite === true || !off.appelOffreId) {
                addToHierarchy(off.lots, off.positions0, off.positions1, off.montant || 0, 'offres');
            }
        });

        // Ajouter les offres complémentaires (avec ventilation)
        offresComplementaires.forEach(oc => {
            addToHierarchy(oc.lots, oc.positions0, oc.positions1, oc.montant || 0, 'offresComp');
        });

        // Ajouter les commandes (avec ventilation)
        commandes.forEach(cmd => {
            const montant = cmd.montant || 0;
            addToHierarchy(cmd.lots, cmd.positions0, cmd.positions1, montant, 'commandes');
        });

        // Ajouter les régies (avec ventilation)
        regies.forEach(regie => {
            addToHierarchy(regie.lots, regie.positions0, regie.positions1, regie.montantTotal || 0, 'regies');
        });

        // Ajouter les factures (avec ventilation basée sur la commande)
        factures.forEach(fact => {
            const cmd = commandes.find(c => c.id === fact.commandeId);
            if (cmd) {
                addToHierarchy(cmd.lots, cmd.positions0, cmd.positions1, fact.montantHT || 0, 'factures');
            }
        });

        // 🆕 Ajouter les ajustements (avec ventilation ou répartition globale)
        ajustements.forEach(adj => {
            const adjLots = adj.lots || [];
            const adjPos0 = adj.positions0 || [];
            const adjPos1 = adj.positions1 || [];
            const adjMontant = parseFloat(adj.montant) || 0;
            
            // Si aucun périmètre spécifié, répartir proportionnellement sur tous les lots
            if (adjLots.length === 0 && adjPos0.length === 0 && adjPos1.length === 0) {
                const totalEstimation = estimations.reduce((sum, e) => sum + (e.montant || 0), 0);
                if (totalEstimation > 0) {
                    Object.keys(hierarchy).forEach(lot => {
                        const lotEstimation = hierarchy[lot].estimation;
                        const prorata = lotEstimation / totalEstimation;
                        const montantProrata = adjMontant * prorata;
                        
                        hierarchy[lot].ajustements += montantProrata;
                        
                        // Répartir aussi dans les positions
                        Object.keys(hierarchy[lot].positions0).forEach(pos0 => {
                            const pos0Estimation = hierarchy[lot].positions0[pos0].estimation;
                            const pos0Prorata = lotEstimation > 0 ? pos0Estimation / lotEstimation : 0;
                            hierarchy[lot].positions0[pos0].ajustements += montantProrata * pos0Prorata;
                            
                            Object.keys(hierarchy[lot].positions0[pos0].positions1).forEach(pos1 => {
                                const pos1Estimation = hierarchy[lot].positions0[pos0].positions1[pos1].estimation;
                                const pos1Prorata = pos0Estimation > 0 ? pos1Estimation / pos0Estimation : 0;
                                hierarchy[lot].positions0[pos0].positions1[pos1].ajustements += montantProrata * pos0Prorata * pos1Prorata;
                            });
                        });
                    });
                }
            } else {
                // Périmètre spécifié : ventiler avec la fonction existante
                addToHierarchy(adjLots, adjPos0, adjPos1, adjMontant, 'ajustements');
            }
        });

        return hierarchy;
    }, [estimations, offres, offresComplementaires, commandes, regies, factures, ajustements]);

    // Filtrer par recherche
    const filteredHierarchy = useMemo(() => {
        if (!searchTerm) return hierarchyData;

        const filtered = {};
        const term = searchTerm.toLowerCase();

        Object.keys(hierarchyData).forEach(lot => {
            if (lot.toLowerCase().includes(term)) {
                filtered[lot] = hierarchyData[lot];
            } else {
                const filteredPos0 = {};
                Object.keys(hierarchyData[lot].positions0).forEach(pos0 => {
                    if (pos0.toLowerCase().includes(term)) {
                        filteredPos0[pos0] = hierarchyData[lot].positions0[pos0];
                    } else {
                        const filteredPos1 = {};
                        Object.keys(hierarchyData[lot].positions0[pos0].positions1).forEach(pos1 => {
                            if (pos1.toLowerCase().includes(term)) {
                                filteredPos1[pos1] = hierarchyData[lot].positions0[pos0].positions1[pos1];
                            }
                        });
                        if (Object.keys(filteredPos1).length > 0) {
                            filteredPos0[pos0] = {
                                ...hierarchyData[lot].positions0[pos0],
                                positions1: filteredPos1
                            };
                        }
                    }
                });
                if (Object.keys(filteredPos0).length > 0) {
                    filtered[lot] = {
                        ...hierarchyData[lot],
                        positions0: filteredPos0
                    };
                }
            }
        });

        return filtered;
    }, [hierarchyData, searchTerm]);

    const toggleLot = (lot) => {
        setExpandedLots(prev => ({...prev, [lot]: !prev[lot]}));
    };

    const togglePos0 = (lot, pos0) => {
        const key = `${lot}-${pos0}`;
        setExpandedPos0(prev => ({...prev, [key]: !prev[key]}));
    };

    const renderMontantCell = (data, type) => {
        const montant = data[type] || 0;
        const isAjustement = type === 'ajustements';
        return (
            <td className="px-4 py-2 text-right text-sm">
                {montant !== 0 ? (
                    <span className={isAjustement && montant < 0 ? 'text-green-600' : isAjustement && montant > 0 ? 'text-red-600' : ''}>
                        {isAjustement && montant > 0 ? '+' : ''}
                        {montant.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </span>
                ) : '-'}
            </td>
        );
    };

    const calculateEcart = (data) => {
        const budgetTotal = (data.estimation || 0) + (data.ajustements || 0); // 🆕 Ajout des ajustements
        const depenses = (data.commandes || 0) + (data.regies || 0);
        const ecart = budgetTotal - depenses;
        return ecart;
    };

    const renderEcartCell = (data) => {
        const ecart = calculateEcart(data);
        const textColor = ecart >= 0 ? 'text-green-600' : 'text-red-600';
        return (
            <td className={`px-4 py-2 text-right text-sm font-medium ${textColor}`}>
                {ecart.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
            </td>
        );
    };

    // 🆕 Fonction pour obtenir l'icône et la couleur du type d'ajustement
    const getAjustementStyle = (type) => {
        const styles = {
            aleas: { icon: '⚡', color: 'text-orange-600', bg: 'bg-orange-50' },
            economies: { icon: '💰', color: 'text-green-600', bg: 'bg-green-50' },
            provision: { icon: '📝', color: 'text-blue-600', bg: 'bg-blue-50' },
            modification: { icon: '🔄', color: 'text-purple-600', bg: 'bg-purple-50' },
            supplement: { icon: '➕', color: 'text-indigo-600', bg: 'bg-indigo-50' }
        };
        return styles[type] || styles.provision;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">🎯 Alignement Budgétaire</h2>
                <div className="flex gap-3">
                    {/* 🆕 Bouton Ajustements */}
                    <button
                        onClick={() => {
                            setEditingAjustement(null);
                            setShowAjustementModal(true);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <window.Icons.Plus />
                        Nouvel ajustement
                    </button>
                    
                    <input
                        type="text"
                        placeholder="🔍 Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border rounded-lg w-64"
                    />
                </div>
            </div>

            {/* 🆕 Section Ajustements */}
            {ajustements.length > 0 && (
                <div className="mb-6">
                    <div 
                        className="flex items-center justify-between p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100"
                        onClick={() => setShowAjustementsSection(!showAjustementsSection)}
                    >
                        <div className="flex items-center gap-3">
                            {showAjustementsSection ? 
                                <window.Icons.ChevronDown size={20} /> : 
                                <window.Icons.ChevronRight size={20} />
                            }
                            <h3 className="text-lg font-semibold text-purple-900">
                                📊 Ajustements budgétaires ({ajustements.length})
                            </h3>
                            <span className={`text-xl font-bold ${
                                totalAjustements >= 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                                {totalAjustements > 0 ? '+' : ''}
                                {totalAjustements.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                            </span>
                        </div>
                    </div>

                    {showAjustementsSection && (
                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm">Type</th>
                                        <th className="px-4 py-3 text-left text-sm">Description</th>
                                        <th className="px-4 py-3 text-left text-sm">Périmètre</th>
                                        <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                        <th className="px-4 py-3 text-center text-sm">Statut</th>
                                        <th className="px-4 py-3 text-left text-sm">Date</th>
                                        <th className="px-4 py-3 text-center text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ajustements.map(adj => {
                                        const style = getAjustementStyle(adj.type);
                                        const perimetre = adj.lots.length > 0 || adj.positions0.length > 0 || adj.positions1.length > 0
                                            ? [...(adj.lots || []), ...(adj.positions0 || []), ...(adj.positions1 || [])].slice(0, 2).join(', ') + 
                                              (adj.lots.length + adj.positions0.length + adj.positions1.length > 2 ? '...' : '')
                                            : 'Tout le projet';
                                        
                                        return (
                                            <tr key={adj.id} className={`border-t hover:bg-gray-50 ${style.bg}`}>
                                                <td className="px-4 py-3">
                                                    <span className={`text-lg ${style.color}`}>
                                                        {style.icon}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{adj.description}</div>
                                                    {adj.commentaire && (
                                                        <div className="text-xs text-gray-600 mt-1">{adj.commentaire}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {perimetre}
                                                    {adj.etape && (
                                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                            Ét. {adj.etape}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-semibold ${
                                                        parseFloat(adj.montant) > 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {parseFloat(adj.montant) > 0 ? '+' : ''}
                                                        {parseFloat(adj.montant).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        adj.statut === 'confirme' ? 'bg-green-100 text-green-800' :
                                                        adj.statut === 'facture' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {adj.statut === 'confirme' ? '✅ Confirmé' :
                                                         adj.statut === 'facture' ? '💰 Facturé' :
                                                         '⏳ Prévisionnel'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(adj.dateCreation).toLocaleDateString('fr-CH')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingAjustement(adj);
                                                                setShowAjustementModal(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Modifier"
                                                        >
                                                            <window.Icons.Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAjustement(adj.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Supprimer"
                                                        >
                                                            <window.Icons.Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-purple-50 border-t-2">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 font-semibold">Total ajustements</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-lg font-bold ${
                                                totalAjustements > 0 ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {totalAjustements > 0 ? '+' : ''}
                                                {totalAjustements.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                            </span>
                                        </td>
                                        <td colSpan="3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-800">💡 Ventilation au prorata des estimations</p>
                <p className="text-blue-700">
                    Lorsqu'une offre/commande/régie/ajustement couvre plusieurs lots ou positions, 
                    son montant est ventilé proportionnellement aux estimations de chaque position.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Hiérarchie</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Estimation</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">🆕 Ajustements</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Offres</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">OC</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Commandes</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Régies</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Factures</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold">Écart</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(filteredHierarchy).length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center py-12 text-gray-500">
                                    {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée à afficher'}
                                </td>
                            </tr>
                        ) : (
                            Object.keys(filteredHierarchy).sort().map(lot => (
                                <React.Fragment key={lot}>
                                    {/* Ligne Lot */}
                                    <tr className="bg-blue-50 font-semibold hover:bg-blue-100 cursor-pointer"
                                        onClick={() => toggleLot(lot)}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {expandedLots[lot] ? 
                                                    <window.Icons.ChevronDown size={18} /> : 
                                                    <window.Icons.ChevronRight size={18} />
                                                }
                                                <span className="text-blue-800">📦 {lot}</span>
                                            </div>
                                        </td>
                                        {renderMontantCell(filteredHierarchy[lot], 'estimation')}
                                        {renderMontantCell(filteredHierarchy[lot], 'ajustements')}
                                        {renderMontantCell(filteredHierarchy[lot], 'offres')}
                                        {renderMontantCell(filteredHierarchy[lot], 'offresComp')}
                                        {renderMontantCell(filteredHierarchy[lot], 'commandes')}
                                        {renderMontantCell(filteredHierarchy[lot], 'regies')}
                                        {renderMontantCell(filteredHierarchy[lot], 'factures')}
                                        {renderEcartCell(filteredHierarchy[lot])}
                                    </tr>

                                    {/* Positions 0 */}
                                    {expandedLots[lot] && Object.keys(filteredHierarchy[lot].positions0).sort().map(pos0 => (
                                        <React.Fragment key={`${lot}-${pos0}`}>
                                            <tr className="bg-green-50 hover:bg-green-100 cursor-pointer"
                                                onClick={() => togglePos0(lot, pos0)}>
                                                <td className="px-4 py-3 pl-12">
                                                    <div className="flex items-center gap-2">
                                                        {expandedPos0[`${lot}-${pos0}`] ? 
                                                            <window.Icons.ChevronDown size={16} /> : 
                                                            <window.Icons.ChevronRight size={16} />
                                                        }
                                                        <span className="text-green-800">📁 {pos0}</span>
                                                    </div>
                                                </td>
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'estimation')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'ajustements')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'offres')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'offresComp')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'commandes')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'regies')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'factures')}
                                                {renderEcartCell(filteredHierarchy[lot].positions0[pos0])}
                                            </tr>

                                            {/* Positions 1 */}
                                            {expandedPos0[`${lot}-${pos0}`] && Object.keys(filteredHierarchy[lot].positions0[pos0].positions1).sort().map(pos1 => (
                                                <tr key={`${lot}-${pos0}-${pos1}`} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 pl-20 text-sm text-gray-700">
                                                        📄 {pos1}
                                                    </td>
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'estimation')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'ajustements')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'offres')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'offresComp')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'commandes')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'regies')}
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'factures')}
                                                    {renderEcartCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1])}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Légende */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">📖 Légende</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                    <div><span className="font-semibold">Estimation :</span> Budget initial</div>
                    <div><span className="font-semibold">🆕 Ajustements :</span> Aléas, économies, provisions</div>
                    <div><span className="font-semibold">Offres :</span> Offres reçues (favorites)</div>
                    <div><span className="font-semibold">OC :</span> Offres complémentaires</div>
                    <div><span className="font-semibold">Commandes :</span> Commandes passées</div>
                    <div><span className="font-semibold">Régies :</span> Travaux en régie</div>
                    <div><span className="font-semibold">Factures :</span> Factures reçues</div>
                    <div className="col-span-1">
                        <span className="font-semibold">Écart :</span> (Estimation + Ajustements) - (Commandes + Régies)
                    </div>
                </div>
            </div>

            {/* Modal d'ajustement */}
            {showAjustementModal && (
                <window.AjustementModal
                    initialData={editingAjustement}
                    onClose={() => {
                        setShowAjustementModal(false);
                        setEditingAjustement(null);
                    }}
                    onSave={handleSaveAjustement}
                    estimations={estimations}
                />
            )}
        </div>
    );
};
