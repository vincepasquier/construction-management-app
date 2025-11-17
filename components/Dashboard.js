// Dashboard avec statistiques, filtres et suivi des commandes
const { useState, useMemo } = React;

window.Dashboard = ({ estimations, offres, commandes, offresComplementaires, regies, factures }) => {
    const [selectedCommandeId, setSelectedCommandeId] = useState(null);
    const [selectedLots, setSelectedLots] = useState([]);
    const [selectedPos0, setSelectedPos0] = useState([]);
    const [selectedPos1, setSelectedPos1] = useState([]);
    const [selectedEtape, setSelectedEtape] = useState('');

    // ========================================
    // EXTRACTION DES FILTRES DISPONIBLES
    // ========================================
    const availableFilters = useMemo(() => {
        const lotsSet = new Set();
        const pos0Set = new Set();
        const pos1Set = new Set();
        const etapesSet = new Set();

        // Collecter depuis toutes les sources
        [...estimations, ...commandes, ...offres, ...offresComplementaires, ...regies, ...factures].forEach(item => {
            (item.lots || []).forEach(lot => lotsSet.add(lot));
            (item.positions0 || []).forEach(pos => pos0Set.add(pos));
            (item.positions1 || []).forEach(pos => pos1Set.add(pos));
            if (item.etape) etapesSet.add(item.etape);
        });

        return {
            lots: [...lotsSet].sort(),
            positions0: [...pos0Set].sort(),
            positions1: [...pos1Set].sort(),
            etapes: [...etapesSet].sort()
        };
    }, [estimations, commandes, offres, offresComplementaires, regies, factures]);

    // ========================================
    // FONCTION DE FILTRAGE
    // ========================================
    const matchesFilters = (item) => {
        // Si aucun filtre actif, tout passe
        if (selectedLots.length === 0 && selectedPos0.length === 0 && selectedPos1.length === 0 && !selectedEtape) {
            return true;
        }

        let matches = true;

        // Filtre par lots
        if (selectedLots.length > 0) {
            const itemLots = item.lots || [];
            matches = matches && selectedLots.some(lot => itemLots.includes(lot));
        }

        // Filtre par positions 0
        if (selectedPos0.length > 0) {
            const itemPos0 = item.positions0 || [];
            matches = matches && selectedPos0.some(pos => itemPos0.includes(pos));
        }

        // Filtre par positions 1
        if (selectedPos1.length > 0) {
            const itemPos1 = item.positions1 || [];
            matches = matches && selectedPos1.some(pos => itemPos1.includes(pos));
        }

        // Filtre par étape
        if (selectedEtape) {
            matches = matches && item.etape === selectedEtape;
        }

        return matches;
    };

    // ========================================
    // DONNÉES FILTRÉES
    // ========================================
    const filteredEstimations = useMemo(() => estimations.filter(matchesFilters), 
        [estimations, selectedLots, selectedPos0, selectedPos1, selectedEtape]);
    
    const filteredOffres = useMemo(() => offres.filter(matchesFilters), 
        [offres, selectedLots, selectedPos0, selectedPos1, selectedEtape]);
    
    const filteredCommandes = useMemo(() => commandes.filter(matchesFilters), 
        [commandes, selectedLots, selectedPos0, selectedPos1, selectedEtape]);
    
    const filteredOC = useMemo(() => offresComplementaires.filter(matchesFilters), 
        [offresComplementaires, selectedLots, selectedPos0, selectedPos1, selectedEtape]);
    
    const filteredRegies = useMemo(() => regies.filter(matchesFilters), 
        [regies, selectedLots, selectedPos0, selectedPos1, selectedEtape]);
    
    const filteredFactures = useMemo(() => factures.filter(matchesFilters), 
        [factures, selectedLots, selectedPos0, selectedPos1, selectedEtape]);

    // ========================================
    // CALCULS AVEC DONNÉES FILTRÉES
    // ========================================
    const totalEstimations = filteredEstimations.reduce((sum, est) => {
        return sum + (est.montantTotal || est.montant || 0);
    }, 0);

    const totalOffresAcceptees = filteredOffres
        .filter(o => o.statut === 'Acceptée')
        .reduce((sum, o) => sum + (o.montant || 0), 0);

    const totalCommandes = filteredCommandes.reduce((sum, c) => {
        return sum + (c.calculatedMontant || c.montant || 0);
    }, 0);

    const totalOCAcceptees = filteredOC
        .filter(oc => oc.statut === 'Acceptée')
        .reduce((sum, oc) => sum + (oc.montant || 0), 0);

    const totalRegies = filteredRegies.reduce((sum, r) => sum + (r.montantTotal || 0), 0);

    const totalFacture = filteredFactures.reduce((sum, f) => sum + (f.montantTTC || 0), 0);

    const budgetEngage = totalCommandes + totalOCAcceptees + totalRegies;

    const ecartBudget = totalEstimations - budgetEngage;
    const pourcentageUtilise = totalEstimations > 0 
        ? ((budgetEngage / totalEstimations) * 100).toFixed(1) 
        : 0;

    // ========================================
    // DÉTAILS COMMANDE (NON FILTRÉ)
    // ========================================
    const getCommandeDetails = (commandeId) => {
        const commande = commandes.find(c => c.id === commandeId);
        if (!commande) return null;

        const montantBase = commande.calculatedMontant || commande.montant || 0;

        const ocLiees = offresComplementaires.filter(oc => 
            oc.commandeId === commandeId && oc.statut === 'Acceptée'
        );
        const montantOC = ocLiees.reduce((sum, oc) => sum + (oc.montant || 0), 0);

        const regiesLiees = regies.filter(r => r.commandeId === commandeId);
        const montantRegies = regiesLiees.reduce((sum, r) => sum + (r.montantTotal || 0), 0);

        const montantTotalEngage = montantBase + montantOC + montantRegies;

        const facturesLiees = factures.filter(f => f.commandeId === commandeId);
        const montantFacture = facturesLiees.reduce((sum, f) => sum + (f.montantHT || 0), 0);
        const montantFactureTTC = facturesLiees.reduce((sum, f) => sum + (f.montantTTC || 0), 0);

        const resteAFacturer = montantTotalEngage - montantFacture;
        const pourcentageFacture = montantTotalEngage > 0 
            ? ((montantFacture / montantTotalEngage) * 100).toFixed(1) 
            : 0;

        const budgetRegie = commande.budgetRegie || 0;
        const regieConsommee = montantRegies;
        const resteRegie = budgetRegie - regieConsommee;
        const pourcentageRegie = budgetRegie > 0 ? ((regieConsommee / budgetRegie) * 100).toFixed(1) : 0;

        return {
            commande,
            montantBase,
            ocLiees,
            montantOC,
            regiesLiees,
            montantRegies,
            montantTotalEngage,
            facturesLiees,
            montantFacture,
            montantFactureTTC,
            resteAFacturer,
            pourcentageFacture,
            budgetRegie,
            regieConsommee,
            resteRegie,
            pourcentageRegie
        };
    };

    const commandeDetails = selectedCommandeId ? getCommandeDetails(selectedCommandeId) : null;

    // ========================================
    // HANDLERS DES FILTRES
    // ========================================
    const handleLotChange = (e) => {
        const options = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedLots(options);
    };

    const handlePos0Change = (e) => {
        const options = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedPos0(options);
    };

    const handlePos1Change = (e) => {
        const options = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedPos1(options);
    };

    const resetFilters = () => {
        setSelectedLots([]);
        setSelectedPos0([]);
        setSelectedPos1([]);
        setSelectedEtape('');
    };

    const hasActiveFilters = selectedLots.length > 0 || selectedPos0.length > 0 || selectedPos1.length > 0 || selectedEtape;

    return (
        <div className="space-y-6">
            {/* Titre */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard</h2>
                <p className="text-gray-600 mt-1">Vue d'ensemble du projet</p>
            </div>

            {/* ========================================
                SECTION FILTRES
            ======================================== */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">🔍 Filtres</h3>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-sm text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                        >
                            <window.Icons.X size={16} />
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>

                {/* Indicateur de filtrage actif */}
                {hasActiveFilters && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-blue-800">Filtres actifs :</span>
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
                            {selectedPos1.length > 0 && (
                                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                    {selectedPos1.length} pos. 1
                                </span>
                            )}
                            {selectedEtape && (
                                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                    Étape {selectedEtape}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Lots */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Lots ({availableFilters.lots.length})
                        </label>
                        <select
                            multiple
                            value={selectedLots}
                            onChange={handleLotChange}
                            className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                        >
                            {availableFilters.lots.map(lot => (
                                <option key={lot} value={lot}>{lot}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Ctrl+clic pour multi-sélection</p>
                    </div>

                    {/* Positions 0 */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Positions Niv. 0 ({availableFilters.positions0.length})
                        </label>
                        <select
                            multiple
                            value={selectedPos0}
                            onChange={handlePos0Change}
                            className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                        >
                            {availableFilters.positions0.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Ctrl+clic pour multi-sélection</p>
                    </div>

                    {/* Positions 1 */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Positions Niv. 1 ({availableFilters.positions1.length})
                        </label>
                        <select
                            multiple
                            value={selectedPos1}
                            onChange={handlePos1Change}
                            className="w-full px-3 py-2 border rounded-lg h-32 text-sm"
                        >
                            {availableFilters.positions1.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Ctrl+clic pour multi-sélection</p>
                    </div>

                    {/* Étapes */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Étape ({availableFilters.etapes.length})
                        </label>
                        <select
                            value={selectedEtape}
                            onChange={(e) => setSelectedEtape(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">-- Toutes --</option>
                            {availableFilters.etapes.map(etape => (
                                <option key={etape} value={etape}>Étape {etape}</option>
                            ))}
                        </select>
                        
                        {/* Info sur les données filtrées */}
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                            <div className="font-semibold mb-1">Données affichées :</div>
                            <div className="space-y-0.5 text-gray-600">
                                <div>• {filteredEstimations.length} estimation(s)</div>
                                <div>• {filteredCommandes.length} commande(s)</div>
                                <div>• {filteredOC.filter(oc => oc.statut === 'Acceptée').length} OC</div>
                                <div>• {filteredRegies.length} régie(s)</div>
                                <div>• {filteredFactures.length} facture(s)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cartes statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Estimation */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">Budget Estimé</span>
                        <span className="text-2xl">📋</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                        {totalEstimations.toLocaleString('fr-CH')} CHF
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                        {filteredEstimations.length} estimation(s)
                    </div>
                </div>

                {/* Budget engagé */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-700">Budget Engagé</span>
                        <span className="text-2xl">📦</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                        {budgetEngage.toLocaleString('fr-CH')} CHF
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                        {pourcentageUtilise}% du budget
                    </div>
                </div>

                {/* Écart */}
                <div className={`${ecartBudget >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${ecartBudget >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            Écart Budget
                        </span>
                        <span className="text-2xl">{ecartBudget >= 0 ? '✅' : '⚠️'}</span>
                    </div>
                    <div className={`text-2xl font-bold ${ecartBudget >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {ecartBudget.toLocaleString('fr-CH')} CHF
                    </div>
                    <div className={`text-xs mt-1 ${ecartBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {ecartBudget >= 0 ? 'Dans le budget' : 'Dépassement'}
                    </div>
                </div>

                {/* Facturé */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-700">Total Facturé</span>
                        <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                        {totalFacture.toLocaleString('fr-CH')} CHF
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                        {filteredFactures.length} facture(s)
                    </div>
                </div>
            </div>

            {/* Répartition détaillée */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold mb-4">📈 Répartition détaillée</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Commandes</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalCommandes.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">{filteredCommandes.length} commande(s)</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Offres Comp.</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalOCAcceptees.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">
                            {filteredOC.filter(oc => oc.statut === 'Acceptée').length} acceptée(s)
                        </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Régies</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalRegies.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">{filteredRegies.length} régie(s)</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Offres</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalOffresAcceptees.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">
                            {filteredOffres.filter(o => o.statut === 'Acceptée').length} acceptée(s)
                        </div>
                    </div>
                </div>
            </div>

            {/* Suivi par commande */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-bold mb-4">🔍 Suivi détaillé par commande</h3>
                
                {/* Sélecteur de commande */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Sélectionner une commande :</label>
                    <select
                        value={selectedCommandeId || ''}
                        onChange={(e) => setSelectedCommandeId(e.target.value)}
                        className="w-full md:w-96 px-3 py-2 border rounded-lg"
                    >
                        <option value="">-- Choisir une commande --</option>
                        {commandes.map(cmd => (
                            <option key={cmd.id} value={cmd.id}>
                                {cmd.numero} - {cmd.fournisseur} ({(cmd.calculatedMontant || cmd.montant || 0).toLocaleString('fr-CH')} CHF)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Détails de la commande sélectionnée */}
                {commandeDetails && (
                    <div className="space-y-4">
                        {/* En-tête */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <h4 className="font-bold text-blue-900 text-lg mb-2">
                                {commandeDetails.commande.numero} - {commandeDetails.commande.fournisseur}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600">Date :</span>
                                    <div className="font-semibold">
                                        {new Date(commandeDetails.commande.dateCommande).toLocaleDateString('fr-CH')}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Statut :</span>
                                    <div className="font-semibold">{commandeDetails.commande.statut}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Lots :</span>
                                    <div className="font-semibold text-xs">
                                        {commandeDetails.commande.lots?.join(', ') || '-'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Étape :</span>
                                    <div className="font-semibold">{commandeDetails.commande.etape || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Tableau de synthèse */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Poste</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Montant HT</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Commande de base */}
                                    <tr className="border-t bg-blue-50">
                                        <td className="px-4 py-3 font-semibold">📦 Commande de base</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-900">
                                            {commandeDetails.montantBase.toLocaleString('fr-CH')} CHF
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            Montant initial
                                        </td>
                                    </tr>

                                    {/* Offres complémentaires */}
                                    {commandeDetails.ocLiees.length > 0 && (
                                        <>
                                            {commandeDetails.ocLiees.map(oc => (
                                                <tr key={oc.id} className="border-t">
                                                    <td className="px-4 py-3 pl-8 text-sm">
                                                        ➕ {oc.numero} - {oc.motif || 'OC'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-green-700 font-semibold">
                                                        +{(oc.montant || 0).toLocaleString('fr-CH')} CHF
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                        {oc.description || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="border-t bg-green-50">
                                                <td className="px-4 py-2 font-semibold">Total OC</td>
                                                <td className="px-4 py-2 text-right font-bold text-green-800">
                                                    {commandeDetails.montantOC.toLocaleString('fr-CH')} CHF
                                                </td>
                                                <td className="px-4 py-2 text-center text-xs">
                                                    {commandeDetails.ocLiees.length} OC
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* Régies */}
                                    {commandeDetails.regiesLiees.length > 0 && (
                                        <>
                                            {commandeDetails.regiesLiees.map(regie => (
                                                <tr key={regie.id} className="border-t">
                                                    <td className="px-4 py-3 pl-8 text-sm">
                                                        ⏱️ REG-{regie.numeroIncrement} - {regie.designation || 'Régie'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-orange-700 font-semibold">
                                                        +{(regie.montantTotal || 0).toLocaleString('fr-CH')} CHF
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                        {regie.dateDebut ? new Date(regie.dateDebut).toLocaleDateString('fr-CH') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="border-t bg-orange-50">
                                                <td className="px-4 py-2 font-semibold">Total Régies</td>
                                                <td className="px-4 py-2 text-right font-bold text-orange-800">
                                                    {commandeDetails.montantRegies.toLocaleString('fr-CH')} CHF
                                                </td>
                                                <td className="px-4 py-2 text-center text-xs">
                                                    {commandeDetails.regiesLiees.length} régie(s)
                                                </td>
                                            </tr>

                                            {/* Budget Régie */}
                                            {commandeDetails.budgetRegie > 0 && (
                                                <tr className={`border-t ${
                                                    commandeDetails.resteRegie < 0 ? 'bg-red-50' : 'bg-gray-50'
                                                }`}>
                                                    <td className="px-4 py-2 pl-8">
                                                        <span className="font-semibold text-sm">Budget Régie</span>
                                                        <span className="text-xs text-gray-600 ml-2">
                                                            ({commandeDetails.pourcentageRegie}% utilisé)
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="text-xs text-gray-600">
                                                            {commandeDetails.budgetRegie.toLocaleString('fr-CH')} CHF alloué
                                                        </div>
                                                        <div className={`font-semibold text-sm ${
                                                            commandeDetails.resteRegie < 0 ? 'text-red-700' : 'text-green-700'
                                                        }`}>
                                                            {commandeDetails.resteRegie.toLocaleString('fr-CH')} CHF restant
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <div className="w-20 bg-gray-200 rounded-full h-2 mx-auto">
                                                            <div 
                                                                className={`h-2 rounded-full ${
                                                                    commandeDetails.resteRegie < 0 ? 'bg-red-600' : 
                                                                    commandeDetails.pourcentageRegie > 80 ? 'bg-orange-500' : 
                                                                    'bg-green-500'
                                                                }`}
                                                                style={{ width: `${Math.min(commandeDetails.pourcentageRegie, 100)}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )}

                                    {/* Total engagé */}
                                    <tr className="border-t-2 border-gray-300 bg-purple-50">
                                        <td className="px-4 py-3 font-bold text-purple-900">💼 Total Engagé</td>
                                        <td className="px-4 py-3 text-right font-bold text-purple-900 text-lg">
                                            {commandeDetails.montantTotalEngage.toLocaleString('fr-CH')} CHF
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-purple-700">
                                            Commande + OC + Régies
                                        </td>
                                    </tr>

                                    {/* Facturé */}
                                    <tr className="border-t bg-yellow-50">
                                        <td className="px-4 py-3 font-semibold text-yellow-900">
                                            💰 Déjà facturé ({commandeDetails.pourcentageFacture}%)
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-yellow-900">
                                            {commandeDetails.montantFacture.toLocaleString('fr-CH')} CHF
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-yellow-700">
                                            {commandeDetails.facturesLiees.length} facture(s)
                                        </td>
                                    </tr>

                                    {/* Reste à facturer */}
                                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-900">📊 Reste à facturer</td>
                                        <td className={`px-4 py-3 text-right font-bold text-lg ${
                                            commandeDetails.resteAFacturer > 0 ? 'text-blue-900' : 'text-green-900'
                                        }`}>
                                            {commandeDetails.resteAFacturer.toLocaleString('fr-CH')} CHF
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs">
                                            {commandeDetails.resteAFacturer === 0 ? '✅ Complet' : '⏳ En cours'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Barre de progression */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">Progression de facturation</span>
                                <span className="font-bold">{commandeDetails.pourcentageFacture}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div 
                                    className={`h-4 rounded-full ${
                                        parseFloat(commandeDetails.pourcentageFacture) === 100 
                                            ? 'bg-green-600' 
                                            : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${Math.min(parseFloat(commandeDetails.pourcentageFacture), 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!selectedCommandeId && (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-6xl mb-4">🔍</div>
                        <p>Sélectionnez une commande pour voir les détails</p>
                    </div>
                )}
            </div>
        </div>
    );
};
