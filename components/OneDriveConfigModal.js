// Modal de configuration OneDrive
window.OneDriveConfigModal = ({ onClose }) => {
    const [clientId, setClientId] = React.useState('');
    const [isConfigured, setIsConfigured] = React.useState(false);

    React.useEffect(() => {
        const savedClientId = window.getOneDriveClientId();
        if (savedClientId) {
            setClientId(savedClientId);
            setIsConfigured(true);
        }
    }, []);

    const handleSave = () => {
        if (!clientId || clientId.trim().length === 0) {
            alert('⚠️ Veuillez entrer un Client ID valide');
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(clientId.trim())) {
            alert('⚠️ Le Client ID doit être au format UUID\n\nExemple : a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            return;
        }

        window.setOneDriveClientId(clientId.trim());
        alert('✅ Configuration OneDrive enregistrée !');
        onClose();
    };

    const handleClear = () => {
        if (confirm('⚠️ Supprimer la configuration OneDrive ?')) {
            window.clearOneDriveClientId();
            setClientId('');
            setIsConfigured(false);
            alert('✅ Configuration supprimée');
        }
    };

    return React.createElement('div', {
        className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    },
        React.createElement('div', {
            className: "bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        },
            React.createElement('div', {
                className: "flex justify-between items-center mb-6"
            },
                React.createElement('h2', {
                    className: "text-2xl font-bold"
                }, '⚙️ Configuration OneDrive'),
                React.createElement('button', {
                    onClick: onClose,
                    className: "text-gray-500 hover:text-gray-700"
                }, React.createElement(window.Icons.X, null))
            ),
            React.createElement('div', {
                className: "space-y-4"
            },
                React.createElement('div', {
                    className: `p-4 rounded-lg border-2 ${isConfigured ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`
                },
                    React.createElement('div', {
                        className: "flex items-center gap-2 mb-2"
                    },
                        React.createElement('span', {
                            className: "text-2xl"
                        }, isConfigured ? '✅' : '⚠️'),
                        React.createElement('span', {
                            className: `font-semibold ${isConfigured ? 'text-green-800' : 'text-orange-800'}`
                        }, isConfigured ? 'OneDrive configuré' : 'OneDrive non configuré')
                    ),
                    isConfigured && React.createElement('p', {
                        className: "text-sm text-green-700"
                    }, 'Vous pouvez maintenant sauvegarder et charger vos sessions depuis OneDrive.')
                ),
                React.createElement('div', {
                    className: "p-4 bg-blue-50 rounded-lg border border-blue-200"
                },
                    React.createElement('h3', {
                        className: "font-semibold text-blue-900 mb-2"
                    }, '📖 Comment obtenir un Client ID ?'),
                    React.createElement('ol', {
                        className: "text-sm text-blue-800 space-y-2 list-decimal list-inside"
                    },
                        React.createElement('li', null, 'Allez sur ', React.createElement('a', {
                            href: "https://portal.azure.com",
                            target: "_blank",
                            className: "underline font-semibold"
                        }, 'Azure Portal')),
                        React.createElement('li', null, 'Recherchez "App registrations"'),
                        React.createElement('li', null, 'Cliquez sur "New registration"'),
                        React.createElement('li', null, 'Nom : "Construction Management"'),
                        React.createElement('li', null, 'Account types : "Accounts in any organizational directory and personal Microsoft accounts"'),
                        React.createElement('li', null, 'Cliquez sur "Register"'),
                        React.createElement('li', null, React.createElement('strong', null, 'Copiez le "Application (client) ID"')),
                        React.createElement('li', null, 'Collez-le ci-dessous')
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', {
                        className: "block text-sm font-medium mb-2"
                    }, 'Client ID (Application ID) ', React.createElement('span', {
                        className: "text-red-500"
                    }, '*')),
                    React.createElement('input', {
                        type: "text",
                        value: clientId,
                        onChange: (e) => setClientId(e.target.value),
                        className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm",
                        placeholder: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                    }),
                    React.createElement('p', {
                        className: "text-xs text-gray-500 mt-1"
                    }, 'Format : UUID (8-4-4-4-12 caractères hexadécimaux)')
                ),
                React.createElement('div', {
                    className: "p-3 bg-gray-50 rounded border text-xs font-mono text-gray-700"
                },
                    React.createElement('div', {
                        className: "text-gray-500 mb-1"
                    }, 'Exemple de Client ID :'),
                    React.createElement('div', {
                        className: "select-all"
                    }, '12345678-1234-1234-1234-123456789abc')
                ),
                React.createElement('div', {
                    className: "p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                },
                    React.createElement('div', {
                        className: "flex items-start gap-2"
                    },
                        React.createElement('span', {
                            className: "text-xl"
                        }, '🔒'),
                        React.createElement('div', {
                            className: "text-xs text-yellow-800"
                        },
                            React.createElement('strong', null, 'Note de sécurité :'),
                            ' Le Client ID est stocké localement dans votre navigateur.'
                        )
                    )
                )
            ),
            React.createElement('div', {
                className: "flex justify-between mt-6 pt-4 border-t"
            },
                React.createElement('div', null,
                    isConfigured && React.createElement('button', {
                        onClick: handleClear,
                        className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                    },
                        React.createElement(window.Icons.Trash2, { size: 16 }),
                        'Supprimer'
                    )
                ),
                React.createElement('div', {
                    className: "flex gap-3"
                },
                    React.createElement('button', {
                        onClick: onClose,
                        className: "px-4 py-2 border rounded-lg hover:bg-gray-50"
                    }, 'Annuler'),
                    React.createElement('button', {
                        onClick: handleSave,
                        className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    },
                        React.createElement(window.Icons.Save, { size: 16 }),
                        'Enregistrer'
                    )
                )
            )
        )
    );
};
