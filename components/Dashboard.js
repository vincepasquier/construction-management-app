// Dashboard - Vue d'ensemble avec filtres et statistiques
const { useState, useMemo } = React;

window.Dashboard = ({ estimations, offres, offresComplementaires, commandes, regies, factures }) => {
    const [filters, setFilters] = useState({
        lot: '',
        position0: '',
        position1: '',
        fournisseur: ''
    });

    // Extraction des listes uniques pour les filtres
    const allLots = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.lots || []))].sort();
    }, [estimations]);

    const allPos0 = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.positions0 || []))].sort();
    }, [estimations]);

    const allPos1 = useMemo(() => {
        return [...new Set(estimations.flatMap(e => e.positions1 || []))].sort();
    }, [estimations]);

    const allFournisseurs = useMemo(() => {
        const fournisseurs = new Set();
        [...offres, ...commandes, ...factures].forEach(item => {
            if (item.fournisseur) fournisseurs.add(item.fournisseur);
        });
        return [...fournisseurs].sort();
    }, [offres, commandes, factures]);

    // Calcul des statistiques globales
    const stats = useMemo(() => {
        const totalEstimation = estimations.reduce((sum, e) => sum + (e.montant || 0), 0);
        const totalOffres = offres
            .filter(applyFilters)
            .filter(o => o.isFavorite === true || !o.appelOffreId)
            .reduce((sum, o) => sum + (o.montant || 0), 0);
        const totalOffresComp = offresComplementaires.reduce((sum, oc) => sum + (oc.montant || 0), 0);
        const totalCommandes = commandes.reduce((sum, c) => sum + (c.calculatedMontant || c.montant || 0), 0);
        const totalRegies = regies.reduce((sum, r) => sum + (r.montantTotal || 0), 0);
        const totalFactures = factures.reduce((sum, f) => sum + (f.montantHT || 0), 0);
        const totalFacturesPayees = factures.filter(f => f.statut === 'PayÃ©e').reduce((sum, f) => sum + (f.montantHT || 0), 0);

        return {
            totalEstimation,
            totalOffres,
            totalOffresComp,
            totalCommandes,
            totalRegies,
            totalFactures,
            totalFacturesPayees,
            totalDepenses: totalCommandes + totalRegies,
            ecartEstimation: totalEstimation - (totalCommandes + totalRegies),
            tauxEngagement: totalEstimation > 0 ? ((totalCommandes + totalRegies) / totalEstimation * 100) : 0
        };
    }, [estimations, offres, offresComplementaires, commandes, regies, factures]);

    // DonnÃ©es filtrÃ©es
    const filteredData = useMemo(() => {
        const filterItem = (item) => {
            if (filters.lot && !item.lots?.includes(filters.lot)) return false;
            if (filters.position0 && !item.positions0?.includes(filters.position0)) return false;
            if (filters.position1 && !item.positions1?.includes(filters.position1)) return false;
            if (filters.fournisseur && item.fournisseur !== filters.fournisseur) return false;
            return true;
        };

        return {
            estimations: estimations.filter(filterItem),
            offres: offres.filter(filterItem),
            offresComplementaires: offresComplementaires.filter(filterItem),
            commandes: commandes.filter(filterItem),
            regies: regies.filter(filterItem),
            factures: factures.filter(filterItem)
        };
    }, [estimations, offres, offresComplementaires, commandes, regies, factures, filters]);

    // RÃ©initialiser les filtres
    const resetFilters = () => {
        setFilters({
            lot: '',
            position0: '',
            position1: '',
            fournisseur: ''
        });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">ðŸ“Š Tableau de Bord</h2>

            {/* Filtres */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">ðŸ” Filtres</h3>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            âœ– RÃ©initialiser
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Lot</label>
                        <select
                            value={filters.lot}
                            onChange={(e) => setFilters({...filters, lot: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">Tous</option>
                            {allLots.map(lot => (
                                <option key={lot} value={lot}>{lot}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Position Niv. 0</label>
                        <select
                            value={filters.position0}
                            onChange={(e) => setFilters({...filters, position0: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">Toutes</option>
                            {allPos0.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Position Niv. 1</label>
                        <select
                            value={filters.position1}
                            onChange={(e) => setFilters({...filters, position1: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">Toutes</option>
                            {allPos1.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fournisseur</label>
                        <select
                            value={filters.fournisseur}
                            onChange={(e) => setFilters({...filters, fournisseur: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">Tous</option>
                            {allFournisseurs.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Statistiques principales */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Budget Initial</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {stats.totalEstimation.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">CHF</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">EngagÃ©</p>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.totalDepenses.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">
                        {stats.tauxEngagement.toFixed(1)}% du budget
                    </p>
                </div>

                <div className={`p-4 rounded-lg ${stats.ecartEstimation >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-600">Ã‰cart Budget</p>
                    <p className={`text-2xl font-bold ${stats.ecartEstimation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.ecartEstimation.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">CHF</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Factures PayÃ©es</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {stats.totalFacturesPayees.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">
                        {stats.totalFactures > 0 ? ((stats.totalFacturesPayees / stats.totalFactures) * 100).toFixed(1) : 0}% payÃ©
                    </p>
                </div>
            </div>

            {/* DÃ©tails par catÃ©gorie */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">ðŸ’° Flux Financiers</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Offres:</span>
                            <span className="font-medium">{stats.totalOffres.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Offres ComplÃ©mentaires:</span>
                            <span className="font-medium">{stats.totalOffresComp.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Commandes:</span>
                            <span className="font-medium">{stats.totalCommandes.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>RÃ©gies:</span>
                            <span className="font-medium">{stats.totalRegies.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Factures Total:</span>
                            <span className="font-bold">{stats.totalFactures.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">ðŸ“‹ Compteurs</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Estimations:</span>
                            <span className="font-medium">{filteredData.estimations.length} / {estimations.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Offres:</span>
                            <span className="font-medium">{filteredData.offres.length} / {offres.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Offres ComplÃ©mentaires:</span>
                            <span className="font-medium">{filteredData.offresComplementaires.length} / {offresComplementaires.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Commandes:</span>
                            <span className="font-medium">{filteredData.commandes.length} / {commandes.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>RÃ©gies:</span>
                            <span className="font-medium">{filteredData.regies.length} / {regies.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Factures:</span>
                            <span className="font-medium">{filteredData.factures.length} / {factures.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertes et indicateurs */}
            <div className="space-y-3">
                {stats.ecartEstimation < 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-semibold">âš ï¸ DÃ©passement de budget</p>
                        <p className="text-sm text-red-700">
                            Le budget est dÃ©passÃ© de {Math.abs(stats.ecartEstimation).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                )}

                {stats.tauxEngagement > 90 && stats.ecartEstimation >= 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-semibold">âš ï¸ Budget presque Ã©puisÃ©</p>
                        <p className="text-sm text-yellow-700">
                            {stats.tauxEngagement.toFixed(1)}% du budget est engagÃ©
                        </p>
                    </div>
                )}

                {factures.filter(f => f.statut === 'En retard').length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800 font-semibold">ðŸ“… Factures en retard</p>
                        <p className="text-sm text-orange-700">
                            {factures.filter(f => f.statut === 'En retard').length} facture(s) en retard de paiement
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
