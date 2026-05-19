const styleId = 'scrollbar-premium-dynamic-style';

const themes = {
    purple: { c1: '#a855f7', c2: '#3b82f6' },
    sunset: { c1: '#f97316', c2: '#eab308' },
    emerald: { c1: '#10b981', c2: '#06b6d4' },
    ruby: { c1: '#ef4444', c2: '#ec4899' }
};

function updateScrollbar(settings) {
    let styleEl = document.getElementById(styleId);
    
    // Si la extensión está apagada, removemos los estilos y la clase
    if (!settings.extensionEnabled) {
        if (styleEl) styleEl.remove();
        document.documentElement.classList.remove('scrollbar-premium-active');
        return;
    }

    // Si está encendida y no existe el tag style, lo creamos
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        // Lo añadimos al HTML lo antes posible
        if (document.head) {
            document.head.appendChild(styleEl);
        } else {
            document.documentElement.appendChild(styleEl);
        }
    }
    
    document.documentElement.classList.add('scrollbar-premium-active');

    let c1, c2, trackColor;
    
    if (settings.advancedColorsEnabled) {
        c1 = settings.thumbColor1 || '#a855f7';
        c2 = settings.thumbColor2 || '#3b82f6';
        trackColor = settings.trackColor || '#141418';
    } else if (settings.syncBrowserTheme && settings.browserThemeColors) {
        c1 = settings.browserThemeColors.c1;
        c2 = settings.browserThemeColors.c2;
        trackColor = 'rgba(128, 128, 128, 0.1)';
    } else {
        const theme = themes[settings.theme] || themes.purple;
        c1 = theme.c1;
        c2 = theme.c2;
        trackColor = 'rgba(128, 128, 128, 0.1)';
    }
    
    // Construimos el SVG dependiendo de si el texto está activado
    const svgText = settings.showText !== false 
        ? `<text x='50%' y='55%' font-family='sans-serif' font-size='7' font-weight='bold' fill='white' opacity='0.6' text-anchor='middle' transform='rotate(-90 6 15)'>NAV</text>` 
        : ``;
        
    const svgTextHover = settings.showText !== false 
        ? `<text x='50%' y='55%' font-family='sans-serif' font-size='7' font-weight='bold' fill='white' opacity='1' text-anchor='middle' transform='rotate(-90 6 15)'>NAV</text>` 
        : ``;

    const svgNormal = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='30' viewBox='0 0 12 30'>${svgText}</svg>`;
    const svgHover = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='30' viewBox='0 0 12 30'>${svgTextHover}</svg>`;

    // Reglas CSS dinámicas
    const cssText = `
        /* Configuración global para Firefox */
        html.scrollbar-premium-active {
            scrollbar-width: thin !important;
            scrollbar-color: ${c1} ${settings.advancedColorsEnabled ? trackColor : c2} !important;
        }

        /* Contenedor principal del scroll (Chrome/Edge/Safari) */
        html.scrollbar-premium-active::-webkit-scrollbar {
            width: 14px !important;
            height: 14px !important;
            background: transparent !important;
        }

        /* La pista de fondo */
        html.scrollbar-premium-active::-webkit-scrollbar-track {
            background: ${trackColor} !important;
        }

        /* El deslizador */
        html.scrollbar-premium-active::-webkit-scrollbar-thumb {
            background-image: url("${svgNormal}"), linear-gradient(180deg, ${c1}, ${c2}) !important;
            background-color: transparent !important;
            background-repeat: no-repeat, no-repeat !important;
            background-position: center, center !important;
            background-size: contain, auto !important;
            border-radius: 10px !important;
            border: 3px solid transparent !important;
            background-clip: padding-box !important;
            transition: all 0.3s ease-in-out !important;
        }

        /* Efecto Hover */
        html.scrollbar-premium-active::-webkit-scrollbar-thumb:hover {
            background-image: url("${svgHover}"), linear-gradient(180deg, ${c1}, ${c2}) !important;
            filter: brightness(1.1);
        }

        /* Cuando el usuario está arrastrando la barra */
        html.scrollbar-premium-active::-webkit-scrollbar-thumb:active {
            filter: brightness(0.9);
        }
    `;

    styleEl.textContent = cssText;
}

// Inicialización: cargar datos guardados
chrome.storage.local.get(['extensionEnabled', 'showText', 'theme', 'syncBrowserTheme', 'browserThemeColors', 'advancedColorsEnabled', 'trackColor', 'thumbColor1', 'thumbColor2'], (result) => {
    const settings = {
        extensionEnabled: result.extensionEnabled !== false, // Por defecto true
        showText: result.showText !== false, // Por defecto true
        theme: result.theme || 'purple',
        syncBrowserTheme: result.syncBrowserTheme || false,
        browserThemeColors: result.browserThemeColors || null,
        advancedColorsEnabled: result.advancedColorsEnabled || false,
        trackColor: result.trackColor || '#141418',
        thumbColor1: result.thumbColor1 || '#a855f7',
        thumbColor2: result.thumbColor2 || '#3b82f6'
    };
    updateScrollbar(settings);
});

// Escuchar cambios desde el popup en tiempo real
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        chrome.storage.local.get(['extensionEnabled', 'showText', 'theme', 'syncBrowserTheme', 'browserThemeColors', 'advancedColorsEnabled', 'trackColor', 'thumbColor1', 'thumbColor2'], (result) => {
            const settings = {
                extensionEnabled: result.extensionEnabled !== false,
                showText: result.showText !== false,
                theme: result.theme || 'purple',
                syncBrowserTheme: result.syncBrowserTheme || false,
                browserThemeColors: result.browserThemeColors || null,
                advancedColorsEnabled: result.advancedColorsEnabled || false,
                trackColor: result.trackColor || '#141418',
                thumbColor1: result.thumbColor1 || '#a855f7',
                thumbColor2: result.thumbColor2 || '#3b82f6'
            };
            updateScrollbar(settings);
        });
    }
});
