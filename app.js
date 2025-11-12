// ========================================
// APPLICATION PRINCIPALE - AVEC SMARTTABLE
// ========================================
const { useState, useEffect } = React;
const { Plus, Trash2, Edit2 } = window.Icons;

const ConstructionManagement = () => {
    // ========================================
    // ÉTATS PRINCIPAUX
    // ========================================
    const [estimations, setEstimations] = useState([]);
    const [offres, setOffres] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [offresComplementaires, setOffresComplementaires] = useState([]);
    const [regies, setRegies] = useState([]);
    const [factures, setFactures] = useState([]);
    const [appelOffres, setAppelOffres] = useState([]);
    const [sessionName, setSessionName] = useState('Projet_Sans_Nom');
    
    // ========================================
    // ÉTATS UI
    // ========================================
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showOffreModal, setShowOffreModal] = useState(false);
    const [showCommandeModal, setShowCommandeModal] = useState(false);
    const [showOffreCompModal, setShowOffreCompModal] = useState(false);
    const [showRegieModal, setShowRegieModal] = useState(false);
    const [showFactureModal, setShowFactureModal] = useState(false);
    const [showAppelOffreModal, setShowAppelOffreModal] = useState(false);
    const [showAppelOffreDetail, setShowAppelOffreDetail] = useState(false);
    
    // ========================================
    // ÉTATS D'ÉDITION
    // ========================================
    const [editingOffre, setEditingOffre] = useState(null);
    const [editingCommande, setEditingCommande] = useState(null);
    const [editingFacture, setEditingFacture] = useState(null);
    const [editingOffreComp, setEditingOffreComp] = useState(null);
    const [editingRegie, setEditingRegie] = useState(null);
    const [editingAppelOffre, setEditingAppelOffre] = useState(null);
    const [selectedAppelOffre, setSelectedAppelOffre] = useState(null);

    // ========================================
    // CHARGEMENT INITIAL
    // ========================================
    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        const savedSession = localStorage.getItem('sessionName');
        if (savedSession) {
            setSessionName(savedSession);
        }
    }, []);

    const handleSessionNameChange = (newName) => {
        setSessionName(newName);
        localStorage.setItem('sessionName', newName);
    };

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

    // ========================================
    // HANDLERS DE SAUVEGARDE
    // ========================================
    
    // Handler Offres
    const handleSaveOffre = (offre) => {
        let updated = editingOffre ? 
            offres.map(o => o.id === editingOffre.id ? offre : o) : 
            [...offres, offre];
        
        // Mettre à jour les favorites si l'offre est liée à un AO
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

    // Handler Offres Complémentaires
    const handleSaveOffreComp = (offreComp) => {
        const updated = editingOffreComp ? 
            offresComplementaires.map(oc => oc.id === editingOffreComp.id ? offreComp : oc) : 
            [...offresComplementaires, offreComp];
        
        setOffresComplementaires(updated);
        window.saveData('offresComplementaires', updated);
        setShowOffreCompModal(false);
        setEditingOffreComp(null);
        alert(editingOffreComp ? '✅ Offre complémentaire modifiée' : '✅ Offre complémentaire créée');
    };

    // Handler Commandes
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
                {...o, statut: 'Acceptée'} : o
            );
            setOffres(updatedOffres);
            window.saveData('offres', updatedOffres);
        }

        // Accepter l'OC source si elle existe
        if (commande.offreComplementaireId && !editingCommande) {
            const updatedOC = offresComplementaires.map(oc => 
                oc.id === commande.offreComplementaireId && oc.statut === 'En attente' ? 
                {...oc, statut: 'Acceptée', commandeId: commande.id} : oc
            );
            setOffresComplementaires(updatedOC);
            window.saveData('offresComplementaires', updatedOC);
        }

        // Accepter les offres complémentaires sélectionnées
        if (commande.offresComplementairesIds && commande.offresComplementairesIds.length > 0) {
            const updatedOC = offresComplementaires.map(oc => {
                if (commande.offresComplementairesIds.includes(oc.id) && oc.statut === 'En attente') {
                    return { ...oc, statut: 'Acceptée', commandeId: commande.id };
                }
                return oc;
            });
            setOffresComplementaires(updatedOC);
            window.saveData('offresComplementaires', updatedOC);
        }

        setShowCommandeModal(false);
        setEditingCommande(null);
        alert(editingCommande ? '✅ Commande modifiée' : '✅ Commande créée');
    };

    // Handler Régies
    const handleSaveRegie = (regie) => {
        const updated = editingRegie ? 
            regies.map(r => r.id === editingRegie.id ? regie : r) : 
            [...regies, regie];
        
        setRegies(updated);
        window.saveData('regies', updated);
        setShowRegieModal(false);
        setEditingRegie(null);
        alert(editingRegie ? '✅ Régie modifiée' : '✅ Régie créée');
    };

    // Handler Factures
    const handleSaveFacture = (facture) => {
        const updated = editingFacture ? 
            factures.map(f => f.id === editingFacture.id ? facture : f) : 
            [...factures, facture];
        
        setFactures(updated);
        window.saveData('factures', updated);
        setShowFactureModal(false);
        setEditingFacture(null);
        alert(editingFacture ? '✅ Facture modifiée' : '✅ Facture créée');
    };

    // Handler Appels d'Offres
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

    // Mettre à jour les offres favorites depuis la vue détaillée
    const handleUpdateFavorites = (updatedOffres) => {
        setOffres(updatedOffres);
        window.saveData('offres', updatedOffres);
    };

    // Créer une commande depuis un AO
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
            etape: offreFavorite.etape || '',
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

    // ========================================
    // HANDLERS D'EXPORT
    // ========================================
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

    // ========================================
    // RENDU PRINCIPAL
    // ========================================
    return (
        <div className="min-h-screen bg-gray-50">
            {/* En-tête */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                🏗️ Gestion de Construction
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Session: {sessionName}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <window.Icons.Upload size={20} />
                                Importer
                            </button>
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <window.Icons.Download size={20} />
                                Exporter
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation par onglets */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
                            { id: 'estimations', label: '📋 Estimations', icon: '📋' },
                            { id: 'appelOffres', label: '🎯 Appels d\'Offres', icon: '🎯' },
                            { id: 'offres', label: '💼 Offres', icon: '💼' },
                            { id: 'offresComplementaires', label: '➕ OC', icon: '➕' },
                            { id: 'commandes', label: '📦 Commandes', icon: '📦' },
                            { id: 'regies', label: '⏱️ Régies', icon: '⏱️' },
                            { id: 'factures', label: '💰 Factures', icon: '💰' },
                            { id: 'alignement', label: '📌 Alignement', icon: '📌' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="space-y-6">
                    {/* Dashboard */}
                    {activeTab === 'dashboard' && (
                        <window.Dashboard
                            estimations={estimations}
                            offres={offres}
                            commandes={commandes}
                            offresComplementaires={offresComplementaires}
                            regies={regies}
                            factures={factures}
                        />
                    )}

                    {/* Estimations avec SmartTable */}
                    {activeTab === 'estimations' && (
                        <window.SmartTable
                            data={estimations}
                            columns={[
                                { key: 'designation', label: 'Désignation', align: 'left' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'positions0', label: 'Pos. Niv. 0', align: 'left' },
                                { key: 'positions1', label: 'Pos. Niv. 1', align: 'left' },
                                { key: 'etape', label: 'Étape', align: 'left' },
                                { key: 'montant', label: 'Montant (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(est) => (
                                <tr key={est.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{est.designation}</td>
                                    <td className="px-4 py-3 text-xs">{est.lots?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-xs">{est.positions0?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-xs">{est.positions1?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-xs">{est.etape || '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {(est.montant || 0).toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => {
                                                alert('Édition des estimations - Fonctionnalité à implémenter');
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            emptyMessage="Aucune estimation - Importez un fichier pour commencer"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">📋 Estimations</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowImportModal(true)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
                                        >
                                            <window.Icons.Upload size={20} />
                                            Importer
                                        </button>
                                    </div>
                                </>
                            }
                        />
                    )}

                    {/* Appels d'Offres avec SmartTable */}
                    {activeTab === 'appelOffres' && (
                        <window.SmartTable
                            data={appelOffres}
                            columns={[
                                { key: 'numero', label: 'N° AO', align: 'left' },
                                { key: 'designation', label: 'Désignation', align: 'left' },
                                { key: 'dateCreation', label: 'Date création', align: 'center' },
                                { key: 'dateLimite', label: 'Date limite', align: 'center' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(ao) => {
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
                                                title="Voir les détails et comparer les offres"
                                            >
                                                {ao.numero}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">{ao.designation}</td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {new Date(ao.dateCreation).toLocaleDateString('fr-CH')}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {ao.dateLimite ? new Date(ao.dateLimite).toLocaleDateString('fr-CH') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs">{ao.lots?.join(', ') || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                ao.statut === 'Attribué' ? 'bg-green-100 text-green-800' :
                                                ao.statut === 'Annulé' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {ao.statut}
                                            </span>
                                            {offresLiees.length > 0 && (
                                                <span className="ml-2 text-xs text-gray-600">
                                                    ({offresLiees.length} offre{offresLiees.length > 1 ? 's' : ''}{offreFavorite && ' ⭐'})
                                                </span>
                                            )}
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
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }}
                            emptyMessage="Aucun appel d'offres"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">🎯 Appels d'Offres</h2>
                                    <button
                                        onClick={() => { 
                                            setEditingAppelOffre(null); 
                                            setShowAppelOffreModal(true); 
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Plus size={20} />
                                        Nouvel AO
                                    </button>
                                </>
                            }
                        />
                    )}

                    {/* Offres avec SmartTable */}
                    {activeTab === 'offres' && (
                        <window.SmartTable
                            data={offres}
                            columns={[
                                { key: 'numero', label: 'N° Offre', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'montant', label: 'Montant (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                          renderRow={(offre) => (
    <tr key={offre.id} className="border-t hover:bg-gray-50">
        <td className="px-4 py-3">
            <span className="font-medium text-blue-600">
                {offre.numero}
            </span>
            {offre.isFavorite && (
                <span className="ml-2 text-yellow-500" title="Offre favorite">⭐</span>
            )}
        </td>
        <td className="px-4 py-3">{offre.fournisseur}</td>
        <td className="px-4 py-3 text-xs">{offre.lots?.join(', ') || '-'}</td>
        <td className="px-4 py-3 text-center">
            <span className={`px-2 py-1 rounded text-xs ${
                offre.statut === 'Acceptée' ? 'bg-green-100 text-green-800' :
                offre.statut === 'Refusée' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {offre.statut || 'En attente'}
            </span>
        </td>
        <td className="px-4 py-3 text-right font-medium">
            {offre.montant?.toLocaleString('fr-CH')} CHF
        </td>
        <td className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2">
                <button 
                    onClick={() => {
                        setEditingOffre(offre);
                        setShowOffreModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="Modifier"
                >
                    <Edit2 size={16} />
                </button>
                <button 
                    onClick={() => {
                        if (confirm(`Supprimer l'offre ${offre.numero} ?`)) {
                            const updated = offres.filter(o => o.id !== offre.id);
                            setOffres(updated);
                            window.saveData('offres', updated);
                            alert('✅ Offre supprimée');
                        }
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="Supprimer"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </td>
    </tr>
)}
emptyMessage="Aucune offre"
actions={
    <>
        <h2 className="text-xl font-bold">💼 Offres</h2>
        <button
            onClick={() => {
                setEditingOffre(null);
                setShowOffreModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
            <Plus size={20} />
            Nouvelle offre
        </button>
    </>
}
{/* Offres Complémentaires avec SmartTable */}
                    {activeTab === 'offresComplementaires' && (
                        <window.SmartTable
                            data={offresComplementaires}
                            columns={[
                                { key: 'numero', label: 'N° OC', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'designation', label: 'Désignation', align: 'left' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'montant', label: 'Montant (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(oc) => (
                                <tr key={oc.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-blue-600">{oc.numero}</td>
                                    <td className="px-4 py-3">{oc.fournisseur}</td>
                                    <td className="px-4 py-3">{oc.designation}</td>
                                    <td className="px-4 py-3 text-xs">{oc.lots?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            oc.statut === 'Acceptée' ? 'bg-green-100 text-green-800' :
                                            oc.statut === 'Refusée' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {oc.statut || 'En attente'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {oc.montant?.toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => {
                                                setEditingOffreComp(oc);
                                                setShowOffreCompModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            emptyMessage="Aucune offre complémentaire"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">➕ Offres Complémentaires</h2>
                                    <button
                                        onClick={() => {
                                            setEditingOffreComp(null);
                                            setShowOffreCompModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Plus size={20} />
                                        Nouvelle OC
                                    </button>
                                </>
                            }
                        />
                    )}

                    {/* Commandes avec SmartTable */}
                    {activeTab === 'commandes' && (
                        <window.SmartTable
                            data={commandes}
                            columns={[
                                { key: 'numero', label: 'N° Commande', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'dateCommande', label: 'Date', align: 'center' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'montant', label: 'Montant (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(cmd) => (
                                <tr key={cmd.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-blue-600">{cmd.numero}</td>
                                    <td className="px-4 py-3">{cmd.fournisseur}</td>
                                    <td className="px-4 py-3 text-xs">{cmd.lots?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        {new Date(cmd.dateCommande).toLocaleDateString('fr-CH')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            cmd.statut === 'Terminée' ? 'bg-green-100 text-green-800' :
                                            cmd.statut === 'Annulée' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {cmd.statut || 'En cours'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {(cmd.calculatedMontant || cmd.montant || 0).toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => {
                                                setEditingCommande(cmd);
                                                setShowCommandeModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            emptyMessage="Aucune commande"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">📦 Commandes</h2>
                                    <button
                                        onClick={() => {
                                            setEditingCommande(null);
                                            setShowCommandeModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Plus size={20} />
                                        Nouvelle commande
                                    </button>
                                </>
                            }
                        />
                    )}

                    {/* Régies avec SmartTable */}
                    {activeTab === 'regies' && (
                        <window.SmartTable
                            data={regies}
                            columns={[
                                { key: 'numero', label: 'N° Régie', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'designation', label: 'Désignation', align: 'left' },
                                { key: 'lots', label: 'Lots', align: 'left' },
                                { key: 'dateDebut', label: 'Date début', align: 'center' },
                                { key: 'dateFin', label: 'Date fin', align: 'center' },
                                { key: 'montantTotal', label: 'Montant Total (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(regie) => (
                                <tr key={regie.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-blue-600">{regie.numero}</td>
                                    <td className="px-4 py-3">{regie.fournisseur}</td>
                                    <td className="px-4 py-3">{regie.designation}</td>
                                    <td className="px-4 py-3 text-xs">{regie.lots?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        {regie.dateDebut ? new Date(regie.dateDebut).toLocaleDateString('fr-CH') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        {regie.dateFin ? new Date(regie.dateFin).toLocaleDateString('fr-CH') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {(regie.montantTotal || 0).toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => {
                                                setEditingRegie(regie);
                                                setShowRegieModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            emptyMessage="Aucune régie"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">⏱️ Régies</h2>
                                    <button
                                        onClick={() => {
                                            setEditingRegie(null);
                                            setShowRegieModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Plus size={20} />
                                        Nouvelle régie
                                    </button>
                                </>
                            }
                        />
                    )}

                    {/* Factures avec SmartTable */}
                    {activeTab === 'factures' && (
                        <window.SmartTable
                            data={factures}
                            columns={[
                                { key: 'numero', label: 'N° Facture', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'dateFacture', label: 'Date', align: 'center' },
                                { key: 'dateEcheance', label: 'Échéance', align: 'center' },
                                { key: 'montantHT', label: 'Montant HT', align: 'right' },
                                { key: 'montantTTC', label: 'Montant TTC', align: 'right' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '100px' }
                            ]}
                            renderRow={(facture) => (
                                <tr key={facture.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-blue-600">{facture.numero}</td>
                                    <td className="px-4 py-3">{facture.fournisseur}</td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        {new Date(facture.dateFacture).toLocaleDateString('fr-CH')}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm">
                                        {facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-CH') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {(facture.montantHT || 0).toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {(facture.montantTTC || 0).toLocaleString('fr-CH')} CHF
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            facture.statut === 'Payée' ? 'bg-green-100 text-green-800' :
                                            facture.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                                            facture.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {facture.statut}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => {
                                                setEditingFacture(facture);
                                                setShowFactureModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            emptyMessage="Aucune facture"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">💰 Factures</h2>
                                    <button
                                        onClick={() => {
                                            setEditingFacture(null);
                                            setShowFactureModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Plus size={20} />
                                        Nouvelle facture
                                    </button>
                                </>
                            }
                        />
                    )}

                    {/* Alignement Budgétaire */}
                    {activeTab === 'alignement' && (
                        <window.AlignementBudgetaire
                            estimations={estimations}
                            offres={offres}
                            commandes={commandes}
                            offresComplementaires={offresComplementaires}
                            regies={regies}
                            factures={factures}
                        />
                    )}
                </div>
            </div>

                     {/* ======================================== */}
            {/* MODALS */}
            {/* ======================================== */}

            {/* Modal Import */}
            {showImportModal && (
                <window.ImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={loadAllData}
                    onSessionRestore={handleSessionNameChange}
                />
            )}

                     {/* Modal Import */}
            {showImportModal && (
                <window.ImportModal
                    onClose={() => setShowImportModal(false)}
                    onImport={loadAllData}
                    onSessionRestore={handleSessionNameChange}
                />
            )}
                     {/* Modal Import */}
{showImportModal && (
    <window.ImportModal
        onClose={() => setShowImportModal(false)}
        onImport={loadAllData}
        onSessionRestore={handleSessionNameChange}
    />
)}

{/* 🆕 AJOUTER CE MODAL EXPORT */}
{showExportModal && (
    <window.ExportModal
        onClose={() => setShowExportModal(false)}
        data={{
            estimations,
            offres,
            commandes,
            offresComplementaires,
            regies,
            factures,
            appelOffres
        }}
        sessionName={sessionName}
    />
)}

            {/* 🆕 AJOUTEZ CE MODAL SESSION MANAGER */}
            <window.SessionManager
                sessionName={sessionName}
                onSessionNameChange={handleSessionNameChange}
            />

            {/* Modal Offre */}
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

            {/* Modal Offre Complémentaire */}
            {showOffreCompModal && (
                <window.OffreComplementaireModal
                    initialData={editingOffreComp}
                    onClose={() => {
                        setShowOffreCompModal(false);
                        setEditingOffreComp(null);
                    }}
                    onSave={handleSaveOffreComp}
                    estimations={estimations}
                />
            )}

            {/* Modal Commande */}
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
                    offresComplementaires={offresComplementaires}
                />
            )}

            {/* Modal Régie */}
            {showRegieModal && (
                <window.RegieModal
                    initialData={editingRegie}
                    onClose={() => {
                        setShowRegieModal(false);
                        setEditingRegie(null);
                    }}
                    onSave={handleSaveRegie}
                    estimations={estimations}
                />
            )}

            {/* Modal Facture */}
            {showFactureModal && (
                <window.FactureModal
                    initialData={editingFacture}
                    onClose={() => {
                        setShowFactureModal(false);
                        setEditingFacture(null);
                    }}
                    onSave={handleSaveFacture}
                    commandes={commandes}
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
    );
};

// ========================================
// MONTAGE DE L'APPLICATION
// ========================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ConstructionManagement />);
