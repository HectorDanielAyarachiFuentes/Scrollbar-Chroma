document.addEventListener('DOMContentLoaded', () => {
    const toggleExtension = document.getElementById('toggle-extension');
    const toggleText = document.getElementById('toggle-text');
    const toggleTextInternal = document.getElementById('toggle-text-internal');
    const customTextInput = document.getElementById('custom-text-input');
    const customTextContainer = document.getElementById('custom-text-container');
    const toggleSync = document.getElementById('toggle-sync');
    const statusMessage = document.getElementById('status-message');
    const root = document.documentElement;

    // Detect Firefox to show WebKit compatibility instructions
    const isFirefox = navigator.userAgent.includes("Firefox");
    if (isFirefox) {
        const ffAlert = document.getElementById('firefox-alert');
        if (ffAlert) ffAlert.classList.add('visible');
    }

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

    const scrollbarSizeInput = document.getElementById('scrollbar-size');
    const scrollbarRadiusInput = document.getElementById('scrollbar-radius');
    const enableInternalScrollbars = document.getElementById('enable-internal-scrollbars');
    const separateInternalSize = document.getElementById('separate-internal-size');
    const separateInternalSizeOption = document.getElementById('separate-internal-size-option');
    const internalScrollbarSizeInput = document.getElementById('internal-scrollbar-size');
    const internalSizeContainer = document.getElementById('internal-size-container');
    const sizeVal = document.getElementById('size-val');
    const internalSizeVal = document.getElementById('internal-size-val');
    const radiusVal = document.getElementById('radius-val');
    const thumbMinSizeInput = document.getElementById('thumb-min-size');
    const thumbMinVal = document.getElementById('thumb-min-val');

    // ── Live preview ──────────────────────────────────────────────
    const previewThumb = document.getElementById('preview-thumb');
    const previewTrack = document.getElementById('preview-track');
    function updateDimensionPreview() {
        if (!previewThumb) return;
        const size   = scrollbarSizeInput   ? parseInt(scrollbarSizeInput.value)   : 14;
        const radius = scrollbarRadiusInput ? parseInt(scrollbarRadiusInput.value) : 10;
        previewThumb.style.width        = `${size}px`;
        previewThumb.style.borderRadius = `${radius}px`;
        if (previewTrack) previewTrack.style.borderRadius = `${radius}px`;
    }
    if (scrollbarSizeInput)   scrollbarSizeInput.addEventListener('input',   updateDimensionPreview);
    if (scrollbarRadiusInput) scrollbarRadiusInput.addEventListener('input', updateDimensionPreview);
    updateDimensionPreview();

    let gradientsData = [];
    let activeThemeName = 'Purple';

    const gradientGrid = document.getElementById('gradient-grid');
    const activeThemeDisplay = document.getElementById('active-theme-display');
    const gradientSearch = document.getElementById('gradient-search');

    function renderGradients(query = '') {
        if (!gradientGrid) return;
        gradientGrid.innerHTML = '';
        const lowerQuery = query.toLowerCase().trim();

        gradientsData.forEach((grad) => {
            if (lowerQuery && !grad.name.toLowerCase().includes(lowerQuery)) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'gradient-item';
            item.title = grad.name;
            if (grad.name.toLowerCase() === activeThemeName.toLowerCase()) {
                item.classList.add('active');
                if (activeThemeDisplay) activeThemeDisplay.textContent = grad.name;
            }

            const preview = document.createElement('span');
            preview.className = 'gradient-item-preview';
            const colors = grad.colors || [];
            if (colors.length === 1) {
                preview.style.backgroundColor = colors[0];
            } else if (colors.length > 1) {
                preview.style.background = `linear-gradient(135deg, ${colors.join(', ')})`;
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'gradient-item-name';
            nameSpan.textContent = grad.name;

            item.appendChild(preview);
            item.appendChild(nameSpan);

            item.addEventListener('click', () => {
                document.querySelectorAll('.gradient-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                activeThemeName = grad.name;
                if (activeThemeDisplay) activeThemeDisplay.textContent = grad.name;

                chrome.storage.local.set({
                    theme: grad.name,
                    themeColors: grad.colors
                });

                if (colors.length > 0) {
                    const c1 = colors[0];
                    const c2 = colors[colors.length - 1];
                    chrome.storage.local.get(['syncBrowserTheme'], (syncRes) => {
                        if (!syncRes.syncBrowserTheme) {
                            root.style.setProperty('--accent-1', c1);
                            root.style.setProperty('--accent-2', c2);
                        }
                    });
                }
            });

            gradientGrid.appendChild(item);
        });
    }

    if (gradientSearch) {
        gradientSearch.addEventListener('input', (e) => {
            renderGradients(e.target.value);
        });
    }

    // Load gradients.json
    fetch('../assets/gradients.json')
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

            renderGradients();

            // Try to set selections after loading
            chrome.storage.local.get(['advancedThumbGradientIndex', 'advancedTrackGradientIndex', 'theme'], (r) => {
                if (r.advancedThumbGradientIndex !== undefined) presetThumb.value = r.advancedThumbGradientIndex;
                if (r.advancedTrackGradientIndex !== undefined) presetTrack.value = r.advancedTrackGradientIndex;
                if (r.theme !== undefined) {
                    activeThemeName = r.theme;
                    renderGradients();
                    activateTheme(r.theme, !toggleSync.checked);
                    setTimeout(() => {
                        const activeEl = document.querySelector('.gradient-item.active');
                        if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
                    }, 100);
                }
            });
        });

    // Load saved settings
    chrome.storage.local.get(['extensionEnabled', 'showText', 'showTextInternal', 'scrollbarText', 'theme', 'syncBrowserTheme', 'browserThemeColors', 'advancedColorsEnabled', 'trackColor', 'trackColor2', 'thumbColor1', 'thumbColor2', 'scrollbarSize', 'scrollbarRadius', 'separateInternalSize', 'internalScrollbarSize', 'thumbMinSize', 'enableInternalScrollbars'], (result) => {
        if (result.extensionEnabled !== undefined) {
            toggleExtension.checked = result.extensionEnabled;
            updateStatus(result.extensionEnabled);
        }
        
        if (result.showText !== undefined) {
            toggleText.checked = result.showText;
            customTextContainer.style.display = result.showText ? 'flex' : 'none';
        }
        if (result.showTextInternal !== undefined) {
            toggleTextInternal.checked = result.showTextInternal;
        }

        if (result.scrollbarText !== undefined) {
            customTextInput.value = result.scrollbarText;
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

        if (result.scrollbarSize !== undefined) {
            scrollbarSizeInput.value = result.scrollbarSize;
            sizeVal.textContent = result.scrollbarSize + 'px';
        }
        if (result.scrollbarRadius !== undefined) {
            scrollbarRadiusInput.value = result.scrollbarRadius;
            radiusVal.textContent = result.scrollbarRadius + 'px';
        }
        if (result.separateInternalSize !== undefined) {
            separateInternalSize.checked = result.separateInternalSize;
        }
        if (result.internalScrollbarSize !== undefined) {
            internalScrollbarSizeInput.value = result.internalScrollbarSize;
            internalSizeVal.textContent = result.internalScrollbarSize + 'px';
        }
        if (result.thumbMinSize !== undefined) {
            thumbMinSizeInput.value = result.thumbMinSize;
            thumbMinVal.textContent = result.thumbMinSize + 'px';
        }

        let enableInternals = false;
        if (result.enableInternalScrollbars !== undefined) {
            enableInternals = result.enableInternalScrollbars;
        }
        enableInternalScrollbars.checked = enableInternals;
        updateInternalOptionsUI(enableInternals);
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

    scrollbarSizeInput.addEventListener('input', (e) => {
        sizeVal.textContent = e.target.value + 'px';
        chrome.storage.local.set({ scrollbarSize: parseInt(e.target.value) });
    });

    enableInternalScrollbars.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        chrome.storage.local.set({ enableInternalScrollbars: isEnabled });
        updateInternalOptionsUI(isEnabled);
    });

    function updateInternalOptionsUI(enableInternals) {
        if (enableInternals) {
            separateInternalSizeOption.style.display = 'flex';
            internalSizeContainer.style.display = separateInternalSize.checked ? 'flex' : 'none';
        } else {
            separateInternalSizeOption.style.display = 'none';
            internalSizeContainer.style.display = 'none';
        }
    }

    separateInternalSize.addEventListener('change', (e) => {
        internalSizeContainer.style.display = e.target.checked ? 'flex' : 'none';
        chrome.storage.local.set({ separateInternalSize: e.target.checked });
    });

    internalScrollbarSizeInput.addEventListener('input', (e) => {
        internalSizeVal.textContent = e.target.value + 'px';
        chrome.storage.local.set({ internalScrollbarSize: parseInt(e.target.value) });
    });

    scrollbarRadiusInput.addEventListener('input', (e) => {
        radiusVal.textContent = e.target.value + 'px';
        chrome.storage.local.set({ scrollbarRadius: parseInt(e.target.value) });
    });

    thumbMinSizeInput.addEventListener('input', (e) => {
        thumbMinVal.textContent = e.target.value + 'px';
        chrome.storage.local.set({ thumbMinSize: parseInt(e.target.value) });
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
        customTextContainer.style.display = e.target.checked ? 'flex' : 'none';
    });

    toggleTextInternal.addEventListener('change', (e) => {
        chrome.storage.local.set({ showTextInternal: e.target.checked });
    });

    customTextInput.addEventListener('input', (e) => {
        chrome.storage.local.set({ scrollbarText: e.target.value });
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

    function activateTheme(themeName, applyVariables = true) {
        activeThemeName = themeName;
        if (activeThemeDisplay) activeThemeDisplay.textContent = themeName;

        // Update active class on grid items
        document.querySelectorAll('.gradient-item').forEach(el => {
            if (el.title.toLowerCase() === themeName.toLowerCase()) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Find color values
        const grad = gradientsData.find(g => g.name.toLowerCase() === themeName.toLowerCase());
        if (grad && grad.colors && grad.colors.length > 0) {
            const c1 = grad.colors[0];
            const c2 = grad.colors[grad.colors.length - 1];
            if (applyVariables) {
                root.style.setProperty('--accent-1', c1);
                root.style.setProperty('--accent-2', c2);
            }
        }
    }

    function updateSyncUI(isSync, browserThemeColors) {
        const gridContainer = document.getElementById('gradient-grid');
        const searchInput = document.getElementById('gradient-search');
        const headerRow = document.querySelector('.gradient-header-row');
        
        if (isSync) {
            if (gridContainer) {
                gridContainer.style.opacity = '0.4';
                gridContainer.style.pointerEvents = 'none';
            }
            if (headerRow) {
                headerRow.style.opacity = '0.4';
                headerRow.style.pointerEvents = 'none';
            }
            if (browserThemeColors && browserThemeColors.c1 && browserThemeColors.c2) {
                root.style.setProperty('--accent-1', browserThemeColors.c1);
                root.style.setProperty('--accent-2', browserThemeColors.c2);
            }
        } else {
            if (gridContainer) {
                gridContainer.style.opacity = '1';
                gridContainer.style.pointerEvents = 'auto';
            }
            if (headerRow) {
                headerRow.style.opacity = '1';
                headerRow.style.pointerEvents = 'auto';
            }
            // Restore active theme colors
            const grad = gradientsData.find(g => g.name.toLowerCase() === activeThemeName.toLowerCase());
            if (grad && grad.colors && grad.colors.length > 0) {
                root.style.setProperty('--accent-1', grad.colors[0]);
                root.style.setProperty('--accent-2', grad.colors[grad.colors.length - 1]);
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

    // Lightbox Modal para la imagen del tutorial
    const openLightbox = document.getElementById('open-lightbox');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxClose = document.querySelector('.lightbox-close');

    if (openLightbox && lightboxModal) {
        openLightbox.addEventListener('click', () => {
            lightboxModal.classList.add('active');
        });

        // Cerrar al hacer clic en la X
        if (lightboxClose) {
            lightboxClose.addEventListener('click', () => {
                lightboxModal.classList.remove('active');
            });
        }

        // Cerrar al hacer clic fuera de la imagen
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.classList.remove('active');
            }
        });
    }
});
