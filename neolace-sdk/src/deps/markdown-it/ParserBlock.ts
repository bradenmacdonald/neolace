// deno-lint-ignore-file no-explicit-any
// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/markdown-it/lib/parser_block.d.ts

import type { Ruler } from "./Ruler.ts";
import type { Token } from "./Token.ts";
import type { StateBlock } from "./rules_block/state_block.ts";

type MarkdownIt = any;

declare namespace ParserBlock {
    type RuleBlock = (state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean;
}

declare class ParserBlock {
    /**
     * [[Ruler]] instance. Keep configuration of block rules.
     */
    ruler: Ruler<ParserBlock.RuleBlock>;

    /**
     * Generate tokens for input range
     */
    tokenize(state: StateBlock, startLine: number, endLine: number): void;

    /**
     * Process input string and push block tokens into `outTokens`
     */
    parse(str: string, md: MarkdownIt, env: any, outTokens: Token[]): void;

    State: typeof StateBlock;
}

export type { ParserBlock };
