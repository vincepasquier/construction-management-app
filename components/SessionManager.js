// Gestionnaire de session pour nommer le projet
const { useState, useEffect } = React;

window.SessionManager = ({ sessionName, onSessionNameChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(sessionName);

    useEffect(() => {
        setTempName(sessionName);
    }, [sessionName]);

    const handleSave = () => {
        const finalName = tempName.trim() || 'Projet_Sans_Nom';
        onSessionNameChange(finalName);
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setTempName(sessionName);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-purple-600 font-semibold">📁</span>
            {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={handleSave}
                        autoFocus
                        className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nom du projet..."
                        maxLength={50}
                    />
                    <button
                        onClick={handleSave}
                        className="px-2 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                        ✓
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-purple-900">{sessionName}</span>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-purple-600 hover:text-purple-800 text-sm"
                        title="Modifier le nom du projet"
                    >
                        ✏️
                    </button>
                </div>
            )}
            <span className="text-xs text-purple-600">Session active</span>
        </div>
    );
};
