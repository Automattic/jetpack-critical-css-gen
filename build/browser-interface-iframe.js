import { BrowserInterface } from './browser-interface.js';
import { CrossDomainError, HttpError, LoadTimeoutError, RedirectError, UrlVerifyError, UnknownError, XFrameDenyError, } from './errors.js';
const defaultLoadTimeout = 60 * 1000;
export class BrowserInterfaceIframe extends BrowserInterface {
    constructor({ requestGetParameters, loadTimeout, verifyPage, allowScripts, }) {
        super();
        this.requestGetParameters = requestGetParameters || {};
        this.loadTimeout = loadTimeout || defaultLoadTimeout;
        this.verifyPage = verifyPage;
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
        this.iframe.setAttribute('style', 'max-width: none; max-height: none; border: 0px;');
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
    addGetParameters(rawUrl) {
        const urlObject = new URL(rawUrl);
        for (const key of Object.keys(this.requestGetParameters)) {
            urlObject.searchParams.append(key, this.requestGetParameters[key]);
        }
        return urlObject.toString();
    }
    async diagnoseUrlError(url) {
        try {
            const response = await this.fetch(url, { redirect: 'manual' }, 'html');
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
    sameOrigin(url) {
        return new URL(url).origin === window.location.origin;
    }
    async loadPage(rawUrl) {
        if (rawUrl === this.currentUrl) {
            return;
        }
        const fullUrl = this.addGetParameters(rawUrl);
        return new Promise((resolve, rawReject) => {
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
            // Set a timeout.
            const timeoutId = setTimeout(() => {
                this.iframe.onload = null;
                reject(new LoadTimeoutError({ url: fullUrl }));
            }, this.loadTimeout);
            // Catch load event.
            this.iframe.onload = async () => {
                try {
                    this.iframe.onload = null;
                    clearTimeout(timeoutId);
                    // Verify the inner document is readable.
                    if (!this.iframe.contentDocument || !this.iframe.contentWindow) {
                        throw ((await this.diagnoseUrlError(fullUrl)) || new CrossDomainError({ url: fullUrl }));
                    }
                    if (!this.verifyPage(rawUrl, this.iframe.contentWindow, this.iframe.contentDocument)) {
                        // Diagnose and throw an appropriate error.
                        throw ((await this.diagnoseUrlError(fullUrl)) || new UrlVerifyError({ url: fullUrl }));
                    }
                    this.currentUrl = rawUrl;
                    resolve();
                }
                catch (err) {
                    reject(err);
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