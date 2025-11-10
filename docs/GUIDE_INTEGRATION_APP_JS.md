# 📝 GUIDE D'INTÉGRATION - Modifications de app.js

## 🎯 Objectif

Ce guide vous explique **exactement** comment modifier votre fichier `app.js` pour intégrer le système d'Appels d'Offres.

---

## ✏️ MODIFICATIONS À APPORTER

### 1️⃣ AJOUTER LES NOUVEAUX ÉTATS (Ligne ~6-29)

**Trouver cette section :**
```javascript
// États principaux
const [estimations, setEstimations] = useState([]);
const [offres, setOffres] = useState([]);
const [commandes, setCommandes] = useState([]);
const [offresComplementaires, setOffresComplementaires] = useState([]);
const [regies, setRegies] = useState([]);
const [factures, setFactures] = useState([]);
```

**Ajouter APRÈS `factures` :**
```javascript
const [appelOffres, setAppelOffres] = useState([]); // 🆕 NOUVEAU
```

**Trouver cette section :**
```javascript
// États UI
const [activeTab, setActiveTab] = useState('dashboard');
const [showImportModal, setShowImportModal] = useState(false);
const [showOffreModal, setShowOffreModal] = useState(false);
const [showCommandeModal, setShowCommandeModal] = useState(false);
const [showOffreCompModal, setShowOffreCompModal] = useState(false);
const [showRegieModal, setShowRegieModal] = useState(false);
const [showFactureModal, setShowFactureModal] = useState(false);
```

**Ajouter APRÈS `showFactureModal` :**
```javascript
const [showAppelOffreModal, setShowAppelOffreModal] = useState(false); // 🆕 NOUVEAU
const [showAppelOffreDetail, setShowAppelOffreDetail] = useState(false); // 🆕 NOUVEAU
```

**Trouver cette section :**
```javascript
// États d'édition
const [editingOffre, setEditingOffre] = useState(null);
const [editingCommande, setEditingCommande] = useState(null);
const [editingFacture, setEditingFacture] = useState(null);
const [editingOffreComp, setEditingOffreComp] = useState(null);
const [editingRegie, setEditingRegie] = useState(null);
```

**Ajouter APRÈS `editingRegie` :**
```javascript
const [editingAppelOffre, setEditingAppelOffre] = useState(null); // 🆕 NOUVEAU
const [selectedAppelOffre, setSelectedAppelOffre] = useState(null); // 🆕 NOUVEAU
```

---

### 2️⃣ MODIFIER loadAllData (Ligne ~35-43)

**Trouver :**
```javascript
const loadAllData = async () => {
    const data = await window.loadData();
    setEstimations(data.estimations);
    setOffres(data.offres);
    setCommandes(data.commandes);
    setOffresComplementaires(data.offresComplementaires);
    setRegies(data.regies);
    setFactures(data.factures);
};
```

**Remplacer par :**
```javascript
const loadAllData = async () => {
    const data = await window.loadData();
    setEstimations(data.estimations);
    setOffres(data.offres);
    setCommandes(data.commandes);
    setOffresComplementaires(data.offresComplementaires);
    setRegies(data.regies);
    setFactures(data.factures);
    setAppelOffres(data.appelOffres || []); // 🆕 NOUVEAU
};
```

---

### 3️⃣ MODIFIER handleSaveOffre (Ligne ~46-56)

**Trouver :**
```javascript
// Handlers pour OffreModal
const handleSaveOffre = (offre) => {
    const updated = editingOffre ? 
        offres.map(o => o.id === editingOffre.id ? offre : o) : 
        [...offres, offre];
    
    setOffres(updated);
    window.saveData('offres', updated);
    setShowOffreModal(false);
    setEditingOffre(null);
    alert(editingOffre ? '✅ Offre modifiée' : '✅ Offre créée');
};
```

**Remplacer par :**
```javascript
// Handlers pour OffreModal
const handleSaveOffre = (offre) => {
    let updated = editingOffre ? 
        offres.map(o => o.id === editingOffre.id ? offre : o) : 
        [...offres, offre];
    
    // 🆕 NOUVEAU : Mettre à jour les favorites si l'offre est liée à un AO
    if (offre.appelOffreId && offre.isFavorite) {
        // Retirer le statut favorite des autres offres du même AO
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
```

---

### 4️⃣ AJOUTER LES NOUVEAUX HANDLERS (APRÈS handleSaveFacture, Ligne ~142)

**Ajouter ce nouveau bloc APRÈS la fonction `handleSaveFacture` :**

```javascript
// 🆕 NOUVEAU : Handlers pour AppelOffreModal
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

// 🆕 NOUVEAU : Mettre à jour les offres favorites depuis la vue détaillée
const handleUpdateFavorites = (updatedOffres) => {
    setOffres(updatedOffres);
    window.saveData('offres', updatedOffres);
};

// 🆕 NOUVEAU : Créer une commande depuis un AO
const handleCreateCommandeFromAO = (offreFavorite, appelOffre) => {
    // Créer la commande
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
    
    // Sauvegarder la commande
    const updatedCommandes = [...commandes, commande];
    setCommandes(updatedCommandes);
    window.saveData('commandes', updatedCommandes);
    
    // Mettre à jour les statuts des offres liées à l'AO
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
    
    // Mettre à jour le statut de l'AO
    const updatedAO = appelOffres.map(ao => 
        ao.id === appelOffre.id ? { ...ao, statut: 'Attribué' } : ao
    );
    setAppelOffres(updatedAO);
    window.saveData('appelOffres', updatedAO);
    
    // Fermer la vue détaillée et afficher un message
    setShowAppelOffreDetail(false);
    setSelectedAppelOffre(null);
    alert('✅ Commande créée ! L\'offre favorite a été acceptée et l\'AO est attribué.');
};
```

---

### 5️⃣ MODIFIER handleExportAllData (Ligne ~144-153)

**Trouver :**
```javascript
// Handlers d'export
const handleExportAllData = () => {
    window.exportAllData({
        estimations,
        offres,
        commandes,
        offresComplementaires,
        regies,
        factures
    });
};
```

**Remplacer par :**
```javascript
// Handlers d'export
const handleExportAllData = () => {
    window.exportAllData({
        estimations,
        offres,
        commandes,
        offresComplementaires,
        regies,
        factures,
        appelOffres // 🆕 NOUVEAU
    });
};
```

---

### 6️⃣ AJOUTER L'ONGLET "APPELS D'OFFRES" (Ligne ~187-196)

**Trouver :**
```javascript
{[
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'estimations', label: '📋 Estimations', icon: '📋' },
    { id: 'offres', label: '💼 Offres', icon: '💼' },
    { id: 'offresComplementaires', label: '➕ OC', icon: '➕' },
    { id: 'commandes', label: '📦 Commandes', icon: '📦' },
    { id: 'regies', label: '⏱️ Régies', icon: '⏱️' },
    { id: 'factures', label: '💰 Factures', icon: '💰' },
    { id: 'alignement', label: '🎯 Alignement', icon: '🎯' }
].map(tab => (
```

**Remplacer par :**
```javascript
{[
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'estimations', label: '📋 Estimations', icon: '📋' },
    { id: 'appelOffres', label: '🎯 Appels d\'Offres', icon: '🎯' }, // 🆕 NOUVEAU
    { id: 'offres', label: '💼 Offres', icon: '💼' },
    { id: 'offresComplementaires', label: '➕ OC', icon: '➕' },
    { id: 'commandes', label: '📦 Commandes', icon: '📦' },
    { id: 'regies', label: '⏱️ Régies', icon: '⏱️' },
    { id: 'factures', label: '💰 Factures', icon: '💰' },
    { id: 'alignement', label: '📌 Alignement', icon: '📌' }
].map(tab => (
```

---

### 7️⃣ AJOUTER LE CONTENU DE L'ONGLET APPELS D'OFFRES

**Chercher l'onglet "offres" (il commence vers la ligne ~400) et AJOUTER AVANT cet onglet :**

```javascript
{/* 🆕 NOUVEAU : ONGLET APPELS D'OFFRES */}
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
```

---

### 8️⃣ MODIFIER LE COMPOSANT OffreModal (À LA FIN, avant le dernier `</div>`)

**Chercher cette ligne vers la fin du fichier (avant les dernières balises de fermeture) :**

```javascript
{showOffreModal && (
    <window.OffreModal
        initialData={editingOffre}
        onClose={() => {
            setShowOffreModal(false);
            setEditingOffre(null);
        }}
        onSave={handleSaveOffre}
        estimations={estimations}
    />
)}
```

**Remplacer par :**

```javascript
{showOffreModal && (
    <window.OffreModal
        initialData={editingOffre}
        onClose={() => {
            setShowOffreModal(false);
            setEditingOffre(null);
        }}
        onSave={handleSaveOffre}
        estimations={estimations}
        appelOffres={appelOffres} // 🆕 NOUVEAU
        offres={offres} // 🆕 NOUVEAU
    />
)}
```

---

### 9️⃣ AJOUTER LES NOUVEAUX MODALS (À LA FIN, avant le dernier `</div>`)

**Ajouter APRÈS le modal `<window.OffreModal>` et AVANT la fermeture finale :**

```javascript
{/* 🆕 NOUVEAU : Modal Appel d'Offres */}
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

{/* 🆕 NOUVEAU : Vue détaillée Appel d'Offres */}
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
```

---

## ✅ VÉRIFICATION FINALE

Après avoir fait toutes les modifications, votre app.js devrait avoir :

1. ✅ 3 nouveaux états : `appelOffres`, `showAppelOffreModal`, `showAppelOffreDetail`
2. ✅ 2 états d'édition : `editingAppelOffre`, `selectedAppelOffre`
3. ✅ `loadAllData` charge les `appelOffres`
4. ✅ `handleSaveOffre` met à jour les favorites
5. ✅ 3 nouveaux handlers : `handleSaveAppelOffre`, `handleUpdateFavorites`, `handleCreateCommandeFromAO`
6. ✅ `handleExportAllData` exporte les `appelOffres`
7. ✅ Un nouvel onglet "Appels d'Offres" dans la navigation
8. ✅ Le contenu de l'onglet avec le tableau des AO
9. ✅ `OffreModal` reçoit les props `appelOffres` et `offres`
10. ✅ 2 nouveaux modals : `AppelOffreModal` et `AppelOffreDetailView`

---

## 🎉 C'EST TERMINÉ !

Votre application dispose maintenant d'un système complet d'Appels d'Offres !

**Prochaines étapes :**
1. Sauvegarder app.js
2. Ouvrir l'application dans le navigateur
3. Tester la création d'un AO
4. Tester la liaison d'offres à l'AO
5. Vérifier la sélection automatique de la favorite

**Bon courage ! 🚀**
