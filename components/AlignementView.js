// Vue Alignement & Atterrissage - VERSION COMPLÈTE HIÉRARCHIQUE
window.AlignementView = ({ 
    estimations, 
    offres, 
    commandes, 
    offresComplementaires, 
    regies, 
    ajustements = [],
    onSaveAjustement,
    onEditCommande,
    onEditOffre,
    onEditOffreComplementaire,
    onEditAjustement
}) => {
    // ========================================
    // ÉTATS
    // ========================================
    const [selectedLots, setSelectedLots] = React.useState([]);
    const [selectedPos0, setSelectedPos0] = React.useState([]);
    const [selectedEtape, setSelectedEtape] = React.useState('');
    const [showAjustementModal, setShowAjustementModal] = React.useState(false);
    const [editingAjustement, setEditingAjustement] = React.useState(null);
    
    // États pour l'expansion
    const [expandedLots, setExpandedLots] = React.useState(new Set());
    const [expandedSections, setExpandedSections] = React.useState({}); // {lotId: {engage: true, attente: false, ...}}
    const [expandedPositions, setExpandedPositions] = React.useState(new Set());
    
    // ========================================
    // FILTRES DISPONIBLES
    // ========================================
    const availableFilters = React.useMemo(() => {
        const lotsSet = new Set();
        const pos0Set = new Set();
        const etapesSet = new Set();

        [...estimations, ...commandes, ...offres].forEach(item => {
            (item.lots || []).forEach(lot => lotsSet.add(lot));
            (item.positions0 || []).forEach(pos => pos0Set.add(pos));
            if (item.etape) etapesSet.add(item.etape);
        });

        return {
            lots: [...lotsSet].sort(),
            positions0: [...pos0Set].sort(),
            etapes: [...etapesSet].sort()
        };
    }, [estimations, commandes, offres]);

    // ========================================
    // FONCTION DE FILTRAGE
    // ========================================
    const matchesFilters = (item) => {
        if (selectedLots.length === 0 && selectedPos0.length === 0 && !selectedEtape) {
            return true;
        }

        let matches = true;

        if (selectedLots.length > 0) {
            const itemLots = item.lots || [];
            matches = matches && selectedLots.some(lot => itemLots.includes(lot));
        }

        if (selectedPos0.length > 0) {
            const itemPos0 = item.positions0 || [];
            matches = matches && selectedPos0.some(pos => itemPos0.includes(pos));
        }

        if (selectedEtape) {
            matches = matches && item.etape === selectedEtape;
        }

        return matches;
    };

    // ========================================
    // CALCULS GLOBAUX
    // ========================================
    const globalStats = React.useMemo(() => {
        const totalEstime = estimations
            .filter(matchesFilters)
            .reduce((sum, est) => sum + (est.montantTotal || est.montant || 0), 0);

        const commandesEngagees = commandes
            .filter(matchesFilters)
            .reduce((sum, cmd) => {
                const montantBase = cmd.calculatedMontant || cmd.montant || 0;
                const budgetRegie = cmd.budgetRegie || 0;
                
                const ocLiees = offresComplementaires.filter(oc => 
                    oc.commandeId === cmd.id && oc.statut === 'Acceptée'
                );
                const montantOC = ocLiees.reduce((s, oc) => s + (oc.montant || 0), 0);
                
                const regiesLiees = regies.filter(r => r.commandeId === cmd.id);
                const montantRegies = regiesLiees.reduce((s, r) => s + (r.montantTotal || 0), 0);
                
                if (budgetRegie > 0) {
                    const depassement = Math.max(0, montantRegies - budgetRegie);
                    return sum + montantBase + montantOC + depassement;
                } else {
                    return sum + montantBase + montantOC + montantRegies;
                }
            }, 0);

        const offresAttente = offres
            .filter(o => matchesFilters(o) && (o.statut === 'En attente' || o.statut === 'Soumise'))
            .reduce((sum, o) => sum + (o.montant || 0), 0);

        const ocAttente = offresComplementaires
            .filter(oc => matchesFilters(oc) && oc.statut === 'En attente')
            .reduce((sum, oc) => sum + (oc.montant || 0), 0);

        const totalAttente = offresAttente + ocAttente;

        const totalAjustements = ajustements
            .filter(matchesFilters)
            .reduce((sum, adj) => sum + (adj.montant || 0), 0);

        const montantPrevu = commandesEngagees + totalAttente + totalAjustements;
        const ecart = montantPrevu - totalEstime;
        const ecartPourcent = totalEstime > 0 ? ((ecart / totalEstime) * 100) : 0;

        return {
            totalEstime,
            commandesEngagees,
            totalAttente,
            totalAjustements,
            montantPrevu,
            ecart,
            ecartPourcent
        };
    }, [estimations, commandes, offres, offresComplementaires, regies, ajustements, selectedLots, selectedPos0, selectedEtape]);

    // ========================================
    // DONNÉES PAR LOT AVEC DÉTAILS
    // ========================================
    const dataByLot = React.useMemo(() => {
        const lotMap = new Map();
        const allLots = new Set();
        
        [...estimations, ...commandes, ...offres, ...offresComplementaires, ...regies, ...ajustements].forEach(item => {
            (item.lots || []).forEach(lot => allLots.add(lot));
        });

        allLots.forEach(lot => {
            // Estimation
            const estLot = estimations
                .filter(e => e.lots?.includes(lot))
                .reduce((sum, e) => sum + (e.montantTotal || e.montant || 0), 0);

            // Commandes engagées pour ce lot
            const commandesLot = commandes.filter(c => c.lots?.includes(lot));
            const cmdLot = commandesLot.reduce((sum, cmd) => {
                const montantBase = cmd.calculatedMontant || cmd.montant || 0;
                const budgetRegie = cmd.budgetRegie || 0;
                
                const ocLiees = offresComplementaires.filter(oc => 
                    oc.commandeId === cmd.id && oc.statut === 'Acceptée' && oc.lots?.includes(lot)
                );
                const montantOC = ocLiees.reduce((s, oc) => s + (oc.montant || 0), 0);
                
                const regiesLiees = regies.filter(r => r.commandeId === cmd.id && r.lots?.includes(lot));
                const montantRegies = regiesLiees.reduce((s, r) => s + (r.montantTotal || 0), 0);
                
                if (budgetRegie > 0) {
                    const depassement = Math.max(0, montantRegies - budgetRegie);
                    return sum + montantBase + montantOC + depassement;
                } else {
                    return sum + montantBase + montantOC + montantRegies;
                }
            }, 0);

            // Offres en attente
            const offresAttenteL = offres.filter(o => 
                o.lots?.includes(lot) && (o.statut === 'En attente' || o.statut === 'Soumise')
            );
            const montantOffresAttente = offresAttenteL.reduce((sum, o) => sum + (o.montant || 0), 0);

            // OC en attente
            const ocAttenteL = offresComplementaires.filter(oc => 
                oc.lots?.includes(lot) && oc.statut === 'En attente'
            );
            const montantOcAttente = ocAttenteL.reduce((sum, oc) => sum + (oc.montant || 0), 0);

            // Régies hors budget
            const regiesHorsBudget = [];
            commandesLot.forEach(cmd => {
                const budgetRegie = cmd.budgetRegie || 0;
                if (budgetRegie > 0) {
                    const regiesLiees = regies.filter(r => r.commandeId === cmd.id && r.lots?.includes(lot));
                    const montantRegies = regiesLiees.reduce((s, r) => s + (r.montantTotal || 0), 0);
                    const depassement = montantRegies - budgetRegie;
                    if (depassement > 0) {
                        regiesHorsBudget.push({
                            commandeNumero: cmd.numero,
                            montant: depassement,
                            regies: regiesLiees
                        });
                    }
                }
            });

            // Ajustements
            const ajustL = ajustements.filter(a => a.lots?.includes(lot));

            const totalAttente = montantOffresAttente + montantOcAttente + 
                regiesHorsBudget.reduce((s, r) => s + r.montant, 0);
            const totalAjust = ajustL.reduce((sum, a) => sum + (a.montant || 0), 0);
            const prevu = cmdLot + totalAttente + totalAjust;
            const ecart = prevu - estLot;

            lotMap.set(lot, {
                lot,
                estime: estLot,
                engage: cmdLot,
                attente: totalAttente,
                ajustements: totalAjust,
                prevu: prevu,
                ecart: ecart,
                ecartPourcent: estLot > 0 ? ((ecart / estLot) * 100) : 0,
                // Détails
                commandes: commandesLot,
                offresAttente: offresAttenteL,
                ocAttente: ocAttenteL,
                regiesHorsBudget: regiesHorsBudget,
                ajustementsDetail: ajustL
            });
        });

        return Array.from(lotMap.values()).sort((a, b) => a.lot.localeCompare(b.lot));
    }, [estimations, commandes, offres, offresComplementaires, regies, ajustements]);

    // ========================================
    // FONCTIONS D'EXPANSION
    // ========================================
    const toggleLot = (lot) => {
        const newExpanded = new Set(expandedLots);
        if (newExpanded.has(lot)) {
            newExpanded.delete(lot);
        } else {
            newExpanded.add(lot);
        }
        setExpandedLots(newExpanded);
    };

    const toggleSection = (lot, section) => {
        setExpandedSections(prev => ({
            ...prev,
            [lot]: {
                ...prev[lot],
                [section]: !prev[lot]?.[section]
            }
        }));
    };

    const resetFilters = () => {
        setSelectedLots([]);
        setSelectedPos0([]);
        setSelectedEtape('');
    };

    const hasActiveFilters = selectedLots.length > 0 || selectedPos0.length > 0 || selectedEtape;

    // ========================================
    // RENDU
    // ========================================
    return React.createElement('div', { className: 'space-y-6' },
        // Titre
        React.createElement('div', null,
            React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, '📊 Alignement & Atterrissage'),
            React.createElement('p', { className: 'text-gray-600 mt-1' }, 'Réconciliation estimation vs réalisé et prévisions finales')
        ),

        // Filtres
        React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                React.createElement('h3', { className: 'text-lg font-bold' }, '🔍 Filtres'),
                hasActiveFilters && React.createElement('button', {
                    onClick: resetFilters,
                    className: 'text-sm text-red-600 hover:text-red-800 hover:underline flex items-center gap-1'
                },
                    React.createElement(window.Icons.X, { size: 16 }),
                    'Réinitialiser'
                )
            ),
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Lots'),
                    React.createElement('select', {
                        multiple: true,
                        value: selectedLots,
                        onChange: (e) => setSelectedLots(Array.from(e.target.selectedOptions, o => o.value)),
                        className: 'w-full px-3 py-2 border rounded-lg h-24 text-sm'
                    },
                        availableFilters.lots.map(lot =>
                            React.createElement('option', { key: lot, value: lot }, lot)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Positions Niv. 0'),
                    React.createElement('select', {
                        multiple: true,
                        value: selectedPos0,
                        onChange: (e) => setSelectedPos0(Array.from(e.target.selectedOptions, o => o.value)),
                        className: 'w-full px-3 py-2 border rounded-lg h-24 text-sm'
                    },
                        availableFilters.positions0.map(pos =>
                            React.createElement('option', { key: pos, value: pos }, pos)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Étape'),
                    React.createElement('select', {
                        value: selectedEtape,
                        onChange: (e) => setSelectedEtape(e.target.value),
                        className: 'w-full px-3 py-2 border rounded-lg'
                    },
                        React.createElement('option', { value: '' }, '-- Toutes --'),
                        availableFilters.etapes.map(etape =>
                            React.createElement('option', { key: etape, value: etape }, 'Étape ' + etape)
                        )
                    )
                )
            )
        ),

        // Cartes KPI
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4' },
            // Estimé
            React.createElement('div', { className: 'bg-blue-50 border-2 border-blue-200 rounded-lg p-4' },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-sm font-medium text-blue-700' }, 'Budget Estimé'),
                    React.createElement('span', { className: 'text-2xl' }, '📋')
                ),
                React.createElement('div', { className: 'text-2xl font-bold text-blue-900' },
                    globalStats.totalEstime.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('div', { className: 'text-xs text-blue-600 mt-1' }, 'Baseline projet')
            ),

            // Engagé
            React.createElement('div', { className: 'bg-green-50 border-2 border-green-200 rounded-lg p-4' },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-sm font-medium text-green-700' }, 'Engagé Confirmé'),
                    React.createElement('span', { className: 'text-2xl' }, '✅')
                ),
                React.createElement('div', { className: 'text-2xl font-bold text-green-900' },
                    globalStats.commandesEngagees.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('div', { className: 'text-xs text-green-600 mt-1' },
                    globalStats.totalEstime > 0 
                        ? ((globalStats.commandesEngagees / globalStats.totalEstime) * 100).toFixed(1) + '% du budget'
                        : '-'
                )
            ),

            // En attente
            React.createElement('div', { className: 'bg-orange-50 border-2 border-orange-200 rounded-lg p-4' },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-sm font-medium text-orange-700' }, 'En Attente'),
                    React.createElement('span', { className: 'text-2xl' }, '⏳')
                ),
                React.createElement('div', { className: 'text-2xl font-bold text-orange-900' },
                    globalStats.totalAttente.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('div', { className: 'text-xs text-orange-600 mt-1' },
                    'Offres + OC + Régies'
                )
            ),

            // Prévu
            React.createElement('div', { className: 'bg-purple-50 border-2 border-purple-200 rounded-lg p-4' },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-sm font-medium text-purple-700' }, 'Atterrissage Prévu'),
                    React.createElement('span', { className: 'text-2xl' }, '🎯')
                ),
                React.createElement('div', { className: 'text-2xl font-bold text-purple-900' },
                    globalStats.montantPrevu.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('div', { className: 'text-xs text-purple-600 mt-1' },
                    globalStats.totalEstime > 0 
                        ? ((globalStats.montantPrevu / globalStats.totalEstime) * 100).toFixed(1) + '% du budget'
                        : '-'
                )
            ),

            // Écart
            React.createElement('div', {
                className: 'border-2 rounded-lg p-4 ' + (
                    globalStats.ecart >= 0 
                        ? globalStats.ecartPourcent > 5 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                )
            },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', {
                        className: 'text-sm font-medium ' + (
                            globalStats.ecart >= 0 
                                ? globalStats.ecartPourcent > 5 
                                    ? 'text-red-700' 
                                    : 'text-yellow-700'
                                : 'text-green-700'
                        )
                    }, 'Écart Budget'),
                    React.createElement('span', { className: 'text-2xl' },
                        globalStats.ecart >= 0 
                            ? globalStats.ecartPourcent > 5 ? '🔴' : '⚠️' 
                            : '✅'
                    )
                ),
                React.createElement('div', {
                    className: 'text-2xl font-bold ' + (
                        globalStats.ecart >= 0 
                            ? globalStats.ecartPourcent > 5 
                                ? 'text-red-900' 
                                : 'text-yellow-900'
                            : 'text-green-900'
                    )
                },
                    (globalStats.ecart >= 0 ? '+' : '') + globalStats.ecart.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('div', {
                    className: 'text-xs mt-1 ' + (
                        globalStats.ecart >= 0 
                            ? globalStats.ecartPourcent > 5 
                                ? 'text-red-600' 
                                : 'text-yellow-600'
                            : 'text-green-600'
                    )
                },
                    (globalStats.ecart >= 0 ? '+' : '') + globalStats.ecartPourcent.toFixed(1) + '%'
                )
            )
        ),

        // Barre de progression
        React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('div', { className: 'flex justify-between items-center mb-3' },
                React.createElement('span', { className: 'font-semibold' }, 'Progression du budget'),
                React.createElement('span', { className: 'text-sm text-gray-600' },
                    globalStats.totalEstime > 0 
                        ? ((globalStats.montantPrevu / globalStats.totalEstime) * 100).toFixed(1) + '%'
                        : '0%'
                )
            ),
            React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-6 relative overflow-hidden' },
                React.createElement('div', {
                    className: 'h-6 bg-green-500 transition-all duration-500',
                    style: { 
                        width: Math.min((globalStats.commandesEngagees / globalStats.totalEstime) * 100, 100) + '%'
                    }
                }),
                React.createElement('div', {
                    className: 'h-6 bg-orange-400 transition-all duration-500 absolute top-0',
                    style: { 
                        left: (globalStats.commandesEngagees / globalStats.totalEstime) * 100 + '%',
                        width: Math.min((globalStats.totalAttente / globalStats.totalEstime) * 100, 100 - (globalStats.commandesEngagees / globalStats.totalEstime) * 100) + '%'
                    }
                }),
                globalStats.totalAjustements !== 0 && React.createElement('div', {
                    className: 'h-6 transition-all duration-500 absolute top-0 ' + (
                        globalStats.totalAjustements > 0 ? 'bg-red-400' : 'bg-blue-400'
                    ),
                    style: { 
                        left: ((globalStats.commandesEngagees + globalStats.totalAttente) / globalStats.totalEstime) * 100 + '%',
                        width: Math.abs((globalStats.totalAjustements / globalStats.totalEstime) * 100) + '%'
                    }
                })
            ),
            React.createElement('div', { className: 'flex justify-between mt-2 text-xs flex-wrap gap-2' },
                React.createElement('span', { className: 'flex items-center gap-1' },
                    React.createElement('span', { className: 'w-3 h-3 bg-green-500 rounded' }),
                    'Engagé: ' + globalStats.commandesEngagees.toLocaleString('fr-CH') + ' CHF'
                ),
                React.createElement('span', { className: 'flex items-center gap-1' },
                    React.createElement('span', { className: 'w-3 h-3 bg-orange-400 rounded' }),
                    'Attente: ' + globalStats.totalAttente.toLocaleString('fr-CH') + ' CHF'
                ),
                globalStats.totalAjustements !== 0 && React.createElement('span', { className: 'flex items-center gap-1' },
                    React.createElement('span', {
                        className: 'w-3 h-3 rounded ' + (globalStats.totalAjustements > 0 ? 'bg-red-400' : 'bg-blue-400')
                    }),
                    'Ajustements: ' + globalStats.totalAjustements.toLocaleString('fr-CH') + ' CHF'
                )
            )
        ),

        // Tableau de réconciliation par lot AVEC EXPANSION
        React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h3', { className: 'text-lg font-bold' }, '📋 Réconciliation par Lot'),
                React.createElement('button', {
                    onClick: () => {
                        setEditingAjustement(null);
                        setShowAjustementModal(true);
                    },
                    className: 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2'
                },
                    React.createElement(window.Icons.Plus, { size: 16 }),
                    'Ajouter un ajustement'
                )
            ),
            React.createElement('div', { className: 'overflow-x-auto' },
                React.createElement('table', { className: 'w-full' },
                    React.createElement('thead', { className: 'bg-gray-50 border-b-2' },
                        React.createElement('tr', null,
                            React.createElement('th', { className: 'px-4 py-3 text-left text-sm font-medium text-gray-600 w-8' }, ''),
                            React.createElement('th', { className: 'px-4 py-3 text-left text-sm font-medium text-gray-600' }, 'Lot'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Estimé'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Engagé ✓'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Attente ⏳'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Ajustements'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Prévu'),
                            React.createElement('th', { className: 'px-4 py-3 text-right text-sm font-medium text-gray-600' }, 'Écart'),
                            React.createElement('th', { className: 'px-4 py-3 text-center text-sm font-medium text-gray-600' }, '%')
                        )
                    ),
                    React.createElement('tbody', null,
                        dataByLot.map(row => 
                            React.createElement(React.Fragment, { key: row.lot },
                                // Ligne principale du lot
                                React.createElement('tr', { 
                                    className: 'border-t hover:bg-gray-50 cursor-pointer',
                                    onClick: () => toggleLot(row.lot)
                                },
                                    React.createElement('td', { className: 'px-4 py-3 text-center' },
                                        React.createElement('button', {
                                            className: 'text-gray-600 hover:text-blue-600 transition-transform ' + 
                                                (expandedLots.has(row.lot) ? 'rotate-90' : ''),
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                toggleLot(row.lot);
                                            }
                                        },
                                            React.createElement(window.Icons.ChevronRight, { size: 18 })
                                        )
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 font-medium text-blue-600' }, row.lot),
                                    React.createElement('td', { className: 'px-4 py-3 text-right' }, 
                                        row.estime.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 text-right text-green-700 font-semibold' },
                                        row.engage.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 text-right text-orange-700' },
                                        row.attente.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 text-right text-purple-700' },
                                        (row.ajustements >= 0 ? '+' : '') + row.ajustements.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 text-right font-bold' },
                                        row.prevu.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', {
                                        className: 'px-4 py-3 text-right font-semibold ' + (
                                            row.ecart > 0 
                                                ? Math.abs(row.ecartPourcent) > 5 
                                                    ? 'text-red-600' 
                                                    : 'text-orange-600'
                                                : 'text-green-600'
                                        )
                                    },
                                        (row.ecart >= 0 ? '+' : '') + row.ecart.toLocaleString('fr-CH') + ' CHF'
                                    ),
                                    React.createElement('td', { className: 'px-4 py-3 text-center' },
                                        React.createElement('span', {
                                            className: 'inline-block px-2 py-1 rounded text-xs font-semibold ' + (
                                                row.ecartPourcent > 5 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : row.ecartPourcent > 0 
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-green-100 text-green-700'
                                            )
                                        },
                                            (row.ecartPourcent >= 0 ? '+' : '') + row.ecartPourcent.toFixed(1) + '%'
                                        )
                                    )
                                ),

                                // Lignes de détail (si développé)
                                expandedLots.has(row.lot) && React.createElement('tr', { className: 'bg-gray-50' },
                                    React.createElement('td', { colSpan: 9, className: 'px-4 py-4' },
                                        React.createElement('div', { className: 'space-y-4' },
                                            
                                            // 💚 SECTION ENGAGÉ
                                            React.createElement('div', { className: 'border rounded-lg overflow-hidden' },
                                                React.createElement('button', {
                                                    onClick: () => toggleSection(row.lot, 'engage'),
                                                    className: 'w-full px-4 py-3 bg-green-50 hover:bg-green-100 flex items-center justify-between font-semibold text-green-800'
                                                },
                                                    React.createElement('span', { className: 'flex items-center gap-2' },
                                                        React.createElement('span', null, '💚'),
                                                        'Engagé (' + row.engage.toLocaleString('fr-CH') + ' CHF)',
                                                        React.createElement('span', { className: 'text-xs font-normal' }, 
                                                            row.commandes.length + ' commande(s)'
                                                        )
                                                    ),
                                                    React.createElement(window.Icons.ChevronRight, { 
                                                        size: 18,
                                                        className: 'transition-transform ' + (expandedSections[row.lot]?.engage ? 'rotate-90' : '')
                                                    })
                                                ),
                                                expandedSections[row.lot]?.engage && React.createElement('div', { className: 'p-4 bg-white' },
                                                    row.commandes.length === 0 ? 
                                                        React.createElement('p', { className: 'text-sm text-gray-500 italic' }, 'Aucune commande')
                                                    :
                                                        React.createElement('div', { className: 'space-y-2' },
                                                            row.commandes.map(cmd => {
                                                                const montant = cmd.calculatedMontant || cmd.montant || 0;
                                                                return React.createElement('div', {
                                                                    key: cmd.id,
                                                                    className: 'flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer',
                                                                    onClick: () => onEditCommande && onEditCommande(cmd)
                                                                },
                                                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                                                        React.createElement('span', { className: 'text-lg' }, '📦'),
                                                                        React.createElement('div', null,
                                                                            React.createElement('div', { className: 'font-semibold text-sm' }, cmd.numero),
                                                                            React.createElement('div', { className: 'text-xs text-gray-600' },
                                                                                cmd.fournisseur + ' • ' + (cmd.positions0?.join(', ') || 'Toutes positions')
                                                                            )
                                                                        )
                                                                    ),
                                                                    React.createElement('div', { className: 'text-right' },
                                                                        React.createElement('div', { className: 'font-bold text-green-700' },
                                                                            montant.toLocaleString('fr-CH') + ' CHF'
                                                                        )
                                                                    )
                                                                );
                                                            })
                                                        )
                                                )
                                            ),

                                            // 🟠 SECTION EN ATTENTE
                                            React.createElement('div', { className: 'border rounded-lg overflow-hidden' },
                                                React.createElement('button', {
                                                    onClick: () => toggleSection(row.lot, 'attente'),
                                                    className: 'w-full px-4 py-3 bg-orange-50 hover:bg-orange-100 flex items-center justify-between font-semibold text-orange-800'
                                                },
                                                    React.createElement('span', { className: 'flex items-center gap-2' },
                                                        React.createElement('span', null, '🟠'),
                                                        'En Attente (' + row.attente.toLocaleString('fr-CH') + ' CHF)',
                                                        React.createElement('span', { className: 'text-xs font-normal' }, 
                                                            (row.offresAttente.length + row.ocAttente.length + row.regiesHorsBudget.length) + ' élément(s)'
                                                        )
                                                    ),
                                                    React.createElement(window.Icons.ChevronRight, { 
                                                        size: 18,
                                                        className: 'transition-transform ' + (expandedSections[row.lot]?.attente ? 'rotate-90' : '')
                                                    })
                                                ),
                                                expandedSections[row.lot]?.attente && React.createElement('div', { className: 'p-4 bg-white space-y-3' },
                                                    // Offres en attente
                                                    row.offresAttente.length > 0 && React.createElement('div', null,
                                                        React.createElement('div', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'OFFRES'),
                                                        React.createElement('div', { className: 'space-y-2' },
                                                            row.offresAttente.map(offre =>
                                                                React.createElement('div', {
                                                                    key: offre.id,
                                                                    className: 'flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer',
                                                                    onClick: () => onEditOffre && onEditOffre(offre)
                                                                },
                                                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                                                        React.createElement('span', { className: 'text-lg' }, '💼'),
                                                                        React.createElement('div', null,
                                                                            React.createElement('div', { className: 'font-semibold text-sm' }, 
                                                                                offre.numero + ' - ' + offre.fournisseur
                                                                            ),
                                                                            React.createElement('div', { className: 'text-xs text-gray-600' },
                                                                                'Statut: ' + (offre.statut || 'En attente')
                                                                            )
                                                                        )
                                                                    ),
                                                                    React.createElement('div', { className: 'font-bold text-orange-700' },
                                                                        offre.montant.toLocaleString('fr-CH') + ' CHF'
                                                                    )
                                                                )
                                                            )
                                                        )
                                                    ),
                                                    
                                                    // OC en attente
                                                    row.ocAttente.length > 0 && React.createElement('div', null,
                                                        React.createElement('div', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'OFFRES COMPLÉMENTAIRES'),
                                                        React.createElement('div', { className: 'space-y-2' },
                                                            row.ocAttente.map(oc =>
                                                                React.createElement('div', {
                                                                    key: oc.id,
                                                                    className: 'flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer',
                                                                    onClick: () => onEditOffreComplementaire && onEditOffreComplementaire(oc)
                                                                },
                                                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                                                        React.createElement('span', { className: 'text-lg' }, '➕'),
                                                                        React.createElement('div', null,
                                                                            React.createElement('div', { className: 'font-semibold text-sm' }, 
                                                                                oc.numero + ' - ' + (oc.motif || 'OC')
                                                                            ),
                                                                            React.createElement('div', { className: 'text-xs text-gray-600' },
                                                                                oc.fournisseur
                                                                            )
                                                                        )
                                                                    ),
                                                                    React.createElement('div', { className: 'font-bold text-orange-700' },
                                                                        oc.montant.toLocaleString('fr-CH') + ' CHF'
                                                                    )
                                                                )
                                                            )
                                                        )
                                                    ),
                                                    
                                                    // Régies hors budget
                                                    row.regiesHorsBudget.length > 0 && React.createElement('div', null,
                                                        React.createElement('div', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'RÉGIES HORS BUDGET'),
                                                        React.createElement('div', { className: 'space-y-2' },
                                                            row.regiesHorsBudget.map((rh, idx) =>
                                                                React.createElement('div', {
                                                                    key: idx,
                                                                    className: 'flex items-center justify-between p-3 bg-red-50 rounded-lg'
                                                                },
                                                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                                                        React.createElement('span', { className: 'text-lg' }, '⏱️'),
                                                                        React.createElement('div', null,
                                                                            React.createElement('div', { className: 'font-semibold text-sm' }, 
                                                                                'Dépassement régie - ' + rh.commandeNumero
                                                                            ),
                                                                            React.createElement('div', { className: 'text-xs text-gray-600' },
                                                                                rh.regies.length + ' régie(s) hors budget'
                                                                            )
                                                                        )
                                                                    ),
                                                                    React.createElement('div', { className: 'font-bold text-red-700' },
                                                                        '+' + rh.montant.toLocaleString('fr-CH') + ' CHF'
                                                                    )
                                                                )
                                                            )
                                                        )
                                                    ),

                                                    (row.offresAttente.length === 0 && row.ocAttente.length === 0 && row.regiesHorsBudget.length === 0) &&
                                                        React.createElement('p', { className: 'text-sm text-gray-500 italic' }, 'Aucun élément en attente')
                                                )
                                            ),

                                            // 🟣 SECTION AJUSTEMENTS
                                            React.createElement('div', { className: 'border rounded-lg overflow-hidden' },
                                                React.createElement('button', {
                                                    onClick: () => toggleSection(row.lot, 'ajustements'),
                                                    className: 'w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 flex items-center justify-between font-semibold text-purple-800'
                                                },
                                                    React.createElement('span', { className: 'flex items-center gap-2' },
                                                        React.createElement('span', null, '🟣'),
                                                        'Ajustements (' + (row.ajustements >= 0 ? '+' : '') + row.ajustements.toLocaleString('fr-CH') + ' CHF)',
                                                        React.createElement('span', { className: 'text-xs font-normal' }, 
                                                            row.ajustementsDetail.length + ' ajustement(s)'
                                                        )
                                                    ),
                                                    React.createElement(window.Icons.ChevronRight, { 
                                                        size: 18,
                                                        className: 'transition-transform ' + (expandedSections[row.lot]?.ajustements ? 'rotate-90' : '')
                                                    })
                                                ),
                                                expandedSections[row.lot]?.ajustements && React.createElement('div', { className: 'p-4 bg-white' },
                                                    row.ajustementsDetail.length === 0 ? 
                                                        React.createElement('p', { className: 'text-sm text-gray-500 italic' }, 'Aucun ajustement')
                                                    :
                                                        React.createElement('div', { className: 'space-y-2' },
                                                            row.ajustementsDetail.map(adj =>
                                                                React.createElement('div', {
                                                                    key: adj.id,
                                                                    className: 'flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 cursor-pointer',
                                                                    onClick: () => {
                                                                        setEditingAjustement(adj);
                                                                        setShowAjustementModal(true);
                                                                    }
                                                                },
                                                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                                                        React.createElement('span', { className: 'text-lg' },
                                                                            adj.type === 'aleas' ? '⚡' : adj.type === 'economies' ? '💰' : '📝'
                                                                        ),
                                                                        React.createElement('div', null,
                                                                            React.createElement('div', { className: 'font-semibold text-sm' }, adj.description),
                                                                            React.createElement('div', { className: 'text-xs text-gray-600' },
                                                                                'Type: ' + adj.type + ' • ' + (adj.statut === 'confirme' ? '✅ Confirmé' : '⏳ Prévisionnel')
                                                                            )
                                                                        )
                                                                    ),
                                                                    React.createElement('div', {
                                                                        className: 'font-bold ' + (adj.montant >= 0 ? 'text-red-700' : 'text-green-700')
                                                                    },
                                                                        (adj.montant >= 0 ? '+' : '') + adj.montant.toLocaleString('fr-CH') + ' CHF'
                                                                    )
                                                                )
                                                            )
                                                        )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        ),
                        
                        // Ligne TOTAL
                        React.createElement('tr', { className: 'border-t-2 border-gray-300 bg-gray-50 font-bold' },
                            React.createElement('td', { className: 'px-4 py-3' }, ''),
                            React.createElement('td', { className: 'px-4 py-3' }, 'TOTAL'),
                            React.createElement('td', { className: 'px-4 py-3 text-right' }, 
                                globalStats.totalEstime.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', { className: 'px-4 py-3 text-right text-green-700' },
                                globalStats.commandesEngagees.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', { className: 'px-4 py-3 text-right text-orange-700' },
                                globalStats.totalAttente.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', { className: 'px-4 py-3 text-right text-purple-700' },
                                (globalStats.totalAjustements >= 0 ? '+' : '') + globalStats.totalAjustements.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', { className: 'px-4 py-3 text-right text-purple-900' },
                                globalStats.montantPrevu.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', {
                                className: 'px-4 py-3 text-right ' + (
                                    globalStats.ecart > 0 
                                        ? Math.abs(globalStats.ecartPourcent) > 5 
                                            ? 'text-red-600' 
                                            : 'text-orange-600'
                                        : 'text-green-600'
                                )
                            },
                                (globalStats.ecart >= 0 ? '+' : '') + globalStats.ecart.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('td', { className: 'px-4 py-3 text-center' },
                                React.createElement('span', {
                                    className: 'inline-block px-2 py-1 rounded text-xs font-semibold ' + (
                                        globalStats.ecartPourcent > 5 
                                            ? 'bg-red-100 text-red-700' 
                                            : globalStats.ecartPourcent > 0 
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-green-100 text-green-700'
                                    )
                                },
                                    (globalStats.ecartPourcent >= 0 ? '+' : '') + globalStats.ecartPourcent.toFixed(1) + '%'
                                )
                            )
                        )
                    )
                )
            )
        ),

        // Modal Ajustement
        showAjustementModal && React.createElement(window.AjustementModal, {
            initialData: editingAjustement,
            onClose: () => {
                setShowAjustementModal(false);
                setEditingAjustement(null);
            },
            onSave: onSaveAjustement,
            availableLots: availableFilters.lots,
            availablePos0: availableFilters.positions0
        })
    );
};
