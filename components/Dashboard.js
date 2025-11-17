// Dashboard avec statistiques et suivi des commandes
const { useState } = React;

window.Dashboard = ({ estimations, offres, commandes, offresComplementaires, regies, factures }) => {
    const [selectedCommandeId, setSelectedCommandeId] = useState(null);

    // Calculer le total des estimations
    const totalEstimations = estimations.reduce((sum, est) => {
        return sum + (est.montantTotal || est.montant || 0);
    }, 0);

    // Calculer le total des offres acceptées
    const totalOffresAcceptees = offres
        .filter(o => o.statut === 'Acceptée')
        .reduce((sum, o) => sum + (o.montant || 0), 0);

    // Calculer le total des commandes
    const totalCommandes = commandes.reduce((sum, c) => {
        return sum + (c.calculatedMontant || c.montant || 0);
    }, 0);

    // Calculer le total des offres complémentaires acceptées
    const totalOCAcceptees = offresComplementaires
        .filter(oc => oc.statut === 'Acceptée')
        .reduce((sum, oc) => sum + (oc.montant || 0), 0);

    // Calculer le total des régies
    const totalRegies = regies.reduce((sum, r) => sum + (r.montantTotal || 0), 0);

    // Calculer le total facturé
    const totalFacture = factures.reduce((sum, f) => sum + (f.montantTTC || 0), 0);

    // Calculer le budget engagé total (commandes + OC + régies)
    const budgetEngage = totalCommandes + totalOCAcceptees + totalRegies;

    // Écart estimation vs engagé
    const ecartBudget = totalEstimations - budgetEngage;
    const pourcentageUtilise = totalEstimations > 0 
        ? ((budgetEngage / totalEstimations) * 100).toFixed(1) 
        : 0;

    // Calculer les détails d'une commande spécifique
    const getCommandeDetails = (commandeId) => {
        const commande = commandes.find(c => c.id === commandeId);
        if (!commande) return null;

        // Montant de base de la commande
        const montantBase = commande.calculatedMontant || commande.montant || 0;

        // OC liées à cette commande
        const ocLiees = offresComplementaires.filter(oc => 
            oc.commandeId === commandeId && oc.statut === 'Acceptée'
        );
        const montantOC = ocLiees.reduce((sum, oc) => sum + (oc.montant || 0), 0);

        // Régies liées à cette commande
        const regiesLiees = regies.filter(r => r.commandeId === commandeId);
        const montantRegies = regiesLiees.reduce((sum, r) => sum + (r.montantTotal || 0), 0);

        // Montant total engagé
        const montantTotalEngage = montantBase + montantOC + montantRegies;

        // Factures liées à cette commande
        const facturesLiees = factures.filter(f => f.commandeId === commandeId);
        const montantFacture = facturesLiees.reduce((sum, f) => sum + (f.montantHT || 0), 0);
        const montantFactureTTC = facturesLiees.reduce((sum, f) => sum + (f.montantTTC || 0), 0);

        // Reste à facturer
        const resteAFacturer = montantTotalEngage - montantFacture;
        const pourcentageFacture = montantTotalEngage > 0 
            ? ((montantFacture / montantTotalEngage) * 100).toFixed(1) 
            : 0;

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
            pourcentageFacture
        };
    };

    const commandeDetails = selectedCommandeId ? getCommandeDetails(selectedCommandeId) : null;

    return (
        <div className="space-y-6">
            {/* Titre */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard</h2>
                <p className="text-gray-600 mt-1">Vue d'ensemble du projet</p>
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
                        {estimations.length} estimation(s)
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
                        {factures.length} facture(s)
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
                        <div className="text-xs text-gray-500">{commandes.length} commande(s)</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Offres Comp.</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalOCAcceptees.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">
                            {offresComplementaires.filter(oc => oc.statut === 'Acceptée').length} acceptée(s)
                        </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Régies</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalRegies.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">{regies.length} régie(s)</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Offres</div>
                        <div className="text-xl font-bold text-gray-900">
                            {totalOffresAcceptees.toLocaleString('fr-CH')} CHF
                        </div>
                        <div className="text-xs text-gray-500">
                            {offres.filter(o => o.statut === 'Acceptée').length} acceptée(s)
                        </div>
                    </div>
                </div>
            </div>

            {/* 🆕 NOUVELLE SECTION : Suivi par commande */}
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
