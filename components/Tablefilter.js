// TableFilter.js - Composant de filtrage pour en-têtes de colonnes
const { useState, useRef, useEffect } = React;

/**
 * Composant de filtrage pour les en-têtes de tableau
 * 
 * @param {string} columnKey - Clé unique de la colonne
 * @param {string} columnLabel - Label affiché dans l'en-tête
 * @param {array} data - Données complètes du tableau
 * @param {string} dataKey - Clé pour extraire les valeurs de data (ex: 'fournisseur', 'statut')
 * @param {function} onFilter - Callback quand un filtre est appliqué (reçoit {columnKey, values})
 * @param {array} activeFilters - Filtres actuellement actifs pour cette colonne
 * @param {string} filterType - Type de filtre: 'checkbox' (défaut), 'search', 'date'
 * @param {string} align - Alignement du texte: 'left', 'center', 'right'
 */
window.TableFilter = ({ 
    columnKey, 
    columnLabel, 
    data, 
    dataKey, 
    onFilter, 
    activeFilters = [],
    filterType = 'checkbox',
    align = 'left',
    width = 'auto'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedValues, setSelectedValues] = useState(new Set(activeFilters));
    const dropdownRef = useRef(null);

    // Extraire les valeurs uniques de la colonne
    const uniqueValues = React.useMemo(() => {
        const values = new Set();
        data.forEach(item => {
            // Supporter les tableaux et valeurs simples
            const value = item[dataKey];
            if (Array.isArray(value)) {
                value.forEach(v => v && values.add(v));
            } else if (value != null && value !== '') {
                values.add(value);
            }
        });
        return Array.from(values).sort((a, b) => {
            // Tri intelligent (nombres avant strings)
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
    }, [data, dataKey]);

    // Filtrer les valeurs selon la recherche
    const filteredValues = React.useMemo(() => {
        if (!searchTerm) return uniqueValues;
        return uniqueValues.filter(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [uniqueValues, searchTerm]);

    // Fermer le dropdown en cliquant à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gérer la sélection/désélection d'une valeur
    const toggleValue = (value) => {
        const newSelected = new Set(selectedValues);
        if (newSelected.has(value)) {
            newSelected.delete(value);
        } else {
            newSelected.add(value);
        }
        setSelectedValues(newSelected);
    };

    // Sélectionner tout
    const selectAll = () => {
        setSelectedValues(new Set(filteredValues));
    };

    // Désélectionner tout
    const clearAll = () => {
        setSelectedValues(new Set());
    };

    // Appliquer le filtre
    const applyFilter = () => {
        onFilter({
            columnKey,
            values: Array.from(selectedValues)
        });
        setIsOpen(false);
    };

    // Réinitialiser le filtre
    const resetFilter = () => {
        setSelectedValues(new Set());
        onFilter({
            columnKey,
            values: []
        });
        setIsOpen(false);
    };

    const hasActiveFilter = selectedValues.size > 0;
    const isPartialSelection = selectedValues.size > 0 && selectedValues.size < uniqueValues.length;

    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

    return (
        <th className={`px-4 py-3 ${alignClass}`} style={{ width }}>
            <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-medium">{columnLabel}</span>
                
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            hasActiveFilter ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        title="Filtrer"
                    >
                        {hasActiveFilter ? (
                            <window.Icons.FilterX size={16} />
                        ) : (
                            <window.Icons.Filter size={16} />
                        )}
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                            {/* En-tête */}
                            <div className="p-3 border-b bg-gray-50">
                                <div className="font-medium text-sm mb-2">Filtrer par {columnLabel}</div>
                                
                                {/* Barre de recherche */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 pr-8 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <window.Icons.Search 
                                        size={16} 
                                        className="absolute right-2 top-2.5 text-gray-400" 
                                    />
                                </div>
                            </div>

                            {/* Actions rapides */}
                            <div className="p-2 border-b bg-gray-50 flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="flex-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    Tout sélectionner
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Tout effacer
                                </button>
                            </div>

                            {/* Liste des valeurs */}
                            <div className="max-h-64 overflow-y-auto p-2">
                                {filteredValues.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        Aucune valeur trouvée
                                    </div>
                                ) : (
                                    filteredValues.map((value, idx) => (
                                        <label
                                            key={idx}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedValues.has(value)}
                                                onChange={() => toggleValue(value)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm truncate">{value}</span>
                                        </label>
                                    ))
                                )}
                            </div>

                            {/* Pied avec compteur */}
                            {selectedValues.size > 0 && (
                                <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
                                    {selectedValues.size} élément(s) sélectionné(s)
                                </div>
                            )}

                            {/* Boutons d'action */}
                            <div className="p-3 border-t flex gap-2">
                                <button
                                    onClick={resetFilter}
                                    className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                                >
                                    Réinitialiser
                                </button>
                                <button
                                    onClick={applyFilter}
                                    className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                                >
                                    Appliquer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </th>
    );
};
