// Vue Alignement & Atterrissage - VERSION FINALE AVEC DÉTAILS
window.AlignementView = ({ 
    estimations, 
    offres, 
    commandes, 
    offresComplementaires, 
    regies,
    factures = [],
    ajustements = [],
    onSaveAjustement,
    onEditCommande,
    onEditOffre,
    onEditOffreComplementaire,
    onEditAjustement,
    onEditFacture,
    onEditRegie
}) => {
    // ========================================
    // ÉTATS
    // ========================================
    const [selectedLots, setSelectedLots] = React.useState([]);
    const [selectedPos0, setSelectedPos0] = React.useState([]);
    const [selectedPos1, setSelectedPos1] = React.useState([]);
    const [selectedEtape, setSelectedEtape] = React.useState('');
    const [showAjustementModal, setShowAjustementModal] = React.useState(false);
    const [editingAjustement, setEditingAjustement] = React.useState(null);
    const [expandedRows, setExpandedRows] = React.useState(new Set());
    const [selectedRowForDetails, setSelectedRowForDetails] = React.useState(null);

    // ========================================
    // HELPER : Calculer le prorata
    // ========================================
    const calculateProrata = React.useCallback((item, targetLot, targetPos0 = null, targetPos1 = null) => {
        const itemLots = item.lots || [];
        const itemPos0 = item.positions0 || [];
        const itemPos1 = item.positions1 || [];
        
        if (targetLot && !itemLots.includes(targetLot)) return 0;
        if (targetPos0 && itemPos0.length > 0 && !itemPos0.includes(targetPos0)) return 0;
        if (targetPos1 && itemPos1.length > 0 && !itemPos1.includes(targetPos1)) return 0;
        
        let totalEstimation = 0;
        let targetEstimation = 0;
        
        estimations.forEach(e => {
            const estLots = e.lots || [];
            const estPos0 = e.positions0 || [];
            const estPos1 = e.positions1 || [];
            const montant = e.montantTotal || e.montant || 0;
            
            const matchLot = itemLots.length === 0 || itemLots.some(l => estLots.includes(l));
            const matchPos0 = itemPos0.length === 0 || itemPos0.some(p => estPos0.includes(p));
            const matchPos1 = itemPos1.length === 0 || itemPos1.some(p => estPos1.includes(p));
            
            if (matchLot && matchPos0 && matchPos1) {
                totalEstimation += montant;
            }
            
            const matchTargetLot = !targetLot || estLots.includes(targetLot);
            const matchTargetPos0 = !targetPos0 || estPos0.includes(targetPos0);
            const matchTargetPos1 = !targetPos1 || estPos1.includes(targetPos1);
            
            if (matchTargetLot && matchTargetPos0 && matchTargetPos1 && matchLot && matchPos0 && matchPos1) {
                targetEstimation += montant;
            }
        });
        
        return totalEstimation > 0 ? targetEstimation / totalEstimation : 0;
    }, [estimations]);

    // ========================================
    // FILTRES EN CASCADE
    // ========================================
    const availableFilters = React.useMemo(() => {
        const lotsSet = new Set();
        const pos0Set = new Set();
        const pos1Set = new Set();
        const etapesSet = new Set();

        [...estimations, ...commandes, ...offres].forEach(item => {
            (item.lots || []).forEach(lot => lotsSet.add(lot));
            if (item.etape) etapesSet.add(item.etape);
        });

        // Positions 0 filtrées selon les lots sélectionnés
        estimations.forEach(e => {
            const estLots = e.lots || [];
            if (selectedLots.length === 0 || selectedLots.some(lot => estLots.includes(lot))) {
                (e.positions0 || []).forEach(pos => pos0Set.add(pos));
            }
        });

        // Positions 1 filtrées selon les positions 0 sélectionnées
        estimations.forEach(e => {
            const estPos0 = e.positions0 || [];
            const estLots = e.lots || [];
            if ((selectedLots.length === 0 || selectedLots.some(lot => estLots.includes(lot))) &&
                (selectedPos0.length === 0 || selectedPos0.some(pos => estPos0.includes(pos)))) {
                (e.positions1 || []).forEach(pos => pos1Set.add(pos));
            }
        });

        return {
            lots: [...lotsSet].sort(),
            positions0: [...pos0Set].sort(),
            positions1: [...pos1Set].sort(),
            etapes: [...etapesSet].sort()
        };
    }, [estimations, commandes, offres, selectedLots, selectedPos0]);

    const matchesFilters = (item) => {
        if (selectedLots.length === 0 && selectedPos0.length === 0 && selectedPos1.length === 0 && !selectedEtape) return true;
        let matches = true;
        if (selectedLots.length > 0) {
            matches = matches && selectedLots.some(lot => (item.lots || []).includes(lot));
        }
        if (selectedPos0.length > 0) {
            matches = matches && selectedPos0.some(pos => (item.positions0 || []).includes(pos));
        }
        if (selectedPos1.length > 0) {
            matches = matches && selectedPos1.some(pos => (item.positions1 || []).includes(pos));
        }
        if (selectedEtape) {
            matches = matches && item.etape === selectedEtape;
        }
        return matches;
    };

    // ========================================
    // DONNÉES HIÉRARCHIQUES : LOT > POS0 > POS1
    // ========================================
    const hierarchicalData = React.useMemo(() => {
        const lotMap = new Map();

        // Récupérer tous les lots
        const allLots = new Set();
        estimations.forEach(e => (e.lots || []).forEach(lot => allLots.add(lot)));

        allLots.forEach(lot => {
            // Positions 0 du lot
            const pos0Set = new Set();
            estimations.filter(e => e.lots?.includes(lot)).forEach(e => {
                (e.positions0 || []).forEach(p => pos0Set.add(p));
            });

            const positions0 = [];
            pos0Set.forEach(pos0 => {
                // Positions 1 de la position 0
                const pos1Set = new Set();
                estimations.filter(e => e.lots?.includes(lot) && e.positions0?.includes(pos0)).forEach(e => {
                    (e.positions1 || []).forEach(p => pos1Set.add(p));
                });

                const positions1 = [];
                pos1Set.forEach(pos1 => {
                    const estPos1 = estimations
                        .filter(e => e.lots?.includes(lot) && e.positions0?.includes(pos0) && e.positions1?.includes(pos1))
                        .reduce((sum, e) => sum + (e.montantTotal || e.montant || 0), 0);
                    
                    let engagePos1 = 0;
                    commandes.forEach(cmd => {
                        const prorata = calculateProrata(cmd, lot, pos0, pos1);
                        if (prorata > 0) {
                            const montantBase = cmd.calculatedMontant || cmd.montant || 0;
                            engagePos1 += montantBase * prorata;
                        }
                    });

                    positions1.push({
                        type: 'pos1',
                        id: `${lot}-${pos0}-${pos1}`,
                        lot, pos0, pos1,
                        label: pos1,
                        estime: estPos1,
                        engage: engagePos1,
                        attente: 0,
                        ajustements: 0,
                        prevu: engagePos1,
                        ecart: engagePos1 - estPos1,
                        ecartPourcent: estPos1 > 0 ? ((engagePos1 - estPos1) / estPos1 * 100) : 0
                    });
                });

                const estPos0 = estimations
                    .filter(e => e.lots?.includes(lot) && e.positions0?.includes(pos0))
                    .reduce((sum, e) => sum + (e.montantTotal || e.montant || 0), 0);
                
                let engagePos0 = 0;
                commandes.forEach(cmd => {
                    const prorata = calculateProrata(cmd, lot, pos0);
                    if (prorata > 0) {
                        engagePos0 += (cmd.calculatedMontant || cmd.montant || 0) * prorata;
                    }
                });

                positions0.push({
                    type: 'pos0',
                    id: `${lot}-${pos0}`,
                    lot, pos0,
                    label: pos0,
                    estime: estPos0,
                    engage: engagePos0,
                    attente: 0,
                    ajustements: 0,
                    prevu: engagePos0,
                    ecart: engagePos0 - estPos0,
                    ecartPourcent: estPos0 > 0 ? ((engagePos0 - estPos0) / estPos0 * 100) : 0,
                    children: positions1.sort((a, b) => {
                        const pos1A = String(a.pos1 || '');
                        const pos1B = String(b.pos1 || '');
                        return pos1A.localeCompare(pos1B);
                    })
                });
            });

            const estLot = estimations
                .filter(e => e.lots?.includes(lot))
                .reduce((sum, e) => sum + (e.montantTotal || e.montant || 0), 0);
            
            let engageLot = 0;
            commandes.forEach(cmd => {
                const prorata = calculateProrata(cmd, lot);
                if (prorata > 0) {
                    engageLot += (cmd.calculatedMontant || cmd.montant || 0) * prorata;
                }
            });

            lotMap.set(lot, {
                type: 'lot',
                id: lot,
                lot,
                label: lot,
                estime: estLot,
                engage: engageLot,
                attente: 0,
                ajustements: 0,
                prevu: engageLot,
                ecart: engageLot - estLot,
                ecartPourcent: estLot > 0 ? ((engageLot - estLot) / estLot * 100) : 0,
                children: positions0.sort((a, b) => {
                    const pos0A = String(a.pos0 || '');
                    const pos0B = String(b.pos0 || '');
                    return pos0A.localeCompare(pos0B);
                })
            });
        });

        return Array.from(lotMap.values()).sort((a, b) => {
    const lotA = String(a.lot || '');
    const lotB = String(b.lot || '');
    return lotA.localeCompare(lotB);
});
    }, [estimations, commandes, calculateProrata]);

    // ========================================
    // OBTENIR DÉTAILS POUR UNE LIGNE
    // ========================================
    const getDetailsForRow = React.useCallback((row) => {
        const details = [];
        const { lot, pos0, pos1 } = row;

        // Récupérer toutes les commandes concernées
        const relatedCommandes = commandes.filter(cmd => {
            const prorata = calculateProrata(cmd, lot, pos0, pos1);
            return prorata > 0;
        });

        relatedCommandes.forEach(cmd => {
            const prorata = calculateProrata(cmd, lot, pos0, pos1);
            const montantBase = cmd.calculatedMontant || cmd.montant || 0;
            const montantProrata = montantBase * prorata;

            // Ajouter la commande
            details.push({
                type: 'commande',
                typeLabel: '📦 Commande',
                id: cmd.id,
                numero: cmd.numero,
                fournisseur: cmd.fournisseur,
                date: cmd.dateCommande,
                montantProrata: montantProrata,
                montantTotal: montantBase,
                prorata: prorata,
                prorataPercent: (prorata * 100).toFixed(1),
                statut: cmd.statut || 'Validée',
                commandeId: cmd.id,
                data: cmd
            });

            // Ajouter les factures liées
            const facturesLiees = factures.filter(f => f.commandeId === cmd.id);
            facturesLiees.forEach(f => {
                const montantFacture = f.montantTTC || f.montantHT || 0;
                details.push({
                    type: 'facture',
                    typeLabel: '💰 Facture',
                    id: f.id,
                    numero: f.numero,
                    fournisseur: f.fournisseur || cmd.fournisseur,
                    date: f.dateFacture,
                    montantProrata: montantFacture * prorata,
                    montantTotal: montantFacture,
                    prorata: prorata,
                    prorataPercent: (prorata * 100).toFixed(1),
                    statut: f.statut,
                    commandeId: cmd.id,
                    commandeNumero: cmd.numero,
                    data: f
                });
            });

            // Ajouter les régies liées
            const regiesLiees = regies.filter(r => r.commandeId === cmd.id);
            regiesLiees.forEach(r => {
                const prorataRegie = calculateProrata(r, lot, pos0, pos1);
                const montantRegie = r.montantTotal || 0;
                details.push({
                    type: 'regie',
                    typeLabel: '⏱️ Régie',
                    id: r.id,
                    numero: r.numero || `R-${r.id}`,
                    fournisseur: r.fournisseur || cmd.fournisseur,
                    date: r.dateDebut,
                    montantProrata: montantRegie * prorataRegie,
                    montantTotal: montantRegie,
                    prorata: prorataRegie,
                    prorataPercent: (prorataRegie * 100).toFixed(1),
                    statut: '-',
                    commandeId: cmd.id,
                    commandeNumero: cmd.numero,
                    data: r
                });
            });

            // Ajouter les OC liées
            const ocLiees = offresComplementaires.filter(oc => oc.commandeId === cmd.id);
            ocLiees.forEach(oc => {
                const prorataOC = calculateProrata(oc, lot, pos0, pos1);
                const montantOC = oc.montant || 0;
                details.push({
                    type: 'oc',
                    typeLabel: '➕ OC',
                    id: oc.id,
                    numero: oc.numero,
                    fournisseur: oc.fournisseur || cmd.fournisseur,
                    date: oc.dateOffre,
                    montantProrata: montantOC * prorataOC,
                    montantTotal: montantOC,
                    prorata: prorataOC,
                    prorataPercent: (prorataOC * 100).toFixed(1),
                    statut: oc.statut,
                    commandeId: cmd.id,
                    commandeNumero: cmd.numero,
                    data: oc
                });
            });
        });

        // Factures hors commandes (orphelines)
        const facturesOrphelines = factures.filter(f => {
            if (f.commandeId) return false;
            const fLots = f.lots || [];
            const fPos0 = f.positions0 || [];
            const fPos1 = f.positions1 || [];
            
            let match = fLots.includes(lot);
            if (pos0) match = match && (fPos0.length === 0 || fPos0.includes(pos0));
            if (pos1) match = match && (fPos1.length === 0 || fPos1.includes(pos1));
            
            return match;
        });

        facturesOrphelines.forEach(f => {
            const prorata = calculateProrata(f, lot, pos0, pos1);
            const montantFacture = f.montantTTC || f.montantHT || 0;
            details.push({
                type: 'facture',
                typeLabel: '💰 Facture',
                id: f.id,
                numero: f.numero,
                fournisseur: f.fournisseur,
                date: f.dateFacture,
                montantProrata: montantFacture * prorata,
                montantTotal: montantFacture,
                prorata: prorata,
                prorataPercent: (prorata * 100).toFixed(1),
                statut: f.statut,
                commandeId: null,
                commandeNumero: 'HORS COMMANDES',
                data: f
            });
        });

        // Trier : par commande d'abord, puis hors commandes
        return details.sort((a, b) => {
            if (a.commandeNumero === 'HORS COMMANDES' && b.commandeNumero !== 'HORS COMMANDES') return 1;
            if (a.commandeNumero !== 'HORS COMMANDES' && b.commandeNumero === 'HORS COMMANDES') return -1;
            if (a.commandeNumero !== b.commandeNumero) {
                const numA = String(a.commandeNumero || '');
                const numB = String(b.commandeNumero || '');
                return numA.localeCompare(numB);
                }
            const typeOrder = { 'commande': 0, 'facture': 1, 'regie': 2, 'oc': 3 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
    }, [commandes, factures, regies, offresComplementaires, calculateProrata]);

    const toggleRow = (rowId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(rowId)) {
            newExpanded.delete(rowId);
        } else {
            newExpanded.add(rowId);
        }
        setExpandedRows(newExpanded);
    };

    const selectRowForDetails = (row) => {
        if (selectedRowForDetails?.id === row.id) {
            setSelectedRowForDetails(null);
        } else {
            setSelectedRowForDetails(row);
        }
    };

    const resetFilters = () => {
        setSelectedLots([]);
        setSelectedPos0([]);
        setSelectedPos1([]);
        setSelectedEtape('');
    };

    const hasActiveFilters = selectedLots.length > 0 || selectedPos0.length > 0 || selectedPos1.length > 0 || selectedEtape;

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
                    return sum + montantBase + montantOC + Math.max(0, montantRegies - budgetRegie);
                }
                return sum + montantBase + montantOC + montantRegies;
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
    }, [estimations, commandes, offres, offresComplementaires, regies, ajustements, matchesFilters]);

    // ========================================
    // FONCTION RÉCURSIVE DE RENDU DES LIGNES
    // ========================================
    const renderRow = (row, level = 0) => {
        const isExpanded = expandedRows.has(row.id);
        const isSelected = selectedRowForDetails?.id === row.id;
        const hasChildren = row.children && row.children.length > 0;
        const indent = level * 24;

        return React.createElement(React.Fragment, { key: row.id },
            React.createElement('tr', {
                className: 'border-t hover:bg-gray-50 cursor-pointer ' + (isSelected ? 'bg-blue-50' : ''),
                onClick: () => selectRowForDetails(row)
            },
                React.createElement('td', { className: 'px-4 py-3 text-center' },
                    hasChildren && React.createElement('button', {
                        className: 'text-gray-600 hover:text-blue-600 transition-transform ' + (isExpanded ? 'rotate-90' : ''),
                        onClick: (e) => { e.stopPropagation(); toggleRow(row.id); }
                    },
                        React.createElement(ChevronRight, { size: 18 })
                    )
                ),
                React.createElement('td', { className: 'px-4 py-3', style: { paddingLeft: (16 + indent) + 'px' } },
                    React.createElement('span', {
                        className: 'font-medium ' + (
                            row.type === 'lot' ? 'text-blue-600 text-base' :
                            row.type === 'pos0' ? 'text-blue-500 text-sm' :
                            'text-gray-700 text-sm'
                        )
                    }, row.label)
                ),
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

            // Tableau de détails si ligne sélectionnée
            isSelected && React.createElement('tr', { className: 'bg-blue-50' },
                React.createElement('td', { colSpan: 9, className: 'px-4 py-4' },
                    React.createElement('div', { className: 'bg-white rounded-lg border' },
                        React.createElement('div', { className: 'px-4 py-3 bg-gray-50 border-b font-semibold text-sm' },
                            '📋 Détails : ' + row.label
                        ),
                        React.createElement('div', { className: 'overflow-x-auto' },
                            React.createElement('table', { className: 'w-full text-sm' },
                                React.createElement('thead', { className: 'bg-gray-100' },
                                    React.createElement('tr', null,
                                        React.createElement('th', { className: 'px-3 py-2 text-left' }, 'Type'),
                                        React.createElement('th', { className: 'px-3 py-2 text-left' }, 'Numéro'),
                                        React.createElement('th', { className: 'px-3 py-2 text-left' }, 'Fournisseur'),
                                        React.createElement('th', { className: 'px-3 py-2 text-left' }, 'Date'),
                                        React.createElement('th', { className: 'px-3 py-2 text-right' }, 'Montant Prorata'),
                                        React.createElement('th', { className: 'px-3 py-2 text-right' }, 'Montant Total'),
                                        React.createElement('th', { className: 'px-3 py-2 text-center' }, '% Prorata'),
                                        React.createElement('th', { className: 'px-3 py-2 text-center' }, 'Statut'),
                                        React.createElement('th', { className: 'px-3 py-2 text-center' }, 'Actions')
                                    )
                                ),
                                React.createElement('tbody', null,
                                    getDetailsForRow(row).length === 0 ? 
                                        React.createElement('tr', null,
                                            React.createElement('td', { colSpan: 9, className: 'px-3 py-4 text-center text-gray-500 italic' },
                                                'Aucune commande ou facture pour cette ligne'
                                            )
                                        )
                                    :
                                    getDetailsForRow(row).map((detail, idx, arr) => {
                                        const showCommandeHeader = detail.type === 'commande' || 
                                            (idx === 0 || detail.commandeNumero !== arr[idx - 1].commandeNumero);
                                        
                                        return React.createElement(React.Fragment, { key: `${detail.type}-${detail.id}` },
                                            showCommandeHeader && detail.commandeNumero === 'HORS COMMANDES' && 
                                                React.createElement('tr', { className: 'bg-red-50' },
                                                    React.createElement('td', { colSpan: 9, className: 'px-3 py-2 font-semibold text-red-700 text-xs' },
                                                        '🚫 HORS COMMANDES'
                                                    )
                                                ),
                                            React.createElement('tr', {
                                                className: 'border-t hover:bg-gray-50 cursor-pointer ' + 
                                                    (detail.type === 'commande' ? 'bg-blue-50 font-semibold' : ''),
                                                onClick: () => {
                                                    if (detail.type === 'commande' && onEditCommande) onEditCommande(detail.data);
                                                    if (detail.type === 'facture' && onEditFacture) onEditFacture(detail.data);
                                                    if (detail.type === 'regie' && onEditRegie) onEditRegie(detail.data);
                                                    if (detail.type === 'oc' && onEditOffreComplementaire) onEditOffreComplementaire(detail.data);
                                                }
                                            },
                                                React.createElement('td', { className: 'px-3 py-2' }, detail.typeLabel),
                                                React.createElement('td', { className: 'px-3 py-2' }, detail.numero),
                                                React.createElement('td', { className: 'px-3 py-2' }, detail.fournisseur),
                                                React.createElement('td', { className: 'px-3 py-2' }, 
                                                    detail.date ? new Date(detail.date).toLocaleDateString('fr-CH') : '-'
                                                ),
                                                React.createElement('td', { className: 'px-3 py-2 text-right font-semibold' },
                                                    detail.montantProrata.toLocaleString('fr-CH') + ' CHF'
                                                ),
                                                React.createElement('td', { className: 'px-3 py-2 text-right text-gray-600' },
                                                    detail.montantTotal.toLocaleString('fr-CH') + ' CHF'
                                                ),
                                                React.createElement('td', { className: 'px-3 py-2 text-center' },
                                                    React.createElement('span', {
                                                        className: 'px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium'
                                                    }, detail.prorataPercent + '%')
                                                ),
                                                React.createElement('td', { className: 'px-3 py-2 text-center' },
                                                    React.createElement('span', {
                                                        className: 'px-2 py-0.5 rounded text-xs ' + (
                                                            detail.statut === 'Payée' || detail.statut === 'Validée' 
                                                                ? 'bg-green-100 text-green-700'
                                                                : detail.statut === 'En attente' 
                                                                    ? 'bg-orange-100 text-orange-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                        )
                                                    }, detail.statut)
                                                ),
                                                React.createElement('td', { className: 'px-3 py-2 text-center' },
                                                    React.createElement('button', {
                                                        className: 'text-blue-600 hover:text-blue-800',
                                                        title: 'Ouvrir'
                                                    },
                                                        React.createElement(window.Icons.Eye, { size: 16 })
                                                    )
                                                )
                                            )
                                        );
                                    })
                                )
                            )
                        )
                    )
                )
            ),

            // Enfants (récursif)
            isExpanded && hasChildren && row.children.map(child => renderRow(child, level + 1))
        );
    };

    // ========================================
    // RENDU
    // ========================================
    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', null,
            React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, '📊 Alignement & Atterrissage'),
            React.createElement('p', { className: 'text-gray-600 mt-1' }, 'Réconciliation estimation vs réalisé et prévisions finales')
        ),

        // Filtres en cascade
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
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Lots'),
                    React.createElement('select', {
                        multiple: true,
                        value: selectedLots,
                        onChange: (e) => {
                            setSelectedLots(Array.from(e.target.selectedOptions, o => o.value));
                            setSelectedPos0([]);
                            setSelectedPos1([]);
                        },
                        className: 'w-full px-3 py-2 border rounded-lg h-24 text-sm'
                    },
                        availableFilters.lots.map(lot =>
                            React.createElement('option', { key: lot, value: lot }, lot)
                        )
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
                        'Positions Niv. 0' + (selectedLots.length > 0 ? ' (filtrées)' : '')
                    ),
                    React.createElement('select', {
                        multiple: true,
                        value: selectedPos0,
                        onChange: (e) => {
                            setSelectedPos0(Array.from(e.target.selectedOptions, o => o.value));
                            setSelectedPos1([]);
                        },
                        disabled: availableFilters.positions0.length === 0,
                        className: 'w-full px-3 py-2 border rounded-lg h-24 text-sm disabled:bg-gray-100'
                    },
                        availableFilters.positions0.map(pos =>
                            React.createElement('option', { key: pos, value: pos }, pos)
                        )
                    ),
                    availableFilters.positions0.length === 0 && React.createElement('p', { className: 'text-xs text-gray-500 mt-1 italic' }, 
                        'Sélectionnez un lot d\'abord'
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 
                        'Positions Niv. 1' + (selectedPos0.length > 0 ? ' (filtrées)' : '')
                    ),
                    React.createElement('select', {
                        multiple: true,
                        value: selectedPos1,
                        onChange: (e) => setSelectedPos1(Array.from(e.target.selectedOptions, o => o.value)),
                        disabled: availableFilters.positions1.length === 0,
                        className: 'w-full px-3 py-2 border rounded-lg h-24 text-sm disabled:bg-gray-100'
                    },
                        availableFilters.positions1.map(pos =>
                            React.createElement('option', { key: pos, value: pos }, pos)
                        )
                    ),
                    availableFilters.positions1.length === 0 && React.createElement('p', { className: 'text-xs text-gray-500 mt-1 italic' }, 
                        'Sélectionnez une position 0 d\'abord'
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

        // Tableau de réconciliation hiérarchique
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
            selectedRowForDetails && React.createElement('div', { className: 'mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm' },
                React.createElement('span', { className: 'font-semibold' }, '💡 Astuce : '),
                'Cliquez sur une ligne pour voir ses détails (commandes, factures, régies...). Cliquez à nouveau pour fermer.'
            ),
            React.createElement('div', { className: 'overflow-x-auto' },
                React.createElement('table', { className: 'w-full' },
                    React.createElement('thead', { className: 'bg-gray-50 border-b-2' },
                        React.createElement('tr', null,
                            React.createElement('th', { className: 'px-4 py-3 text-left text-sm font-medium text-gray-600 w-8' }, ''),
                            React.createElement('th', { className: 'px-4 py-3 text-left text-sm font-medium text-gray-600' }, 'Lot / Position'),
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
                        hierarchicalData.map(lot => renderRow(lot)),
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

    
