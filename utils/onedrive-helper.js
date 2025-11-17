// ========================================
// ONEDRIVE PICKER - CONFIGURATION DYNAMIQUE
// ========================================

// Récupérer le Client ID depuis le localStorage
window.getOneDriveClientId = () => {
    return localStorage.getItem('onedrive_client_id') || null;
};

// Sauvegarder le Client ID
window.setOneDriveClientId = (clientId) => {
    localStorage.setItem('onedrive_client_id', clientId);
};

// Supprimer le Client ID
window.clearOneDriveClientId = () => {
    localStorage.removeItem('onedrive_client_id');
};

// Vérifier si OneDrive est configuré
window.isOneDriveConfigured = () => {
    const clientId = window.getOneDriveClientId();
    return clientId && clientId.length > 0;
};

// Sauvegarder sur OneDrive
window.saveToOneDrive = (sessionName, sessionData) => {
    return new Promise((resolve, reject) => {
        const clientId = window.getOneDriveClientId();
        
        if (!clientId) {
            reject(new Error("OneDrive non configuré. Veuillez entrer votre Client ID."));
            return;
        }
        
        try {
            // Créer le contenu JSON
            const jsonString = JSON.stringify(sessionData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Nom du fichier avec date
            const fileName = `${sessionName}_${new Date().toISOString().split('T')[0]}.json`;
            
            // Options OneDrive
            const saveOptions = {
                clientId: clientId,
                action: "save",
                sourceInputElementId: null,
                sourceUri: null,
                fileName: fileName,
                openInNewWindow: true,
                advanced: {
                    filter: ".json"
                },
                success: (files) => {
                    console.log("✅ Fichier sauvegardé:", files);
                    resolve({
                        success: true,
                        fileName: fileName,
                        files: files
                    });
                },
                error: (error) => {
                    console.error("❌ Erreur OneDrive:", error);
                    reject(error);
                }
            };
            
            // Créer un input temporaire avec le blob
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            input.id = 'onedrive-temp-input';
            document.body.appendChild(input);
            
            // Créer un fichier depuis le blob
            const file = new File([blob], fileName, { type: 'application/json' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            
            saveOptions.sourceInputElementId = 'onedrive-temp-input';
            
            // Ouvrir le picker OneDrive
            OneDrive.save(saveOptions);
            
            // Nettoyer après 1 seconde
            setTimeout(() => {
                document.body.removeChild(input);
            }, 1000);
            
        } catch (error) {
            console.error("❌ Erreur:", error);
            reject(error);
        }
    });
};

// Charger depuis OneDrive
window.loadFromOneDrive = () => {
    return new Promise((resolve, reject) => {
        const clientId = window.getOneDriveClientId();
        
        if (!clientId) {
            reject(new Error("OneDrive non configuré. Veuillez entrer votre Client ID."));
            return;
        }
        
        try {
            const openOptions = {
                clientId: clientId,
                action: "download",
                multiSelect: false,
                advanced: {
                    filter: ".json"
                },
                success: (files) => {
                    if (files.value && files.value.length > 0) {
                        const file = files.value[0];
                        const downloadUrl = file['@microsoft.graph.downloadUrl'];
                        
                        // Télécharger le fichier
                        fetch(downloadUrl)
                            .then(response => response.json())
                            .then(data => {
                                console.log("✅ Fichier chargé:", file.name);
                                resolve({
                                    success: true,
                                    fileName: file.name,
                                    data: data
                                });
                            })
                            .catch(error => {
                                console.error("❌ Erreur lecture:", error);
                                reject(error);
                            });
                    } else {
                        reject(new Error("Aucun fichier sélectionné"));
                    }
                },
                error: (error) => {
                    console.error("❌ Erreur OneDrive:", error);
                    reject(error);
                }
            };
            
            // Ouvrir le picker OneDrive
            OneDrive.open(openOptions);
            
        } catch (error) {
            console.error("❌ Erreur:", error);
            reject(error);
        }
    });
};
