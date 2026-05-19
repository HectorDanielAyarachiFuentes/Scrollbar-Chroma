document.addEventListener('DOMContentLoaded', () => {
    const toggleExtension = document.getElementById('toggle-extension');
    const toggleText = document.getElementById('toggle-text');
    const toggleSync = document.getElementById('toggle-sync');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const statusMessage = document.getElementById('status-message');
    const root = document.documentElement;

    // Load saved settings
    chrome.storage.local.get(['extensionEnabled', 'showText', 'theme', 'syncBrowserTheme', 'browserThemeColors'], (result) => {
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
});
