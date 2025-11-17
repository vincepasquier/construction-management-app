// Vue Alignement & Atterrissage
window.AlignementView = ({ 
    estimations, 
    offres, 
    commandes, 
    offresComplementaires, 
    regies, 
    ajustements = [],
    onSaveAjustement 
}) => {
    // États
    const [selectedLots, setSelectedLots] = React.useState([]);
    const [selectedPos0, setSelectedPos0] = React.useState([]);
    const [selectedEtape, setSelectedEtape] = React.useState('');
    const [showAjustementModal, setShowAjustementModal] = React.useState(false);
    const [viewMode, setViewMode] = React.useState('lots');
    
    // Filtres disponibles
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

    // Fonction de filtrage
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

    // Calculs globaux
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

    // Données par lot
    const dataByLot = React.useMemo(() => {
        const lotMap = new Map();
        const allLots = new Set();
        
        [...estimations, ...commandes, ...offres, ...offresComplementaires, ...regies].forEach(item => {
            (item.lots || []).forEach(lot => allLots.add(lot));
        });

        allLots.forEach(lot => {
            const estLot = estimations
                .filter(e => e.lots?.includes(lot))
                .reduce((sum, e) => sum + (e.montantTotal || e.montant || 0), 0);

            const cmdLot = commandes
                .filter(c => c.lots?.includes(lot))
                .reduce((sum, cmd) => {
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

            const offresAttenteL = offres
                .filter(o => o.lots?.includes(lot) && (o.statut === 'En attente' || o.statut === 'Soumise'))
                .reduce((sum, o) => sum + (o.montant || 0), 0);

            const ocAttenteL = offresComplementaires
                .filter(oc => oc.lots?.includes(lot) && oc.statut === 'En attente')
                .reduce((sum, oc) => sum + (oc.montant || 0), 0);

            const ajustL = ajustements
                .filter(a => a.lots?.includes(lot))
                .reduce((sum, a) => sum + (a.montant || 0), 0);

            const prevu = cmdLot + offresAttenteL + ocAttenteL + ajustL;
            const ecart = prevu - estLot;

            lotMap.set(lot, {
                lot,
                estime: estLot,
                engage: cmdLot,
                attente: offresAttenteL + ocAttenteL,
                ajustements: ajustL,
                prevu: prevu,
                ecart: ecart,
                ecartPourcent: estLot > 0 ? ((ecart / estLot) * 100) : 0
            });
        });

        return Array.from(lotMap.values()).sort((a, b) => a.lot.localeCompare(b.lot));
    }, [estimations, commandes, offres, offresComplementaires, regies, ajustements]);

    // Éléments en attente
    const elementsAttente = React.useMemo(() => {
        const items = [];

        offres
            .filter(o => matchesFilters(o) && (o.statut === 'En attente' || o.statut === 'Soumise'))
            .forEach(o => {
                items.push({
                    type: 'offre',
                    description: 'Offre ' + o.fournisseur + ' (' + (o.lots?.join(', ') || '-') + ')',
                    montant: o.montant || 0,
                    statut: o.statut,
                    date: o.dateReception
                });
            });

        offresComplementaires
            .filter(oc => matchesFilters(oc) && oc.statut === 'En attente')
            .forEach(oc => {
                items.push({
                    type: 'oc',
                    description: 'OC ' + oc.numero + ' - ' + (oc.motif || 'OC'),
                    montant: oc.montant || 0,
                    statut: oc.statut,
                    date: oc.dateCreation
                });
            });

        commandes
            .filter(matchesFilters)
            .forEach(cmd => {
                const budgetRegie = cmd.budgetRegie || 0;
                if (budgetRegie === 0) return;
                
                const regiesLiees = regies.filter(r => r.commandeId === cmd.id);
                const montantRegies = regiesLiees.reduce((s, r) => s + (r.montantTotal || 0), 0);
                const depassement = montantRegies - budgetRegie;
                
                if (depassement > 0) {
                    items.push({
                        type: 'regie',
                        description: 'Régie hors budget (' + cmd.numero + ')',
                        montant: depassement,
                        statut: 'Dépassement',
                        date: null
                    });
                }
            });

        return items.sort((a, b) => (b.montant || 0) - (a.montant || 0));
    }, [offres, offresComplementaires, commandes, regies, selectedLots, selectedPos0, selectedEtape]);

    const resetFilters = () => {
        setSelectedLots([]);
        setSelectedPos0([]);
        setSelectedEtape('');
    };

    const hasActiveFilters = selectedLots.length > 0 || selectedPos0.length > 0 || selectedEtape;

    // RENDU - Je continue dans la partie 2...
    // Suite de AlignementView.js - PARTIE 2 : RENDU
    
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
                    elementsAttente.length + ' élément(s)'
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
            React.createElement('div', { className: 'flex justify-between mt-2 text-xs' },
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
    );
};

// PARTIE 3 - Suite et fin de AlignementView.js
        
        // Tableau de réconciliation par lot
        React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h3', { className: 'text-lg font-bold' }, '📋 Réconciliation par Lot'),
                React.createElement('button', {
                    onClick: () => setShowAjustementModal(true),
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
                            React.createElement('tr', { key: row.lot, className: 'border-t hover:bg-gray-50' },
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
                            )
                        ),
                        
                        // Ligne TOTAL
                        React.createElement('tr', { className: 'border-t-2 border-gray-300 bg-gray-50 font-bold' },
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

        // Éléments en attente
        elementsAttente.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('h3', { className: 'text-lg font-bold mb-4' }, '⚠️ Éléments en attente de validation'),
            React.createElement('div', { className: 'space-y-2' },
                elementsAttente.map((item, idx) =>
                    React.createElement('div', {
                        key: idx,
                        className: 'flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg'
                    },
                        React.createElement('div', { className: 'flex items-center gap-3' },
                            React.createElement('span', { className: 'text-2xl' },
                                item.type === 'offre' ? '💼' : item.type === 'oc' ? '➕' : '⏱️'
                            ),
                            React.createElement('div', null,
                                React.createElement('div', { className: 'font-medium' }, item.description),
                                React.createElement('div', { className: 'text-xs text-gray-600' },
                                    'Statut: ' + item.statut +
                                    (item.date ? ' • ' + new Date(item.date).toLocaleDateString('fr-CH') : '')
                                )
                            )
                        ),
                        React.createElement('div', { className: 'text-right' },
                            React.createElement('div', { className: 'font-bold text-orange-700' },
                                item.montant.toLocaleString('fr-CH') + ' CHF'
                            )
                        )
                    )
                )
            )
        ),

        // Ajustements & Prévisions
        ajustements.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border p-6' },
            React.createElement('h3', { className: 'text-lg font-bold mb-4' }, '📊 Ajustements & Prévisions'),
            React.createElement('div', { className: 'space-y-2' },
                ajustements.filter(matchesFilters).map((adj) =>
                    React.createElement('div', {
                        key: adj.id,
                        className: 'flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg'
                    },
                        React.createElement('div', { className: 'flex items-center gap-3' },
                            React.createElement('span', { className: 'text-2xl' },
                                adj.type === 'aleas' ? '⚡' : adj.type === 'economies' ? '💰' : '📝'
                            ),
                            React.createElement('div', null,
                                React.createElement('div', { className: 'font-medium' }, adj.description),
                                React.createElement('div', { className: 'text-xs text-gray-600' },
                                    'Type: ' + adj.type + ' • ' + (adj.lots?.join(', ') || 'Tous les lots') +
                                    (adj.commentaire ? ' • ' + adj.commentaire : '')
                                )
                            )
                        ),
                        React.createElement('div', { className: 'text-right' },
                            React.createElement('div', {
                                className: 'font-bold ' + (adj.montant > 0 ? 'text-red-700' : 'text-green-700')
                            },
                                (adj.montant >= 0 ? '+' : '') + adj.montant.toLocaleString('fr-CH') + ' CHF'
                            ),
                            React.createElement('div', { className: 'text-xs text-gray-500' },
                                adj.statut === 'confirme' ? '✅ Confirmé' : '⏳ Prévisionnel'
                            )
                        )
                    )
                )
            )
        ),

        // Modal Ajustement
        showAjustementModal && React.createElement(window.AjustementModal, {
            onClose: () => setShowAjustementModal(false),
            onSave: onSaveAjustement,
            availableLots: availableFilters.lots,
            availablePos0: availableFilters.positions0
        })
    ;
};
