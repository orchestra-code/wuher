/**
 * Wuher - A robots.txt parser and classifier
 *
 * Named after the Mos Eisley cantina bartender who told Luke,
 * "Your droids. They can't come in here."
 *
 * @packageDocumentation
 * @module wuher
 * @license MIT
 * @copyright Orchestra AI, Inc.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Classification level for robots.txt analysis
 */
export type Classification = "red" | "yellow" | "green";

/**
 * Alias types for more semantic naming
 */
export type ClassificationSeverity = "error" | "warning" | "ok";

/**
 * A pattern to match against robots.txt user-agent directives
 */
export interface BotPattern {
  /** Name of the bot or pattern group (e.g., "GPTBot", "ChatGPT") */
  name: string;
  /** User-agent patterns to match (case-insensitive) */
  patterns: string[];
  /** Optional metadata about the bot */
  metadata?: Record<string, unknown>;
}

/**
 * A matched bot that was found to be blocked or restricted
 */
export interface MatchedBot {
  /** Name of the bot that matched */
  name: string;
  /** The specific pattern that matched */
  pattern: string;
  /** The user-agent directive in robots.txt that matched */
  userAgent: string;
  /** The disallow rules that apply to this bot */
  disallowRules: string[];
  /** Any metadata from the original BotPattern */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration options for the Wuher parser
 */
export interface WuherOptions {
  /**
   * Bot patterns that should trigger a "red" / "error" classification.
   * If any of these bots are blocked with significant rules, the result is red.
   */
  redPatterns?: BotPattern[];

  /**
   * Bot patterns that should trigger a "yellow" / "warning" classification.
   * If any of these bots are blocked (and no red patterns match), the result is yellow.
   */
  yellowPatterns?: BotPattern[];

  /**
   * Whether a wildcard disallow (User-agent: * with Disallow: /) should
   * automatically trigger a red classification. Default: true
   */
  wildcardDisallowIsRed?: boolean;

  /**
   * Paths that count as "significant" blocks.
   * Default: ["/"] (only root disallow is significant)
   * Set to null to consider ANY disallow as significant.
   */
  significantPaths?: string[] | null;
}

/**
 * Detailed analysis result from parsing a robots.txt
 */
export interface WuherResult {
  /** The overall classification: red (error), yellow (warning), or green (ok) */
  classification: Classification;

  /** Alias for classification using severity terminology */
  severity: ClassificationSeverity;

  /** Whether a wildcard disallow rule was detected (User-agent: * with Disallow: /) */
  hasWildcardDisallow: boolean;

  /** Bots from redPatterns that were found to be blocked */
  redMatches: MatchedBot[];

  /** Bots from yellowPatterns that were found to be blocked */
  yellowMatches: MatchedBot[];

  /** Human-readable summary of the result */
  summary: string;

  /** All parsed user-agent blocks from the robots.txt */
  parsedBlocks: ParsedUserAgentBlock[];
}

/**
 * A parsed User-agent block from robots.txt
 */
export interface ParsedUserAgentBlock {
  /** The user-agent values (can be multiple if stacked) */
  userAgents: string[];
  /** Disallow rules in this block */
  disallowRules: string[];
  /** Allow rules in this block */
  allowRules: string[];
  /** Any crawl-delay directive */
  crawlDelay?: number;
  /** Raw lines that made up this block */
  rawLines: string[];
}

// ============================================================================
// Default Bot Patterns
// ============================================================================

/**
 * AI Visitors - bots that cite content in real-time AI responses.
 * Blocking these means your content won't appear in AI search results,
 * ChatGPT browsing, Claude web access, or Google AI Overviews.
 * 
 * These are RED/critical because blocking them has immediate visibility impact.
 */
export const DEFAULT_RED_PATTERNS: BotPattern[] = [
  // AI Assistants - Direct AI assistants executing web requests
  {
    name: "ChatGPT User",
    patterns: ["chatgpt-user"],
    metadata: { company: "OpenAI", category: "AI Assistant", purpose: "Live browsing and citations" },
  },
  {
    name: "Claude User",
    patterns: ["claude-user"],
    metadata: { company: "Anthropic", category: "AI Assistant", purpose: "Live browsing and citations" },
  },
  {
    name: "Gemini User",
    patterns: ["gemini"],
    metadata: { company: "Google", category: "AI Assistant", purpose: "Live browsing and citations" },
  },
  {
    name: "Mistral User",
    patterns: ["mistral-user", "mistral"],
    metadata: { company: "Mistral", category: "AI Assistant", purpose: "Live browsing and citations" },
  },
  {
    name: "Perplexity User",
    patterns: ["perplexitybot", "perplexity-user"],
    metadata: { company: "Perplexity AI", category: "AI Assistant", purpose: "Live search and citations" },
  },
  // AI Agents - AI tools accessing data as part of agent workflows
  {
    name: "GoogleAgent URL Context",
    patterns: ["google-agentspace", "googleagent"],
    metadata: { company: "Google", category: "AI Agent", purpose: "Agent workflow web access" },
  },
  {
    name: "LangChain",
    patterns: ["langchain"],
    metadata: { company: "LangChain", category: "AI Agent", purpose: "Agent workflow web access" },
  },
  // Traditional Search Crawlers - blocking these severely impacts organic search visibility
  {
    name: "Googlebot",
    patterns: ["googlebot"],
    metadata: { company: "Google", category: "Search Crawler", purpose: "Google Search indexing" },
  },
  {
    name: "Bingbot",
    patterns: ["bingbot"],
    metadata: { company: "Microsoft", category: "Search Crawler", purpose: "Bing Search indexing" },
  },
  {
    name: "DuckDuckBot",
    patterns: ["duckduckbot"],
    metadata: { company: "DuckDuckGo", category: "Search Crawler", purpose: "DuckDuckGo Search indexing" },
  },
  {
    name: "Yandex",
    patterns: ["yandexbot", "yandex"],
    metadata: { company: "Yandex", category: "Search Crawler", purpose: "Yandex Search indexing" },
  },
  {
    name: "Baiduspider",
    patterns: ["baiduspider"],
    metadata: { company: "Baidu", category: "Search Crawler", purpose: "Baidu Search indexing" },
  },
];

/**
 * Model Training Crawlers - bots that collect data for AI model training.
 * Blocking these means future AI models won't include your content in their training data.
 * 
 * These are YELLOW/warning because there are valid reasons to block them (copyright,
 * competitive concerns), but doing so means future AI won't "know" about your content.
 */
export const DEFAULT_YELLOW_PATTERNS: BotPattern[] = [
  {
    name: "GPTBot",
    patterns: ["gptbot"],
    metadata: { company: "OpenAI", category: "Model Training", purpose: "Training data collection" },
  },
  {
    name: "ClaudeBot",
    patterns: ["claudebot", "claude-web"],
    metadata: { company: "Anthropic", category: "Model Training", purpose: "Training data collection" },
  },
  {
    name: "Google-Extended",
    patterns: ["google-extended"],
    metadata: { company: "Google", category: "Model Training", purpose: "Gemini/Bard training" },
  },
  {
    name: "CCBot",
    patterns: ["ccbot"],
    metadata: { company: "Common Crawl", category: "Model Training", purpose: "Open training dataset" },
  },
  {
    name: "Bytespider",
    patterns: ["bytespider"],
    metadata: { company: "ByteDance", category: "Model Training", purpose: "Training data collection" },
  },
  {
    name: "Amazonbot",
    patterns: ["amazonbot"],
    metadata: { company: "Amazon", category: "Model Training", purpose: "Alexa/AI training" },
  },
  {
    name: "Applebot-Extended",
    patterns: ["applebot-extended"],
    metadata: { company: "Apple", category: "Model Training", purpose: "Apple Intelligence training" },
  },
  {
    name: "DeepSeek Bot",
    patterns: ["deepseekbot", "deepseek"],
    metadata: { company: "DeepSeek", category: "Model Training", purpose: "Training data collection" },
  },
  {
    name: "Meta-ExternalAgent",
    patterns: ["meta-externalagent", "meta-externalfetcher", "facebookbot"],
    metadata: { company: "Meta", category: "Model Training", purpose: "Llama/AI training" },
  },
  {
    name: "Cohere",
    patterns: ["cohere-ai", "cohere"],
    metadata: { company: "Cohere", category: "Model Training", purpose: "Training data collection" },
  },
  {
    name: "Diffbot",
    patterns: ["diffbot"],
    metadata: { company: "Diffbot", category: "Model Training", purpose: "Knowledge graph training" },
  },
];

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Parse a robots.txt file into structured blocks
 *
 * @param robotsTxt - The raw robots.txt content
 * @returns Array of parsed user-agent blocks
 */
export function parseRobotsTxt(robotsTxt: string): ParsedUserAgentBlock[] {
  const blocks: ParsedUserAgentBlock[] = [];
  const lines = robotsTxt.split("\n");

  let currentBlock: ParsedUserAgentBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines (they end the current block)
    if (!trimmed) {
      if (currentBlock && currentBlock.userAgents.length > 0) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    // Skip comments
    if (trimmed.startsWith("#")) {
      continue;
    }

    // Parse directive
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const directive = trimmed.substring(0, colonIndex).toLowerCase().trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    switch (directive) {
      case "user-agent":
        if (
          currentBlock &&
          currentBlock.disallowRules.length === 0 &&
          currentBlock.allowRules.length === 0
        ) {
          // Stacked user-agent directives
          currentBlock.userAgents.push(value.toLowerCase());
          currentBlock.rawLines.push(trimmed);
        } else {
          // New block - save previous if exists
          if (currentBlock && currentBlock.userAgents.length > 0) {
            blocks.push(currentBlock);
          }
          currentBlock = {
            userAgents: [value.toLowerCase()],
            disallowRules: [],
            allowRules: [],
            rawLines: [trimmed],
          };
        }
        break;

      case "disallow":
        if (currentBlock) {
          if (value) {
            currentBlock.disallowRules.push(value);
          }
          currentBlock.rawLines.push(trimmed);
        }
        break;

      case "allow":
        if (currentBlock) {
          if (value) {
            currentBlock.allowRules.push(value);
          }
          currentBlock.rawLines.push(trimmed);
        }
        break;

      case "crawl-delay":
        if (currentBlock) {
          const delay = parseFloat(value);
          if (!isNaN(delay)) {
            currentBlock.crawlDelay = delay;
          }
          currentBlock.rawLines.push(trimmed);
        }
        break;

      default:
        // Unknown directive - just add to raw lines if in a block
        if (currentBlock) {
          currentBlock.rawLines.push(trimmed);
        }
        break;
    }
  }

  // Don't forget the last block
  if (currentBlock && currentBlock.userAgents.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Check if a robots.txt has a wildcard disallow rule (User-agent: * with Disallow: /)
 *
 * @param blocks - Parsed user-agent blocks
 * @returns true if wildcard disallow exists
 */
export function hasWildcardDisallow(blocks: ParsedUserAgentBlock[]): boolean {
  for (const block of blocks) {
    if (block.userAgents.includes("*")) {
      if (block.disallowRules.includes("/")) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if disallow rules are "significant" based on configuration
 *
 * @param disallowRules - The disallow rules to check
 * @param significantPaths - Paths considered significant (null = any disallow is significant)
 * @returns true if the rules are considered significant
 */
function hasSignificantDisallow(
  disallowRules: string[],
  significantPaths: string[] | null
): boolean {
  if (disallowRules.length === 0) {
    return false;
  }

  // If null, any disallow is significant
  if (significantPaths === null) {
    return true;
  }

  // Check if any disallow rule matches significant paths exactly
  // "/" is only significant if the rule is exactly "/"
  return disallowRules.some((rule) => {
    return significantPaths.some((sigPath) => rule === sigPath);
  });
}

/**
 * Find which bots from a pattern list are blocked in the robots.txt
 *
 * @param blocks - Parsed user-agent blocks
 * @param patterns - Bot patterns to check
 * @param significantPaths - Paths considered significant
 * @returns Array of matched (blocked) bots
 */
export function findBlockedBots(
  blocks: ParsedUserAgentBlock[],
  patterns: BotPattern[],
  significantPaths: string[] | null = ["/"]
): MatchedBot[] {
  const matches: MatchedBot[] = [];

  for (const block of blocks) {
    // Check if this block has significant disallow rules
    if (!hasSignificantDisallow(block.disallowRules, significantPaths)) {
      continue;
    }

    // Check each user-agent in the block against our patterns
    for (const userAgent of block.userAgents) {
      for (const botPattern of patterns) {
        for (const pattern of botPattern.patterns) {
          const patternLower = pattern.toLowerCase();

          // Match if user-agent equals or contains the pattern
          if (userAgent === patternLower || userAgent.includes(patternLower)) {
            // Avoid duplicates
            if (!matches.some((m) => m.name === botPattern.name)) {
              matches.push({
                name: botPattern.name,
                pattern: pattern,
                userAgent: userAgent,
                disallowRules: block.disallowRules,
                metadata: botPattern.metadata,
              });
            }
            break;
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Generate a human-readable summary of the classification result
 */
function generateSummary(
  classification: Classification,
  hasWildcard: boolean,
  redMatches: MatchedBot[],
  yellowMatches: MatchedBot[]
): string {
  if (classification === "green") {
    return "No significant bot restrictions detected in robots.txt.";
  }

  const parts: string[] = [];

  if (hasWildcard) {
    parts.push(
      "Wildcard disallow rule (User-agent: * with Disallow: /) blocks all crawlers"
    );
  }

  if (redMatches.length > 0) {
    const botNames = redMatches.map((m) => m.name).join(", ");
    parts.push(`Critical bots blocked: ${botNames}`);
  }

  if (yellowMatches.length > 0) {
    const botNames = yellowMatches.map((m) => m.name).join(", ");
    parts.push(`Additional bots blocked: ${botNames}`);
  }

  return parts.join(". ") + ".";
}

/**
 * Map classification to severity
 */
function classificationToSeverity(
  classification: Classification
): ClassificationSeverity {
  switch (classification) {
    case "red":
      return "error";
    case "yellow":
      return "warning";
    case "green":
      return "ok";
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Analyze a robots.txt and classify its bot restrictions
 *
 * @param robotsTxt - The raw robots.txt content to analyze
 * @param options - Configuration options
 * @returns Detailed analysis result with classification
 *
 * @example
 * ```typescript
 * import { analyze } from 'wuher';
 *
 * const robotsTxt = `
 * User-agent: GPTBot
 * Disallow: /
 *
 * User-agent: *
 * Disallow: /private/
 * `;
 *
 * const result = analyze(robotsTxt);
 * console.log(result.classification); // 'red'
 * console.log(result.redMatches); // [{ name: 'GPTBot', ... }]
 * ```
 *
 * @example
 * ```typescript
 * // With custom patterns
 * const result = analyze(robotsTxt, {
 *   redPatterns: [{ name: 'MyBot', patterns: ['mybot'] }],
 *   yellowPatterns: [{ name: 'OtherBot', patterns: ['otherbot'] }],
 * });
 * ```
 */
export function analyze(
  robotsTxt: string,
  options: WuherOptions = {}
): WuherResult {
  const {
    redPatterns = DEFAULT_RED_PATTERNS,
    yellowPatterns = DEFAULT_YELLOW_PATTERNS,
    wildcardDisallowIsRed = true,
    significantPaths = ["/"],
  } = options;

  // Parse the robots.txt
  const parsedBlocks = parseRobotsTxt(robotsTxt);

  // Check for wildcard disallow
  const hasWildcard = hasWildcardDisallow(parsedBlocks);

  // Find blocked bots
  const redMatches = findBlockedBots(parsedBlocks, redPatterns, significantPaths);
  const yellowMatches = findBlockedBots(
    parsedBlocks,
    yellowPatterns,
    significantPaths
  );

  // Determine classification
  let classification: Classification = "green";

  if (wildcardDisallowIsRed && hasWildcard) {
    classification = "red";
  } else if (redMatches.length > 0) {
    classification = "red";
  } else if (yellowMatches.length > 0) {
    classification = "yellow";
  }

  const summary = generateSummary(
    classification,
    hasWildcard,
    redMatches,
    yellowMatches
  );

  return {
    classification,
    severity: classificationToSeverity(classification),
    hasWildcardDisallow: hasWildcard,
    redMatches,
    yellowMatches,
    summary,
    parsedBlocks,
  };
}

/**
 * Quick check if a specific bot pattern is blocked
 *
 * @param robotsTxt - The raw robots.txt content
 * @param pattern - The bot pattern to check (e.g., "gptbot")
 * @returns true if the bot is blocked
 *
 * @example
 * ```typescript
 * import { isBotBlocked } from 'wuher';
 *
 * const blocked = isBotBlocked(robotsTxt, 'gptbot');
 * ```
 */
export function isBotBlocked(
  robotsTxt: string,
  pattern: string,
  significantPaths: string[] | null = ["/"]
): boolean {
  const blocks = parseRobotsTxt(robotsTxt);
  const matches = findBlockedBots(
    blocks,
    [{ name: pattern, patterns: [pattern] }],
    significantPaths
  );
  return matches.length > 0;
}

/**
 * Check if a user-agent is allowed to access a specific path
 *
 * @param robotsTxt - The raw robots.txt content
 * @param userAgent - The user-agent to check
 * @param path - The path to check (default: "/")
 * @returns true if access is allowed
 *
 * @example
 * ```typescript
 * import { isAllowed } from 'wuher';
 *
 * const allowed = isAllowed(robotsTxt, 'GPTBot', '/blog/');
 * ```
 */
export function isAllowed(
  robotsTxt: string,
  userAgent: string,
  path: string = "/"
): boolean {
  const blocks = parseRobotsTxt(robotsTxt);
  const userAgentLower = userAgent.toLowerCase();

  // Collect applicable rules
  const rules: Array<{ type: "allow" | "disallow"; path: string }> = [];

  for (const block of blocks) {
    // Check if this block applies to the user-agent
    const applies = block.userAgents.some(
      (ua) =>
        ua === "*" || ua === userAgentLower || userAgentLower.includes(ua)
    );

    if (applies) {
      for (const allowPath of block.allowRules) {
        rules.push({ type: "allow", path: allowPath });
      }
      for (const disallowPath of block.disallowRules) {
        rules.push({ type: "disallow", path: disallowPath });
      }
    }
  }

  // No rules = allowed
  if (rules.length === 0) {
    return true;
  }

  // Find the most specific matching rule
  let longestMatch = "";
  let matchType: "allow" | "disallow" | null = null;

  for (const rule of rules) {
    if (pathMatches(path, rule.path) && rule.path.length > longestMatch.length) {
      longestMatch = rule.path;
      matchType = rule.type;
    }
  }

  // Allow wins for equal-length matches, and no match = allowed
  if (matchType === "disallow") {
    return false;
  }

  return true;
}

/**
 * Check if a path matches a robots.txt path pattern
 */
function pathMatches(path: string, pattern: string): boolean {
  // Handle $ anchor (exact match) - must check before wildcard handling
  if (pattern.endsWith("$")) {
    const patternWithoutAnchor = pattern.slice(0, -1);
    // Handle wildcards in anchored patterns
    if (patternWithoutAnchor.includes("*")) {
      const regexPattern = patternWithoutAnchor
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    }
    return path === patternWithoutAnchor;
  }

  // Handle wildcards
  if (pattern.includes("*")) {
    // Convert to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }

  // Simple prefix match
  return path.startsWith(pattern);
}

/**
 * Get a list of all user-agents mentioned in a robots.txt
 *
 * @param robotsTxt - The raw robots.txt content
 * @returns Array of unique user-agent strings (lowercase)
 */
export function listUserAgents(robotsTxt: string): string[] {
  const blocks = parseRobotsTxt(robotsTxt);
  const userAgents = new Set<string>();

  for (const block of blocks) {
    for (const ua of block.userAgents) {
      userAgents.add(ua);
    }
  }

  return Array.from(userAgents).sort();
}

// ============================================================================
// Convenience Exports
// ============================================================================

export default {
  analyze,
  isBotBlocked,
  isAllowed,
  parseRobotsTxt,
  listUserAgents,
  hasWildcardDisallow,
  findBlockedBots,
  DEFAULT_RED_PATTERNS,
  DEFAULT_YELLOW_PATTERNS,
};
