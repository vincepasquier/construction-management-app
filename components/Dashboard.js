// Dashboard Avancé - Vue d'ensemble avec graphiques temporels et projections
const { useState, useMemo } = React;

window.Dashboard = ({ estimations, offres, offresComplementaires, commandes, regies, factures }) => {
    const [filters, setFilters] = useState({
        lot: '',
        position0: '',
        position1: '',
        fournisseur: ''
    });

    const [timeView, setTimeView] = useState('cumulative'); // 'cumulative' ou 'monthly'

    // Listes pour les filtres - CORRECTION pour gérer les deux formats
    const allLots = useMemo(() => {
        const lots = new Set();
        estimations.forEach(est => {
            // Format hiérarchique (nouveau)
            if (est.lots && Array.isArray(est.lots) && est.lots.length > 0 && typeof est.lots[0] === 'object') {
                est.lots.forEach(lot => {
                    if (lot.numero) lots.add(lot.numero);
                });
            }
            // Format plat (ancien/import CSV)
            else if (est.lots && Array.isArray(est.lots)) {
                est.lots.forEach(lot => lots.add(String(lot)));
            }
        });
        return [...lots].sort();
    }, [estimations]);

    const allPos0 = useMemo(() => {
        const positions = new Set();
        estimations.forEach(est => {
            // Format hiérarchique (nouveau)
            if (est.lots && Array.isArray(est.lots) && est.lots.length > 0 && typeof est.lots[0] === 'object') {
                est.lots.forEach(lot => {
                    if (lot.positions0 && Array.isArray(lot.positions0)) {
                        lot.positions0.forEach(pos0 => {
                            if (pos0.nom) positions.add(pos0.nom);
                        });
                    }
                });
            }
            // Format plat (ancien/import CSV)
            else if (est.positions0 && Array.isArray(est.positions0)) {
                est.positions0.forEach(pos => positions.add(String(pos)));
            }
        });
        return [...positions].sort();
    }, [estimations]);

    const allPos1 = useMemo(() => {
        const positions = new Set();
        estimations.forEach(est => {
            // Format hiérarchique (nouveau)
            if (est.lots && Array.isArray(est.lots) && est.lots.length > 0 && typeof est.lots[0] === 'object') {
                est.lots.forEach(lot => {
                    if (lot.positions0 && Array.isArray(lot.positions0)) {
                        lot.positions0.forEach(pos0 => {
                            if (pos0.positions1 && Array.isArray(pos0.positions1)) {
                                pos0.positions1.forEach(pos1 => {
                                    if (pos1.nom) positions.add(pos1.nom);
                                });
                            }
                        });
                    }
                });
            }
            // Format plat (ancien/import CSV)
            else if (est.positions1 && Array.isArray(est.positions1)) {
                est.positions1.forEach(pos => positions.add(String(pos)));
            }
        });
        return [...positions].sort();
    }, [estimations]);

    const allFournisseurs = useMemo(() => {
        const fournisseurs = new Set();
        [...offres, ...commandes, ...factures].forEach(item => {
            if (item.fournisseur) fournisseurs.add(item.fournisseur);
        });
        return [...fournisseurs].sort();
    }, [offres, commandes, factures]);

    // Données filtrées
    const filteredData = useMemo(() => {
        // Fonction de filtrage
        const applyFilters = (item) => {
            // Pour les estimations hiérarchiques, vérifier dans la structure
            if (item.lots && Array.isArray(item.lots) && item.lots.length > 0 && typeof item.lots[0] === 'object') {
                // C'est une estimation hiérarchique - filtrage plus complexe
                if (filters.lot) {
                    const hasLot = item.lots.some(lot => String(lot.numero) === String(filters.lot));
                    if (!hasLot) return false;
                }
                if (filters.position0) {
                    const hasPos0 = item.lots.some(lot => 
                        lot.positions0?.some(pos0 => pos0.nom === filters.position0)
                    );
                    if (!hasPos0) return false;
                }
                if (filters.position1) {
                    const hasPos1 = item.lots.some(lot => 
                        lot.positions0?.some(pos0 => 
                            pos0.positions1?.some(pos1 => pos1.nom === filters.position1)
                        )
                    );
                    if (!hasPos1) return false;
                }
                // Pas de fournisseur dans les estimations
                return true;
            }
            
            // Filtrage classique pour les autres items
            if (filters.lot && !item.lots?.includes(filters.lot)) return false;
            if (filters.position0 && !item.positions0?.includes(filters.position0)) return false;
            if (filters.position1 && !item.positions1?.includes(filters.position1)) return false;
            if (filters.fournisseur && item.fournisseur !== filters.fournisseur) return false;
            return true;
        };
        
        return {
            estimations: estimations.filter(applyFilters),
            offres: offres.filter(applyFilters),
            offresComplementaires: offresComplementaires.filter(applyFilters),
            commandes: commandes.filter(applyFilters),
            regies: regies.filter(applyFilters),
            factures: factures.filter(applyFilters)
        };
    }, [estimations, offres, offresComplementaires, commandes, regies, factures, filters]);

    // Statistiques globales
    const stats = useMemo(() => {
        // ✅ CORRECTION : Gérer les deux formats d'estimation
        const totalEstimation = filteredData.estimations.reduce((sum, e) => {
            // Format hiérarchique (nouveau)
            if (e.montantTotal !== undefined) {
                return sum + (e.montantTotal || 0);
            }
            // Format plat (ancien/import CSV)
            return sum + (e.montant || 0);
        }, 0);
        
        const totalOffres = filteredData.offres
            .filter(o => o.isFavorite === true || !o.appelOffreId)
            .reduce((sum, o) => sum + (o.montant || 0), 0);
            
        const totalOffresComp = filteredData.offresComplementaires.reduce((sum, oc) => sum + (oc.montant || 0), 0);
        const totalCommandes = filteredData.commandes.reduce((sum, c) => sum + (c.montant || 0), 0);
        const totalRegies = filteredData.regies.reduce((sum, r) => sum + (r.montantTotal || 0), 0);
        const totalFactures = filteredData.factures.reduce((sum, f) => sum + (f.montantHT || 0), 0);
        const totalFacturesPayees = filteredData.factures
            .filter(f => f.statut === 'Payée')
            .reduce((sum, f) => sum + (f.montantHT || 0), 0);
        const totalDepenses = totalCommandes + totalRegies;
        const ecart = totalEstimation - totalDepenses;
        const tauxEngagement = totalEstimation > 0 ? (totalDepenses / totalEstimation * 100) : 0;

        return {
            totalEstimation,
            totalOffres,
            totalOffresComp,
            totalCommandes,
            totalRegies,
            totalFactures,
            totalFacturesPayees,
            totalDepenses,
            ecart,
            tauxEngagement
        };
    }, [filteredData]);

    // Données temporelles pour le graphique
    const timelineData = useMemo(() => {
        const events = [];

        // Ajouter les commandes
        filteredData.commandes.forEach(cmd => {
            if (cmd.dateCommande) {
                events.push({
                    date: new Date(cmd.dateCommande),
                    type: 'commande',
                    montant: cmd.montant || 0,
                    description: `Commande ${cmd.numero} - ${cmd.fournisseur}`
                });
            }
        });

        // Ajouter les factures
        filteredData.factures.forEach(fact => {
            if (fact.dateFacture) {
                events.push({
                    date: new Date(fact.dateFacture),
                    type: 'facture',
                    montant: fact.montantHT || 0,
                    description: `Facture ${fact.numero}`
                });
            }
        });

        // Trier par date
        events.sort((a, b) => a.date - b.date);

        // Calculer les cumuls
        let cumulCommandes = 0;
        let cumulFactures = 0;

        const timeline = events.map(event => {
            if (event.type === 'commande') {
                cumulCommandes += event.montant;
            } else if (event.type === 'facture') {
                cumulFactures += event.montant;
            }

            return {
                date: event.date.toLocaleDateString('fr-CH'),
                dateObj: event.date,
                type: event.type,
                montant: event.montant,
                cumulCommandes,
                cumulFactures,
                description: event.description
            };
        });

        return timeline;
    }, [filteredData]);

    // Graphique cumulatif simple (style barre ASCII)
    const renderSimpleChart = () => {
        if (timelineData.length === 0) {
            return <p className="text-gray-500 text-center py-8">Aucune donnée temporelle disponible</p>;
        }

        const maxCumul = Math.max(
            ...timelineData.map(d => Math.max(d.cumulCommandes, d.cumulFactures))
        );

        // Prendre des points échantillonnés (max 10 pour la lisibilité)
        const sampledData = timelineData.filter((_, idx) => 
            idx === 0 || 
            idx === timelineData.length - 1 || 
            idx % Math.ceil(timelineData.length / 8) === 0
        );

        return (
            <div className="space-y-2">
                {sampledData.map((point, idx) => {
                    const barWidthCommandes = (point.cumulCommandes / maxCumul) * 100;
                    const barWidthFactures = (point.cumulFactures / maxCumul) * 100;

                    return (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="w-24">{point.date}</span>
                                <span className="text-gray-400">|</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-blue-600">Commandes</span>
                                <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                                        style={{ width: `${barWidthCommandes}%` }}
                                    >
                                        <span className="text-xs text-white font-semibold">
                                            {point.cumulCommandes.toLocaleString('fr-CH', {maximumFractionDigits: 0})}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-purple-600">Factures</span>
                                <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                                    <div 
                                        className="bg-purple-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                                        style={{ width: `${barWidthFactures}%` }}
                                    >
                                        <span className="text-xs text-white font-semibold">
                                            {point.cumulFactures.toLocaleString('fr-CH', {maximumFractionDigits: 0})}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Projection future
    const projection = useMemo(() => {
        const commandesRestantes = filteredData.commandes
            .filter(c => c.statut !== 'Validée' && c.statut !== 'Annulée')
            .reduce((sum, c) => sum + (c.montant || 0), 0);

        const facturesEnAttente = filteredData.factures
            .filter(f => f.statut !== 'Payée')
            .reduce((sum, f) => sum + (f.montantHT || 0), 0);

        const projeteFinal = stats.totalDepenses + commandesRestantes;
        const ecartProjete = stats.totalEstimation - projeteFinal;

        return {
            commandesRestantes,
            facturesEnAttente,
            projeteFinal,
            ecartProjete
        };
    }, [filteredData, stats]);

    const resetFilters = () => {
        setFilters({ lot: '', position0: '', position1: '', fournisseur: '' });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">📊 Tableau de Bord</h2>

            {/* Filtres */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">🔍 Filtres</h3>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            ✖ Réinitialiser
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
                    <p className="text-sm text-gray-600">Engagé</p>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.totalDepenses.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">
                        {stats.tauxEngagement.toFixed(1)}% du budget
                    </p>
                </div>

                <div className={`p-4 rounded-lg ${stats.ecart >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-600">Écart Budget</p>
                    <p className={`text-2xl font-bold ${stats.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.ecart.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">CHF</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Factures Payées</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {stats.totalFacturesPayees.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                    </p>
                    <p className="text-xs text-gray-500">
                        {stats.totalFactures > 0 
                            ? `${(stats.totalFacturesPayees / stats.totalFactures * 100).toFixed(0)}%`
                            : '0%'
                        } du total
                    </p>
                </div>
            </div>

            {/* Graphique temporel */}
            <div className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">📈 Évolution Temporelle (Cumulée)</h3>
                    <div className="flex gap-2 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Commandes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>Factures</span>
                        </div>
                    </div>
                </div>
                {renderSimpleChart()}
            </div>

            {/* Projection */}
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">🔮 Projection Future</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Commandes en cours</p>
                        <p className="text-xl font-bold text-orange-600">
                            {projection.commandesRestantes.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Factures en attente</p>
                        <p className="text-xl font-bold text-orange-600">
                            {projection.facturesEnAttente.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Coût final projeté</p>
                        <p className="text-xl font-bold text-orange-600">
                            {projection.projeteFinal.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Écart projeté</p>
                        <p className={`text-xl font-bold ${projection.ecartProjete >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {projection.ecartProjete.toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                </div>
            </div>

            {/* Répartition détaillée */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">💰 Répartition Budget</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Offres:</span>
                            <span className="font-medium">{stats.totalOffres.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Offres Complémentaires:</span>
                            <span className="font-medium">{stats.totalOffresComp.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Commandes:</span>
                            <span className="font-medium">{stats.totalCommandes.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Régies:</span>
                            <span className="font-medium">{stats.totalRegies.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                            <span>Total Factures:</span>
                            <span className="text-purple-600">{stats.totalFactures.toLocaleString('fr-CH')} CHF</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">📋 Compteurs</h3>
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
                            <span>Offres Complémentaires:</span>
                            <span className="font-medium">{filteredData.offresComplementaires.length} / {offresComplementaires.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Commandes:</span>
                            <span className="font-medium">{filteredData.commandes.length} / {commandes.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Régies:</span>
                            <span className="font-medium">{filteredData.regies.length} / {regies.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Factures:</span>
                            <span className="font-medium">{filteredData.factures.length} / {factures.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertes */}
            <div className="space-y-3">
                {stats.ecart < 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-semibold">⚠️ Dépassement de budget</p>
                        <p className="text-sm text-red-700">
                            Le budget est dépassé de {Math.abs(stats.ecart).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                        </p>
                    </div>
                )}

                {projection.ecartProjete < 0 && stats.ecart >= 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800 font-semibold">⚠️ Dépassement projeté</p>
                        <p className="text-sm text-orange-700">
                            Le budget sera dépassé de {Math.abs(projection.ecartProjete).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF si toutes les commandes sont validées
                        </p>
                    </div>
                )}

                {stats.tauxEngagement > 90 && stats.ecart >= 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-semibold">⚠️ Budget presque épuisé</p>
                        <p className="text-sm text-yellow-700">
                            {stats.tauxEngagement.toFixed(1)}% du budget est engagé
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
