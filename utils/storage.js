// ========================================
// SYSTÈME DE STORAGE
// ========================================

// Storage avec localStorage pour persistance des données
const storage = {
    get: (key) => {
        try {
            const value = localStorage.getItem(key);
            return value ? { value: JSON.parse(value) } : null;
        } catch (error) {
            console.error('Erreur lecture storage:', error);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Erreur écriture storage:', error);
        }
    }
};

window.storage = storage;

// Fonction de chargement des données
window.loadData = async () => {
    return {
        estimations: storage.get('estimations')?.value || [],
        offres: storage.get('offres')?.value || [],
        commandes: storage.get('commandes')?.value || [],
        offresComplementaires: storage.get('offresComplementaires')?.value || [],
        regies: storage.get('regies')?.value || [],
        factures: storage.get('factures')?.value || [],
        appelOffres: storage.get('appelOffres')?.value || [],
        ajustements: storage.get('ajustements')?.value || []
    };
};

// Fonction de sauvegarde des données
window.saveData = (key, value) => {
    storage.set(key, value);
};

// Configuration MSAL pour Microsoft Graph (optionnelle)
const msalConfig = {
    auth: {
        clientId: "VOTRE_CLIENT_ID", // À remplacer par votre Client ID Azure AD
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false
    }
};

const loginRequest = {
    scopes: ["User.Read", "Files.ReadWrite.All", "Sites.ReadWrite.All"]
};

let msalInstance = null;
try {
    // Vérifier si MSAL est chargé avant de l'utiliser
    if (typeof msal !== 'undefined') {
        msalInstance = new msal.PublicClientApplication(msalConfig);
        console.log("✅ MSAL initialisé");
    } else {
        console.log("ℹ️ MSAL non chargé - fonctionnalités Microsoft désactivées");
    }
} catch (error) {
    console.log("⚠️ MSAL non disponible:", error);
}

// Fonctions Microsoft Graph (optionnelles)
window.authenticateWithMicrosoft = async () => {
    if (!msalInstance) {
        alert("La bibliothèque MSAL n'est pas chargée.");
        return null;
    }
    try {
        const response = await msalInstance.loginPopup(loginRequest);
        return response;
    } catch (error) {
        console.error("Erreur d'authentification:", error);
        return null;
    }
};

window.getAccessToken = async () => {
    if (!msalInstance) return null;
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;
    try {
        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
        });
        return response.accessToken;
    } catch (error) {
        try {
            const response = await msalInstance.acquireTokenPopup(loginRequest);
            return response.accessToken;
        } catch (popupError) {
            return null;
        }
    }
};
