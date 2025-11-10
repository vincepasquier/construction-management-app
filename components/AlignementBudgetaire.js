// Alignement BudgÃ©taire - Vue hiÃ©rarchique Lot > Position0 > Position1
const { useState, useMemo } = React;

window.AlignementBudgetaire = ({ estimations, offres, offresComplementaires, commandes, regies, factures }) => {
    const [expandedLots, setExpandedLots] = useState({});
    const [expandedPos0, setExpandedPos0] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Construction de la hiÃ©rarchie des donnÃ©es
    const hierarchyData = useMemo(() => {
        const hierarchy = {};

        // Fonction pour ajouter des montants Ã  la hiÃ©rarchie
        const addToHierarchy = (lots, pos0s, pos1s, montant, type) => {
            (lots || []).forEach(lot => {
                if (!hierarchy[lot]) {
                    hierarchy[lot] = { 
                        estimation: 0, 
                        offres: 0, 
                        offresComp: 0,
                        commandes: 0, 
                        regies: 0, 
                        factures: 0,
                        positions0: {} 
                    };
                }
                hierarchy[lot][type] += montant;

                (pos0s || []).forEach(pos0 => {
                    if (!hierarchy[lot].positions0[pos0]) {
                        hierarchy[lot].positions0[pos0] = { 
                            estimation: 0, 
                            offres: 0, 
                            offresComp: 0,
                            commandes: 0, 
                            regies: 0, 
                            factures: 0,
                            positions1: {} 
                        };
                    }
                    hierarchy[lot].positions0[pos0][type] += montant;

                    (pos1s || []).forEach(pos1 => {
                        if (!hierarchy[lot].positions0[pos0].positions1[pos1]) {
                            hierarchy[lot].positions0[pos0].positions1[pos1] = { 
                                estimation: 0, 
                                offres: 0, 
                                offresComp: 0,
                                commandes: 0, 
                                regies: 0, 
                                factures: 0
                            };
                        }
                        hierarchy[lot].positions0[pos0].positions1[pos1][type] += montant;
                    });
                });
            });
        };

        // Ajouter les estimations
        estimations.forEach(est => {
            addToHierarchy(est.lots, est.positions0, est.positions1, est.montant || 0, 'estimation');
        });

        // Ajouter les offres
        offres.forEach(off => {
            addToHierarchy(off.lots, off.positions0, off.positions1, off.montant || 0, 'offres');
        });

        // Ajouter les offres complÃ©mentaires
        offresComplementaires.forEach(oc => {
            addToHierarchy(oc.lots, oc.positions0, oc.positions1, oc.montant || 0, 'offresComp');
        });

        // Ajouter les commandes
        commandes.forEach(cmd => {
            const montant = cmd.calculatedMontant || cmd.montant || 0;
            addToHierarchy(cmd.lots, cmd.positions0, cmd.positions1, montant, 'commandes');
        });

        // Ajouter les rÃ©gies
        regies.forEach(regie => {
            addToHierarchy(regie.lots, regie.positions0, regie.positions1, regie.montantTotal || 0, 'regies');
        });

        // Ajouter les factures
        factures.forEach(fact => {
            const cmd = commandes.find(c => c.id === fact.commandeId);
            if (cmd) {
                addToHierarchy(cmd.lots, cmd.positions0, cmd.positions1, fact.montantHT || 0, 'factures');
            }
        });

        return hierarchy;
    }, [estimations, offres, offresComplementaires, commandes, regies, factures]);

    // Filtrer par recherche
    const filteredHierarchy = useMemo(() => {
        if (!searchTerm) return hierarchyData;

        const filtered = {};
        const search = searchTerm.toLowerCase();

        Object.entries(hierarchyData).forEach(([lot, lotData]) => {
            if (lot.toLowerCase().includes(search)) {
                filtered[lot] = lotData;
                return;
            }

            const filteredPos0 = {};
            Object.entries(lotData.positions0).forEach(([pos0, pos0Data]) => {
                if (pos0.toLowerCase().includes(search)) {
                    filteredPos0[pos0] = pos0Data;
                    return;
                }

                const filteredPos1 = {};
                Object.entries(pos0Data.positions1).forEach(([pos1, pos1Data]) => {
                    if (pos1.toLowerCase().includes(search)) {
                        filteredPos1[pos1] = pos1Data;
                    }
                });

                if (Object.keys(filteredPos1).length > 0) {
                    filteredPos0[pos0] = { ...pos0Data, positions1: filteredPos1 };
                }
            });

            if (Object.keys(filteredPos0).length > 0) {
                filtered[lot] = { ...lotData, positions0: filteredPos0 };
            }
        });

        return filtered;
    }, [hierarchyData, searchTerm]);

    const toggleLot = (lot) => {
        setExpandedLots(prev => ({ ...prev, [lot]: !prev[lot] }));
    };

    const togglePos0 = (key) => {
        setExpandedPos0(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const expandAll = () => {
        const allLots = {};
        const allPos0 = {};
        Object.keys(filteredHierarchy).forEach(lot => {
            allLots[lot] = true;
            Object.keys(filteredHierarchy[lot].positions0).forEach(pos0 => {
                allPos0[`${lot}-${pos0}`] = true;
            });
        });
        setExpandedLots(allLots);
        setExpandedPos0(allPos0);
    };

    const collapseAll = () => {
        setExpandedLots({});
        setExpandedPos0({});
    };

    // Composant pour afficher une ligne de montants
    const MontantRow = ({ data, label, niveau = 0 }) => {
        const totalDepense = (data.commandes || 0) + (data.regies || 0);
        const ecart = (data.estimation || 0) - totalDepense;
        const tauxEngagement = data.estimation > 0 ? (totalDepense / data.estimation * 100) : 0;

        const bgColor = niveau === 0 ? 'bg-blue-50' : niveau === 1 ? 'bg-gray-50' : 'bg-white';
        const fontWeight = niveau === 0 ? 'font-bold' : niveau === 1 ? 'font-semibold' : '';

        return (
            <tr className={`${bgColor} border-b`}>
                <td className={`px-4 py-2 ${fontWeight}`} style={{paddingLeft: `${niveau * 20 + 16}px`}}>
                    {label}
                </td>
                <td className="px-4 py-2 text-right">{data.estimation?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
                <td className="px-4 py-2 text-right">{data.offres?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
                <td className="px-4 py-2 text-right">{data.offresComp?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
                <td className="px-4 py-2 text-right">{data.commandes?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
                <td className="px-4 py-2 text-right">{data.regies?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
                <td className="px-4 py-2 text-right font-medium">{totalDepense.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                <td className={`px-4 py-2 text-right font-medium ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ecart.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                </td>
                <td className="px-4 py-2 text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                        tauxEngagement > 100 ? 'bg-red-100 text-red-800' :
                        tauxEngagement > 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                        {tauxEngagement.toFixed(1)}%
                    </span>
                </td>
                <td className="px-4 py-2 text-right">{data.factures?.toLocaleString('fr-CH', {minimumFractionDigits: 2}) || '-'}</td>
            </tr>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ðŸŽ¯ Alignement BudgÃ©taire</h2>
                <div className="flex gap-2">
                    <button
                        onClick={expandAll}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                        âž• Tout dÃ©velopper
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                        âž– Tout rÃ©duire
                    </button>
                </div>
            </div>

            {/* Recherche */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="ðŸ” Rechercher un lot, position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                />
            </div>

            {/* LÃ©gende */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="flex gap-4 flex-wrap">
                    <div><span className="font-semibold">ðŸ“Š Estimation:</span> Budget prÃ©vu</div>
                    <div><span className="font-semibold">ðŸ’¼ Offres:</span> Offres reÃ§ues</div>
                    <div><span className="font-semibold">âž• OC:</span> Offres complÃ©mentaires</div>
                    <div><span className="font-semibold">ðŸ“¦ Commandes:</span> Montants commandÃ©s</div>
                    <div><span className="font-semibold">â±ï¸ RÃ©gies:</span> Travaux en rÃ©gie</div>
                    <div><span className="font-semibold">ðŸ’° Total:</span> Commandes + RÃ©gies</div>
                    <div><span className="font-semibold">ðŸ“ˆ Ã‰cart:</span> Budget - Total</div>
                    <div><span className="font-semibold">ðŸ“„ Factures:</span> Montants facturÃ©s</div>
                </div>
            </div>

            {/* Tableau hiÃ©rarchique */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left">Lot / Position</th>
                            <th className="px-4 py-3 text-right">Estimation</th>
                            <th className="px-4 py-3 text-right">Offres</th>
                            <th className="px-4 py-3 text-right">OC</th>
                            <th className="px-4 py-3 text-right">Commandes</th>
                            <th className="px-4 py-3 text-right">RÃ©gies</th>
                            <th className="px-4 py-3 text-right">Total DÃ©pensÃ©</th>
                            <th className="px-4 py-3 text-right">Ã‰cart</th>
                            <th className="px-4 py-3 text-right">Taux</th>
                            <th className="px-4 py-3 text-right">Factures</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(filteredHierarchy).length === 0 ? (
                            <tr>
                                <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                                    {searchTerm ? 'Aucun rÃ©sultat trouvÃ©' : 'Aucune donnÃ©e disponible'}
                                </td>
                            </tr>
                        ) : (
                            Object.entries(filteredHierarchy).map(([lot, lotData]) => (
                                <React.Fragment key={lot}>
                                    <tr className="bg-blue-100 hover:bg-blue-200 cursor-pointer" onClick={() => toggleLot(lot)}>
                                        <td className="px-4 py-2 font-bold flex items-center gap-2">
                                            {expandedLots[lot] ? <window.Icons.ChevronDown /> : <window.Icons.ChevronRight />}
                                            ðŸ“¦ {lot}
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold">{lotData.estimation.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-right">{lotData.offres.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-right">{lotData.offresComp.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-right">{lotData.commandes.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-right">{lotData.regies.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-right font-bold">
                                            {(lotData.commandes + lotData.regies).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className={`px-4 py-2 text-right font-bold ${
                                            (lotData.estimation - lotData.commandes - lotData.regies) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {(lotData.estimation - lotData.commandes - lotData.regies).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                ((lotData.commandes + lotData.regies) / lotData.estimation * 100) > 100 ? 'bg-red-100 text-red-800' :
                                                ((lotData.commandes + lotData.regies) / lotData.estimation * 100) > 90 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {((lotData.commandes + lotData.regies) / lotData.estimation * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">{lotData.factures.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                    </tr>

                                    {expandedLots[lot] && Object.entries(lotData.positions0).map(([pos0, pos0Data]) => (
                                        <React.Fragment key={`${lot}-${pos0}`}>
                                            <tr className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={() => togglePos0(`${lot}-${pos0}`)}>
                                                <td className="px-4 py-2 font-semibold flex items-center gap-2" style={{paddingLeft: '36px'}}>
                                                    {expandedPos0[`${lot}-${pos0}`] ? <window.Icons.ChevronDown /> : <window.Icons.ChevronRight />}
                                                    ðŸ“‹ {pos0}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold">{pos0Data.estimation.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-2 text-right">{pos0Data.offres.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-2 text-right">{pos0Data.offresComp.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-2 text-right">{pos0Data.commandes.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-2 text-right">{pos0Data.regies.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-2 text-right font-semibold">
                                                    {(pos0Data.commandes + pos0Data.regies).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                </td>
                                                <td className={`px-4 py-2 text-right font-semibold ${
                                                    (pos0Data.estimation - pos0Data.commandes - pos0Data.regies) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {(pos0Data.estimation - pos0Data.commandes - pos0Data.regies).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        ((pos0Data.commandes + pos0Data.regies) / pos0Data.estimation * 100) > 100 ? 'bg-red-100 text-red-800' :
                                                        ((pos0Data.commandes + pos0Data.regies) / pos0Data.estimation * 100) > 90 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {((pos0Data.commandes + pos0Data.regies) / pos0Data.estimation * 100).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right">{pos0Data.factures.toLocaleString('fr-CH', {minimumFractionDigits: 2})}</td>
                                            </tr>

                                            {expandedPos0[`${lot}-${pos0}`] && Object.entries(pos0Data.positions1).map(([pos1, pos1Data]) => (
                                                <MontantRow key={`${lot}-${pos0}-${pos1}`} data={pos1Data} label={`ðŸ“„ ${pos1}`} niveau={2} />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
