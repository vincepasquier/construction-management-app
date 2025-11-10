// Alignement Budgétaire - Vue hiérarchique Lot > Position0 > Position1
const { useState, useMemo } = React;

window.AlignementBudgetaire = ({ estimations, offres, offresComplementaires, commandes, regies, factures }) => {
    const [expandedLots, setExpandedLots] = useState({});
    const [expandedPos0, setExpandedPos0] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Construction de la hiérarchie des données
    const hierarchyData = useMemo(() => {
        const hierarchy = {};

        // Fonction pour ajouter des montants à la hiérarchie
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

        // Ajouter les offres complémentaires
        offresComplementaires.forEach(oc => {
            addToHierarchy(oc.lots, oc.positions0, oc.positions1, oc.montant || 0, 'offresComp');
        });

        // Ajouter les commandes
        commandes.forEach(cmd => {
            const montant = cmd.calculatedMontant || cmd.montant || 0;
            addToHierarchy(cmd.lots, cmd.positions0, cmd.positions1, montant, 'commandes');
        });

        // Ajouter les régies
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
        return (
            <td className="px-4 py-2 text-right text-sm">
                {montant > 0 ? montant.toLocaleString('fr-CH', {minimumFractionDigits: 2}) : '-'}
            </td>
        );
    };

    const calculateEcart = (data) => {
        const depenses = (data.commandes || 0) + (data.regies || 0);
        const ecart = (data.estimation || 0) - depenses;
        return ecart;
    };

    const renderEcartCell = (data) => {
        const ecart = calculateEcart(data);
        const textColor = ecart >= 0 ? 'text-green-600' : 'text-red-600';
        return (
            <td className={`px-4 py-2 text-right text-sm font-semibold ${textColor}`}>
                {ecart.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
            </td>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📌 Alignement Budgétaire</h2>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="🔍 Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border rounded-lg w-64"
                    />
                    <button
                        onClick={() => {
                            setExpandedLots({});
                            setExpandedPos0({});
                        }}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Tout réduire
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Hiérarchie</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Estimation</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Offres</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">OC</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Commandes</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Régies</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Factures</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Écart</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(filteredHierarchy).length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-12 text-gray-500">
                                    {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée à afficher'}
                                </td>
                            </tr>
                        ) : (
                            Object.keys(filteredHierarchy).map(lot => (
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
                                        {renderMontantCell(filteredHierarchy[lot], 'offres')}
                                        {renderMontantCell(filteredHierarchy[lot], 'offresComp')}
                                        {renderMontantCell(filteredHierarchy[lot], 'commandes')}
                                        {renderMontantCell(filteredHierarchy[lot], 'regies')}
                                        {renderMontantCell(filteredHierarchy[lot], 'factures')}
                                        {renderEcartCell(filteredHierarchy[lot])}
                                    </tr>

                                    {/* Positions 0 */}
                                    {expandedLots[lot] && Object.keys(filteredHierarchy[lot].positions0).map(pos0 => (
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
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'offres')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'offresComp')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'commandes')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'regies')}
                                                {renderMontantCell(filteredHierarchy[lot].positions0[pos0], 'factures')}
                                                {renderEcartCell(filteredHierarchy[lot].positions0[pos0])}
                                            </tr>

                                            {/* Positions 1 */}
                                            {expandedPos0[`${lot}-${pos0}`] && Object.keys(filteredHierarchy[lot].positions0[pos0].positions1).map(pos1 => (
                                                <tr key={`${lot}-${pos0}-${pos1}`} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 pl-20 text-sm text-gray-700">
                                                        📄 {pos1}
                                                    </td>
                                                    {renderMontantCell(filteredHierarchy[lot].positions0[pos0].positions1[pos1], 'estimation')}
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
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="font-semibold">Estimation :</span> Budget initial</div>
                    <div><span className="font-semibold">Offres :</span> Offres reçues</div>
                    <div><span className="font-semibold">OC :</span> Offres complémentaires</div>
                    <div><span className="font-semibold">Commandes :</span> Commandes passées</div>
                    <div><span className="font-semibold">Régies :</span> Travaux en régie</div>
                    <div><span className="font-semibold">Factures :</span> Factures reçues</div>
                    <div className="col-span-3">
                        <span className="font-semibold">Écart :</span> Estimation - (Commandes + Régies)
                        <span className="ml-2 text-green-600">Vert = Sous budget</span>
                        <span className="ml-2 text-red-600">Rouge = Dépassement</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
