// ============================================
// Lumos Connect - Accessibility System
// Applies saved settings on every page load
// ============================================

(function () {
    const SETTINGS_KEY = "lumos_accessibility";

    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch {
            return {};
        }
    }

    function applyAll() {
        const s = getSettings();
        applyFontSize(s.fontSize || "normal");
        applyContrast(s.contrast || false);
        applyReducedMotion(s.reducedMotion || false);
        applyFocusVisible(s.focusVisible || false);
        applyTextSpacing(s.textSpacing || false);
        applyDyslexicFont(s.dyslexicFont || false);
    }

    function applyFontSize(size) {
        document.body.classList.remove(
            "accessibility-large-text",
            "accessibility-extra-large-text"
        );
        if (size === "large") {
            document.body.classList.add("accessibility-large-text");
        } else if (size === "extra-large") {
            document.body.classList.add("accessibility-extra-large-text");
        }
    }

    function applyContrast(enabled) {
        document.body.classList.toggle("accessibility-high-contrast", !!enabled);
    }

    function applyReducedMotion(enabled) {
        document.body.classList.toggle("accessibility-reduced-motion", !!enabled);
    }

    function applyFocusVisible(enabled) {
        document.body.classList.toggle("accessibility-focus-visible", !!enabled);
    }

    function applyTextSpacing(enabled) {
        document.body.classList.toggle("accessibility-text-spacing", !!enabled);
    }

    function applyDyslexicFont(enabled) {
        document.body.classList.toggle("accessibility-dyslexic-font", !!enabled);
    }

    // Apply on load
    applyAll();

    // Expose for settings page
    window.lumosAccessibility = {
        getSettings,
        applyAll,
        applyFontSize,
        applyContrast,
        applyReducedMotion,
        applyFocusVisible,
        applyTextSpacing,
        applyDyslexicFont,
        save(settings) {
            const current = getSettings();
            const merged = { ...current, ...settings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            applyAll();
        }
    };
})();
