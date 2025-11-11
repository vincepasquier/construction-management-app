// Application principale de gestion de projet de construction
const { useState, useEffect } = React;
const { Plus, Trash2 } = window.Icons;

const ConstructionManagement = () => {
    // États principaux
    const [estimations, setEstimations] = useState([]);
    const [offres, setOffres] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [offresComplementaires, setOffresComplementaires] = useState([]);
    const [regies, setRegies] = useState([]);
    const [factures, setFactures] = useState([]);
    const [appelOffres, setAppelOffres] = useState([]);
    const [sessionName, setSessionName] = useState('Projet_Sans_Nom');
    
    // États UI
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
    
    // États d'édition
    const [editingOffre, setEditingOffre] = useState(null);
    const [editingCommande, setEditingCommande] = useState(null);
    const [editingFacture, setEditingFacture] = useState(null);
    const [editingOffreComp, setEditingOffreComp] = useState(null);
    const [editingRegie, setEditingRegie] = useState(null);
    const [editingAppelOffre, setEditingAppelOffre] = useState(null);
    const [selectedAppelOffre, setSelectedAppelOffre] = useState(null);

    // Chargement initial des données
    useEffect(() => {
        loadAllData();
    }, []);

    // Charger le nom de session
useEffect(() => {
    const savedSession = localStorage.getItem('sessionName');
    if (savedSession) {
        setSessionName(savedSession);
    }
}, []);

// Sauvegarder le nom de session quand il change
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

    // Handlers pour OffreModal
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

    // Handlers pour OffreComplementaireModal
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

    // Handlers pour RegieModal
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

    // Handlers pour FactureModal
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
                {/* En-tête */}
{/* En-tête */}
<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
    <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">🏗️ Gestion du Projet de Construction</h1>
            <p className="text-gray-600 mt-2">Suivi complet des estimations, offres, commandes et factures</p>
        </div>
        <div className="flex flex-col gap-3">
            {/* 🆕 SESSION MANAGER - NOUVEAU */}
            <window.SessionManager
                sessionName={sessionName}
                onSessionNameChange={handleSessionNameChange}
            />
            
            {/* Boutons d'action */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    title="Exporter les données"
                >
                    📤 Exporter
                </button>
                <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    title="Importer des données"
                >
                    📥 Importer
                </button>
                <button
                    onClick={() => {
                        if (confirm('⚠️ ATTENTION !\n\nCette action va SUPPRIMER TOUTES LES DONNÉES de manière IRRÉVERSIBLE.\n\nÊtes-vous absolument sûr de vouloir continuer ?')) {
                            if (confirm('Dernière confirmation : Toutes les estimations, offres, commandes, régies, factures et appels d\'offres seront supprimés.\n\nConfirmer la suppression ?')) {
                                localStorage.clear();
                                setEstimations([]);
                                setOffres([]);
                                setCommandes([]);
                                setOffresComplementaires([]);
                                setRegies([]);
                                setFactures([]);
                                setAppelOffres([]);
                                setSessionName('Projet_Sans_Nom');
                                alert('✅ Toutes les données ont été supprimées !');
                                window.location.reload();
                            }
                        }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    title="Supprimer toutes les données"
                >
                    🗑️ Reset
                </button>
            </div>
        </div>
    </div>
</div>

                {/* Onglets de navigation */}
                <div className="bg-white rounded-lg shadow-lg mb-6">
                    <div className="flex overflow-x-auto">
                        {[
                            { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
                            { id: 'alignement', label: '📌 Alignement', icon: '📌' },
                            { id: 'estimations', label: '📋 Estimations', icon: '📋' },
                            { id: 'appelOffres', label: '🎯 Appels d\'Offres', icon: '🎯' },
                            { id: 'offres', label: '💼 Offres', icon: '💼' },
                            { id: 'offresComplementaires', label: '➕ OC', icon: '➕' },
                            { id: 'commandes', label: '📦 Commandes', icon: '📦' },
                            { id: 'regies', label: '⏱️ Régies', icon: '⏱️' },
                            { id: 'factures', label: '💰 Factures', icon: '💰' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white border-b-4 border-blue-800'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Contenu des onglets */}
                <div className="mb-6">
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

                    {/* Estimations */}
                    {activeTab === 'estimations' && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between mb-6">
                                <h2 className="text-xl font-bold">Estimations Budgétaires</h2>
                                <div className="flex gap-2">
                                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2">
                                        📥 Importer CSV
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    window.importCSVData(file, 'Estimations', (data) => {
                                                        setEstimations(data);
                                                        window.saveData('estimations', data);
                                                        alert('✅ Estimations importées !');
                                                    });
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                    <button
                                        onClick={() => window.exportToCSV(estimations, 'estimations')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        💾 Exporter CSV
                                    </button>
                                </div>
                            </div>
                            {estimations.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Aucune estimation. Importez vos données pour commencer.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm">Lot</th>
                                                    <th className="px-4 py-3 text-left text-sm">Position 0</th>
                                                    <th className="px-4 py-3 text-left text-sm">Position 1</th>
                                                    <th className="px-4 py-3 text-center text-sm">Étape</th>
                                                    <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estimations.map((est, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3">{est.lots?.join(', ') || '-'}</td>
                                                        <td className="px-4 py-3">{est.positions0?.join(', ') || '-'}</td>
                                                        <td className="px-4 py-3">{est.positions1?.join(', ') || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {est.etape ? (
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                    est.etape === '1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                    Étape {est.etape}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium">
                                                            {est.montant?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600">Total Général</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {estimations.reduce((sum, e) => sum + (e.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Total Étape 1</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {estimations.filter(e => e.etape === '1').reduce((sum, e) => sum + (e.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Total Étape 2</p>
                                                <p className="text-xl font-bold text-purple-600">
                                                    {estimations.filter(e => e.etape === '2').reduce((sum, e) => sum + (e.montant || 0), 0).toLocaleString('fr-CH', {minimumFractionDigits: 2})} CHF
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Onglet Appels d'Offres */}
                    {activeTab === 'appelOffres' && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between mb-6">
                                <h2 className="text-xl font-bold">Appels d'Offres</h2>
                                <button 
                                    onClick={() => { 
                                        setEditingAppelOffre(null); 
                                        setShowAppelOffreModal(true); 
                                    }} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
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
                                                                    title="Voir les détails et comparer les offres"
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
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    <Trash2 size={18} />
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

                    {/* Offres */}
                    {activeTab === 'offres' && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between mb-6">
                                <h2 className="text-xl font-bold">Offres</h2>
                                <div className="flex gap-2">
                                    {offres.length > 0 && (
                                        <button
                                            onClick={() => window.exportToCSV(offres, 'offres')}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            💾 Exporter CSV
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setEditingOffre(null);
                                            setShowOffreModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
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
                                                    <th className="px-4 py-3 text-left text-sm">N° Offre</th>
                                                    <th className="px-4 py-3 text-left text-sm">Version</th>
                                                    <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                                    <th className="px-4 py-3 text-left text-sm">Date</th>
                                                    <th className="px-4 py-3 text-left text-sm">Lots</th>
                                                    <th className="px-4 py-3 text-center text-sm">Étape</th>
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
                                                            {offre.isFavorite && (
                                                                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                                    ⭐ Favorite
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                                V{offre.version}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">{offre.fournisseur}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {new Date(offre.dateOffre).toLocaleDateString('fr-CH')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">{offre.lots?.join(', ') || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {offre.etape ? (
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                    offre.etape === '1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                    Ét. {offre.etape}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium">
                                                            {offre.montant?.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-xs ${
                                                                offre.statut === 'Acceptée' ? 'bg-green-100 text-green-800' :
                                                                offre.statut === 'Refusée' ? 'bg-red-100 text-red-800' :
                                                                offre.statut === 'Expirée' ? 'bg-gray-100 text-gray-800' :
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
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 size={18} />
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

                    {/* Autres onglets (OC, Commandes, Régies, Factures) */}

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

            {/* Modals */}
{showImportModal && (
    <window.ImportModal
        onClose={() => setShowImportModal(false)}
        onImport={loadAllData}
        onSessionRestore={handleSessionNameChange}
    />
)}
                    {showExportModal && (
    <window.ExportModal
        onClose={() => setShowExportModal(false)}
        sessionName={sessionName}
        data={{
            estimations,
            offres,
            commandes,
            offresComplementaires,
            regies,
            factures,
            appelOffres
        }}
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
        estimations={estimations}
    />
)}

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

// Montage de l'application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ConstructionManagement />);
