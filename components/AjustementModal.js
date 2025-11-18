// Modal de création/modification d'ajustements budgétaires
window.AjustementModal = ({ initialData, onClose, onSave, availableLots, availablePos0 }) => {
    const [formData, setFormData] = React.useState(initialData || {
        id: null,
        type: 'aleas', // aleas, economies, provision
        description: '',
        montant: 0,
        lots: [],
        positions0: [],
        statut: 'previsionnel', // previsionnel, confirme
        commentaire: '',
        dateCreation: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.description || formData.montant === 0) {
            alert('⚠️ Veuillez renseigner une description et un montant');
            return;
        }

        const ajustement = {
            ...formData,
            id: formData.id || `ADJ-${Date.now()}`,
            dateCreation: formData.dateCreation || new Date().toISOString().split('T')[0]
        };

        onSave(ajustement);
        onClose();
    };

    const handleLotsChange = (e) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        setFormData({ ...formData, lots: selected });
    };

    const handlePos0Change = (e) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        setFormData({ ...formData, positions0: selected });
    };

    return React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onClick: onClose
    },
        React.createElement('div', {
            className: 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto',
            onClick: (e) => e.stopPropagation()
        },
            React.createElement('form', { onSubmit: handleSubmit },
                // En-tête
                React.createElement('div', { className: 'flex justify-between items-center p-6 border-b' },
                    React.createElement('h2', { className: 'text-2xl font-bold' },
                        initialData ? '✏️ Modifier l\'ajustement' : '➕ Nouvel ajustement'
                    ),
                    React.createElement('button', {
                        type: 'button',
                        onClick: onClose,
                        className: 'text-gray-400 hover:text-gray-600'
                    },
                        React.createElement(window.Icons.X, { size: 24 })
                    )
                ),

                // Corps
                React.createElement('div', { className: 'p-6 space-y-4' },
                    
                    // Type d'ajustement
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Type d\'ajustement *'
                        ),
                        React.createElement('select', {
                            value: formData.type,
                            onChange: (e) => setFormData({ ...formData, type: e.target.value }),
                            className: 'w-full px-3 py-2 border rounded-lg',
                            required: true
                        },
                            React.createElement('option', { value: 'aleas' }, '⚡ Aléas / Dépassement'),
                            React.createElement('option', { value: 'economies' }, '💰 Économies'),
                            React.createElement('option', { value: 'provision' }, '📝 Provision / Prévision')
                        )
                    ),

                    // Description
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Description *'
                        ),
                        React.createElement('input', {
                            type: 'text',
                            value: formData.description,
                            onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                            className: 'w-full px-3 py-2 border rounded-lg',
                            placeholder: 'Ex: Surcoût terrassement, Économie matériaux...',
                            required: true
                        })
                    ),

                    // Montant
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Montant (CHF) *',
                            React.createElement('span', { className: 'text-xs text-gray-500 ml-2' },
                                '(Positif = augmentation, Négatif = économie)'
                            )
                        ),
                        React.createElement('input', {
                            type: 'number',
                            step: '0.01',
                            value: formData.montant,
                            onChange: (e) => setFormData({ ...formData, montant: parseFloat(e.target.value) }),
                            className: 'w-full px-3 py-2 border rounded-lg',
                            placeholder: 'Ex: 50000 ou -20000',
                            required: true
                        })
                    ),

                    // Statut
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Statut'
                        ),
                        React.createElement('select', {
                            value: formData.statut,
                            onChange: (e) => setFormData({ ...formData, statut: e.target.value }),
                            className: 'w-full px-3 py-2 border rounded-lg'
                        },
                            React.createElement('option', { value: 'previsionnel' }, '⏳ Prévisionnel'),
                            React.createElement('option', { value: 'confirme' }, '✅ Confirmé')
                        )
                    ),

                    // Lots
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Lots concernés',
                            React.createElement('span', { className: 'text-xs text-gray-500 ml-2' },
                                '(Maintenir Ctrl/Cmd pour sélection multiple)'
                            )
                        ),
                        React.createElement('select', {
                            multiple: true,
                            value: formData.lots,
                            onChange: handleLotsChange,
                            className: 'w-full px-3 py-2 border rounded-lg h-32'
                        },
                            availableLots.map(lot =>
                                React.createElement('option', { key: lot, value: lot }, lot)
                            )
                        ),
                        React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                            'Laisser vide pour appliquer à tous les lots'
                        )
                    ),

                    // Positions 0
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Positions Niveau 0',
                            React.createElement('span', { className: 'text-xs text-gray-500 ml-2' },
                                '(Maintenir Ctrl/Cmd pour sélection multiple)'
                            )
                        ),
                        React.createElement('select', {
                            multiple: true,
                            value: formData.positions0,
                            onChange: handlePos0Change,
                            className: 'w-full px-3 py-2 border rounded-lg h-32'
                        },
                            availablePos0.map(pos =>
                                React.createElement('option', { key: pos, value: pos }, pos)
                            )
                        ),
                        React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                            'Laisser vide pour appliquer à toutes les positions'
                        )
                    ),

                    // Commentaire
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-medium mb-2' },
                            'Commentaire / Notes'
                        ),
                        React.createElement('textarea', {
                            value: formData.commentaire,
                            onChange: (e) => setFormData({ ...formData, commentaire: e.target.value }),
                            className: 'w-full px-3 py-2 border rounded-lg h-24 resize-none',
                            placeholder: 'Notes complémentaires...'
                        })
                    ),

                    // Aperçu du montant
                    React.createElement('div', { 
                        className: 'p-4 rounded-lg border-2 ' + (
                            formData.montant > 0 
                                ? 'bg-red-50 border-red-200' 
                                : formData.montant < 0 
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                        )
                    },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'font-semibold' }, 'Impact budgétaire:'),
                            React.createElement('span', { 
                                className: 'text-2xl font-bold ' + (
                                    formData.montant > 0 
                                        ? 'text-red-600' 
                                        : formData.montant < 0 
                                            ? 'text-green-600'
                                            : 'text-gray-600'
                                )
                            },
                                (formData.montant > 0 ? '+' : '') + 
                                (formData.montant || 0).toLocaleString('fr-CH') + ' CHF'
                            )
                        ),
                        React.createElement('div', { className: 'text-xs text-gray-600 mt-2' },
                            formData.montant > 0 
                                ? '⚠️ Augmentation du coût du projet'
                                : formData.montant < 0 
                                    ? '✅ Réduction du coût du projet'
                                    : 'ℹ️ Aucun impact'
                        )
                    )
                ),

                // Pied de page
                React.createElement('div', { className: 'flex justify-end gap-3 p-6 border-t bg-gray-50' },
                    React.createElement('button', {
                        type: 'button',
                        onClick: onClose,
                        className: 'px-4 py-2 border rounded-lg hover:bg-gray-100'
                    }, 'Annuler'),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                    },
                        initialData ? 'Modifier' : 'Créer l\'ajustement'
                    )
                )
            )
        )
    );
};
