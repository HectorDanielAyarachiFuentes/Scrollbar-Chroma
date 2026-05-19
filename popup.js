document.addEventListener('DOMContentLoaded', () => {
    const toggleExtension = document.getElementById('toggle-extension');
    const toggleText = document.getElementById('toggle-text');
    const toggleSync = document.getElementById('toggle-sync');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const statusMessage = document.getElementById('status-message');
    const root = document.documentElement;

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Advanced Colors
    const toggleAdvancedColors = document.getElementById('toggle-advanced-colors');
    const trackColorInput = document.getElementById('track-color');
    const trackColor2Input = document.getElementById('track-color-2');
    const thumbColor1Input = document.getElementById('thumb-color-1');
    const thumbColor2Input = document.getElementById('thumb-color-2');
    const advancedColorsCard = document.getElementById('advanced-colors-card');
    const advancedPresetsCard = document.getElementById('advanced-presets-card');
    const presetThumb = document.getElementById('preset-thumb');
    const presetTrack = document.getElementById('preset-track');

    let gradientsData = [];

    // Load gradients.json
    fetch('gradients.json')
        .then(res => res.json())
        .then(data => {
            gradientsData = data;
            data.forEach((grad, index) => {
                const opt1 = document.createElement('option');
                opt1.value = index;
                opt1.textContent = grad.name;
                presetThumb.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = index;
                opt2.textContent = grad.name;
                presetTrack.appendChild(opt2);
            });
            // Try to set selections after loading
            chrome.storage.local.get(['advancedThumbGradientIndex', 'advancedTrackGradientIndex'], (r) => {
                if (r.advancedThumbGradientIndex !== undefined) presetThumb.value = r.advancedThumbGradientIndex;
                if (r.advancedTrackGradientIndex !== undefined) presetTrack.value = r.advancedTrackGradientIndex;
            });
        });

    // Load saved settings
    chrome.storage.local.get(['extensionEnabled', 'showText', 'theme', 'syncBrowserTheme', 'browserThemeColors', 'advancedColorsEnabled', 'trackColor', 'trackColor2', 'thumbColor1', 'thumbColor2'], (result) => {
        if (result.extensionEnabled !== undefined) {
            toggleExtension.checked = result.extensionEnabled;
            updateStatus(result.extensionEnabled);
        }
        
        if (result.showText !== undefined) {
            toggleText.checked = result.showText;
        }

        if (result.syncBrowserTheme !== undefined) {
            toggleSync.checked = result.syncBrowserTheme;
            updateSyncUI(result.syncBrowserTheme, result.browserThemeColors);
        }
        
        // Always activate the theme visually if sync is off or browserThemeColors missing
        if (result.theme) {
            activateTheme(result.theme, !result.syncBrowserTheme); 
        }

        if (result.advancedColorsEnabled !== undefined) {
            toggleAdvancedColors.checked = result.advancedColorsEnabled;
            updateAdvancedUI(result.advancedColorsEnabled);
        }
        if (result.trackColor) trackColorInput.value = result.trackColor;
        if (result.trackColor2) trackColor2Input.value = result.trackColor2;
        if (result.thumbColor1) thumbColor1Input.value = result.thumbColor1;
        if (result.thumbColor2) thumbColor2Input.value = result.thumbColor2;
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Advanced Colors Toggle
    toggleAdvancedColors.addEventListener('change', (e) => {
        const isAdvanced = e.target.checked;
        chrome.storage.local.set({ advancedColorsEnabled: isAdvanced });
        updateAdvancedUI(isAdvanced);
    });

    function updateAdvancedUI(isAdvanced) {
        if (isAdvanced) {
            advancedColorsCard.style.opacity = '1';
            advancedColorsCard.style.pointerEvents = 'auto';
            advancedPresetsCard.style.opacity = '1';
            advancedPresetsCard.style.pointerEvents = 'auto';
        } else {
            advancedColorsCard.style.opacity = '0.5';
            advancedColorsCard.style.pointerEvents = 'none';
            advancedPresetsCard.style.opacity = '0.5';
            advancedPresetsCard.style.pointerEvents = 'none';
        }
    }

    presetThumb.addEventListener('change', (e) => {
        if (e.target.value === "") {
            chrome.storage.local.remove(['advancedThumbGradientString', 'advancedThumbGradientIndex']);
            return;
        }
        const grad = gradientsData[e.target.value];
        const colorsStr = grad.colors.join(', ');
        chrome.storage.local.set({ 
            advancedThumbGradientString: colorsStr,
            advancedThumbGradientIndex: e.target.value,
            thumbColor1: grad.colors[0],
            thumbColor2: grad.colors[grad.colors.length - 1]
        });
        thumbColor1Input.value = grad.colors[0];
        thumbColor2Input.value = grad.colors[grad.colors.length - 1];
    });

    presetTrack.addEventListener('change', (e) => {
        if (e.target.value === "") {
            chrome.storage.local.remove(['advancedTrackGradientString', 'advancedTrackGradientIndex']);
            return;
        }
        const grad = gradientsData[e.target.value];
        const colorsStr = grad.colors.join(', ');
        chrome.storage.local.set({ 
            advancedTrackGradientString: colorsStr,
            advancedTrackGradientIndex: e.target.value,
            trackColor: grad.colors[0],
            trackColor2: grad.colors[grad.colors.length - 1]
        });
        trackColorInput.value = grad.colors[0];
        trackColor2Input.value = grad.colors[grad.colors.length - 1];
    });

    trackColorInput.addEventListener('input', (e) => {
        chrome.storage.local.set({ trackColor: e.target.value });
        chrome.storage.local.remove(['advancedTrackGradientString', 'advancedTrackGradientIndex']);
        presetTrack.value = "";
    });
    trackColor2Input.addEventListener('input', (e) => {
        chrome.storage.local.set({ trackColor2: e.target.value });
        chrome.storage.local.remove(['advancedTrackGradientString', 'advancedTrackGradientIndex']);
        presetTrack.value = "";
    });
    thumbColor1Input.addEventListener('input', (e) => {
        chrome.storage.local.set({ thumbColor1: e.target.value });
        chrome.storage.local.remove(['advancedThumbGradientString', 'advancedThumbGradientIndex']);
        presetThumb.value = "";
    });
    thumbColor2Input.addEventListener('input', (e) => {
        chrome.storage.local.set({ thumbColor2: e.target.value });
        chrome.storage.local.remove(['advancedThumbGradientString', 'advancedThumbGradientIndex']);
        presetThumb.value = "";
    });

    // Toggle Extension
    toggleExtension.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        chrome.storage.local.set({ extensionEnabled: isEnabled });
        updateStatus(isEnabled);
        
        // Notify content scripts or background script (if we implement dynamic injection later)
    });

    // Toggle Text
    toggleText.addEventListener('change', (e) => {
        chrome.storage.local.set({ showText: e.target.checked });
    });

    // Toggle Sync
    toggleSync.addEventListener('change', (e) => {
        const isSync = e.target.checked;
        chrome.storage.local.set({ syncBrowserTheme: isSync });
        chrome.storage.local.get(['browserThemeColors'], (result) => {
            updateSyncUI(isSync, result.browserThemeColors);
        });
    });

    // Escuchar si el background script actualiza los colores del tema de Firefox
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.browserThemeColors && toggleSync.checked) {
            updateSyncUI(true, changes.browserThemeColors.newValue);
        }
    });

    // Theme Selection
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            activateTheme(theme);
            chrome.storage.local.set({ theme: theme });
        });
    });

    function activateTheme(themeName, applyVariables = true) {
        themeBtns.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.theme-btn[data-theme="${themeName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            
            // Update popup accent colors based on selected theme
            const color1 = activeBtn.style.getPropertyValue('--t-color-1');
            const color2 = activeBtn.style.getPropertyValue('--t-color-2');
            
            if (applyVariables && color1 && color2) {
                root.style.setProperty('--accent-1', color1.trim());
                root.style.setProperty('--accent-2', color2.trim());
            }
        }
    }

    function updateSyncUI(isSync, browserThemeColors) {
        const themesContainer = document.querySelector('.themes');
        if (isSync) {
            themesContainer.style.opacity = '0.5';
            themesContainer.style.pointerEvents = 'none';
            // Aplicar colores del tema del navegador si existen
            if (browserThemeColors && browserThemeColors.c1 && browserThemeColors.c2) {
                root.style.setProperty('--accent-1', browserThemeColors.c1);
                root.style.setProperty('--accent-2', browserThemeColors.c2);
            }
        } else {
            themesContainer.style.opacity = '1';
            themesContainer.style.pointerEvents = 'auto';
            // Restaurar colores del tema seleccionado actualmente
            const activeBtn = document.querySelector('.theme-btn.active');
            if (activeBtn) {
                const color1 = activeBtn.style.getPropertyValue('--t-color-1');
                const color2 = activeBtn.style.getPropertyValue('--t-color-2');
                if (color1 && color2) {
                    root.style.setProperty('--accent-1', color1.trim());
                    root.style.setProperty('--accent-2', color2.trim());
                }
            }
        }
    }

    function updateStatus(isEnabled) {
        if (isEnabled) {
            statusMessage.textContent = 'Activo';
            statusMessage.style.color = 'var(--accent-1)';
            document.body.style.opacity = '1';
        } else {
            statusMessage.textContent = 'Inactivo';
            statusMessage.style.color = 'var(--text-secondary)';
            document.querySelector('.content').style.opacity = '0.5';
            document.querySelector('.content').style.pointerEvents = 'none';
        }
        
        if (isEnabled) {
            document.querySelector('.content').style.opacity = '1';
            document.querySelector('.content').style.pointerEvents = 'auto';
        }
    }

    // Funcionalidad para abrir en una ventana flotante separada
    const openWindowBtn = document.getElementById('open-window');
    if (openWindowBtn) {
        openWindowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.windows.create({
                url: 'popup.html',
                type: 'popup',
                width: 360,
                height: 600
            });
        });
    }

    // Funcionalidad para abrir en el panel lateral (Sidebar)
    const openSidebarBtn = document.getElementById('open-sidebar');
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof browser !== 'undefined' && browser.sidebarAction) {
                browser.sidebarAction.open();
                window.close(); // Cierra el popup original
            } else {
                alert('Esta función solo está disponible en navegadores compatibles (Firefox).');
            }
        });
    }
});
