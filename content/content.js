// ============================================================
// Scrollbar Premium - DOM Custom Scrollbar Engine v2
// Supports: vertical (Y) + horizontal (X) axes, text, gradients
// ============================================================

const TRACK_CLASS  = 'sp-track';
const THUMB_CLASS  = 'sp-thumb';
const LABEL_CLASS  = 'sp-label';
const PROCESSED_ATTR = 'data-sp-done';
const STYLE_ID     = 'sp-global-style';

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
let mainScrollbar   = null;
// Map: element -> [CustomScrollbar, ...]  (could be 1 for Y, 1 for X, or both)
const internalScrollbars = new Map();

// ── Compute style values from settings ──────────────────────
function getStyleValues(settings, isMain) {
    let thumbGrad, trackBg;

    if (settings.advancedColorsEnabled) {
        const c1 = settings.thumbColor1 || '#a855f7';
        const c2 = settings.thumbColor2 || '#3b82f6';
        thumbGrad = settings.advancedThumbGradientString
            ? `linear-gradient(180deg, ${settings.advancedThumbGradientString})`
            : `linear-gradient(180deg, ${c1}, ${c2})`;
        trackBg = settings.advancedTrackGradientString
            ? `linear-gradient(180deg, ${settings.advancedTrackGradientString})`
            : (settings.trackColor || '#141418');
    } else if (settings.syncBrowserTheme && settings.browserThemeColors) {
        const { c1, c2 } = settings.browserThemeColors;
        thumbGrad = `linear-gradient(180deg, ${c1}, ${c2})`;
        trackBg   = 'rgba(128,128,128,0.1)';
    } else {
        const t = themes[settings.theme] || themes.purple;
        thumbGrad = t.gradient
            ? `linear-gradient(180deg, ${t.gradient})`
            : `linear-gradient(180deg, ${t.c1}, ${t.c2})`;
        trackBg = 'rgba(128,128,128,0.08)';
    }

    const width = isMain
        ? (settings.scrollbarSize || 14)
        : (settings.separateInternalSize ? settings.internalScrollbarSize : settings.scrollbarSize) || 14;

    const radius = settings.scrollbarRadius || 10;

    // Determine if text should show: main uses showText, internals use showTextInternal
    const showText = isMain
        ? settings.showText !== false
        : settings.showTextInternal !== false && settings.showText !== false;
    const text = showText ? (settings.scrollbarText || '').toUpperCase() : '';

    return { thumbGrad, trackBg, width, radius, text };
}

// ── CustomScrollbar class ────────────────────────────────────
class CustomScrollbar {
    /**
     * @param {Element|Window} target
     * @param {Object} settings
     * @param {boolean} isMain - true = viewport scrollbar
     * @param {'x'|'y'} axis
     */
    constructor(target, settings, isMain, axis = 'y') {
        this.target  = target;
        this.isMain  = isMain;
        this.axis    = axis;
        this.settings = settings;
        this.dragging = false;
        this.dragStart = 0;
        this.dragStartScroll = 0;

        this._createDOM();
        this._bindEvents();
        this.refresh(settings);
    }

    // ── DOM ──
    _createDOM() {
        this.track = document.createElement('div');
        this.track.className = TRACK_CLASS;

        this.thumb = document.createElement('div');
        this.thumb.className = THUMB_CLASS;

        this.label = document.createElement('span');
        this.label.className = LABEL_CLASS;

        this.thumb.appendChild(this.label);
        this.track.appendChild(this.thumb);

        if (this.isMain) {
            const css = this.axis === 'y'
                ? 'position:fixed!important;right:0!important;top:0!important;z-index:2147483647!important;'
                : 'position:fixed!important;bottom:0!important;left:0!important;z-index:2147483647!important;';
            this.track.style.cssText = css;
            document.documentElement.appendChild(this.track);
        } else {
            const css = this.axis === 'y'
                ? 'position:absolute!important;right:0!important;top:0!important;z-index:2147483646!important;'
                : 'position:absolute!important;bottom:0!important;left:0!important;z-index:2147483646!important;';
            this.track.style.cssText = css;
            if (getComputedStyle(this.target).position === 'static') {
                this.target.style.position = 'relative';
            }
            this.target.appendChild(this.track);
        }
    }

    // ── Styles ──
    _applyStyles() {
        const { thumbGrad, trackBg, width, radius, text } = getStyleValues(this.settings, this.isMain);

        if (this.axis === 'y') {
            Object.assign(this.track.style, {
                width: `${width}px`, background: trackBg,
                borderRadius: `${radius}px`, overflow: 'hidden', cursor: 'pointer'
            });
            Object.assign(this.thumb.style, {
                background: thumbGrad, borderRadius: `${radius}px`,
                width: '100%', position: 'absolute', left: '0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'grab', userSelect: 'none', transition: 'filter 0.2s',
                overflow: 'hidden'
            });
            Object.assign(this.label.style, {
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                userSelect: 'none',
                pointerEvents: 'none',
                letterSpacing: '2px',
                overflow: 'hidden',
                maxHeight: '90%',
                flexShrink: '0',
                display: text ? 'block' : 'none'
            });
        } else {
            // Horizontal
            Object.assign(this.track.style, {
                height: `${width}px`, background: trackBg,
                borderRadius: `${radius}px`, overflow: 'hidden', cursor: 'pointer'
            });
            Object.assign(this.thumb.style, {
                background: thumbGrad, borderRadius: `${radius}px`,
                height: '100%', position: 'absolute', top: '0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'grab', userSelect: 'none', transition: 'filter 0.2s', overflow: 'hidden'
            });
            Object.assign(this.label.style, {
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
                letterSpacing: '2px',
                display: text ? 'block' : 'none'
            });
        }
        this.label.textContent = text;
    }

    // ── Scroll info ──
    _info() {
        if (this.axis === 'y') {
            return this.isMain
                ? { 
                    pos: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0, 
                    total: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), 
                    client: window.innerHeight 
                  }
                : { pos: this.target.scrollTop, total: this.target.scrollHeight, client: this.target.clientHeight };
        } else {
            return this.isMain
                ? { 
                    pos: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0, 
                    total: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), 
                    client: window.innerWidth 
                  }
                : { pos: this.target.scrollLeft, total: this.target.scrollWidth, client: this.target.clientWidth };
        }
    }

    _trackSize() {
        if (this.axis === 'y') return this.isMain ? window.innerHeight : this.target.getBoundingClientRect().height;
        return this.isMain ? window.innerWidth : this.target.getBoundingClientRect().width;
    }

    // ── Update position ──
    _update() {
        const { pos, total, client } = this._info();
        const trackSize = this._trackSize();

        if (total <= client) { this.track.style.display = 'none'; return; }
        this.track.style.display = 'block';

        const minThumb = this.settings.thumbMinSize || 40;
        const thumbSize = Math.max(minThumb, (client / total) * trackSize);
        const maxOffset = trackSize - thumbSize;
        const offset    = (pos / (total - client)) * maxOffset;

        if (this.axis === 'y') {
            this.track.style.height = `${trackSize}px`;
            this.thumb.style.height = `${thumbSize}px`;
            this.thumb.style.top    = `${offset}px`;

            // Adjust font size based on thumb height so text always fits
            const text = this.label.textContent;
            if (text && this.label.style.display !== 'none') {
                // Each char in vertical writing-mode takes ~fontSize * 1.2px in height
                const maxFontSize = 12;
                const minFontSize = 5;
                const fittingSize = thumbSize / (text.length * 1.25);
                const fontSize = Math.min(maxFontSize, Math.max(minFontSize, fittingSize));
                this.label.style.fontSize = `${fontSize.toFixed(1)}px`;
                this.label.style.visibility = (fittingSize < minFontSize) ? 'hidden' : 'visible';
            }
        } else {
            this.track.style.width = `${trackSize}px`;
            this.thumb.style.width = `${thumbSize}px`;
            this.thumb.style.left  = `${offset}px`;

            // Scale text to fit inside the thumb width
            const text = this.label.textContent;
            if (text && this.label.style.display !== 'none') {
                const minFontSize = 6;
                const maxFontSize = 11;
                const fittingFontSize = thumbSize / (text.length * 0.65);
                const fontSize = Math.min(maxFontSize, Math.max(minFontSize, fittingFontSize));
                this.label.style.fontSize = `${fontSize.toFixed(1)}px`;
                this.label.style.visibility = fittingFontSize < minFontSize ? 'hidden' : 'visible';
            }
        }
    }

    // ── Events ──
    _bindEvents() {
        this._onScroll = () => this._update();
        this._onResize = () => this._update();

        if (this.isMain) {
            window.addEventListener('scroll', this._onScroll, { passive: true });
            document.addEventListener('scroll', this._onScroll, { passive: true });
            window.addEventListener('resize', this._onResize, { passive: true });
        } else {
            this.target.addEventListener('scroll', this._onScroll, { passive: true });
        }

        // Drag
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dragging = true;
            this.dragStart = this.axis === 'y' ? e.clientY : e.clientX;
            this.dragStartScroll = this._info().pos;
            this.thumb.style.cursor = 'grabbing';
            this.thumb.style.filter = 'brightness(0.85)';
        });

        this._onMove = (e) => {
            if (!this.dragging) return;
            const { total, client } = this._info();
            const trackSize = this._trackSize();
            const thumbSize = Math.max(32, (client / total) * trackSize);
            const delta = (this.axis === 'y' ? e.clientY : e.clientX) - this.dragStart;
            const newPos = this.dragStartScroll + (delta / (trackSize - thumbSize)) * (total - client);
            if (this.isMain) {
                this.axis === 'y' ? window.scrollTo(0, newPos) : window.scrollTo(newPos, 0);
            } else {
                this.axis === 'y' ? (this.target.scrollTop = newPos) : (this.target.scrollLeft = newPos);
            }
        };

        this._onUp = () => {
            if (this.dragging) {
                this.dragging = false;
                this.thumb.style.cursor = 'grab';
                this.thumb.style.filter = '';
            }
        };

        document.addEventListener('mousemove', this._onMove);
        document.addEventListener('mouseup',   this._onUp);

        // Click track
        this.track.addEventListener('click', (e) => {
            if (this.thumb.contains(e.target)) return;
            const rect = this.track.getBoundingClientRect();
            const { total, client } = this._info();
            const trackSize = this._trackSize();
            const ratio = this.axis === 'y'
                ? (e.clientY - rect.top) / trackSize
                : (e.clientX - rect.left) / trackSize;
            const newPos = ratio * (total - client);
            if (this.isMain) {
                this.axis === 'y'
                    ? window.scrollTo({ top: newPos, behavior: 'smooth' })
                    : window.scrollTo({ left: newPos, behavior: 'smooth' });
            } else {
                this.axis === 'y'
                    ? this.target.scrollTo({ top: newPos, behavior: 'smooth' })
                    : this.target.scrollTo({ left: newPos, behavior: 'smooth' });
            }
        });

        // Hover
        this.thumb.addEventListener('mouseenter', () => {
            if (!this.dragging) this.thumb.style.filter = 'brightness(1.2)';
        });
        this.thumb.addEventListener('mouseleave', () => {
            if (!this.dragging) this.thumb.style.filter = '';
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
            document.removeEventListener('scroll', this._onScroll);
            window.removeEventListener('resize', this._onResize);
        } else {
            this.target && this.target.removeEventListener('scroll', this._onScroll);
        }
        document.removeEventListener('mousemove', this._onMove);
        document.removeEventListener('mouseup',   this._onUp);
    }
}

// ── Inject / remove global CSS ───────────────────────────────
function injectGlobalStyle() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = `
        html, body { scrollbar-width: none !important; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display:none!important; width:0!important; height:0!important; }
        .sp-hide-scroll { scrollbar-width: none !important; }
        .sp-hide-scroll::-webkit-scrollbar { display:none!important; width:0!important; height:0!important; }
        body { overflow-x: hidden; }
    `;
}

function removeGlobalStyle() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
}

// ── Detect scrollable axes for an element ────────────────────
function getScrollAxes(el) {
    if (el === document.documentElement || el === document.body) return null;
    if (el.classList && el.classList.contains(TRACK_CLASS)) return null;
    if (el.classList && el.classList.contains(THUMB_CLASS)) return null;

    const s = getComputedStyle(el);
    const types = ['auto', 'scroll', 'overlay'];
    const hasY = types.includes(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
    const hasX = types.includes(s.overflowX) && el.scrollWidth  > el.clientWidth  + 2;
    return (hasY || hasX) ? { y: hasY, x: hasX } : null;
}

// ── Attach custom scrollbar(s) to an internal element ────────
function attachInternal(el, settings) {
    if (internalScrollbars.has(el)) return;
    const axes = getScrollAxes(el);
    if (!axes) return;

    el.setAttribute(PROCESSED_ATTR, '1');
    el.classList.add('sp-hide-scroll');

    const instances = [];
    if (axes.y) instances.push(new CustomScrollbar(el, settings, false, 'y'));
    if (axes.x) instances.push(new CustomScrollbar(el, settings, false, 'x'));

    internalScrollbars.set(el, instances);
}

function scanInternals(settings) {
    const selector = 'div, section, article, aside, main, ul, ol, pre, textarea, form, blockquote';
    document.querySelectorAll(selector).forEach(el => {
        if (!internalScrollbars.has(el) && getScrollAxes(el)) {
            attachInternal(el, settings);
        }
    });
}

// ── Enable / Disable ─────────────────────────────────────────
function enable(settings) {
    injectGlobalStyle();

    if (!mainScrollbar) {
        mainScrollbar = new CustomScrollbar(window, settings, true, 'y');
    } else {
        mainScrollbar.refresh(settings);
    }

    if (settings.enableInternalScrollbars) {
        // Refresh existing internals first
        for (const [, instances] of internalScrollbars) {
            for (const sb of instances) sb.refresh(settings);
        }

        // Then scan for new ones
        scanInternals(settings);
    } else {
        // Destroy all existing internal scrollbars if disabled
        for (const [el, instances] of internalScrollbars) {
            for (const sb of instances) sb.destroy();
            el.classList.remove('sp-hide-scroll');
            el.removeAttribute(PROCESSED_ATTR);
        }
        internalScrollbars.clear();
    }
}

function disable() {
    removeGlobalStyle();

    if (mainScrollbar) { mainScrollbar.destroy(); mainScrollbar = null; }

    for (const [el, instances] of internalScrollbars) {
        for (const sb of instances) sb.destroy();
        el.classList.remove('sp-hide-scroll');
        el.removeAttribute(PROCESSED_ATTR);
    }
    internalScrollbars.clear();
}

// ── MutationObserver ─────────────────────────────────────────
let scanTimeout = null;
function debouncedScanInternals(settings) {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        scanInternals(settings);
    }, 200);
}

// ── MutationObserver ─────────────────────────────────────────
const observer = new MutationObserver(() => {
    if (currentSettings && currentSettings.extensionEnabled && currentSettings.enableInternalScrollbars) {
        debouncedScanInternals(currentSettings);
    }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// ── Apply settings ───────────────────────────────────────────
function applySettings(settings) {
    currentSettings = settings;
    settings.extensionEnabled ? enable(settings) : disable();
}

// ── Build settings object ────────────────────────────────────
function buildSettings(result) {
    return {
        extensionEnabled:            result.extensionEnabled !== false,
        showText:                    result.showText !== false,
        showTextInternal:            result.showTextInternal !== false,
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
        internalScrollbarSize:       result.internalScrollbarSize || 8,
        thumbMinSize:                result.thumbMinSize || 40,
        enableInternalScrollbars:    result.enableInternalScrollbars === true
    };
}

const STORAGE_KEYS = [
    'extensionEnabled','showText','showTextInternal','scrollbarText','theme','syncBrowserTheme',
    'browserThemeColors','advancedColorsEnabled','trackColor','trackColor2',
    'thumbColor1','thumbColor2','advancedThumbGradientString','advancedTrackGradientString',
    'scrollbarSize','scrollbarRadius','separateInternalSize','internalScrollbarSize','thumbMinSize',
    'showTextInternal','enableInternalScrollbars'
];

// ── Init ─────────────────────────────────────────────────────
chrome.storage.local.get(STORAGE_KEYS, (result) => {
    applySettings(buildSettings(result));
});

// ── Live update ──────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, ns) => {
    if (ns === 'local') {
        chrome.storage.local.get(STORAGE_KEYS, (result) => {
            applySettings(buildSettings(result));
        });
    }
});
