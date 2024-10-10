import { BrowserInterface, BrowserRunnable } from './browser-interface.js';
import { UrlError } from './errors.js';
import { Viewport } from './types.js';
type VerifyMethod = (rawUrl: string, contentWindow: Window, contentDocument: Document) => boolean;
type BrowserInterfaceIframeOptions = {
    requestGetParameters?: {
        [key: string]: string;
    };
    loadTimeout?: number;
    verifyPage: VerifyMethod;
    allowScripts?: boolean;
};
export declare class BrowserInterfaceIframe extends BrowserInterface {
    private requestGetParameters;
    private loadTimeout;
    private verifyPage;
    private currentUrl;
    private currentSize;
    private wrapperDiv;
    private iframe;
    constructor({ requestGetParameters, loadTimeout, verifyPage, allowScripts, }: BrowserInterfaceIframeOptions);
    cleanup(): Promise<void>;
    fetch(url: string, options: RequestInit, _role: 'css' | 'html'): Promise<Response>;
    runInPage<ReturnType>(pageUrl: string, viewport: Viewport | null, method: BrowserRunnable<ReturnType>, ...args: unknown[]): Promise<ReturnType>;
    addGetParameters(rawUrl: string): string;
    diagnoseUrlError(url: string): Promise<UrlError | null>;
    sameOrigin(url: string): boolean;
    loadPage(rawUrl: string): Promise<void>;
    resize({ width, height }: Viewport): Promise<unknown>;
}
export {};
