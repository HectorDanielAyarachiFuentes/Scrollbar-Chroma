// background.js

function normalizeColor(color) {
    if (!color) return null;
    if (Array.isArray(color)) {
        if (color.length === 3) return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        if (color.length === 4) return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
    }
    return color;
}

function updateBrowserThemeColors() {
    // browser.theme está disponible de forma nativa en extensiones de Firefox
    if (typeof browser !== 'undefined' && browser.theme) {
        browser.theme.getCurrent().then(themeInfo => {
            let c1 = '#a855f7'; // default purpura
            let c2 = '#3b82f6'; // default azul
            
            if (themeInfo && themeInfo.colors) {
                const colors = themeInfo.colors;
                
                // Extraer y normalizar colores (Firefox puede devolver arrays [r,g,b] en lugar de strings)
                let rawC1 = colors.tab_line || colors.toolbar || colors.frame;
                let rawC2 = colors.toolbar_field || colors.accentcolor || colors.tab_background_text;
                
                if (rawC1) c1 = normalizeColor(rawC1) || c1;
                if (rawC2) c2 = normalizeColor(rawC2) || c2;
            }
            
            chrome.storage.local.set({
                browserThemeColors: { c1: c1, c2: c2 }
            });
        }).catch(err => {
            console.error("Error al obtener el tema de Firefox:", err);
        });
    }
}

// Escuchar cambios en el tema de Firefox
if (typeof browser !== 'undefined' && browser.theme) {
    browser.theme.onUpdated.addListener((updateInfo) => {
        updateBrowserThemeColors();
    });
}

// Actualizar colores al iniciar el background script
updateBrowserThemeColors();

// Escuchar si el usuario activa la opción en el popup para forzar actualización
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.syncBrowserTheme) {
        if (changes.syncBrowserTheme.newValue === true) {
            updateBrowserThemeColors();
        }
    }
});
