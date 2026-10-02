/**
 * Remove earlier identical rules in matching conditional contexts, keeping cascade order.
 *
 * @param {string} css - Minified CSS from all pruned source stylesheets.
 * @return {string} CSS without redundant rules.
 */
export declare function deduplicateCss(css: string): string;
