// SmartTable.js - Composant de tableau intelligent avec filtres et tri automatiques
const { useState, useMemo } = React;

/**
 * Composant de tableau intelligent avec filtres et tri intégrés
 * @param {Array} data - Données à afficher
 * @param {Array} columns - Configuration des colonnes
 * @param {Function} renderRow - Fonction pour rendre une ligne
 * @param {String} emptyMessage - Message si aucune donnée
 * @param {Object} actions - Actions supplémentaires (boutons, etc.)
 */
window.SmartTable = ({ 
    data = [], 
    columns = [], 
    renderRow, 
    emptyMessage = "Aucune donnée",
    actions = null,
    className = ""
}) => {
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [openFilter, setOpenFilter] = useState(null);

    // Appliquer les filtres et le tri
    const processedData = useMemo(() => {
        let filtered = [...data];

        // Appliquer les filtres
        Object.entries(columnFilters).forEach(([columnKey, filterValues]) => {
            if (filterValues && filterValues.length > 0) {
                filtered = filtered.filter(item => {
                    const itemValue = item[columnKey];
                    
                    if (Array.isArray(itemValue)) {
                        return itemValue.some(val => filterValues.includes(val));
                    }
                    
                    return filterValues.includes(itemValue);
                });
            }
        });

        // Appliquer le tri
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Gérer les tableaux
                if (Array.isArray(aVal)) aVal = aVal.join(', ');
                if (Array.isArray(bVal)) bVal = bVal.join(', ');

                // Gérer les nombres
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                // Gérer les strings
                const compareResult = String(aVal || '').localeCompare(String(bVal || ''));
                return sortConfig.direction === 'asc' ? compareResult : -compareResult;
            });
        }

        return filtered;
    }, [data, columnFilters, sortConfig]);

    // Gérer le tri
    const handleSort = (columnKey) => {
        setSortConfig(prev => ({
            key: columnKey,
            direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Gérer les filtres
    const handleFilterChange = (columnKey, values) => {
        setColumnFilters(prev => ({
            ...prev,
            [columnKey]: values
        }));
        setOpenFilter(null);
    };

    // Réinitialiser tous les filtres
    const resetAllFilters = () => {
        setColumnFilters({});
        setSortConfig({ key: null, direction: 'asc' });
    };

    const hasActiveFilters = Object.values(columnFilters).some(v => v && v.length > 0);
    const activeFilterCount = Object.values(columnFilters).filter(v => v && v.length > 0).length;

    return (
        <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
            {/* En-tête avec actions */}
            {actions && (
                <div className="flex justify-between items-center mb-6">
                    {actions}
                </div>
            )}

            {/* Info et réinitialisation des filtres */}
            <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                    {processedData.length} élément(s) affiché(s)
                    {data.length !== processedData.length && ` sur ${data.length} au total`}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={resetAllFilters}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-2 text-sm"
                    >
                        <window.Icons.X size={14} />
                        Réinitialiser les filtres ({activeFilterCount})
                    </button>
                )}
            </div>

            {/* Badges de filtres actifs */}
            {hasActiveFilters && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(columnFilters).map(([key, values]) => (
                        values && values.length > 0 && (
                            <div key={key} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-2">
                                <span className="font-medium">
                                    {columns.find(c => c.key === key)?.label || key}:
                                </span>
                                <span>{values.length} sélectionné(s)</span>
                                <button
                                    onClick={() => handleFilterChange(key, [])}
                                    className="hover:bg-blue-200 rounded-full p-0.5"
                                >
                                    <window.Icons.X size={12} />
                                </button>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Tableau */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(column => (
                                <SmartTableHeader
                                    key={column.key}
                                    column={column}
                                    data={data}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    filters={columnFilters[column.key] || []}
                                    onFilterChange={(values) => handleFilterChange(column.key, values)}
                                    isOpen={openFilter === column.key}
                                    onToggle={() => setOpenFilter(openFilter === column.key ? null : column.key)}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                                    {hasActiveFilters 
                                        ? "Aucun élément ne correspond aux filtres sélectionnés" 
                                        : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            processedData.map((item, index) => renderRow(item, index))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * En-tête de colonne avec tri et filtre
 */
const SmartTableHeader = ({ 
    column, 
    data, 
    sortConfig, 
    onSort, 
    filters, 
    onFilterChange, 
    isOpen, 
    onToggle 
}) => {
    const { key, label, sortable = true, filterable = true, align = 'left', width } = column;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedValues, setSelectedValues] = useState(new Set(filters));
    const dropdownRef = React.useRef(null);

    // Extraire les valeurs uniques
    const uniqueValues = useMemo(() => {
        const values = new Set();
        data.forEach(item => {
            const value = item[key];
            if (Array.isArray(value)) {
                value.forEach(v => v != null && v !== '' && values.add(v));
            } else if (value != null && value !== '') {
                values.add(value);
            }
        });
        return Array.from(values).sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
    }, [data, key]);

    // Filtrer par recherche
    const filteredValues = useMemo(() => {
        if (!searchTerm) return uniqueValues;
        return uniqueValues.filter(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [uniqueValues, searchTerm]);

    // Fermer en cliquant dehors
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                if (isOpen) onToggle();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    // Synchroniser selectedValues avec filters
    React.useEffect(() => {
        setSelectedValues(new Set(filters));
    }, [filters]);

    const toggleValue = (value) => {
        const newSelected = new Set(selectedValues);
        if (newSelected.has(value)) {
            newSelected.delete(value);
        } else {
            newSelected.add(value);
        }
        setSelectedValues(newSelected);
    };

    const applyFilter = () => {
        onFilterChange(Array.from(selectedValues));
    };

    const hasActiveFilter = filters.length > 0;
    const isSorted = sortConfig.key === key;

    const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

    return (
        <th className={`px-4 py-3 ${textAlignClass}`} style={{ width }}>
            <div className={`flex items-center gap-2 ${alignClass}`}>
                <span className="text-sm font-medium">{label}</span>
                
                <div className="flex items-center gap-1">
                    {/* Bouton de tri */}
                    {sortable && (
                        <button
                            onClick={() => onSort(key)}
                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                isSorted ? 'text-blue-600' : 'text-gray-400'
                            }`}
                            title="Trier"
                        >
                            {isSorted ? (
                                sortConfig.direction === 'asc' ? 
                                    <window.Icons.ArrowUp size={14} /> : 
                                    <window.Icons.ArrowDown size={14} />
                            ) : (
                                <window.Icons.ArrowUpDown size={14} />
                            )}
                        </button>
                    )}

                    {/* Bouton de filtre */}
                    {filterable && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={onToggle}
                                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                    hasActiveFilter ? 'text-blue-600' : 'text-gray-400'
                                }`}
                                title="Filtrer"
                            >
                                {hasActiveFilter ? (
                                    <window.Icons.FilterX size={14} />
                                ) : (
                                    <window.Icons.Filter size={14} />
                                )}
                            </button>

                            {isOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                                    {/* En-tête */}
                                    <div className="p-3 border-b bg-gray-50">
                                        <div className="font-medium text-sm mb-2">Filtrer {label}</div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Rechercher..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-3 py-2 pr-8 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <window.Icons.Search size={16} className="absolute right-2 top-2.5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Actions rapides */}
                                    <div className="p-2 border-b bg-gray-50 flex gap-2">
                                        <button
                                            onClick={() => setSelectedValues(new Set(filteredValues))}
                                            className="flex-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            Tout
                                        </button>
                                        <button
                                            onClick={() => setSelectedValues(new Set())}
                                            className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                            Aucun
                                        </button>
                                    </div>

                                    {/* Liste */}
                                    <div className="max-h-64 overflow-y-auto p-2">
                                        {filteredValues.length === 0 ? (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                Aucune valeur
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
                                                    <span className="text-sm truncate">{String(value)}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {/* Pied */}
                                    {selectedValues.size > 0 && (
                                        <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
                                            {selectedValues.size} sélectionné(s)
                                        </div>
                                    )}

                                    {/* Boutons */}
                                    <div className="p-3 border-t flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedValues(new Set());
                                                onFilterChange([]);
                                            }}
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
                    )}
                </div>
            </div>
        </th>
    );
};
