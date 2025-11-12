// Vue détaillée d'un appel d'offres avec comparaison des offres
const { useState, useMemo } = React;

window.AppelOffreDetailView = ({ appelOffre, offres = [], onClose, onUpdateOffres, onChangeFavorite, onCreateCommande }) => {
    const [selectedOffreId, setSelectedOffreId] = useState(null);

    // Filtrer les offres liées à cet appel d'offres
    const offresLiees = useMemo(() => {
        return offres.filter(o => o.appelOffreId === appelOffre.id);
    }, [offres, appelOffre.id]);

    // Trouver l'offre favorite actuelle
    const offreFavorite = useMemo(() => {
        return offresLiees.find(o => o.isFavorite);
    }, [offresLiees]);

    // Trouver l'offre la moins chère
    const offreMoinsChere = useMemo(() => {
        if (offresLiees.length === 0) return null;
        return offresLiees.reduce((min, offre) => 
            (offre.montant < min.montant) ? offre : min
        );
    }, [offresLiees]);

    // Changer l'offre favorite
// Changer l'offre favorite
const handleChangeFavorite = (offreId) => {
    if (!confirm('Changer l\'offre favorite ?')) {
        return;
    }
    
    // Utiliser la fonction dédiée qui gère tout proprement
    if (onChangeFavorite) {
        onChangeFavorite(appelOffre.id, offreId);
    }
};
    
    try {
        const updatedOffres = offres.map(o => {
            if (o.appelOffreId === appelOffre.id) {
                return { ...o, isFavorite: o.id === offreId };
            }
            return o;
        });
        
        // Vérifier qu'une seule offre est favorite
        const favorites = updatedOffres.filter(o => 
            o.appelOffreId === appelOffre.id && o.isFavorite
        );
        
        if (favorites.length !== 1) {
            console.error('Erreur : nombre de favorites incorrect', favorites);
            alert('❌ Erreur lors du changement de favorite');
            return;
        }
        
        onUpdateOffres(updatedOffres);
        alert('✅ Offre favorite mise à jour');
    } catch (error) {
        console.error('Erreur handleChangeFavorite:', error);
        alert('❌ Erreur : ' + error.message);
    }
};

    // Créer une commande à partir de l'offre favorite
    const handleCreateCommandeFromFavorite = () => {
        if (!offreFavorite) {
            alert('⚠️ Aucune offre favorite sélectionnée');
            return;
        }
        onCreateCommande(offreFavorite, appelOffre);
    };

    const getStatutBadgeColor = (statut) => {
        switch(statut) {
            case 'En consultation': return 'bg-yellow-100 text-yellow-800';
            case 'Attribué': return 'bg-green-100 text-green-800';
            case 'Annulé': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-7xl my-8">
                {/* En-tête */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{appelOffre.numero}</h2>
                        <p className="text-lg text-gray-700">{appelOffre.designation}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>📅 Créé le {new Date(appelOffre.dateCreation).toLocaleDateString('fr-CH')}</span>
                            {appelOffre.dateLimite && (
                                <span>⏰ Date limite: {new Date(appelOffre.dateLimite).toLocaleDateString('fr-CH')}</span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs ${getStatutBadgeColor(appelOffre.statut)}`}>
                                {appelOffre.statut}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                {/* Informations de l'AO */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Lots concernés:</p>
                            <p className="text-sm">{appelOffre.lots?.join(', ') || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">Positions:</p>
                            <p className="text-sm">
                                {[...(appelOffre.positions0 || []), ...(appelOffre.positions1 || [])].join(', ') || '-'}
                            </p>
                        </div>
                    </div>
                    {appelOffre.description && (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700">Description:</p>
                            <p className="text-sm whitespace-pre-wrap">{appelOffre.description}</p>
                        </div>
                    )}
                </div>

                {/* Statistiques des offres */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-600">Offres reçues</div>
                        <div className="text-2xl font-bold text-blue-600">{offresLiees.length}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-600">Offre la moins chère</div>
                        <div className="text-2xl font-bold text-green-600">
                            {offreMoinsChere ? `${offreMoinsChere.montant.toLocaleString('fr-CH')} CHF` : '-'}
                        </div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-600">Offre favorite</div>
                        <div className="text-xl font-bold text-purple-600">
                            {offreFavorite ? offreFavorite.fournisseur : 'Aucune'}
                        </div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-600">Écart min/max</div>
                        <div className="text-2xl font-bold text-orange-600">
                            {offresLiees.length > 1 ? 
                                `${(Math.max(...offresLiees.map(o => o.montant)) - Math.min(...offresLiees.map(o => o.montant))).toLocaleString('fr-CH')} CHF` 
                                : '-'}
                        </div>
                    </div>
                </div>

                {/* Tableau comparatif des offres */}
                {offresLiees.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-lg mb-2">📭 Aucune offre reçue pour cet appel d'offres</p>
                        <p className="text-sm">Les offres liées à cet AO apparaîtront ici automatiquement</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm">Favorite</th>
                                    <th className="px-4 py-3 text-left text-sm">N° Offre</th>
                                    <th className="px-4 py-3 text-left text-sm">Fournisseur</th>
                                    <th className="px-4 py-3 text-left text-sm">Date</th>
                                    <th className="px-4 py-3 text-left text-sm">Validité</th>
                                    <th className="px-4 py-3 text-right text-sm">Montant (CHF)</th>
                                    <th className="px-4 py-3 text-left text-sm">Écart</th>
                                    <th className="px-4 py-3 text-left text-sm">Statut</th>
                                    <th className="px-4 py-3 text-center text-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {offresLiees
                                    .sort((a, b) => a.montant - b.montant) // Tri par montant croissant
                                    .map(offre => {
                                        const ecart = offreMoinsChere ? offre.montant - offreMoinsChere.montant : 0;
                                        const ecartPourcent = offreMoinsChere && offreMoinsChere.montant > 0 
                                            ? ((ecart / offreMoinsChere.montant) * 100).toFixed(1) 
                                            : 0;
                                        
                                        return (
                                            <tr 
                                                key={offre.id} 
                                                className={`border-t hover:bg-gray-50 ${
                                                    offre.isFavorite ? 'bg-purple-50' : ''
                                                } ${
                                                    offre.id === offreMoinsChere?.id ? 'font-medium' : ''
                                                }`}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="radio"
                                                        name="favorite"
                                                        checked={offre.isFavorite || false}
                                                        onChange={() => handleChangeFavorite(offre.id)}
                                                        className="w-4 h-4 cursor-pointer"
                                                        title="Définir comme favorite"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {offre.numero}
                                                    {offre.id === offreMoinsChere?.id && (
                                                        <span className="ml-2 text-xs text-green-600">🏆 Moins chère</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{offre.fournisseur}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {new Date(offre.dateOffre).toLocaleDateString('fr-CH')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {offre.validite ? new Date(offre.validite).toLocaleDateString('fr-CH') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {offre.montant.toLocaleString('fr-CH', {minimumFractionDigits: 2})}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {ecart > 0 ? (
                                                        <span className="text-orange-600 text-sm">
                                                            +{ecart.toLocaleString('fr-CH')} ({ecartPourcent}%)
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 text-sm">-</span>
                                                    )}
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
                                                    {offre.isFavorite && appelOffre.statut === 'En consultation' && (
                                                        <button
                                                            onClick={handleCreateCommandeFromFavorite}
                                                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                            title="Créer une commande"
                                                        >
                                                            📦 Commande
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                        {offreFavorite ? (
                            <span>
                                ⭐ Offre favorite: <strong>{offreFavorite.fournisseur}</strong> - 
                                <strong className="ml-1">{offreFavorite.montant.toLocaleString('fr-CH')} CHF</strong>
                            </span>
                        ) : (
                            <span className="text-orange-600">⚠️ Aucune offre favorite sélectionnée</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {offreFavorite && appelOffre.statut === 'En consultation' && (
                            <button 
                                onClick={handleCreateCommandeFromFavorite}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <window.Icons.Check />
                                Créer commande depuis favorite
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
