// Modal de configuration OneDrive
const { useState, useEffect } = React;

window.OneDriveConfigModal = ({ onClose }) => {
    const [clientId, setClientId] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
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

        // Valider le format (UUID)
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">⚙️ Configuration OneDrive</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <window.Icons.X />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Statut */}
                    <div className={`p-4 rounded-lg border-2 ${
                        isConfigured 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-orange-50 border-orange-300'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                                {isConfigured ? '✅' : '⚠️'}
                            </span>
                            <span className={`font-semibold ${
                                isConfigured ? 'text-green-800' : 'text-orange-800'
                            }`}>
                                {isConfigured 
                                    ? 'OneDrive configuré' 
                                    : 'OneDrive non configuré'}
                            </span>
                        </div>
                        {isConfigured && (
                            <p className="text-sm text-green-700">
                                Vous pouvez maintenant s
