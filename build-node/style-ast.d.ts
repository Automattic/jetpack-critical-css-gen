import * as csstree from 'css-tree';
import { AtRuleFilter, FilterSpec, PropertiesFilter } from './types.js';
/**
 * Represents an Abstract Syntax Tree for a CSS file (as generated by css-tree) and contains helper
 * methods for pruning and rearranging it.
 */
export declare class StyleAST {
    private css;
    private ast;
    private errors;
    constructor(css: string, ast: csstree.CssNode, errors: Error[]);
    /**
     * Given a base URL (where the CSS file this AST was built from), find all relative URLs and
     * convert them to absolute.
     *
     * @param {string} base - base URL for relative URLs.
     */
    absolutifyUrls(base: string): void;
    /**
     * Returns a new StyleAST with content from this one pruned based on the specified contentWindow
     * and criticalSelectors to keep.
     *
     * Removes:
     * - Irrelevant media queries
     * - Selectors not included in criticalSelectors
     * - Excluded properties
     * - Large embeds
     * - Empty rules
     *
     * @param {Set< string >} criticalSelectors - Set of selectors to keep in the new AST.
     *
     * @returns {StyleAST} - New AST with pruned contents.
     */
    pruned(criticalSelectors: Set<string>): StyleAST;
    /**
     * Given an AST node, returns the original text it was compiled from in the source CSS.
     *
     * @param {object} node - Node from the AST.
     * @returns {string} original text the node was compiled from.
     */
    originalText(node: csstree.CssNode): string;
    /**
     * Applies filters to the properties or atRules in this AST. Mutates the AST in-place.
     *
     * @param {FilterSpec} filters - Object containing property and atRule filter functions.
     */
    applyFilters(filters: FilterSpec): void;
    /**
     * Applies a filter to the properties in this AST. Mutates the AST in-place.
     *
     * @param {Function} filter - to apply.
     */
    applyPropertiesFilter(filter: PropertiesFilter): void;
    /**
     * Applies a filter to the atRules in this AST. Mutates the AST in-place.
     *
     * @param {Function} filter - to apply.
     */
    applyAtRulesFilter(filter: AtRuleFilter): void;
    /**
     * Remove variables that do not appear in the usedVariables set. Returns a count of variables
     * that were removed.
     *
     * @param {Set< string >} usedVariables - Set of used variables to keep.
     * @returns {number} variables pruned.
     */
    pruneUnusedVariables(usedVariables: Set<string>): number;
    /**
     * Find all variables that are used and return them as a Set.
     * @returns {Set< string >} Set of used variables.
     */
    getUsedVariables(): Set<string>;
    /**
     * Remove all comments from the syntax tree.
     */
    pruneComments(): void;
    /**
     * Remove media queries that only apply to print.
     */
    pruneMediaQueries(): void;
    /**
     * Remove unwanted at-rules.
     *
     * @param { string[] } names - Names of at-rules to remove, excluding the at symbol.
     */
    pruneAtRules(names: string[]): void;
    /**
     * Returns true if the given CSS rule object relates to animation keyframes.
     *
     * @param {csstree.WalkContext} rule - CSS rule.
     * @returns {boolean} True if the rule is a keyframe rule, false otherwise.
     */
    static isKeyframeRule(rule: csstree.WalkContext): boolean;
    /**
     * Walks this AST and calls the specified callback with each selector found (as text).
     * Skips any selectors in the excludedSelectors constant.
     *
     * @param {Function} callback - Callback to call with each selector.
     */
    forEachSelector(callback: (selector: string) => void): void;
    /**
     * Remove any selectors not listed in the criticalSelectors set, deleting any
     * rules that no longer have any selectors in their prelude.
     *
     * @param {Set< string >} criticalSelector - Set of critical selectors.
     */
    pruneNonCriticalSelectors(criticalSelector: Set<string>): void;
    /**
     * Remove any Base64 embedded content which exceeds maxBase64Length.
     */
    pruneLargeBase64Embeds(): void;
    /**
     * Remove any properties that match the regular expressions in the excludedProperties constant.
     */
    pruneExcludedProperties(): void;
    /**
     * Remove any fonts which are not in the specified whitelist.
     *
     * @param {Set< string >} fontWhitelist - Whitelisted font.
     */
    pruneNonCriticalFonts(fontWhitelist: Set<string>): void;
    /**
     * Returns a count of the rules in this Style AST.
     *
     * @returns {number} rules in this AST.
     */
    ruleCount(): number;
    /**
     * Returns a list of font families that are used by any rule in this AST.
     *
     * @returns {Set<string>} Set of used fonts.
     */
    getUsedFontFamilies(): Set<string>;
    /**
     * Given an AST node, read it as a value based on its type. Removes quote marks from
     * string types if present.
     *
     * @param {csstree.CssNode} node - AST node.
     * @returns {string} The value of the node as a string.
     */
    static readValue(node: csstree.CssNode): string;
    /**
     * Returns true if the specified media query node is relevant to screen rendering.
     *
     * @param {object} mediaQueryNode - Media Query AST node to examine.
     *
     * @returns {boolean} true if the media query is relevant to screens.
     */
    static isUsefulMediaQuery(mediaQueryNode: csstree.MediaQuery): boolean;
    /**
     * Returns this AST converted to CSS.
     *
     * @returns {string} this AST represented in CSS.
     */
    toCSS(): string;
    /**
     * Static method to parse a block of CSS and return a new StyleAST object which represents it.
     *
     * @param {string} css - CSS to parse.
     *
     * @returns {StyleAST} new parse AST based on the CSS.
     */
    static parse(css: string): StyleAST;
}
