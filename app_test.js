// ========================================
// APPLICATION PRINCIPALE - VERSION TEST
// ========================================

const { useState, useEffect } = React;

// Composant de test minimaliste
const ConstructionManagement = () => {
    return React.createElement('div', { 
        style: { padding: '40px', fontFamily: 'system-ui' } 
    },
        React.createElement('h1', { style: { fontSize: '24px', marginBottom: '20px' } }, 
            '🏗️ Application de Gestion de Construction'
        ),
        React.createElement('p', { style: { color: '#666' } }, 
            'Version de test - L\'application se charge correctement !'
        ),
        React.createElement('div', { 
            style: { 
                marginTop: '20px', 
                padding: '20px', 
                background: '#f0f9ff', 
                border: '1px solid #3b82f6',
                borderRadius: '8px'
            } 
        },
            React.createElement('p', { style: { margin: 0 } }, 
                '✅ React fonctionne'
            ),
            React.createElement('p', { style: { margin: '8px 0 0 0' } }, 
                '✅ Composant monté avec succès'
            )
        )
    );
};

// Exposer le composant globalement
window.ConstructionManagement = ConstructionManagement;

// Montage de l'application
console.log('📦 Chargement de app.js...');

window.addEventListener('load', () => {
    console.log('📦 DOM chargé, montage de l\'app...');
    
    setTimeout(() => {
        const rootElement = document.getElementById('root');
        
        if (!rootElement) {
            console.error('❌ Élément root introuvable');
            return;
        }
        
        if (typeof ReactDOM === 'undefined') {
            console.error('❌ ReactDOM non chargé');
            return;
        }
        
        try {
            const root = ReactDOM.createRoot(rootElement);
            root.render(React.createElement(ConstructionManagement));
            console.log('✅ Application montée avec succès !');
        } catch (error) {
            console.error('❌ Erreur lors du montage:', error);
        }
    }, 1000);
});

console.log('✅ app.js chargé');
