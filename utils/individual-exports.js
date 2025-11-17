// 📤 EXPORTS CSV INDIVIDUELS PAR ONGLET
// Ce fichier permet d'exporter chaque type de données en CSV
// Les CSV exportés sont directement compatibles avec l'import existant

/**
 * Exporter les estimations en CSV
 */
window.exportEstimationsCSV = (estimations) => {
    if (!estimations || estimations.length === 0) {
        alert('❌ Aucune estimation à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = estimations.map(est => ({
        'ID': est.id || '',
        'Lot': est.lot || '',
        'Position Niv. 0': est.position0 || '',
        'Position Niv. 1': est.position1 || '',
        'Désignation': est.designation || '',
        'Quantité': est.quantite || '',
        'Unité': est.unite || '',
        'Prix Unitaire': est.prixUnitaire || '',
        'Montant': est.montant || '',
        'Remarque': est.remarque || ''
    }));
    
    window.exportToCSV(csvData, 'estimations');
    console.log(`✅ ${estimations.length} estimations exportées`);
};

/**
 * Exporter les appels d'offres en CSV
 */
window.exportAppelOffresCSV = (appelOffres) => {
    if (!appelOffres || appelOffres.length === 0) {
        alert('❌ Aucun appel d\'offres à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = appelOffres.map(ao => ({
        'ID': ao.id || '',
        'Numéro': ao.numero || '',
        'Désignation': ao.designation || '',
        'Date Création': ao.dateCreation || '',
        'Date Limite': ao.dateLimite || '',
        'Lot': Array.isArray(ao.lots) ? ao.lots.join(',') : ao.lots || '',
        'Position 0': Array.isArray(ao.positions0) ? ao.positions0.join(',') : ao.positions0 || '',
        'Position 1': Array.isArray(ao.positions1) ? ao.positions1.join(',') : ao.positions1 || '',
        'Description': ao.description || '',
        'Statut': ao.statut || '',
        'Critère Prix': ao.criteres?.prix ? 'Oui' : 'Non',
        'Critère Délai': ao.criteres?.delai ? 'Oui' : 'Non',
        'Critère Qualité': ao.criteres?.qualite ? 'Oui' : 'Non'
    }));
    
    window.exportToCSV(csvData, 'appels_offres');
    console.log(`✅ ${appelOffres.length} appels d'offres exportés`);
};

/**
 * Exporter les offres en CSV
 */
window.exportOffresCSV = (offres) => {
    if (!offres || offres.length === 0) {
        alert('❌ Aucune offre à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = offres.map(offre => ({
        'ID': offre.id || '',
        'Numéro': offre.numero || '',
        'Fournisseur': offre.fournisseur || '',
        'Date': offre.date || '',
        'Lot': Array.isArray(offre.lots) ? offre.lots.join(',') : offre.lots || '',
        'Position 0': Array.isArray(offre.positions0) ? offre.positions0.join(',') : offre.positions0 || '',
        'Position 1': Array.isArray(offre.positions1) ? offre.positions1.join(',') : offre.positions1 || '',
        'Désignation': offre.designation || '',
        'Montant': offre.montant || '',
        'Validité': offre.validite || '',
        'Délai': offre.delai || '',
        'Remarque': offre.remarque || '',
        'Appel d\'Offres': offre.appelOffreId || '',
        'Favorite': offre.isFavorite ? 'Oui' : 'Non',
        'Statut': offre.statut || ''
    }));
    
    window.exportToCSV(csvData, 'offres');
    console.log(`✅ ${offres.length} offres exportées`);
};

/**
 * Exporter les offres complémentaires en CSV
 */
window.exportOffresComplementairesCSV = (offresComplementaires) => {
    if (!offresComplementaires || offresComplementaires.length === 0) {
        alert('❌ Aucune offre complémentaire à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = offresComplementaires.map(oc => ({
        'ID': oc.id || '',
        'Numéro OC': oc.numeroOC || '',
        'Commande Liée': oc.commandeId || '',
        'N° Commande': oc.numeroCommande || '',
        'Fournisseur': oc.fournisseur || '',
        'Date': oc.date || '',
        'Lot': Array.isArray(oc.lots) ? oc.lots.join(',') : oc.lots || '',
        'Position 0': Array.isArray(oc.positions0) ? oc.positions0.join(',') : oc.positions0 || '',
        'Position 1': Array.isArray(oc.positions1) ? oc.positions1.join(',') : oc.positions1 || '',
        'Désignation': oc.designation || '',
        'Montant': oc.montant || '',
        'Remarque': oc.remarque || ''
    }));
    
    window.exportToCSV(csvData, 'offres_complementaires');
    console.log(`✅ ${offresComplementaires.length} offres complémentaires exportées`);
};

/**
 * Exporter les commandes en CSV
 */
window.exportCommandesCSV = (commandes) => {
    if (!commandes || commandes.length === 0) {
        alert('❌ Aucune commande à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = commandes.map(cmd => ({
        'ID': cmd.id || '',
        'N° Commande': cmd.numeroCommande || '',
        'Offre Liée': cmd.offreId || '',
        'N° Offre': cmd.numeroOffre || '',
        'Fournisseur': cmd.fournisseur || '',
        'Date': cmd.date || '',
        'Lot': Array.isArray(cmd.lots) ? cmd.lots.join(',') : cmd.lots || '',
        'Position 0': Array.isArray(cmd.positions0) ? cmd.positions0.join(',') : cmd.positions0 || '',
        'Position 1': Array.isArray(cmd.positions1) ? cmd.positions1.join(',') : cmd.positions1 || '',
        'Désignation': cmd.designation || '',
        'Montant': cmd.montant || '',
        'Remarque': cmd.remarque || ''
    }));
    
    window.exportToCSV(csvData, 'commandes');
    console.log(`✅ ${commandes.length} commandes exportées`);
};

/**
 * Exporter les régies en CSV
 */
window.exportRegiesCSV = (regies) => {
    if (!regies || regies.length === 0) {
        alert('❌ Aucune régie à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = regies.map(regie => ({
        'ID': regie.id || '',
        'N° Régie': regie.numeroRegie || '',
        'Commande Liée': regie.commandeId || '',
        'N° Commande': regie.numeroCommande || '',
        'Fournisseur': regie.fournisseur || '',
        'Date': regie.date || '',
        'Lot': Array.isArray(regie.lots) ? regie.lots.join(',') : regie.lots || '',
        'Position 0': Array.isArray(regie.positions0) ? regie.positions0.join(',') : regie.positions0 || '',
        'Position 1': Array.isArray(regie.positions1) ? regie.positions1.join(',') : regie.positions1 || '',
        'Désignation': regie.designation || '',
        'Heures': regie.heures || '',
        'Taux Horaire': regie.tauxHoraire || '',
        'Montant': regie.montant || '',
        'Remarque': regie.remarque || ''
    }));
    
    window.exportToCSV(csvData, 'regies');
    console.log(`✅ ${regies.length} régies exportées`);
};

/**
 * Exporter les factures en CSV
 */
window.exportFacturesCSV = (factures) => {
    if (!factures || factures.length === 0) {
        alert('❌ Aucune facture à exporter');
        return;
    }
    
    // Format compatible avec l'import
    const csvData = factures.map(facture => ({
        'ID': facture.id || '',
        'N° Facture': facture.numeroFacture || '',
        'Commande Liée': facture.commandeId || '',
        'N° Commande': facture.numeroCommande || '',
        'Fournisseur': facture.fournisseur || '',
        'Date': facture.date || '',
        'Lot': Array.isArray(facture.lots) ? facture.lots.join(',') : facture.lots || '',
        'Position 0': Array.isArray(facture.positions0) ? facture.positions0.join(',') : facture.positions0 || '',
        'Position 1': Array.isArray(facture.positions1) ? facture.positions1.join(',') : facture.positions1 || '',
        'Désignation': facture.designation || '',
        'Montant': facture.montant || '',
        'N° Situation': facture.numeroSituation || '',
        'Pourcentage': facture.pourcentage || '',
        'Remarque': facture.remarque || ''
    }));
    
    window.exportToCSV(csvData, 'factures');
    console.log(`✅ ${factures.length} factures exportées`);
};

console.log('✅ Exports CSV individuels chargés');
