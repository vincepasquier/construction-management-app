// Modal pour créer un ajustement/prévision
window.AjustementModal = ({ onClose, onSave, availableLots = [], availablePos0 = [] }) => {
    const [formData, setFormData] = React.useState({
        type: 'aleas',
        description: '',
        montant: '',
        lots: [],
        positions0: [],
        statut: 'previsionnel',
        commentaire: ''
    });

    const handleSubmit = () => {
        if (!formData.description || !formData.montant) {
            alert('⚠️ Veuillez renseigner la description et le montant');
            return;
        }

        const ajustement = {
            id: 'adj_' + Date.now(),
            type: formData.type,
            description: formData.description,
            montant: parseFloat(formData.montant) || 0,
            lots: formData.lots,
            positions0: formData.positions0,
            statut: formData.statut,
            commentaire: formData.commentaire,
            dateCreation: new Date().toISOString()
        };

        onSave(ajustement);
        onClose();
    };

    return React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
    },
        React.createElement('div', {
            className: 'bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'
        },
            React.createElement('div', { className: 'flex justify-between items-center mb-6' },
                React.createElement('h2', { className: 'text-2xl font-bold' }, '📊 Nouvel Ajustement'),
                React.createElement('button', {
                    onClick: onClose,
                    className: 'text-gray-500 hover:text-gray-700'
                }, React.createElement(window.Icons.X, null))
            ),

            React.createElement('div', { className: 'space-y-4' },
                // Type
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Type d\'ajustement *'),
                    React.createElement('select', {
                        value: formData.type,
                        onChange: (e) => setFormData({...formData, type: e.target.value}),
                        className: 'w-full px-3 py-2 border rounded-lg'
                    },
                        React.createElement('option', { value: 'aleas' }, '⚡ Aléas / Imprévus'),
                        React.createElement('option', { value: 'economies' }, '💰 Économies prévues'),
                        React.createElement('option', { value: 'autre' }, '📝 Autre')
                    )
                ),

                // Description
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Description *'),
                    React.createElement('input', {
                        type: 'text',
                        value: formData.description,
                        onChange: (e) => setFormData({...formData, description: e.target.value}),
                        className: 'w-full px-3 py-2 border rounded-lg',
                        placeholder: 'Ex: Provision pour aléas météo'
                    })
                ),

                // Montant
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' },
                        'Montant (CHF) * ',
                        React.createElement('span', { className: 'text-xs text-gray-500 ml-2' },
                            '(Positif = augmentation, Négatif = économie)'
                        )
                    ),
                    React.createElement('input', {
                        type: 'number',
                        step: '0.01',
                        value: formData.montant,
                        onChange: (e) => setFormData({...formData, montant: e.target.value}),
                        className: 'w-full px-3 py-2 border rounded-lg',
                        placeholder: 'Ex: 50000'
                    })
                ),

                // Lots
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' },
                        'Lots concernés (optionnel)'
                    ),
                    React.createElement('select', {
                        multiple: true,
                        value: formData.lots,
                        onChange: (e) => setFormData({...formData, lots: Array.from(e.target.selectedOptions, o => o.value)}),
                        className: 'w-full px-3 py-2 border rounded-lg h-24'
                    },
                        availableLots.map(lot =>
                            React.createElement('option', { key: lot, value: lot }, lot)
                        )
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                        'Laisser vide pour impacter tous les lots. Ctrl+clic pour multi-sélection.'
                    )
                ),

                // Positions 0
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' },
                        'Positions Niv. 0 (optionnel)'
                    ),
                    React.createElement('select', {
                        multiple: true,
                        value: formData.positions0,
                        onChange: (e) => setFormData({...formData, positions0: Array.from(e.target.selectedOptions, o => o.value)}),
                        className: 'w-full px-3 py-2 border rounded-lg h-24'
                    },
                        availablePos0.map(pos =>
                            React.createElement('option', { key: pos, value: pos }, pos)
                        )
                    )
                ),

                // Statut
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Statut'),
                    React.createElement('select', {
                        value: formData.statut,
                        onChange: (e) => setFormData({...formData, statut: e.target.value}),
                        className: 'w-full px-3 py-2 border rounded-lg'
                    },
                        React.createElement('option', { value: 'previsionnel' }, '⏳ Prévisionnel'),
                        React.createElement('option', { value: 'confirme' }, '✅ Confirmé')
                    )
                ),

                // Commentaire
                React.createElement('div', null,
                    React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'Commentaire'),
                    React.createElement('textarea', {
                        value: formData.commentaire,
                        onChange: (e) => setFormData({...formData, commentaire: e.target.value}),
                        className: 'w-full px-3 py-2 border rounded-lg',
                        rows: 3,
                        placeholder: 'Notes complémentaires...'
                    })
                )
            ),

            // Boutons
            React.createElement('div', { className: 'flex justify-end gap-3 mt-6 pt-4 border-t' },
                React.createElement('button', {
                    onClick: onClose,
                    className: 'px-4 py-2 border rounded-lg hover:bg-gray-50'
                }, 'Annuler'),
                React.createElement('button', {
                    onClick: handleSubmit,
                    className: 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
                }, 'Créer l\'ajustement')
            )
        )
    );
};
