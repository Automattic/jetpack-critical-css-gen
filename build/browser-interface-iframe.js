import { BrowserInterface } from './browser-interface.js';
import { CrossDomainError, HttpError, LoadTimeoutError, RedirectError, UrlVerifyError, UnknownError, XFrameDenyError, InvalidURLError, } from './errors.js';
const defaultLoadTimeout = 60 * 1000;
const defaultCheckTimeout = 30 * 1000;
export class BrowserInterfaceIframe extends BrowserInterface {
    constructor({ requestGetParameters, loadTimeout, checkTimeout, verifyPage, allowScripts, signal, }) {
        super();
        this.requestGetParameters = requestGetParameters || {};
        this.loadTimeout = loadTimeout || defaultLoadTimeout;
        this.checkTimeout = checkTimeout || defaultCheckTimeout;
        this.verifyPage = verifyPage;
        this.signal = signal;
        // Default 'allowScripts' to true if not specified.
        allowScripts = allowScripts !== false;
        this.currentUrl = null;
        this.currentSize = { width: null, height: null };
        // Create a wrapper div to keep the iframe invisible.
        this.wrapperDiv = document.createElement('div');
        this.wrapperDiv.setAttribute('style', 'position:fixed; z-index: -1000; opacity: 0; top: 50px;');
        document.body.append(this.wrapperDiv);
        // Create iframe itself.
        this.iframe = document.createElement('iframe');
        this.iframe.setAttribute('style', 'max-width: none; max-height: none; border: 0;');
        this.iframe.setAttribute('aria-hidden', 'true');
        this.iframe.setAttribute('sandbox', 'allow-same-origin ' + (allowScripts ? 'allow-scripts' : ''));
        this.wrapperDiv.append(this.iframe);
    }
    async cleanup() {
        this.iframe.remove();
        this.wrapperDiv.remove();
    }
    async fetch(url, options, _role) {
        return window.fetch(url, options);
    }
    async runInPage(pageUrl, viewport, method, ...args) {
        await this.loadPage(pageUrl);
        if (viewport) {
            await this.resize(viewport);
        }
        // The inner window in the iframe is separate from the main window object.
        // Pass the iframe window object to the evaluating method.
        return method({ innerWindow: this.iframe.contentWindow, args });
    }
    addGetParameters(url) {
        for (const key of Object.keys(this.requestGetParameters)) {
            url.searchParams.append(key, this.requestGetParameters[key]);
        }
        return url.toString();
    }
    async diagnoseUrlError(url, signal) {
        try {
            const response = await this.fetch(url, { redirect: 'manual', signal }, 'html');
            const headers = response.headers;
            if (headers.get('x-frame-options') === 'DENY') {
                return new XFrameDenyError({ url });
            }
            if (response.type === 'opaqueredirect') {
                return new RedirectError({
                    url,
                    redirectUrl: response.url,
                });
            }
            if (response.status === 200) {
                return null;
            }
            return new HttpError({ url, code: response.status });
        }
        catch (err) {
            return new UnknownError({ url, message: err.message });
        }
    }
    async is404Page(url, signal) {
        const response = await this.fetch(url, { redirect: 'manual', signal }, 'html');
        return response.status === 404;
    }
    sameOrigin(url) {
        return new URL(url).origin === window.location.origin;
    }
    async loadPage(rawUrl) {
        var _a;
        // A cancelled run must not reuse the page it loaded before the cancel.
        if ((_a = this.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
            this.currentUrl = null;
            const cancelled = new UnknownError({ url: rawUrl, message: 'Generation was cancelled' });
            this.trackUrlError(rawUrl, cancelled);
            throw cancelled;
        }
        if (rawUrl === this.currentUrl) {
            return;
        }
        // Make sure URL is valid.
        let url;
        try {
            url = new URL(rawUrl);
        }
        catch (err) {
            this.trackUrlError(rawUrl, err);
            throw new InvalidURLError({ url: rawUrl });
        }
        const fullUrl = this.addGetParameters(url);
        return new Promise((resolve, rawReject) => {
            var _a, _b;
            // Track all URL errors.
            const reject = err => {
                this.trackUrlError(rawUrl, err);
                rawReject(err);
            };
            // Catch cross-domain errors before they occur.
            if (!this.sameOrigin(fullUrl)) {
                reject(new CrossDomainError({ url: fullUrl }));
                return;
            }
            // The load has its own limit, and the checks that follow it have theirs, so a check that
            // never answers cannot stall the run.
            const checks = new AbortController();
            let settled = false;
            let timeoutId;
            const finish = (settle) => {
                var _a;
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeoutId);
                this.iframe.onload = null;
                (_a = this.signal) === null || _a === void 0 ? void 0 : _a.removeEventListener('abort', onAbort);
                settle();
            };
            const onAbort = () => {
                checks.abort();
                this.iframe.src = 'about:blank';
                this.currentUrl = null;
                finish(() => reject(new UnknownError({ url: fullUrl, message: 'Generation was cancelled' })));
            };
            const timeOut = () => {
                checks.abort();
                finish(() => reject(new LoadTimeoutError({ url: fullUrl })));
            };
            timeoutId = setTimeout(timeOut, this.loadTimeout);
            if ((_a = this.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
                onAbort();
                return;
            }
            (_b = this.signal) === null || _b === void 0 ? void 0 : _b.addEventListener('abort', onAbort, { once: true });
            // Catch load event.
            this.iframe.onload = async () => {
                this.iframe.onload = null;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(timeOut, this.checkTimeout);
                try {
                    // Check HTTP status code first.
                    const is404 = await this.is404Page(fullUrl, checks.signal);
                    if (is404) {
                        throw new HttpError({ url: fullUrl, code: 404 });
                    }
                    // Verify the inner document is readable.
                    if (!this.iframe.contentDocument || !this.iframe.contentWindow) {
                        throw ((await this.diagnoseUrlError(fullUrl, checks.signal)) ||
                            new CrossDomainError({ url: fullUrl }));
                    }
                    if (!this.verifyPage(rawUrl, this.iframe.contentWindow, this.iframe.contentDocument)) {
                        // Diagnose and throw an appropriate error.
                        throw ((await this.diagnoseUrlError(fullUrl, checks.signal)) ||
                            new UrlVerifyError({ url: fullUrl }));
                    }
                    this.currentUrl = rawUrl;
                    finish(resolve);
                }
                catch (err) {
                    finish(() => reject(err));
                }
            };
            this.iframe.src = fullUrl;
        });
    }
    async resize({ width, height }) {
        if (this.currentSize.width === width && this.currentSize.height === height) {
            return;
        }
        return new Promise(resolve => {
            // Set iframe size.
            this.iframe.width = width.toString();
            this.iframe.height = height.toString();
            // Bounce to browser main loop to allow resize to complete.
            setTimeout(resolve, 1);
        });
    }
}
//# sourceMappingURL=browser-interface-iframe.js.map