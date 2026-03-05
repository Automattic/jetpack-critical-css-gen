import { BrowserInterface } from './browser-interface.js';
import { HttpError, RedirectError } from './errors.js';
import { objectPromiseAll } from './object-promise-all.js';
const PAGE_GOTO_TIMEOUT_MS = 5 * 60 * 1000;
export class BrowserInterfacePlaywright extends BrowserInterface {
    context;
    urls;
    tabs;
    /**
     * Creates a new BrowserInterfacePlaywright instance.
     *
     * @param {BrowserContext} context - The playwright browser context to work with.
     * @param {string[]}       urls    - Array of urls to evaluate. The reason we are taking this as an argument is because we want to load all of them in parallel.
     */
    constructor(context, urls) {
        super();
        this.context = context;
        this.urls = urls;
    }
    async cleanup() {
        if (this.tabs) {
            await Promise.all(Object.values(this.tabs).map(tab => tab.page.close().catch(() => { })));
        }
        this.tabs = undefined;
    }
    async getTabs() {
        if (typeof this.tabs === 'undefined') {
            await this.openUrls(this.context, this.urls);
        }
        return this.tabs;
    }
    /**
     * Open an array of urls in a new browser context.
     *
     * Take a browser instance and an array of urls to open in new tabs.
     *
     * @param {BrowserContext} context - Browser context to use.
     * @param {string[]}       urls    - Array of urls to open.
     * @return {Promise< TabsByUrl >} Promise resolving to the browser context.
     */
    async openUrls(context, urls) {
        this.tabs = await objectPromiseAll(urls.reduce((set, url) => {
            set[url] = this.newTab(context, url);
            return set;
        }, {}));
    }
    /**
     * Open url in a new tab in a given browserContext.
     *
     * @param {BrowserContext} browserContext - Browser context to use.
     * @param {string}         url            - Url to open.
     * @return {Promise<Page>} Promise resolving to the page instance.
     */
    async newTab(browserContext, url) {
        const page = await browserContext.newPage();
        try {
            const tab = {
                page,
                statusCode: null,
            };
            tab.page.on('response', async response => {
                if (response.url() === url) {
                    tab.statusCode = response.status();
                }
            });
            await tab.page.goto(url, { timeout: PAGE_GOTO_TIMEOUT_MS });
            return tab;
        }
        catch (error) {
            await page.close().catch(() => { }); // Cleanup on error
            throw error;
        }
    }
    async runInPage(pageUrl, viewport, method, ...args) {
        const tabs = await this.getTabs();
        const tab = tabs[pageUrl];
        if (!tab || !tab.page) {
            throw new Error(`Playwright interface does not include URL ${pageUrl}`);
        }
        // Bail early if the page returned a non-200 or non-300 status code.
        if (!tab.statusCode || !this.isOkStatus(tab.statusCode)) {
            const error = new HttpError({ url: pageUrl, code: tab.statusCode });
            this.trackUrlError(pageUrl, error);
            throw error;
        }
        if (!this.isSameOrigin(pageUrl, tab.page.url())) {
            // If the origin isn't the same, that means that the page has been redirected.
            const error = new RedirectError({
                url: pageUrl,
                redirectUrl: tab.page.url(),
            });
            this.trackUrlError(pageUrl, error);
            throw error;
        }
        const originalPath = new URL(pageUrl).pathname;
        const redirectedPath = new URL(tab.page.url()).pathname;
        // Check if the paths match.
        // Critical CSS should only be generated for the original page.
        if (originalPath !== redirectedPath) {
            const error = new RedirectError({
                url: pageUrl,
                redirectUrl: tab.page.url(),
            });
            this.trackUrlError(pageUrl, error);
            throw error;
        }
        if (viewport) {
            await tab.page.setViewportSize(viewport);
        }
        // The inner window in Playwright is the directly accessible main window object.
        // The evaluating method does not need a separate window object.
        // Call inner method within the Playwright context.
        return tab.page.evaluate(method, { innerWindow: null, args });
    }
    /**
     * Replacement for browser.fetch, uses node's fetch to simulate the same
     * interface.
     *
     * @param {string} url     - URL to fetch.
     * @param {object} options - Fetch options.
     * @param {string} _role   - 'css' or 'html' indicating what kind of thing is being fetched.
     * @return {Promise<Response>} A promise that resolves to the fetch response.
     */
    async fetch(url, options, _role) {
        return fetch(url, options);
    }
    isOkStatus(statusCode) {
        return statusCode >= 200 && statusCode < 400;
    }
    isSameOrigin(url, pageUrl) {
        try {
            return new URL(url).origin === new URL(pageUrl).origin;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=browser-interface-playwright.js.map