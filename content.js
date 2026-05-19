// ============================================================
// Scrollbar Premium - DOM Custom Scrollbar Engine
// ============================================================

const TRACK_CLASS = 'sp-track';
const THUMB_CLASS = 'sp-thumb';
const LABEL_CLASS = 'sp-label';
const PROCESSED_ATTR = 'data-sp-done';
const STYLE_ID = 'sp-global-style';

const themes = {
    purple:      { c1: '#a855f7', c2: '#3b82f6' },
    sunset:      { c1: '#f97316', c2: '#eab308' },
    emerald:     { c1: '#10b981', c2: '#06b6d4' },
    ruby:        { c1: '#ef4444', c2: '#ec4899' },
    rainbow:     { c1: '#ff0000', c2: '#8a2be2', gradient: 'red, orange, yellow, green, blue, indigo, violet' },
    ocean:       { c1: '#0ea5e9', c2: '#1e3a8a' },
    forest:      { c1: '#84cc16', c2: '#065f46' },
    aurora:      { c1: '#00ff87', c2: '#60efff' },
    fire:        { c1: '#facc15', c2: '#ef4444' },
    cherry:      { c1: '#fbcfe8', c2: '#d946ef' },
    starry:      { c1: '#94a3b8', c2: '#172554' },
    cyberpunk:   { c1: '#0ff',    c2: '#f0f'    },
    gold:        { c1: '#fbbf24', c2: '#78350f' },
    lavender:    { c1: '#e879f9', c2: '#c084fc' },
    matrix:      { c1: '#22c55e', c2: '#000000' },
    monochrome:  { c1: '#ffffff', c2: '#000000' },
    vampire:     { c1: '#ef4444', c2: '#000000' },
    cottoncandy: { c1: '#67e8f9', c2: '#f9a8d4' },
    volcano:     { c1: '#ea580c', c2: '#000000' },
    ice:         { c1: '#ffffff', c2: '#bae6fd' }
};

let currentSettings = null;
let mainScrollbar = null;
const internalScrollbars = new Map(); // element -> CustomScrollbar

// ── Helper ──────────────────────────────────────────────────
function getStyleValues(settings, isMain) {
    let c1, c2, thumbGrad, trackBg;

    if (settings.advancedColorsEnabled) {
        c1 = settings.thumbColor1 || '#a855f7';
        c2 = settings.thumbColor2 || '#3b82f6';
        thumbGrad = settings.advancedThumbGradientString
            ? `linear-gradient(180deg, ${settings.advancedThumbGradientString})`
            : `linear-gradient(180deg, ${c1}, ${c2})`;
        trackBg = settings.advancedTrackGradientString
            ? `linear-gradient(180deg, ${settings.advancedTrackGradientString})`
            : (settings.trackColor || '#141418');
    } else if (settings.syncBrowserTheme && settings.browserThemeColors) {
        c1 = settings.browserThemeColors.c1;
        c2 = settings.browserThemeColors.c2;
        thumbGrad = `linear-gradient(180deg, ${c1}, ${c2})`;
        trackBg = 'rgba(128,128,128,0.1)';
    } else {
        const t = themes[settings.theme] || themes.purple;
        c1 = t.c1; c2 = t.c2;
        thumbGrad = t.gradient
            ? `linear-gradient(180deg, ${t.gradient})`
            : `linear-gradient(180deg, ${c1}, ${c2})`;
        trackBg = 'rgba(128,128,128,0.08)';
    }

    const width = isMain
        ? (settings.scrollbarSize || 14)
        : (settings.separateInternalSize ? settings.internalScrollbarSize : settings.scrollbarSize) || 14;
    const radius = settings.scrollbarRadius || 10;
    const text = settings.showText !== false ? (settings.scrollbarText || '').toUpperCase() : '';

    return { thumbGrad, trackBg, width, radius, text };
}

// ── Custom Scrollbar Class ───────────────────────────────────
class CustomScrollbar {
    constructor(target, settings, isMain) {
        this.target   = target;
        this.isMain   = isMain;
        this.settings = settings;
        this.dragging = false;
        this.dragStartY = 0;
        this.dragStartScroll = 0;

        this._buildDOM();
        this._bindEvents();
        this.refresh(settings);
    }

    _buildDOM() {
        this.track = document.createElement('div');
        this.track.className = TRACK_CLASS;

        this.thumb = document.createElement('div');
        this.thumb.className = THUMB_CLASS;

        this.label = document.createElement('span');
        this.label.className = LABEL_CLASS;

        this.thumb.appendChild(this.label);
        this.track.appendChild(this.thumb);

        if (this.isMain) {
            this.track.style.cssText = `
                position:fixed !important;
                right:0 !important;
                top:0 !important;
                z-index:2147483647 !important;
                pointer-events:auto !important;
            `;
            document.documentElement.appendChild(this.track);
        } else {
            this.track.style.cssText = `
                position:absolute !important;
                right:0 !important;
                top:0 !important;
                z-index:2147483646 !important;
                pointer-events:auto !important;
            `;
            const pos = getComputedStyle(this.target).position;
            if (pos === 'static') this.target.style.position = 'relative';
            this.target.appendChild(this.track);
        }
    }

    _styleValues() {
        return getStyleValues(this.settings, this.isMain);
    }

    _applyStyles() {
        const { thumbGrad, trackBg, width, radius, text } = this._styleValues();

        Object.assign(this.track.style, {
            width:        `${width}px`,
            background:   trackBg,
            borderRadius: `${radius}px`,
            overflow:     'hidden',
            cursor:       'pointer'
        });

        Object.assign(this.thumb.style, {
            background:   thumbGrad,
            borderRadius: `${radius}px`,
            width:        '100%',
            position:     'absolute',
            left:         '0',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            cursor:       'grab',
            userSelect:   'none',
            transition:   'filter 0.2s',
            overflow:     'hidden'
        });

        Object.assign(this.label.style, {
            color:       'rgba(255,255,255,0.75)',
            fontSize:    '9px',
            fontWeight:  'bold',
            fontFamily:  'sans-serif',
            transform:   'rotate(-90deg)',
            whiteSpace:  'nowrap',
            userSelect:  'none',
            pointerEvents: 'none',
            letterSpacing: '1px',
            display:     text ? 'block' : 'none'
        });
        this.label.textContent = text;
    }

    _scrollInfo() {
        if (this.isMain) {
            return {
                scrollTop:    window.scrollY,
                scrollHeight: document.documentElement.scrollHeight,
                clientHeight: window.innerHeight
            };
        }
        return {
            scrollTop:    this.target.scrollTop,
            scrollHeight: this.target.scrollHeight,
            clientHeight: this.target.clientHeight
        };
    }

    _update() {
        const { scrollTop, scrollHeight, clientHeight } = this._scrollInfo();
        const trackH = this.isMain ? window.innerHeight : this.target.getBoundingClientRect().height;

        if (scrollHeight <= clientHeight) {
            this.track.style.display = 'none';
            return;
        }
        this.track.style.display = 'block';

        const thumbH = Math.max(32, (clientHeight / scrollHeight) * trackH);
        const maxTop = trackH - thumbH;
        const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxTop;

        this.track.style.height = `${trackH}px`;
        this.thumb.style.height = `${thumbH}px`;
        this.thumb.style.top    = `${thumbTop}px`;
    }

    _bindEvents() {
        this._onScroll = () => this._update();
        this._onResize = () => this._update();

        if (this.isMain) {
            window.addEventListener('scroll', this._onScroll, { passive: true });
            window.addEventListener('resize', this._onResize, { passive: true });
        } else {
            this.target.addEventListener('scroll', this._onScroll, { passive: true });
        }

        // ── Drag ────────────────────────
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dragging = true;
            this.dragStartY = e.clientY;
            this.dragStartScroll = this._scrollInfo().scrollTop;
            this.thumb.style.cursor = 'grabbing';
            this.thumb.style.filter = 'brightness(0.85)';
        });

        this._onMouseMove = (e) => {
            if (!this.dragging) return;
            const { scrollHeight, clientHeight } = this._scrollInfo();
            const trackH = this.isMain ? window.innerHeight : this.target.getBoundingClientRect().height;
            const thumbH = Math.max(32, (clientHeight / scrollHeight) * trackH);
            const scrollable = trackH - thumbH;
            const dy = e.clientY - this.dragStartY;
            const ratio = dy / scrollable;
            const newTop = this.dragStartScroll + ratio * (scrollHeight - clientHeight);

            if (this.isMain) window.scrollTo(0, newTop);
            else this.target.scrollTop = newTop;
        };

        this._onMouseUp = () => {
            if (this.dragging) {
                this.dragging = false;
                this.thumb.style.cursor = 'grab';
                this.thumb.style.filter = '';
            }
        };

        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup',   this._onMouseUp);

        // ── Click track ─────────────────
        this.track.addEventListener('click', (e) => {
            if (this.thumb.contains(e.target)) return;
            const rect = this.track.getBoundingClientRect();
            const { scrollHeight, clientHeight } = this._scrollInfo();
            const trackH = this.isMain ? window.innerHeight : this.target.getBoundingClientRect().height;
            const ratio = (e.clientY - rect.top) / trackH;
            const newTop = ratio * (scrollHeight - clientHeight);
            if (this.isMain) window.scrollTo({ top: newTop, behavior: 'smooth' });
            else this.target.scrollTo({ top: newTop, behavior: 'smooth' });
        });

        // ── Hover ───────────────────────
        this.thumb.addEventListener('mouseenter', () => {
            if (!this.dragging) this.thumb.style.filter = 'brightness(1.2)';
            this.label.style.color = 'white';
        });
        this.thumb.addEventListener('mouseleave', () => {
            if (!this.dragging) this.thumb.style.filter = '';
            this.label.style.color = 'rgba(255,255,255,0.75)';
        });
    }

    refresh(settings) {
        this.settings = settings;
        this._applyStyles();
        this._update();
    }

    destroy() {
        if (this.track.parentNode) this.track.parentNode.removeChild(this.track);
        if (this.isMain) {
            window.removeEventListener('scroll', this._onScroll);
            window.removeEventListener('resize', this._onResize);
        } else {
            if (this.target) this.target.removeEventListener('scroll', this._onScroll);
        }
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup',   this._onMouseUp);
    }
}

// ── Hide Native Scrollbars ───────────────────────────────────
function injectGlobalStyle(settings) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
    }

    const mainW = settings.scrollbarSize || 14;
    const intW  = settings.separateInternalSize
        ? settings.internalScrollbarSize
        : mainW;

    el.textContent = `
        /* Hide native - main viewport */
        html { scrollbar-width: none !important; }
        html::-webkit-scrollbar { display: none !important; width: 0 !important; }

        /* Hide native - internal elements */
        .sp-hide-scroll { scrollbar-width: none !important; }
        .sp-hide-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; }

        /* Prevent overflow-x body shift when hiding viewport scrollbar */
        body { overflow-x: hidden; }
    `;
}

function removeGlobalStyle() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
}

// ── Detect scrollable internal elements ─────────────────────
function isScrollable(el) {
    if (el === document.documentElement || el === document.body) return false;
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (!canScroll) return false;
    return el.scrollHeight > el.clientHeight + 2;
}

function attachInternal(el, settings) {
    if (internalScrollbars.has(el)) return;
    el.setAttribute(PROCESSED_ATTR, '1');
    el.classList.add('sp-hide-scroll');
    const sb = new CustomScrollbar(el, settings, false);
    internalScrollbars.set(el, sb);
}

function scanInternals(settings) {
    const all = document.querySelectorAll('*');
    for (const el of all) {
        if (!internalScrollbars.has(el) && isScrollable(el)) {
            attachInternal(el, settings);
        }
    }
}

// ── Main enable/disable ──────────────────────────────────────
function enable(settings) {
    injectGlobalStyle(settings);

    // Main window scrollbar
    if (!mainScrollbar) {
        mainScrollbar = new CustomScrollbar(window, settings, true);
    } else {
        mainScrollbar.refresh(settings);
    }

    scanInternals(settings);
}

function disable() {
    removeGlobalStyle();

    if (mainScrollbar) { mainScrollbar.destroy(); mainScrollbar = null; }

    for (const [el, sb] of internalScrollbars) {
        sb.destroy();
        el.classList.remove('sp-hide-scroll');
        el.removeAttribute(PROCESSED_ATTR);
    }
    internalScrollbars.clear();
}

// ── MutationObserver: watch for new scrollable nodes ─────────
const observer = new MutationObserver(() => {
    if (currentSettings && currentSettings.extensionEnabled) {
        scanInternals(currentSettings);
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// ── Apply settings ───────────────────────────────────────────
function applySettings(settings) {
    currentSettings = settings;
    if (!settings.extensionEnabled) {
        disable();
    } else {
        enable(settings);
        // Refresh all existing internals
        for (const [, sb] of internalScrollbars) sb.refresh(settings);
    }
}

// ── Load from storage ────────────────────────────────────────
function buildSettings(result) {
    return {
        extensionEnabled:            result.extensionEnabled !== false,
        showText:                    result.showText !== false,
        scrollbarText:               result.scrollbarText || '',
        theme:                       result.theme || 'purple',
        syncBrowserTheme:            result.syncBrowserTheme || false,
        browserThemeColors:          result.browserThemeColors || null,
        advancedColorsEnabled:       result.advancedColorsEnabled || false,
        trackColor:                  result.trackColor || '#141418',
        trackColor2:                 result.trackColor2 || '#141418',
        thumbColor1:                 result.thumbColor1 || '#a855f7',
        thumbColor2:                 result.thumbColor2 || '#3b82f6',
        advancedThumbGradientString: result.advancedThumbGradientString || null,
        advancedTrackGradientString: result.advancedTrackGradientString || null,
        scrollbarSize:               result.scrollbarSize || 14,
        scrollbarRadius:             result.scrollbarRadius || 10,
        separateInternalSize:        result.separateInternalSize || false,
        internalScrollbarSize:       result.internalScrollbarSize || 8
    };
}

const STORAGE_KEYS = [
    'extensionEnabled','showText','scrollbarText','theme','syncBrowserTheme',
    'browserThemeColors','advancedColorsEnabled','trackColor','trackColor2',
    'thumbColor1','thumbColor2','advancedThumbGradientString','advancedTrackGradientString',
    'scrollbarSize','scrollbarRadius','separateInternalSize','internalScrollbarSize'
];

// Init
chrome.storage.local.get(STORAGE_KEYS, (result) => {
    applySettings(buildSettings(result));
});

// Live update
chrome.storage.onChanged.addListener((changes, ns) => {
    if (ns === 'local') {
        chrome.storage.local.get(STORAGE_KEYS, (result) => {
            applySettings(buildSettings(result));
        });
    }
});
