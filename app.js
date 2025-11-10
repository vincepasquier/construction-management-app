// Application principale de gestion de projet de construction
const { useState, useEffect } = React;
const { Plus, Trash2 } = window.Icons;

const ConstructionManagement = () => {
    // Ã‰tats principaux
    const [estimations, setEstimations] = useState([]);
    const [offres, setOffres] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [offresComplementaires, setOffresComplementaires] = useState([]);
    const [regies, setRegies] = useState([]);
    const [factures, setFactures] = useState([]);
    const [appelOffres, setAppelOffres] = useState([]);
    
    // Ã‰tats UI
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showOffreModal, setShowOffreModal] = useState(false);
    const [showCommandeModal, setShowCommandeModal] = useState(false);
    const [showOffreCompModal, setShowOffreCompModal] = useState(false);
    const [showRegieModal, setShowRegieModal] = useState(false);
    const [showFactureModal, setShowFactureModal] = useState(false);
    const [showAppelOffreModal, setShowAppelOffreModal] = useState(false);
    const [showAppelOffreDetail, setShowAppelOffreDetail] = useState(false);
    
    // Ã‰tats d'Ã©dition
    const [editingOffre, setEditingOffre] = useState(null);
    const [editingCommande, setEditingCommande] = useState(null);
    const [editingFacture, setEditingFacture] = useState(null);
    const [editingOffreComp, setEditingOffreComp] = useState(null);
    const [editingRegie, setEditingRegie] = useState(null);
    const [editingAppelOffre, setEditingAppelOffre] = useState(null);
    const [selectedAppelOffre, setSelectedAppelOffre] = useState(null);

    // Chargement initial des donnÃ©es
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        const data = await window.loadData();
        setEstimations(data.estimations);
        setOffres(data.offres);
        setCommandes(data.commandes);
        setOffresComplementaires(data.offresComplementaires);
        setRegies(data.regies);
        setFactures(data.factures);
        setAppelOffres(data.appelOffres || []);
    };

    // Handlers pour OffreModal
    const handleSaveOffre = (offre) => {
    let updated = editingOffre ? 
        offres.map(o => o.id === editingOffre.id ? offre : o) : 
        [...offres, offre];
    
    // NOUVEAU : Mettre à jour les favorites si l'offre est liée à un AO
    if (offre.appelOffreId && offre.isFavorite) {
        updated = updated.map(o => {
            if (o.appelOffreId === offre.appelOffreId && o.id !== offre.id) {
                return { ...o, isFavorite: false };
            }
            return o;
        });
    }
    
    setOffres(updated);
    window.saveData('offres', updated);
    setShowOffreModal(false);
    setEditingOffre(null);
    alert(editingOffre ? '✅ Offre modifiée' : '✅ Offre créée');
    };

    // Handlers pour OffreComplementaireModal
    const handleSaveOffreComp = (offreComp) => {
        const updated = editingOffreComp ? 
            offresComplementaires.map(oc => oc.id === editingOffreComp.id ? offreComp : oc) : 
            [...offresComplementaires, offreComp];
        
        setOffresComplementaires(updated);
        window.saveData('offresComplementaires', updated);
        setShowOffreCompModal(false);
        setEditingOffreComp(null);
        alert(editingOffreComp ? 'âœ… Offre complÃ©mentaire modifiÃ©e' : 'âœ… Offre complÃ©mentaire crÃ©Ã©e');
    };

    // Handlers pour CommandeModal
    const handleSaveCommande = (commande) => {
        const updated = editingCommande ? 
            commandes.map(c => c.id === editingCommande.id ? commande : c) : 
            [...commandes, commande];
        
        setCommandes(updated);
        window.saveData('commandes', updated);

        // Accepter l'offre source si c'est une nouvelle commande
        if (commande.offreId && !editingCommande) {
            const updatedOffres = offres.map(o => 
                o.id === commande.offreId && o.statut === 'En attente' ? 
                {...o, statut: 'AcceptÃ©e'} : o
            );
            setOffres(updatedOffres);
            window.saveData('offres', updatedOffres);
        }

        // Accepter l'OC source si elle existe
        if (commande.offreComplementaireId && !editingCommande) {
            const updatedOC = offresComplementaires.map(oc => 
                oc.id === commande.offreComplementaireId && oc.statut === 'En attente' ? 
                {...oc, statut: 'AcceptÃ©e', commandeId: commande.id} : oc
            );
            setOffresComplementaires(updatedOC);
            window.saveData('offresComplementaires', updatedOC);
        }

        // Accepter les offres complÃ©mentaires sÃ©lectionnÃ©es
        if (commande.offresComplementairesIds && commande.offresComplementairesIds.length > 0) {
            const updatedOC = offresComplementaires.map(oc => {
                if (commande.offresComplementairesIds.includes(oc.id) && oc.statut === 'En attente') {
                    return { ...oc, statut: 'AcceptÃ©e', commandeId: commande.id };
                }
                return oc;
            });
            setOffresComplementaires(updatedOC);
            window.saveData('offresComplementaires', updatedOC);
        }

        setShowCommandeModal(false);
        setEditingCommande(null);
        alert(editingCommande ? 'âœ… Commande modifiÃ©e' : 'âœ… Commande crÃ©Ã©e');
    };

    // Handlers pour RegieModal
    const handleSaveRegie = (regie) => {
        const updated = editingRegie ? 
            regies.map(r => r.id === editingRegie.id ? regie : r) : 
            [...regies, regie];
        
        setRegies(updated);
        window.saveData('regies', updated);
        setShowRegieModal(false);
        setEditingRegie(null);
        alert(editingRegie ? 'âœ… RÃ©gie modifiÃ©e' : 'âœ… RÃ©gie crÃ©Ã©e');
    };

    // Handlers pour FactureModal
    const handleSaveFacture = (facture) => {
        const updated = editingFacture ? 
            factures.map(f => f.id === editingFacture.id ? facture : f) : 
            [...factures, facture];
        
        setFactures(updated);
        window.saveData('factures', updated);
        setShowFactureModal(false);
        setEditingFacture(null);
        alert(editingFacture ? 'âœ… Facture modifiÃ©e' : 'âœ… Facture crÃ©Ã©e');
    };

    // Handlers pour AppelOffreModal
const handleSaveAppelOffre = (appelOffre) => {
    const updated = editingAppelOffre ? 
        appelOffres.map(ao => ao.id === editingAppelOffre.id ? appelOffre : ao) : 
        [...appelOffres, appelOffre];
    
    setAppelOffres(updated);
    window.saveData('appelOffres', updated);
    setShowAppelOffreModal(false);
    setEditingAppelOffre(null);
    alert(editingAppelOffre ? '✅ Appel d\'offres modifié' : '✅ Appel d\'offres créé');
};

const handleUpdateFavorites = (updatedOffres) => {
    setOffres(updatedOffres);
    window.saveData('offres', updatedOffres);
};

const handleCreateCommandeFromAO = (offreFavorite, appelOffre) => {
    const commande = {
        id: `CMD-${Date.now()}`,
        numero: `CMD-${Date.now().toString().slice(-6)}`,
        offreId: offreFavorite.id,
        fournisseur: offreFavorite.fournisseur,
        dateCommande: new Date().toISOString().split('T')[0],
        lots: offreFavorite.lots || [],
        positions0: offreFavorite.positions0 || [],
        positions1: offreFavorite.positions1 || [],
        montant: offreFavorite.montant,
        statut: 'En cours',
        source: 'Offre',
        dateCreation: new Date().toISOString()
    };
    
    const updatedCommandes = [...commandes, commande];
    setCommandes(updatedCommandes);
    window.saveData('commandes', updatedCommandes);
    
    const updatedOffres = offres.map(o => {
        if (o.appelOffreId === appelOffre.id) {
            if (o.id === offreFavorite.id) {
                return { ...o, statut: 'Acceptée' };
            } else {
                return { ...o, statut: 'Refusée' };
            }
        }
        return o;
    });
    setOffres(updatedOffres);
    window.saveData('offres', updatedOffres);
    
    const updatedAO = appelOffres.map(ao => 
        ao.id === appelOffre.id ? { ...ao, statut: 'Attribué' } : ao
    );
    setAppelOffres(updatedAO);
    window.saveData('appelOffres', updatedAO);
    
    setShowAppelOffreDetail(false);
    setSelectedAppelOffre(null);
    alert('✅ Commande créée ! L\'offre favorite a été acceptée et l\'AO est attribué.');
    };

    // Handlers d'export
    const handleExportAllData = () => {
        window.exportAllData({
            estimations,
            offres,
            commandes,
            offresComplementaires,
            regies,
            factures,
            appelOffres
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* En-tÃªte */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">ðŸ—ï¸ Gestion du Projet de Construction</h1>
                            <p className="text-gray-600 mt-2">Suivi complet des estimations, offres, commandes et factures</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportAllData}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                title="Exporter toutes les donnÃ©es (JSON)"
                            >
                                ðŸ’¾ Exporter tout
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                title="Importer des donnÃ©es"
                            >
                                ðŸ“¥ Importer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Onglets de navigation */}
                <div className="bg-white rounded-lg shadow-lg mb-6">
                    <div className="flex overflow-x-auto">
                        {[
                            { id: 'dashboard', label: 'ðŸ“Š Dashboard', icon: 'ðŸ“Š' },
                            { id: 'estimations', label: 'ðŸ“‹ Estimations', icon: 'ðŸ“‹' },
                            { id: 'offres', label: 'ðŸ’¼ Offres', icon: 'ðŸ’¼' },
                            { id: 'appelOffres', label: '🎯 Appels d\'Offres', icon: '🎯' },
                            { id: 'offresComplementaires', label: 'âž• OC', icon: 'âž•' },
                            { id: 'commandes', label: 'ðŸ“¦ Commandes', icon: 'ðŸ“¦' },
                            { id: 'regies', label: 'â±ï¸ RÃ©gies', icon: 'â±ï¸' },
                            { id: 'factures', label: 'ðŸ’° Factures', icon: 'ðŸ’°' },
                            { id: 'alignement', label: 'ðŸŽ¯ Alignement', icon: 'ðŸŽ¯' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                                    activeTab === tab.id 
                                        ? 'bg-blue-600 text-white border-b-4 border-blue-800' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Contenu des onglets */}
                
                {/* DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <window.Dashboard
                        estimations={estimations}
                        offres={offres}
                        offresComplementaires={offresComplementaires}
                        commandes={commandes}
                        regies={regies}
                        factures={factures}
                    />
                )}

                {/* ESTIMATIONS */}
                {activeTab === 'estimations' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">ðŸ“‹ Estimations</h2>
                            <div className="flex gap-2">
                                {estimations.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(estimations, 'estimations')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">ðŸ“ Module Estimations</p>
                            <p className="text-sm mt-2">Les estimations peuvent Ãªtre crÃ©Ã©es manuellement ou importÃ©es via CSV/JSON</p>
                            <p className="text-sm mt-4 text-gray-400">
                                Total estimations : {estimations.length}
                            </p>
                        </div>
                    </div>
                )}

{/* ONGLET APPELS D'OFFRES */}
{activeTab === 'appelOffres' && (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex justify-between mb-6">
      <h2 className="text-xl font-bold">Appels d'Offres</h2>
      <button 
        onClick={() => { 
          setEditingAppelOffre(null); 
          setShowAppelOffreModal(true); 
        }} 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
      >
        <Plus />Nouvel AO
      </button>
    </div>
    
    {appelOffres.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p>Aucun appel d'offres</p>
      </div>
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">N° AO</th>
                <th className="px-4 py-3 text-left text-sm">Désignation</th>
                <th className="px-4 py-3 text-left text-sm">Date création</th>
                <th className="px-4 py-3 text-left text-sm">Date limite</th>
                <th className="px-4 py-3 text-left text-sm">Lots</th>
                <th className="px-4 py-3 text-center text-sm">Offres reçues</th>
                <th className="px-4 py-3 text-left text-sm">Statut</th>
                <th className="px-4 py-3 text-center text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appelOffres.map(ao => {
                const offresLiees = offres.filter(o => o.appelOffreId === ao.id);
                const offreFavorite = offresLiees.find(o => o.isFavorite);
                
                return (
                  <tr key={ao.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => { 
                          setSelectedAppelOffre(ao); 
                          setShowAppelOffreDetail(true); 
                        }} 
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {ao.numero}
                      </button>
                    </td>
                    <td className="px-4 py-3">{ao.designation}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(ao.dateCreation).toLocaleDateString('fr-CH')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {ao.dateLimite ? new Date(ao.dateLimite).toLocaleDateString('fr-CH') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">{ao.lots?.join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        offresLiees.length === 0 ? 'bg-gray-100 text-gray-800' :
                        offresLiees.length === 1 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {offresLiees.length}
                        {offreFavorite && ' (⭐)'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ao.statut === 'Attribué' ? 'bg-green-100 text-green-800' : 
                        ao.statut === 'Annulé' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ao.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => { 
                          if (confirm('Supprimer cet appel d\'offres ?')) { 
                            const updated = appelOffres.filter(a => a.id !== ao.id); 
                            setAppelOffres(updated); 
                            window.saveData('appelOffres', updated); 
                          }
                        }} 
                        className="text-red-600"
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="font-semibold">
            Total appels d'offres: {appelOffres.length} 
            ({appelOffres.filter(ao => ao.statut === 'En consultation').length} en consultation, 
            {appelOffres.filter(ao => ao.statut === 'Attribué').length} attribués)
          </p>
        </div>
      </>
    )}
  </div>
    )}

                {/* OFFRES */}
                {activeTab === 'offres' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">ðŸ’¼ Offres</h2>
                            <div className="flex gap-2">
                                {offres.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(offres, 'offres')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                                <button 
                                    onClick={() => { 
                                        setEditingOffre(null); 
                                        setShowOffreModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus />Nouvelle offre
                                </button>
                            </div>
                        </div>
                        
                        {offres.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Aucune offre</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° Offre</th>
                                                <th className="px-4 py-3 text-left text-sm">Version</th>
                                                <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                                <th className="px-4 py-3 text-left text-sm">Date</th>
                                                <th className="px-4 py-3 text-left text-sm">Lots</th>
                                                <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                                <th className="px-4 py-3 text-left text-sm">Statut</th>
                                                <th className="px-4 py-3 text-center text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offres.map(offre => (
                                                <tr key={offre.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => { 
                                                                setEditingOffre(offre); 
                                                                setShowOffreModal(true); 
                                                            }} 
                                                            className="text-blue-600 hover:underline font-medium"
                                                        >
                                                            {offre.numero}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                            V{offre.version || 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{offre.fournisseur}</td>
                                                    <td className="px-4 py-3">
                                                        {new Date(offre.dateOffre).toLocaleDateString('fr-CH')}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{offre.lots?.join(', ') || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {offre.montant?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            offre.statut === 'AcceptÃ©e' ? 'bg-green-100 text-green-800' : 
                                                            offre.statut === 'RefusÃ©e' ? 'bg-red-100 text-red-800' :
                                                            offre.statut === 'ExpirÃ©e' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {offre.statut}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => { 
                                                                if (confirm('Supprimer cette offre ?')) { 
                                                                    const updated = offres.filter(o => o.id !== offre.id); 
                                                                    setOffres(updated); 
                                                                    window.saveData('offres', updated); 
                                                                }
                                                            }} 
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">
                                        Total offres: {offres.reduce((sum, o) => sum + (o.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* OFFRES COMPLÃ‰MENTAIRES */}
                {activeTab === 'offresComplementaires' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">âž• Offres ComplÃ©mentaires</h2>
                            <div className="flex gap-2">
                                {offresComplementaires.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(offresComplementaires, 'offres_complementaires')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                                <button 
                                    onClick={() => { 
                                        setEditingOffreComp(null); 
                                        setShowOffreCompModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus />Nouvelle OC
                                </button>
                            </div>
                        </div>
                        
                        {offresComplementaires.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Aucune offre complÃ©mentaire</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° OC</th>
                                                <th className="px-4 py-3 text-left text-sm">Offre Originale</th>
                                                <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                                <th className="px-4 py-3 text-left text-sm">Motif</th>
                                                <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                                <th className="px-4 py-3 text-left text-sm">Statut</th>
                                                <th className="px-4 py-3 text-center text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offresComplementaires.map(oc => {
                                                const offre = offres.find(o => o.id === oc.offreOriginaleId);
                                                return (
                                                    <tr key={oc.id} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <button 
                                                                onClick={() => { 
                                                                    setEditingOffreComp(oc); 
                                                                    setShowOffreCompModal(true); 
                                                                }} 
                                                                className="text-blue-600 hover:underline font-medium"
                                                            >
                                                                {oc.numero}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {offre ? offre.numero : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">{oc.fournisseur}</td>
                                                        <td className="px-4 py-3 text-sm">{oc.motif || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-medium">
                                                            {oc.montant?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-xs ${
                                                                oc.statut === 'AcceptÃ©e' ? 'bg-green-100 text-green-800' : 
                                                                oc.statut === 'RefusÃ©e' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {oc.statut}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button 
                                                                onClick={() => { 
                                                                    if (confirm('Supprimer cette OC ?')) { 
                                                                        const updated = offresComplementaires.filter(o => o.id !== oc.id); 
                                                                        setOffresComplementaires(updated); 
                                                                        window.saveData('offresComplementaires', updated); 
                                                                    }
                                                                }} 
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                                    <p className="font-semibold">
                                        Total OC: {offresComplementaires.reduce((sum, oc) => sum + (oc.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* COMMANDES */}
                {activeTab === 'commandes' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">ðŸ“¦ Commandes</h2>
                            <div className="flex gap-2">
                                {commandes.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(commandes, 'commandes')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                                <button 
                                    onClick={() => { 
                                        setEditingCommande(null); 
                                        setShowCommandeModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus />Nouvelle commande
                                </button>
                            </div>
                        </div>
                        
                        {commandes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Aucune commande</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° Commande</th>
                                                <th className="px-4 py-3 text-left text-sm">Source</th>
                                                <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                                <th className="px-4 py-3 text-left text-sm">Date</th>
                                                <th className="px-4 py-3 text-left text-sm">Lots</th>
                                                <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                                <th className="px-4 py-3 text-left text-sm">Statut</th>
                                                <th className="px-4 py-3 text-center text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commandes.map(cmd => (
                                                <tr key={cmd.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => { 
                                                                setEditingCommande(cmd); 
                                                                setShowCommandeModal(true); 
                                                            }} 
                                                            className="text-blue-600 hover:underline font-medium"
                                                        >
                                                            {cmd.numero}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <span className={`px-2 py-1 rounded ${
                                                            cmd.sourceType === 'Offre' ? 'bg-blue-100 text-blue-800' :
                                                            cmd.sourceType === 'OC' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {cmd.sourceType || 'Manuelle'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{cmd.fournisseur}</td>
                                                    <td className="px-4 py-3">
                                                        {new Date(cmd.dateCommande).toLocaleDateString('fr-CH')}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{cmd.lots?.join(', ') || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {(cmd.calculatedMontant || cmd.montant || 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            cmd.statut === 'ComplÃ©tÃ©e' ? 'bg-green-100 text-green-800' : 
                                                            cmd.statut === 'AnnulÃ©e' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {cmd.statut}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => { 
                                                                if (confirm('Supprimer ?')) { 
                                                                    const updated = commandes.filter(c => c.id !== cmd.id); 
                                                                    setCommandes(updated); 
                                                                    window.saveData('commandes', updated); 
                                                                }
                                                            }} 
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">
                                        Total commandes: {commandes.reduce((sum, c) => sum + (c.calculatedMontant || c.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* RÃ‰GIES */}
                {activeTab === 'regies' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">â±ï¸ RÃ©gies</h2>
                            <div className="flex gap-2">
                                {regies.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(regies, 'regies')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                                <button 
                                    onClick={() => { 
                                        setEditingRegie(null); 
                                        setShowRegieModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus />Nouvelle rÃ©gie
                                </button>
                            </div>
                        </div>
                        
                        {regies.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Aucune rÃ©gie</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° RÃ©gie</th>
                                                <th className="px-4 py-3 text-left text-sm">Date</th>
                                                <th className="px-4 py-3 text-right text-sm">Heures</th>
                                                <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                                <th className="px-4 py-3 text-left text-sm">Statut</th>
                                                <th className="px-4 py-3 text-center text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {regies.map(regie => (
                                                <tr key={regie.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => { 
                                                                setEditingRegie(regie); 
                                                                setShowRegieModal(true); 
                                                            }} 
                                                            className="text-blue-600 hover:underline font-medium"
                                                        >
                                                            {regie.numero}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {new Date(regie.date).toLocaleDateString('fr-CH')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{regie.heures?.toFixed(1)}h</td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {regie.montantTotal?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            regie.statut === 'FacturÃ©e' ? 'bg-green-100 text-green-800' : 
                                                            regie.statut === 'ValidÃ©e' ? 'bg-blue-100 text-blue-800' : 
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {regie.statut}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => { 
                                                                if (confirm('Supprimer ?')) { 
                                                                    const updated = regies.filter(r => r.id !== regie.id); 
                                                                    setRegies(updated); 
                                                                    window.saveData('regies', updated); 
                                                                }
                                                            }} 
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">
                                        Total rÃ©gies: {regies.reduce((sum, r) => sum + (r.montantTotal || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* FACTURES */}
                {activeTab === 'factures' && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">ðŸ’° Factures</h2>
                            <div className="flex gap-2">
                                {factures.length > 0 && (
                                    <button 
                                        onClick={() => window.exportToCSV(factures, 'factures')} 
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        ðŸ’¾ Exporter CSV
                                    </button>
                                )}
                                <button 
                                    onClick={() => { 
                                        setEditingFacture(null); 
                                        setShowFactureModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus />Nouvelle facture
                                </button>
                            </div>
                        </div>
                        
                        {factures.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Aucune facture</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° Facture</th>
                                                <th className="px-4 py-3 text-left text-sm">NÂ° Situation</th>
                                                <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                                <th className="px-4 py-3 text-left text-sm">Date</th>
                                                <th className="px-4 py-3 text-right text-sm">Montant HT (CHF)</th>
                                                <th className="px-4 py-3 text-left text-sm">Statut</th>
                                                <th className="px-4 py-3 text-center text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {factures.map(facture => (
                                                <tr key={facture.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => { 
                                                                setEditingFacture(facture); 
                                                                setShowFactureModal(true); 
                                                            }} 
                                                            className="text-blue-600 hover:underline font-medium"
                                                        >
                                                            {facture.numero}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {facture.numeroSituation ? `Sit. ${facture.numeroSituation}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">{facture.fournisseur}</td>
                                                    <td className="px-4 py-3">
                                                        {new Date(facture.dateFacturation).toLocaleDateString('fr-CH')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {facture.montantHT?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${
                                                            facture.statut === 'PayÃ©e' ? 'bg-green-100 text-green-800' : 
                                                            facture.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                                                            facture.statut === 'ContestÃ©e' ? 'bg-orange-100 text-orange-800' :
                                                            facture.statut === 'ReÃ§ue' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {facture.statut}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => { 
                                                                if (confirm('Supprimer ?')) { 
                                                                    const updated = factures.filter(f => f.id !== facture.id); 
                                                                    setFactures(updated); 
                                                                    window.saveData('factures', updated); 
                                                                }
                                                            }} 
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total factures</p>
                                        <p className="font-semibold text-lg">
                                            {factures.reduce((sum, f) => sum + (f.montantHT || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                        </p>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-gray-600">PayÃ©es</p>
                                        <p className="font-semibold text-lg">
                                            {factures.filter(f => f.statut === 'PayÃ©e').reduce((sum, f) => sum + (f.montantHT || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                        </p>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg">
                                        <p className="text-sm text-gray-600">En attente</p>
                                        <p className="font-semibold text-lg">
                                            {factures.filter(f => f.statut !== 'PayÃ©e').reduce((sum, f) => sum + (f.montantHT || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ALIGNEMENT BUDGÃ‰TAIRE */}
                {activeTab === 'alignement' && (
                    <window.AlignementBudgetaire
                        estimations={estimations}
                        offres={offres}
                        offresComplementaires={offresComplementaires}
                        commandes={commandes}
                        regies={regies}
                        factures={factures}
                    />
                )}

                {/* MODALS */}
                {showImportModal && (
                    <window.ImportModal
                        onClose={() => setShowImportModal(false)}
                        onImportComplete={() => loadAllData()}
                        estimations={estimations}
                        offres={offres}
                        offresComplementaires={offresComplementaires}
                        commandes={commandes}
                        regies={regies}
                        factures={factures}
                        setEstimations={setEstimations}
                        setOffres={setOffres}
                        setOffresComplementaires={setOffresComplementaires}
                        setCommandes={setCommandes}
                        setRegies={setRegies}
                        setFactures={setFactures}
                    />
                )}

                {showOffreModal && (
                    <window.OffreModal
                        initialData={editingOffre}
                        onClose={() => {
                            setShowOffreModal(false);
                            setEditingOffre(null);
                        }}
                        onSave={handleSaveOffre}
                        estimations={estimations}
                        appelOffres={appelOffres}
                        offres={offres}
                    />
                )}

                {showOffreCompModal && (
                    <window.OffreComplementaireModal
                        initialData={editingOffreComp}
                        onClose={() => {
                            setShowOffreCompModal(false);
                            setEditingOffreComp(null);
                        }}
                        onSave={handleSaveOffreComp}
                        estimations={estimations}
                        offres={offres}
                    />
                )}

                {showCommandeModal && (
                    <window.CommandeModal
                        initialData={editingCommande}
                        onClose={() => {
                            setShowCommandeModal(false);
                            setEditingCommande(null);
                        }}
                        onSave={handleSaveCommande}
                        estimations={estimations}
                        offres={offres}
                        commandes={commandes}
                        offresComplementaires={offresComplementaires}
                    />
                )}

                {showRegieModal && (
                    <window.RegieModal
                        initialData={editingRegie}
                        onClose={() => {
                            setShowRegieModal(false);
                            setEditingRegie(null);
                        }}
                        onSave={handleSaveRegie}
                        estimations={estimations}
                        commandes={commandes}
                    />
                )}

                {showFactureModal && (
                    <window.FactureModal
                        initialData={editingFacture}
                        onClose={() => {
                            setShowFactureModal(false);
                            setEditingFacture(null);
                        }}
                        onSave={handleSaveFacture}
                        commandes={commandes}
                        regies={regies}
                    />
                )}
                            {/* Modal Appel d'Offres */}
{showAppelOffreModal && (
    <window.AppelOffreModal
        initialData={editingAppelOffre}
        onClose={() => {
            setShowAppelOffreModal(false);
            setEditingAppelOffre(null);
        }}
        onSave={handleSaveAppelOffre}
        estimations={estimations}
    />
)}

{/* Vue détaillée Appel d'Offres */}
{showAppelOffreDetail && selectedAppelOffre && (
    <window.AppelOffreDetailView
        appelOffre={selectedAppelOffre}
        offres={offres}
        onClose={() => {
            setShowAppelOffreDetail(false);
            setSelectedAppelOffre(null);
        }}
        onUpdateOffres={handleUpdateFavorites}
        onCreateCommande={handleCreateCommandeFromAO}
    />
)}
            </div>
        </div>
    );
};

// Rendre l'application
ReactDOM.render(<ConstructionManagement />, document.getElementById('root'));
