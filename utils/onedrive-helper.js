// ========================================
// ONEDRIVE PICKER - HELPER FUNCTIONS
// ========================================

// ⚠️ REMPLACE PAR TON CLIENT ID
const ONEDRIVE_CLIENT_ID = "TON_CLIENT_ID_ICI";

// Sauvegarder sur OneDrive
window.saveToOneDrive = (sessionName, sessionData) => {
    return new Promise((resolve, reject) => {
        try {
            // Créer le contenu JSON
            const jsonString = JSON.stringify(sessionData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Nom du fichier avec date
            const fileName = `${sessionName}_${new Date().toISOString().split('T')[0]}.json`;
            
            // Options OneDrive
            const saveOptions = {
                clientId: ONEDRIVE_CLIENT_ID,
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
        try {
            const openOptions = {
                clientId: ONEDRIVE_CLIENT_ID,
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
