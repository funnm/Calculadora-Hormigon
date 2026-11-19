/* ==========================================================================
   Calculadora de Hormigón — Android Runtime Bridge & Legacy WebView Polyfills
   Chromium 70+ / Android API 24+ (Engineering Suite Pro)
   ========================================================================== */
(function () {
    'use strict';

    // 1. ES2019-ES2023 & Canvas2D Polyfills for older Android WebViews
    if (typeof globalThis === 'undefined') {
        try {
            Object.defineProperty(Object.prototype, '__cg_global__', {
                get: function () { return this; },
                configurable: true
            });
            __cg_global__.globalThis = __cg_global__;
            delete Object.prototype.__cg_global__;
        } catch (e) {
            window.globalThis = window;
        }
    }

    if (typeof window.queueMicrotask !== 'function') {
        window.queueMicrotask = function (cb) {
            Promise.resolve().then(cb).catch(function (err) {
                setTimeout(function () { throw err; }, 0);
            });
        };
    }

    if (typeof Object.hasOwn !== 'function') {
        Object.hasOwn = function (obj, prop) {
            if (obj === null || obj === undefined) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            return Object.prototype.hasOwnProperty.call(Object(obj), prop);
        };
    }

    if (typeof Object.fromEntries !== 'function') {
        Object.fromEntries = function (entries) {
            var out = {};
            if (!entries) return out;
            var arr = Array.from(entries);
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].length >= 2) {
                    out[arr[i][0]] = arr[i][1];
                }
            }
            return out;
        };
    }

    function polyfillAt(proto) {
        if (proto && typeof proto.at !== 'function') {
            Object.defineProperty(proto, 'at', {
                value: function (n) {
                    var len = this.length >>> 0;
                    var idx = Math.trunc(n) || 0;
                    if (idx < 0) idx += len;
                    if (idx < 0 || idx >= len) return undefined;
                    return this[idx];
                },
                writable: true,
                enumerable: false,
                configurable: true
            });
        }
    }
    polyfillAt(Array.prototype);
    polyfillAt(String.prototype);
    if (typeof Int8Array !== 'undefined') {
        polyfillAt(Object.getPrototypeOf(Int8Array.prototype));
    }

    if (typeof Array.prototype.flat !== 'function') {
        Array.prototype.flat = function (depth) {
            var d = depth === undefined ? 1 : Number(depth);
            var flatten = function (arr, level) {
                var result = [];
                for (var i = 0; i < arr.length; i++) {
                    if (!(i in arr)) continue;
                    var item = arr[i];
                    if (Array.isArray(item) && level > 0) {
                        result = result.concat(flatten(item, level - 1));
                    } else {
                        result.push(item);
                    }
                }
                return result;
            };
            return flatten(this, isNaN(d) ? 0 : d);
        };
    }

    if (typeof Array.prototype.flatMap !== 'function') {
        Array.prototype.flatMap = function (callback, thisArg) {
            return this.map(callback, thisArg).flat(1);
        };
    }

    if (typeof String.prototype.replaceAll !== 'function') {
        String.prototype.replaceAll = function (search, replacement) {
            if (search instanceof RegExp) {
                if (!search.global) {
                    throw new TypeError('String.prototype.replaceAll called with a non-global RegExp');
                }
                return this.replace(search, replacement);
            }
            var str = String(this);
            var needle = String(search);
            if (needle === '') {
                return typeof replacement === 'function'
                    ? str.split('').map(function (c, i) { return replacement('', i, str) + c; }).join('') + replacement('', str.length, str)
                    : String(replacement) + str.split('').join(String(replacement)) + String(replacement);
            }
            return str.split(needle).join(String(replacement));
        };
    }

    if (typeof Promise.allSettled !== 'function') {
        Promise.allSettled = function (promises) {
            return Promise.all(Array.from(promises).map(function (p) {
                return Promise.resolve(p).then(
                    function (value) { return { status: 'fulfilled', value: value }; },
                    function (reason) { return { status: 'rejected', reason: reason }; }
                );
            }));
        };
    }

    if (typeof window.structuredClone !== 'function') {
        window.structuredClone = function (value) {
            if (value === undefined || value === null) return value;
            return JSON.parse(JSON.stringify(value));
        };
    }

    if (typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
            var r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? Number(radii[0]) || 0 : 0);
            r = Math.max(0, Math.min(r, Math.min(Math.abs(w), Math.abs(h)) / 2));
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            this.closePath();
            return this;
        };
    }

    // 2. Mark Android environment & disable web SW / cookie banner
    window.__calculadoraAndroid = true;
    var docEl = document.documentElement;
    if (docEl) {
        docEl.classList.add('android-app');
        var supportsModernCss = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
            && CSS.supports('inset', '0')
            && CSS.supports('background', 'color-mix(in srgb, white 50%, black)');
        if (!supportsModernCss) {
            docEl.classList.add('android-legacy-webview');
        }
    }

    try {
        if (!localStorage.getItem('calc_cookie_consent')) {
            localStorage.setItem('calc_cookie_consent', JSON.stringify({
                mode: 'all',
                timestamp: Date.now(),
                version: 'android'
            }));
        }
    } catch (e) {}

    // 3. Forward diagnostics to Android logcat
    window.addEventListener('error', function (evt) {
        console.error('[AndroidRuntimeError]', evt.message, evt.filename + ':' + evt.lineno);
    });
    window.addEventListener('unhandledrejection', function (evt) {
        var reason = evt && evt.reason ? (evt.reason.stack || evt.reason.message || String(evt.reason)) : 'unknown';
        console.error('[AndroidUnhandledRejection]', reason);
    });

    // 4. Native Android File Export, Print & Clipboard Bridges
    var hasBridge = typeof window.AndroidBridge !== 'undefined' && window.AndroidBridge !== null;
    if (hasBridge) {
        var blobMap = new Map();
        var origCreateObjectURL = URL.createObjectURL.bind(URL);
        var origRevokeObjectURL = URL.revokeObjectURL.bind(URL);

        URL.createObjectURL = function (obj) {
            var url = origCreateObjectURL(obj);
            if (obj instanceof Blob) {
                blobMap.set(url, obj);
            }
            return url;
        };

        URL.revokeObjectURL = function (url) {
            setTimeout(function () {
                blobMap.delete(url);
                try { origRevokeObjectURL(url); } catch (e) {}
            }, 8000);
        };

        function sendBlobToAndroid(blob, filename) {
            var reader = new FileReader();
            reader.onloadend = function () {
                var dataUrl = String(reader.result || '');
                var commaIdx = dataUrl.indexOf(',');
                if (commaIdx === -1) return;
                var header = dataUrl.slice(5, commaIdx);
                var mime = header.split(';')[0] || blob.type || 'application/octet-stream';
                var base64 = dataUrl.slice(commaIdx + 1);
                window.AndroidBridge.saveFileBase64(filename || 'calculadora_grafica', mime, base64, true);
            };
            reader.readAsDataURL(blob);
        }

        function sendDataUrlToAndroid(dataUrl, filename) {
            var commaIdx = dataUrl.indexOf(',');
            if (commaIdx === -1) return false;
            var header = dataUrl.slice(5, commaIdx);
            var payload = dataUrl.slice(commaIdx + 1);
            var isBase64 = header.indexOf(';base64') !== -1;
            var mime = header.split(';')[0] || 'application/octet-stream';
            var base64;
            if (isBase64) {
                base64 = payload;
            } else {
                var decoded = decodeURIComponent(payload);
                var bytes = unescape(encodeURIComponent(decoded));
                base64 = btoa(bytes);
            }
            window.AndroidBridge.saveFileBase64(filename || 'calculadora_grafica', mime, base64, true);
            return true;
        }

        function interceptAnchorDownload(anchor) {
            if (!anchor || anchor.tagName !== 'A') return false;
            var href = anchor.getAttribute('href') || anchor.href || '';
            var isDownload = anchor.hasAttribute('download');
            if (!isDownload && !/^blob:|^data:/i.test(href)) return false;

            var filename = anchor.getAttribute('download') || 'calculadora_grafica_export';
            if (href.indexOf('blob:') === 0) {
                var tracked = blobMap.get(href);
                if (tracked) {
                    sendBlobToAndroid(tracked, filename);
                    return true;
                }
                if (typeof fetch === 'function') {
                    fetch(href).then(function (r) { return r.blob(); }).then(function (b) {
                        sendBlobToAndroid(b, filename);
                    }).catch(function (err) {
                        console.error('[AndroidExport] Blob fetch error:', err);
                    });
                    return true;
                }
            } else if (href.indexOf('data:') === 0) {
                return sendDataUrlToAndroid(href, filename);
            }
            return false;
        }

        var origAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            if (interceptAnchorDownload(this)) return;
            return origAnchorClick.apply(this, arguments);
        };

        var origDispatchEvent = EventTarget.prototype.dispatchEvent;
        EventTarget.prototype.dispatchEvent = function (event) {
            if (this instanceof HTMLAnchorElement && event && event.type === 'click') {
                if (interceptAnchorDownload(this)) return true;
            }
            return origDispatchEvent.apply(this, arguments);
        };

        // Native Print / PDF support
        if (typeof window.AndroidBridge.printDocument === 'function') {
            window.print = function () {
                window.AndroidBridge.printDocument(document.title || 'Calculadora de Hormigón');
            };
        }

        // Native Clipboard Bridge
        if (typeof window.AndroidBridge.copyToClipboard === 'function') {
            var nativeClipboard = {
                writeText: function (text) {
                    try {
                        window.AndroidBridge.copyToClipboard(String(text || ''));
                        return Promise.resolve();
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }
            };
            try {
                Object.defineProperty(navigator, 'clipboard', {
                    value: nativeClipboard,
                    configurable: true
                });
            } catch (e) {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText = nativeClipboard.writeText;
                }
            }
        }

        // Sync Dark/Light Theme with Android Status & Navigation Bars
        var lastSyncedDark = null;
        function syncNativeTheme() {
            try {
                var isDark = document.documentElement.classList.contains('dark-mode')
                    || document.documentElement.classList.contains('dark-theme')
                    || (document.body && (document.body.classList.contains('dark-mode') || document.body.classList.contains('dark-theme')));
                window.AndroidBridge.setTheme(isDark ? 'dark' : 'light');

                if (lastSyncedDark !== null && lastSyncedDark !== isDark
                        && document.documentElement.classList.contains('android-legacy-webview')
                        && document.body) {
                    var body = document.body;
                    body.style.display = 'none';
                    void body.offsetHeight;
                    body.style.display = '';
                }
                lastSyncedDark = isDark;
            } catch (e) {}
        }

        var themeObserver = new MutationObserver(syncNativeTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('DOMContentLoaded', function () {
            if (document.body) {
                themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            }
            syncNativeTheme();
        });
        syncNativeTheme();
    }
})();
