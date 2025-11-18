    // ========================================
    // APPLICATION PRINCIPALE - AVEC SMARTTABLE
    // ========================================
    const { useState, useEffect, useRef } = React;
    const { Plus, Trash2, Edit2, Upload, Download } = window.Icons;  // 🆕 MODIFIÉ
    
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
    const [ajustements, setAjustements] = useState([]);
    
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
    const [showEstimationBuilder, setShowEstimationBuilder] = useState(false);
    const [editingEstimation, setEditingEstimation] = useState(null);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const [showCSVTypeMenu, setShowCSVTypeMenu] = useState(false);  // 🆕 NOUVEAU
    const [selectedCSVType, setSelectedCSVType] = useState(null);
    const [showOneDriveConfig, setShowOneDriveConfig] = useState(false);// 🆕 NOUVEAU


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
    // REFS POUR LES IMPORTS
    // ========================================
    const importJSONRef = useRef(null);
    const importCSVRef = useRef(null);

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
        setAjustements(data.ajustements || []);
    };

    // ========================================
    // 🆕 FONCTIONS D'IMPORT/EXPORT JSON
    // ========================================
    
    // Export JSON Session complète
    const handleExportJSON = () => {
        const sessionData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            sessionName: sessionName,
            data: {
                estimations: estimations,
                appelOffres: appelOffres,
                offres: offres,
                commandes: commandes,
                offresComplementaires: offresComplementaires,
                regies: regies,
                factures: factures,
                ajustements: ajustements
            }
        };
        
        const jsonString = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionName}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Session complète exportée avec succès');
    };
        
  // Import JSON Session complète - VERSION DEBUG
const handleImportJSON = (event) => {
    console.log('🔵 handleImportJSON appelé'); // TEST 1
     setShowImportMenu(false);  // 🆕 FERMER LE MENU ICI
    
    const file = event.target.files[0];
    console.log('🔵 Fichier sélectionné:', file); // TEST 2
    
    if (!file) {
        console.log('⚠️ Aucun fichier');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('🔵 Fichier chargé'); // TEST 3
        
        try {
            const sessionData = JSON.parse(e.target.result);
            console.log('🔵 Données parsées:', sessionData); // TEST 4
            
            if (!sessionData.data) {
                throw new Error('Format de fichier invalide');
            }
            
            const stats = `• ${sessionData.data.estimations?.length || 0} estimation(s)
• ${sessionData.data.appelOffres?.length || 0} appel(s) d'offres
• ${sessionData.data.offres?.length || 0} offre(s)
• ${sessionData.data.commandes?.length || 0} commande(s)
• ${sessionData.data.offresComplementaires?.length || 0} offre(s) complémentaire(s)
• ${sessionData.data.regies?.length || 0} régie(s)
• ${sessionData.data.factures?.length || 0} facture(s)`;
            
            console.log('🔵 Stats:', stats); // TEST 5
            
            const confirmation = confirm(
                `⚠️ ATTENTION !\n\n` +
                `Cette action va REMPLACER toutes vos données actuelles par :\n\n` +
                stats + `\n\n` +
                `Session : ${sessionData.sessionName || 'Sans nom'}\n` +
                `Exporté le : ${new Date(sessionData.exportDate).toLocaleString('fr-CH')}\n\n` +
                `Voulez-vous continuer ?`
            );
            
            console.log('🔵 Confirmation:', confirmation); // TEST 6
            
            if (!confirmation) {
                event.target.value = '';
                return;
            }
            
            // Restaurer toutes les données
            if (sessionData.data.estimations) {
                setEstimations(sessionData.data.estimations);
                window.saveData('estimations', sessionData.data.estimations);
            }
            
            if (sessionData.data.appelOffres) {
                setAppelOffres(sessionData.data.appelOffres);
                window.saveData('appelOffres', sessionData.data.appelOffres);
            }
            
            if (sessionData.data.offres) {
                setOffres(sessionData.data.offres);
                window.saveData('offres', sessionData.data.offres);
            }
            
            if (sessionData.data.commandes) {
                setCommandes(sessionData.data.commandes);
                window.saveData('commandes', sessionData.data.commandes);
            }
            
            if (sessionData.data.offresComplementaires) {
                setOffresComplementaires(sessionData.data.offresComplementaires);
                window.saveData('offresComplementaires', sessionData.data.offresComplementaires);
            }
            
            if (sessionData.data.regies) {
                setRegies(sessionData.data.regies);
                window.saveData('regies', sessionData.data.regies);
            }
            
            if (sessionData.data.factures) {
                setFactures(sessionData.data.factures);
                window.saveData('factures', sessionData.data.factures);
            }
            
            // Restaurer le nom de session
            if (sessionData.sessionName) {
                handleSessionNameChange(sessionData.sessionName);
            }
            
            console.log('✅ Import terminé'); // TEST 7
            alert(`✅ Session complète restaurée !\n\n` + stats);
            event.target.value = '';
            
        } catch (error) {
            console.error('❌ Erreur import JSON:', error);
            alert('❌ Erreur lors de l\'import : ' + error.message);
        }
    };
    
    reader.onerror = (error) => {
        console.error('❌ Erreur lecture fichier:', error);
    };
    
    console.log('🔵 Début lecture fichier'); // TEST 8
    reader.readAsText(file, 'UTF-8');
};

   // Import CSV universel
const handleImportCSV = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvContent = e.target.result;
            const lines = csvContent.split('\n');
            const header = lines[0].replace(/^\uFEFF/, '').split(';').map(h => h.trim());
            const itemsImported = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.split(';');
                const row = {};
                header.forEach((col, idx) => {
                    row[col] = values[idx] ? values[idx].trim() : '';
                });
                
                let item = null;
                
                // Créer l'objet selon le type
                switch(type) {
                   // ========================================
                // 🔧 CODE À COPIER-COLLER DANS app.js
                // ========================================
                // Remplacer le case 'factures': dans handleImportCSV

                case 'factures':
                    item = {
                        // === IDs ===
                        id: row['ID'] || `facture-${Date.now()}-${i}`,
                        
                        // === Informations principales ===
                        numero: row['N° Facture'] || row['Numéro'] || row['Numero'] || '',
                        numeroFacture: row['N° Facture'] || row['Numéro'] || row['Numero'] || '',
                        fournisseur: row['Fournisseur'] || '',
                        
                        // === Liens avec commandes ===
                        commandeId: row['Commande Liée'] || row['Commande'] || '',
                        numeroCommande: row['N° Commande'] || '',
                        
                        // === Dates ===
                        dateFacture: row['Date Facture'] || row['Date'] || new Date().toISOString().split('T')[0],
                        dateEcheance: row['Date Échéance'] || row['Echeance'] || '',
                        
                        // === Lots et positions ===
                        lots: row['Lot'] ? (Array.isArray(row['Lot']) ? row['Lot'] : [row['Lot']]) : [],
                        positions0: row['Position 0'] ? (Array.isArray(row['Position 0']) ? row['Position 0'] : [row['Position 0']]) : [],
                        positions1: row['Position 1'] ? (Array.isArray(row['Position 1']) ? row['Position 1'] : [row['Position 1']]) : [],
                        
                        // === Désignation ===
                        designation: row['Désignation'] || row['Description'] || '',
                        description: row['Désignation'] || row['Description'] || '',
                        
                        // === Montants ===
                        montantHT: parseFloat(row['Montant HT'] || row['Montant']) || 0,
                        tauxTVA: parseFloat(row['Taux TVA']) || 8.1,
                        montantTVA: parseFloat(row['Montant TVA']) || 0,
                        montantTTC: parseFloat(row['Montant TTC']) || 0,
                        
                        // === Situation ===
                        numeroSituation: row['N° Situation'] ? parseInt(row['N° Situation']) : null,
                        pourcentage: row['Pourcentage'] || '',
                        
                        // === Statut ===
                        statut: row['Statut'] || 'En attente',
                        
                        // === Remarque ===
                        remarque: row['Remarque'] || '',
                        
                        // === Metadata ===
                        dateCreation: new Date().toISOString()
                    };
                    
                    // Recalculer TVA et TTC si manquants
                    if (!item.montantTVA && item.montantHT && item.tauxTVA) {
                        item.montantTVA = (item.montantHT * item.tauxTVA) / 100;
                    }
                    if (!item.montantTTC && item.montantHT) {
                        item.montantTTC = item.montantHT + (item.montantTVA || 0);
                    }
                    break;
                        
                    case 'commandes':
                        item = {
                            id: `commande-${Date.now()}-${i}`,
                            numero: row['Numéro'] || row['Numero'] || '',
                            fournisseur: row['Fournisseur'] || '',
                            montant: parseFloat(row['Montant']) || 0,
                            dateCommande: row['Date'] || new Date().toISOString().split('T')[0],
                            statut: row['Statut'] || 'En cours',
                            lots: row['Lots'] ? row['Lots'].split(',').map(l => l.trim()) : [],
                            positions0: [],
                            positions1: [],
                            etape: row['Etape'] || '',
                            dateCreation: new Date().toISOString()
                        };
                        break;
                        
                    case 'offres':
                        item = {
                            id: `offre-${Date.now()}-${i}`,
                            numero: row['Numéro'] || row['Numero'] || '',
                            fournisseur: row['Fournisseur'] || '',
                            montant: parseFloat(row['Montant']) || 0,
                            statut: row['Statut'] || 'En attente',
                            lots: row['Lots'] ? row['Lots'].split(',').map(l => l.trim()) : [],
                            positions0: [],
                            positions1: [],
                            etape: row['Etape'] || '',
                            dateCreation: new Date().toISOString()
                        };
                        break;
                        
                    case 'offresComplementaires':
                        item = {
                            id: `oc-${Date.now()}-${i}`,
                            numero: row['Numéro'] || row['Numero'] || '',
                            fournisseur: row['Fournisseur'] || '',
                            designation: row['Designation'] || row['Désignation'] || '',
                            montant: parseFloat(row['Montant']) || 0,
                            statut: row['Statut'] || 'En attente',
                            lots: row['Lots'] ? row['Lots'].split(',').map(l => l.trim()) : [],
                            positions0: [],
                            positions1: [],
                            dateCreation: new Date().toISOString()
                        };
                        break;
                        
                    case 'regies':
                        item = {
                            id: `regie-${Date.now()}-${i}`,
                            numero: row['Numéro'] || row['Numero'] || '',
                            fournisseur: row['Fournisseur'] || '',
                            designation: row['Designation'] || row['Désignation'] || '',
                            montantTotal: parseFloat(row['Montant']) || 0,
                            dateDebut: row['Date Debut'] || row['Date Début'] || '',
                            dateFin: row['Date Fin'] || '',
                            lots: row['Lots'] ? row['Lots'].split(',').map(l => l.trim()) : [],
                            positions0: [],
                            positions1: [],
                            dateCreation: new Date().toISOString()
                        };
                        break;
                }
                
                if (item) itemsImported.push(item);
            }
            
            if (itemsImported.length > 0) {
                const typeNames = {
                    factures: 'facture',
                    commandes: 'commande',
                    offres: 'offre',
                    offresComplementaires: 'offre complémentaire',
                    regies: 'régie'
                };
                
                const confirmation = confirm(
                    `Importer ${itemsImported.length} ${typeNames[type]}(s) ?\n\n` +
                    `⚠️ Cela REMPLACERA toutes les ${typeNames[type]}s existantes.`
                );
                
                if (confirmation) {
                    // Mettre à jour le state correspondant
                    switch(type) {
                        case 'factures':
                            setFactures(itemsImported);
                            window.saveData('factures', itemsImported);
                            break;
                        case 'commandes':
                            setCommandes(itemsImported);
                            window.saveData('commandes', itemsImported);
                            break;
                        case 'offres':
                            setOffres(itemsImported);
                            window.saveData('offres', itemsImported);
                            break;
                        case 'offresComplementaires':
                            setOffresComplementaires(itemsImported);
                            window.saveData('offresComplementaires', itemsImported);
                            break;
                        case 'regies':
                            setRegies(itemsImported);
                            window.saveData('regies', itemsImported);
                            break;
                    }
                    
                    alert(`✅ ${itemsImported.length} ${typeNames[type]}(s) importée(s)`);
                }
            } else {
                alert('⚠️ Aucune donnée valide trouvée');
            }
            
            event.target.value = '';
            
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur: ' + error.message);
        }
    };
    
    reader.readAsText(file, 'UTF-8');
};
    // Reset complet de la session
    const handleResetSession = () => {
    const confirmation = confirm(
        `⚠️ ATTENTION - SUPPRESSION TOTALE !\n\n` +
        `Cette action va SUPPRIMER DÉFINITIVEMENT :\n\n` +
        `• Toutes les estimations\n` +
        `• Tous les appels d'offres\n` +
        `• Toutes les offres\n` +
        `• Toutes les commandes\n` +
        `• Toutes les offres complémentaires\n` +
        `• Toutes les régies\n` +
        `• Toutes les factures\n\n` +
        `Cette action est IRRÉVERSIBLE.\n\n` +
        `Voulez-vous vraiment continuer ?`
    );
    
    if (!confirmation) return;
    
    // Double confirmation
    const doubleCheck = confirm(
        `⚠️ DERNIÈRE CONFIRMATION\n\n` +
        `Êtes-vous ABSOLUMENT SÛR de vouloir tout supprimer ?\n\n` +
        `Cette action ne peut pas être annulée !`
    );
    
    if (!doubleCheck) return;
    
    // Tout supprimer
    setEstimations([]);
    setAppelOffres([]);
    setOffres([]);
    setCommandes([]);
    setOffresComplementaires([]);
    setRegies([]);
    setFactures([]);
    setAjustements([]);
    
    window.saveData('estimations', []);
    window.saveData('appelOffres', []);
    window.saveData('offres', []);
    window.saveData('commandes', []);
    window.saveData('offresComplementaires', []);
    window.saveData('regies', []);
    window.saveData('factures', []);
    window.saveData('ajustements', []);
    
    // Reset le nom de session
    setSessionName('Projet_Sans_Nom');
    localStorage.setItem('sessionName', 'Projet_Sans_Nom');
    
    // Retour au dashboard
    setActiveTab('dashboard');
    
    alert('✅ Session complètement réinitialisée !');
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

    // Handler Estimations
    const handleSaveEstimation = (estimation) => {
        const updated = editingEstimation ? 
            estimations.map(e => e.id === editingEstimation.id ? estimation : e) : 
            [...estimations, estimation];
        
        setEstimations(updated);
        window.saveData('estimations', updated);
        setShowEstimationBuilder(false);
        setEditingEstimation(null);
        alert(editingEstimation ? '✅ Estimation modifiée' : '✅ Estimation créée');
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

        const handleSaveAjustement = (ajustement) => {
            let updated;
            if (ajustement.id) {
                // Modification
                updated = ajustements.map(a => a.id === ajustement.id ? ajustement : a);
            } else {
                // Création
                updated = [...ajustements, { ...ajustement, id: Date.now().toString() }];
            }
            setAjustements(updated);
            window.saveData('ajustements', updated);
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
            appelOffres,
            ajustements 
        });
    };

    // ========================================
    // 🆕 COMPOSANT MENU D'IMPORT
    // ========================================
// ========================================
// 🆕 COMPOSANT MENU D'IMPORT - VERSION FIXÉE
// ========================================
// ========================================
// 🆕 COMPOSANT MENU D'IMPORT - VERSION COMPLÈTE ET FIXÉE
// ========================================
// ========================================
// 🆕 COMPOSANT MENU D'IMPORT - VERSION OVERLAY
// ========================================
const ImportMenu = () => {
    return (
        <div className="relative">
            {/* Bouton principal */}
            <button
                onClick={() => {
                    setShowImportMenu(!showImportMenu);
                    setShowCSVTypeMenu(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
                <Upload size={20} />
                Importer
                <span className="text-xs">▼</span>
            </button>
            
            {/* Menu déroulant */}
            {showImportMenu && (
                <>
                    {/* Backdrop pour fermer en cliquant à côté */}
                    <div 
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setShowImportMenu(false);
                            setShowCSVTypeMenu(false);
                        }}
                    />
                    
                    {/* Menu principal */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        
                        {/* === OPTION 1 : SESSION JSON === */}
                        <div className="border-b relative">
                            <div className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                    <div className="font-semibold text-gray-800">Session complète</div>
                                    <div className="text-xs text-gray-500">Fichier JSON (toutes les données)</div>
                                </div>
                            </div>
                            
                            {/* Input en overlay transparent */}
                            <input
                                type="file"
                                accept=".json"
                                onChange={(e) => {
                                    console.log('🔵 JSON sélectionné');
                                    handleImportJSON(e);
                                    setShowImportMenu(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                        
                        {/* === OPTION 2 : CSV === */}
                        <div className="relative">
                            <button
                                onClick={() => setShowCSVTypeMenu(!showCSVTypeMenu)}
                                className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📊</span>
                                    <div>
                                        <div className="font-semibold text-gray-800">Import CSV</div>
                                        <div className="text-xs text-gray-500">Choisir le type de données</div>
                                    </div>
                                </div>
                                <span className="text-gray-400">›</span>
                            </button>
                            
                            {/* Sous-menu types CSV */}
                            {showCSVTypeMenu && (
                                <div className="absolute left-full top-0 ml-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                    
                                    {/* Factures */}
                                    <div className="border-b relative">
                                        <div className="w-full px-4 py-2 hover:bg-gray-50 text-sm">
                                            💰 Factures
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => {
                                                console.log('🔵 CSV Factures sélectionné');
                                                handleImportCSV(e, 'factures');
                                                setShowImportMenu(false);
                                                setShowCSVTypeMenu(false);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Commandes */}
                                    <div className="border-b relative">
                                        <div className="w-full px-4 py-2 hover:bg-gray-50 text-sm">
                                            📦 Commandes
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => {
                                                console.log('🔵 CSV Commandes sélectionné');
                                                handleImportCSV(e, 'commandes');
                                                setShowImportMenu(false);
                                                setShowCSVTypeMenu(false);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Offres */}
                                    <div className="border-b relative">
                                        <div className="w-full px-4 py-2 hover:bg-gray-50 text-sm">
                                            💼 Offres
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => {
                                                console.log('🔵 CSV Offres sélectionné');
                                                handleImportCSV(e, 'offres');
                                                setShowImportMenu(false);
                                                setShowCSVTypeMenu(false);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Offres Complémentaires */}
                                    <div className="border-b relative">
                                        <div className="w-full px-4 py-2 hover:bg-gray-50 text-sm">
                                            ➕ Offres Complémentaires
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => {
                                                console.log('🔵 CSV OC sélectionné');
                                                handleImportCSV(e, 'offresComplementaires');
                                                setShowImportMenu(false);
                                                setShowCSVTypeMenu(false);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Régies */}
                                    <div className="relative">
                                        <div className="w-full px-4 py-2 hover:bg-gray-50 text-sm">
                                            ⏱️ Régies
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => {
                                                console.log('🔵 CSV Régies sélectionné');
                                                handleImportCSV(e, 'regies');
                                                setShowImportMenu(false);
                                                setShowCSVTypeMenu(false);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    
                                </div>
                            )}
                        </div>
                        
                    </div>
                </>
            )}
        </div>
    );
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
{/* 🆕 MODIFIÉ - Boutons avec OneDrive */}
<div className="flex gap-2">
    {/* Bouton Configuration OneDrive */}
    <button
        onClick={() => setShowOneDriveConfig(true)}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            window.isOneDriveConfigured && window.isOneDriveConfigured() 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        }`}
        title="Configurer OneDrive"
    >
        ⚙️ OneDrive
        {window.isOneDriveConfigured && window.isOneDriveConfigured() ? ' ✓' : ' !'}
    </button>
    
    {/* Import OneDrive */}
    <button
        onClick={async () => {
            if (!window.isOneDriveConfigured || !window.isOneDriveConfigured()) {
                alert('⚠️ Veuillez d\'abord configurer OneDrive en cliquant sur le bouton "⚙️ OneDrive"');
                setShowOneDriveConfig(true);
                return;
            }
            
            try {
                const result = await window.loadFromOneDrive();
                
                if (result.success && result.data) {
                    const sessionData = result.data;
                    
                    const stats = `• ${sessionData.data.estimations?.length || 0} estimation(s)
- ${sessionData.data.appelOffres?.length || 0} appel(s) d'offres
- ${sessionData.data.offres?.length || 0} offre(s)
- ${sessionData.data.commandes?.length || 0} commande(s)
- ${sessionData.data.offresComplementaires?.length || 0} offre(s) complémentaire(s)
- ${sessionData.data.regies?.length || 0} régie(s)
- ${sessionData.data.factures?.length || 0} facture(s)`;
                    
                    const confirmation = confirm(
                        `⚠️ ATTENTION !\n\n` +
                        `Cette action va REMPLACER toutes vos données actuelles par :\n\n` +
                        stats + `\n\n` +
                        `Fichier : ${result.fileName}\n` +
                        `Session : ${sessionData.sessionName || 'Sans nom'}\n\n` +
                        `Voulez-vous continuer ?`
                    );
                    
                    if (!confirmation) return;
                    
                    // Restaurer toutes les données
                    setEstimations(sessionData.data.estimations || []);
                    setAppelOffres(sessionData.data.appelOffres || []);
                    setOffres(sessionData.data.offres || []);
                    setCommandes(sessionData.data.commandes || []);
                    setOffresComplementaires(sessionData.data.offresComplementaires || []);
                    setRegies(sessionData.data.regies || []);
                    setFactures(sessionData.data.factures || []);
                    
                    // Sauvegarder localement
                    window.saveData('estimations', sessionData.data.estimations || []);
                    window.saveData('appelOffres', sessionData.data.appelOffres || []);
                    window.saveData('offres', sessionData.data.offres || []);
                    window.saveData('commandes', sessionData.data.commandes || []);
                    window.saveData('offresComplementaires', sessionData.data.offresComplementaires || []);
                    window.saveData('regies', sessionData.data.regies || []);
                    window.saveData('factures', sessionData.data.factures || []);
                    
                    // Restaurer le nom de session
                    if (sessionData.sessionName) {
                        handleSessionNameChange(sessionData.sessionName);
                    }
                    
                    alert(`✅ Session restaurée depuis OneDrive !\n\n` + stats);
                }
            } catch (error) {
                console.error("Erreur:", error);
                if (error.message && error.message.includes("non configuré")) {
                    alert('⚠️ ' + error.message);
                    setShowOneDriveConfig(true);
                } else if (!error.message || error.message !== "Aucun fichier sélectionné") {
                    alert('❌ Erreur lors de l\'import depuis OneDrive');
                }
            }
        }}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        title="Importer depuis OneDrive"
    >
        ☁️ Import OneDrive
    </button>
    
    {/* Export OneDrive */}
    <button
        onClick={async () => {
            if (!window.isOneDriveConfigured || !window.isOneDriveConfigured()) {
                alert('⚠️ Veuillez d\'abord configurer OneDrive en cliquant sur le bouton "⚙️ OneDrive"');
                setShowOneDriveConfig(true);
                return;
            }
            
            try {
                const sessionData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    sessionName: sessionName,
                    data: {
                        estimations: estimations,
                        appelOffres: appelOffres,
                        offres: offres,
                        commandes: commandes,
                        offresComplementaires: offresComplementaires,
                        regies: regies,
                        factures: factures
                    }
                };
                
                const result = await window.saveToOneDrive(sessionName, sessionData);
                
                if (result.success) {
                    alert(`✅ Session sauvegardée sur OneDrive !\n\nFichier : ${result.fileName}`);
                }
            } catch (error) {
                console.error("Erreur:", error);
                if (error.message && error.message.includes("non configuré")) {
                    alert('⚠️ ' + error.message);
                    setShowOneDriveConfig(true);
                } else {
                    alert('❌ Erreur lors de l\'export vers OneDrive');
                }
            }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        title="Exporter vers OneDrive"
    >
        ☁️ Export OneDrive
    </button>
    
    {/* Menu Import local */}
    <ImportMenu />
    
    {/* Export JSON local */}
    <button
        onClick={handleExportJSON}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        title="Télécharger localement"
    >
        <Download size={20} />
        Export Local
    </button>
    
    {/* Bouton Reset */}
    <button
        onClick={handleResetSession}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        title="Réinitialiser complètement la session"
    >
        <Trash2 size={20} />
        Reset
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
                                { key: 'positions0', label: 'Pos. 0', align: 'left' },
                                { key: 'positions1', label: 'Pos. 1', align: 'left' },
                                { key: 'etape', label: 'Étape', align: 'center' },
                                { key: 'montant', label: 'Montant (CHF)', align: 'right' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
                            ]}
                            renderRow={(est) => {
                                const isHierarchique = est.lots && Array.isArray(est.lots) && est.lots.length > 0 && typeof est.lots[0] === 'object';
                                
                                if (isHierarchique) {
                                    const nombreLots = est.lots?.length || 0;
                                    return (
                                        <tr key={est.id} className="border-t hover:bg-gray-50 bg-blue-50">
                                            <td className="px-4 py-3 font-medium">{est.designation}</td>
                                            <td className="px-4 py-3 text-center" colSpan="4">
                                                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                                                    📊 Structure hiérarchique - {nombreLots} lot{nombreLots > 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                                                {(est.montantTotal || 0).toLocaleString('fr-CH')} CHF
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingEstimation(est);
                                                            setShowEstimationBuilder(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Modifier"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm(`Supprimer l'estimation "${est.designation}" ?`)) {
                                                                const updated = estimations.filter(e => e.id !== est.id);
                                                                setEstimations(updated);
                                                                window.saveData('estimations', updated);
                                                                alert('✅ Estimation supprimée');
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
                                    );
                                } else {
                                    return (
                                        <tr key={est.id} className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-3">{est.designation || '-'}</td>
                                            <td className="px-4 py-3 text-xs">{est.lots?.join(', ') || '-'}</td>
                                            <td className="px-4 py-3 text-xs">{est.positions0?.join(', ') || '-'}</td>
                                            <td className="px-4 py-3 text-xs">{est.positions1?.join(', ') || '-'}</td>
                                            <td className="px-4 py-3 text-center text-xs">{est.etape || '-'}</td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {(est.montant || 0).toLocaleString('fr-CH')} CHF
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            alert('⚠️ Cette estimation au format CSV ne peut pas être éditée.\nVeuillez créer une nouvelle estimation hiérarchique.');
                                                        }}
                                                        className="text-gray-400 cursor-not-allowed"
                                                        title="Non éditable (format CSV)"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm(`Supprimer cette ligne d'estimation ?`)) {
                                                                const updated = estimations.filter(e => e.id !== est.id);
                                                                setEstimations(updated);
                                                                window.saveData('estimations', updated);
                                                                alert('✅ Ligne supprimée');
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
                                    );
                                }
                            }}
                            emptyMessage="Aucune estimation - Créez votre première estimation !"
                            actions={
                                    <>
                                        <h2 className="text-xl font-bold">📋 Estimations</h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => window.exportEstimationsCSV(estimations)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                                title="Exporter les estimations en CSV"
                                            >
                                                📤 Exporter CSV
                                            </button>
                                            <button
                                                onClick={() => setShowImportModal(true)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                            >
                                                <window.Icons.Upload size={20} />
                                                Importer CSV
                                            </button>
                                            <button
                                            onClick={() => {
                                                setEditingEstimation(null);
                                                setShowEstimationBuilder(true);
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                        >
                                            <Plus size={20} />
                                            Nouvelle estimation
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
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.exportAppelOffresCSV(appelOffres)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                            title="Exporter les appels d'offres en CSV"
                                        >
                                            📤 Exporter CSV
                                        </button>
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
                                    </div>
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
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
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
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.exportOffresCSV(offres)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                            title="Exporter les offres en CSV"
                                        >
                                            📤 Exporter CSV
                                        </button>
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
                                    </div>
                                </>
                            }
                        />
                    )}

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
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
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
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingOffreComp(oc);
                                                    setShowOffreCompModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Modifier"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (confirm(`Supprimer l'offre complémentaire ${oc.numero} ?`)) {
                                                        const updated = offresComplementaires.filter(o => o.id !== oc.id);
                                                        setOffresComplementaires(updated);
                                                        window.saveData('offresComplementaires', updated);
                                                        alert('✅ Offre complémentaire supprimée');
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
                            emptyMessage="Aucune offre complémentaire"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">➕ Offres Complémentaires</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.exportOffresComplementairesCSV(offresComplementaires)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                            title="Exporter les offres complémentaires en CSV"
                                        >
                                            📤 Exporter CSV
                                        </button>
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
                                    </div>
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
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
                            ]}
                        renderRow={(cmd) => {
                            // Calculer le budget régie consommé
                            const regiesLiees = regies.filter(r => r.commandeId === cmd.id);
                            const regieConsommee = regiesLiees.reduce((sum, r) => sum + (r.montantTotal || 0), 0);
                            const budgetRegie = cmd.budgetRegie || 0;
                            const resteRegie = budgetRegie - regieConsommee;
                            const pourcentageRegie = budgetRegie > 0 ? ((regieConsommee / budgetRegie) * 100).toFixed(0) : 0;
                            
                            return (
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
                                    
                                    {/* Budget Régie */}
                                    <td className="px-4 py-3 text-center">
                                        {budgetRegie > 0 ? (
                                            <div className="text-xs">
                                                <div className={`font-semibold ${
                                                    resteRegie < 0 ? 'text-red-600' : 
                                                    pourcentageRegie > 80 ? 'text-orange-600' : 
                                                    'text-green-600'
                                                }`}>
                                                    {resteRegie.toLocaleString('fr-CH')} CHF
                                                </div>
                                                <div className="text-gray-500">
                                                    {pourcentageRegie}% utilisé
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                                    <div 
                                                        className={`h-1 rounded-full ${
                                                            resteRegie < 0 ? 'bg-red-600' : 
                                                            pourcentageRegie > 80 ? 'bg-orange-500' : 
                                                            'bg-green-500'
                                                        }`}
                                                        style={{ width: `${Math.min(pourcentageRegie, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingCommande(cmd);
                                                    setShowCommandeModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Modifier"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (confirm(`Supprimer la commande ${cmd.numero} ?\n\nAttention : Les factures liées resteront présentes.`)) {
                                                        const updated = commandes.filter(c => c.id !== cmd.id);
                                                        setCommandes(updated);
                                                        window.saveData('commandes', updated);
                                                        alert('✅ Commande supprimée');
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
                            );
                        }}
                        emptyMessage="Aucune commande"
                        actions={
                            <>
                                <h2 className="text-xl font-bold">📦 Commandes</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.exportCommandesCSV(commandes)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                        title="Exporter les commandes en CSV"
                                    >
                                        📤 Exporter CSV
                                    </button>
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
                                </div>
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
                                { key: 'budgetRegie', label: 'Budget Régie', align: 'center' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
                            ]}
                        renderRow={(regie) => {
                            // Trouver la commande liée
                            const commande = commandes.find(c => c.id === regie.commandeId);
                            
                            // Construire le numéro affiché
                            const numeroAffiche = commande 
                                ? `${commande.numero} > REG-${regie.numeroIncrement || '?'}` 
                                : regie.numero;
                            
                            return (
                                <tr key={regie.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-blue-600">
                                        {numeroAffiche}
                                    </td>
                                    <td className="px-4 py-3">{regie.fournisseur}</td>
                                    <td className="px-4 py-3">{regie.designation || '-'}</td>
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
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingRegie(regie);
                                                    setShowRegieModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Modifier"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (confirm(`Supprimer la régie ${numeroAffiche} ?`)) {
                                                        const updated = regies.filter(r => r.id !== regie.id);
                                                        setRegies(updated);
                                                        window.saveData('regies', updated);
                                                        alert('✅ Régie supprimée');
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
                            );
                       }}
                        emptyMessage="Aucune régie"
                        actions={
                            <>
                                <h2 className="text-xl font-bold">⏱️ Régies</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.exportRegiesCSV(regies)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                        title="Exporter les régies en CSV"
                                    >
                                        📤 Exporter CSV
                                    </button>
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
                                </div>
                            </>
                        }
                    />
                )}

                {/* Factures avec SmartTable */}
                    {/* Factures avec SmartTable */}
                    {activeTab === 'factures' && (
                        <window.SmartTable
                            data={factures}
                            columns={[
                                { key: 'numero', label: 'N° Facture', align: 'left' },
                                { key: 'fournisseur', label: 'Fournisseur', align: 'left' },
                                { key: 'commandeNumero', label: 'Commande', align: 'left' },
                                { key: 'numeroSituation', label: 'Situation', align: 'center' },
                                { key: 'dateFacture', label: 'Date', align: 'center' },
                                { key: 'dateEcheance', label: 'Échéance', align: 'center' },
                                { key: 'montantHT', label: 'Montant HT', align: 'right' },
                                { key: 'pourcentageCommande', label: '% Cmd', align: 'center' },
                                { key: 'montantTTC', label: 'Montant TTC', align: 'right' },
                                { key: 'statut', label: 'Statut', align: 'center' },
                                { key: 'actions', label: 'Actions', sortable: false, filterable: false, align: 'center', width: '120px' }
                            ]}
                            renderRow={(facture) => {
                                const commande = facture.commandeId ? commandes.find(c => c.id === facture.commandeId) : null;
                                const pourcentage = commande 
                                    ? ((facture.montantHT / (commande.montant || commande.calculatedMontant || 1)) * 100).toFixed(1) 
                                    : null;

                                return (
                                    <tr key={facture.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-blue-600">{facture.numero}</td>
                                        <td className="px-4 py-3">{facture.fournisseur}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {commande ? (
                                                <span className="text-blue-600">{commande.numero}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {facture.numeroSituation ? (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold text-sm">
                                                    {facture.numeroSituation}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {new Date(facture.dateFacture).toLocaleDateString('fr-CH')}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-CH') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {(facture.montantHT || 0).toLocaleString('fr-CH')} CHF
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {pourcentage ? (
                                                <span className="text-xs text-blue-600 font-semibold">{pourcentage}%</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
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
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setEditingFacture(facture);
                                                        setShowFactureModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Modifier"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (confirm(`Supprimer la facture ${facture.numero} ?`)) {
                                                            const updated = factures.filter(f => f.id !== facture.id);
                                                            setFactures(updated);
                                                            window.saveData('factures', updated);
                                                            alert('✅ Facture supprimée');
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
                                );
                            }}
                            emptyMessage="Aucune facture"
                            actions={
                                <>
                                    <h2 className="text-xl font-bold">💰 Factures</h2>
                                        <div className="flex gap-2">
                                        <button
                                            onClick={() => window.exportFacturesCSV(factures)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                            title="Exporter les factures en CSV"
                                        >
                                            📤 Exporter CSV
                                        </button>
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
                                        <ImportMenu />
                                    </div>
                                </>
                            }
                        />
                    )}
    
                    {/* Alignement & Atterrissage */}
                    {activeTab === 'alignement' && (
                        <window.AlignementView
                            estimations={estimations}
                            offres={offres}
                            commandes={commandes}
                            offresComplementaires={offresComplementaires}
                            regies={regies}
                            ajustements={ajustements}
                            onSaveAjustement={handleSaveAjustement}
                            onEditCommande={(cmd) => {
                                setEditingCommande(cmd);
                                setShowCommandeModal(true);
                            }}
                            onEditOffre={(offre) => {
                                setEditingOffre(offre);
                                setShowOffreModal(true);
                            }}
                            onEditOffreComplementaire={(oc) => {
                                setEditingOffreComp(oc);
                                setShowOffreCompModal(true);
                            }}
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

            {/* 🆕 Modal Export */}
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
                        appelOffres,
                        ajustements
                    }}
                    sessionName={sessionName}
                />
            )}

            {/* 🆕 Session Manager */}
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
                    commandes={commandes}  
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
                        commandes={commandes}      // ✅ AJOUTER
                        regies={regies}            // ✅ AJOUTER
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
                    regies={regies}
                    estimations={estimations}
                    factures={factures}
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

            {/* Modal Estimation Builder */}
            {showEstimationBuilder && (
                <window.EstimationBuilder
                    initialData={editingEstimation}
                    onClose={() => {
                        setShowEstimationBuilder(false);
                        setEditingEstimation(null);
                    }}
                    onSave={handleSaveEstimation}
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
       {/* 🆕 Modal Configuration OneDrive */}
            {showOneDriveConfig && (
                <window.OneDriveConfigModal
                    onClose={() => setShowOneDriveConfig(false)}
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
