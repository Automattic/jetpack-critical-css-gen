import { BrowserInterface, BrowserRunnable } from './browser-interface.ts';
import { UrlError } from './errors.ts';
import { Viewport } from './types.ts';
type VerifyMethod = (rawUrl: string, contentWindow: Window, contentDocument: Document) => boolean;
type BrowserInterfaceIframeOptions = {
    requestGetParameters?: {
        [key: string]: string;
    };
    loadTimeout?: number;
    checkTimeout?: number;
    verifyPage: VerifyMethod;
    allowScripts?: boolean;
    signal?: AbortSignal;
};
export declare class BrowserInterfaceIframe extends BrowserInterface {
    private requestGetParameters;
    private loadTimeout;
    private checkTimeout;
    private verifyPage;
    private signal;
    private currentUrl;
    private currentSize;
    private wrapperDiv;
    private iframe;
    constructor({ requestGetParameters, loadTimeout, checkTimeout, verifyPage, allowScripts, signal, }: BrowserInterfaceIframeOptions);
    cleanup(): Promise<void>;
    fetch(url: string, options: RequestInit, _role: 'css' | 'html'): Promise<Response>;
    runInPage<ReturnType>(pageUrl: string, viewport: Viewport | null, method: BrowserRunnable<ReturnType>, ...args: unknown[]): Promise<ReturnType>;
    addGetParameters(url: URL): string;
    diagnoseUrlError(url: string, signal?: AbortSignal): Promise<UrlError | null>;
    is404Page(url: string, signal?: AbortSignal): Promise<boolean>;
    sameOrigin(url: string): boolean;
    loadPage(rawUrl: string): Promise<void>;
    resize({ width, height }: Viewport): Promise<unknown>;
}
export {};
