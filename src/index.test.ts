/**
 * Wuher Test Suite
 *
 * @copyright Orchestra AI, Inc.
 */

import { describe, it, expect } from "vitest";
import {
  analyze,
  parseRobotsTxt,
  isBotBlocked,
  isAllowed,
  listUserAgents,
  hasWildcardDisallow,
  findBlockedBots,
  extractSitemaps,
  detectCloudflareChallenge,
  buildKeyDirectoryUrl,
  validateWebBotAuthConfig,
  DEFAULT_RED_PATTERNS,
  DEFAULT_YELLOW_PATTERNS,
  type BotPattern,
} from "./index";

// ============================================================================
// Test Fixtures
// ============================================================================

const ROBOTS_EMPTY = "";

const ROBOTS_ALLOW_ALL = `
User-agent: *
Disallow:
`;

const ROBOTS_BLOCK_ALL = `
User-agent: *
Disallow: /
`;

const ROBOTS_BLOCK_GPTBOT = `
User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /private/
`;

const ROBOTS_BLOCK_CHATGPT_USER = `
User-agent: ChatGPT-User
Disallow: /

User-agent: *
Disallow: /private/
`;

const ROBOTS_BLOCK_MULTIPLE_AI = `
User-agent: ChatGPT-User
User-agent: Claude-User
Disallow: /

User-agent: Googlebot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /
`;

const ROBOTS_COMPLEX = `
# This is a complex robots.txt
User-agent: Googlebot
Allow: /
Disallow: /private/

User-agent: ChatGPT-User
User-agent: Claude-User
Disallow: /

User-agent: CCBot
Disallow: /ai-training/
Crawl-delay: 10

User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
`;

const ROBOTS_ONLY_YELLOW = `
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: *
Allow: /
`;

const ROBOTS_SPECIFIC_PATHS = `
User-agent: ChatGPT-User
Disallow: /blog/
Disallow: /articles/

User-agent: *
Allow: /
`;

const ROBOTS_WITH_WILDCARDS = `
User-agent: *
Disallow: /*.pdf$
Disallow: /tmp*

User-agent: ChatGPT-User
Disallow: /private/*
`;

// ============================================================================
// parseRobotsTxt Tests
// ============================================================================

describe("parseRobotsTxt", () => {
  it("should parse empty robots.txt", () => {
    const blocks = parseRobotsTxt(ROBOTS_EMPTY);
    expect(blocks).toEqual([]);
  });

  it("should parse allow-all robots.txt", () => {
    const blocks = parseRobotsTxt(ROBOTS_ALLOW_ALL);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].userAgents).toContain("*");
    expect(blocks[0].disallowRules).toEqual([]);
  });

  it("should parse block-all robots.txt", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_ALL);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].userAgents).toContain("*");
    expect(blocks[0].disallowRules).toContain("/");
  });

  it("should parse multiple user-agent blocks", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_CHATGPT_USER);
    expect(blocks).toHaveLength(2);

    const chatgptBlock = blocks.find((b) => b.userAgents.includes("chatgpt-user"));
    expect(chatgptBlock).toBeDefined();
    expect(chatgptBlock?.disallowRules).toContain("/");

    const wildcardBlock = blocks.find((b) => b.userAgents.includes("*"));
    expect(wildcardBlock).toBeDefined();
    expect(wildcardBlock?.disallowRules).toContain("/private/");
  });

  it("should handle stacked user-agent directives", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_MULTIPLE_AI);

    // Find the block with stacked user-agents
    const stackedBlock = blocks.find(
      (b) =>
        b.userAgents.includes("chatgpt-user") &&
        b.userAgents.includes("claude-user")
    );
    expect(stackedBlock).toBeDefined();
    expect(stackedBlock?.userAgents).toHaveLength(2);
  });

  it("should parse crawl-delay directive", () => {
    const blocks = parseRobotsTxt(ROBOTS_COMPLEX);
    const ccbotBlock = blocks.find((b) => b.userAgents.includes("ccbot"));
    expect(ccbotBlock?.crawlDelay).toBe(10);
  });

  it("should handle comments", () => {
    const robotsWithComments = `
# Main crawler rules
User-agent: Googlebot
# Allow everything for Google
Allow: /
`;
    const blocks = parseRobotsTxt(robotsWithComments);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].userAgents).toContain("googlebot");
  });
});

// ============================================================================
// hasWildcardDisallow Tests
// ============================================================================

describe("hasWildcardDisallow", () => {
  it("should detect wildcard disallow", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_ALL);
    expect(hasWildcardDisallow(blocks)).toBe(true);
  });

  it("should not flag non-wildcard blocks", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_GPTBOT);
    expect(hasWildcardDisallow(blocks)).toBe(false);
  });

  it("should not flag empty robots.txt", () => {
    const blocks = parseRobotsTxt(ROBOTS_EMPTY);
    expect(hasWildcardDisallow(blocks)).toBe(false);
  });

  it("should not flag allow-all robots.txt", () => {
    const blocks = parseRobotsTxt(ROBOTS_ALLOW_ALL);
    expect(hasWildcardDisallow(blocks)).toBe(false);
  });
});

// ============================================================================
// findBlockedBots Tests
// ============================================================================

describe("findBlockedBots", () => {
  it("should find blocked bots", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_CHATGPT_USER);
    const matches = findBlockedBots(blocks, DEFAULT_RED_PATTERNS);

    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("ChatGPT User");
    expect(matches[0].disallowRules).toContain("/");
  });

  it("should find multiple blocked bots", () => {
    const blocks = parseRobotsTxt(ROBOTS_BLOCK_MULTIPLE_AI);
    const matches = findBlockedBots(blocks, DEFAULT_RED_PATTERNS);

    expect(matches.length).toBeGreaterThan(1);
    expect(matches.map((m) => m.name)).toContain("ChatGPT User");
    expect(matches.map((m) => m.name)).toContain("Googlebot");
  });

  it("should not flag non-significant disallow paths by default", () => {
    const blocks = parseRobotsTxt(ROBOTS_SPECIFIC_PATHS);
    const matches = findBlockedBots(blocks, DEFAULT_RED_PATTERNS);

    // ChatGPT-User only blocks /blog/ and /articles/, not /
    expect(matches).toHaveLength(0);
  });

  it("should flag any disallow when significantPaths is null", () => {
    const blocks = parseRobotsTxt(ROBOTS_SPECIFIC_PATHS);
    const matches = findBlockedBots(blocks, DEFAULT_RED_PATTERNS, null);

    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("ChatGPT User");
  });

  it("should return empty array when no bots blocked", () => {
    const blocks = parseRobotsTxt(ROBOTS_ALLOW_ALL);
    const matches = findBlockedBots(blocks, DEFAULT_RED_PATTERNS);

    expect(matches).toEqual([]);
  });
});

// ============================================================================
// analyze Tests
// ============================================================================

describe("analyze", () => {
  it("should return green for empty robots.txt", () => {
    const result = analyze(ROBOTS_EMPTY);

    expect(result.classification).toBe("green");
    expect(result.severity).toBe("ok");
    expect(result.hasWildcardDisallow).toBe(false);
    expect(result.redMatches).toEqual([]);
    expect(result.yellowMatches).toEqual([]);
  });

  it("should return green for allow-all robots.txt", () => {
    const result = analyze(ROBOTS_ALLOW_ALL);

    expect(result.classification).toBe("green");
    expect(result.severity).toBe("ok");
  });

  it("should return red for wildcard disallow", () => {
    const result = analyze(ROBOTS_BLOCK_ALL);

    expect(result.classification).toBe("red");
    expect(result.severity).toBe("error");
    expect(result.hasWildcardDisallow).toBe(true);
    expect(result.summary).toContain("Wildcard disallow");
  });

  it("should return red when red patterns are blocked", () => {
    const result = analyze(ROBOTS_BLOCK_CHATGPT_USER);

    expect(result.classification).toBe("red");
    expect(result.severity).toBe("error");
    expect(result.redMatches.length).toBeGreaterThan(0);
    expect(result.redMatches[0].name).toBe("ChatGPT User");
  });

  it("should return yellow when only yellow patterns are blocked", () => {
    const result = analyze(ROBOTS_ONLY_YELLOW);

    expect(result.classification).toBe("yellow");
    expect(result.severity).toBe("warning");
    expect(result.redMatches).toEqual([]);
    expect(result.yellowMatches.length).toBeGreaterThan(0);
  });

  it("should use custom patterns", () => {
    const customRobots = `
User-agent: MyCustomBot
Disallow: /
`;
    const customPatterns: BotPattern[] = [
      { name: "My Custom Bot", patterns: ["mycustombot"] },
    ];

    const result = analyze(customRobots, {
      redPatterns: customPatterns,
      yellowPatterns: [],
    });

    expect(result.classification).toBe("red");
    expect(result.redMatches[0].name).toBe("My Custom Bot");
  });

  it("should allow disabling wildcard as red", () => {
    const result = analyze(ROBOTS_BLOCK_ALL, {
      wildcardDisallowIsRed: false,
      redPatterns: [],
      yellowPatterns: [],
    });

    expect(result.classification).toBe("green");
    expect(result.hasWildcardDisallow).toBe(true);
  });

  it("should include parsed blocks in result", () => {
    const result = analyze(ROBOTS_COMPLEX);

    expect(result.parsedBlocks.length).toBeGreaterThan(0);
    expect(result.parsedBlocks.some((b) => b.userAgents.includes("googlebot"))).toBe(
      true
    );
  });

  it("should generate meaningful summary", () => {
    const result = analyze(ROBOTS_BLOCK_CHATGPT_USER);

    expect(result.summary).toBeTruthy();
    expect(result.summary.toLowerCase()).toContain("chatgpt");
  });
});

// ============================================================================
// isBotBlocked Tests
// ============================================================================

describe("isBotBlocked", () => {
  it("should return true for blocked bot", () => {
    expect(isBotBlocked(ROBOTS_BLOCK_CHATGPT_USER, "chatgpt-user")).toBe(true);
  });

  it("should return false for non-blocked bot", () => {
    expect(isBotBlocked(ROBOTS_BLOCK_CHATGPT_USER, "googlebot")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isBotBlocked(ROBOTS_BLOCK_CHATGPT_USER, "CHATGPT-USER")).toBe(true);
    expect(isBotBlocked(ROBOTS_BLOCK_CHATGPT_USER, "ChatGPT-User")).toBe(true);
  });

  it("should respect significantPaths parameter", () => {
    // ChatGPT-User only blocks /blog/ and /articles/, not /
    expect(isBotBlocked(ROBOTS_SPECIFIC_PATHS, "chatgpt-user")).toBe(false);
    expect(isBotBlocked(ROBOTS_SPECIFIC_PATHS, "chatgpt-user", null)).toBe(true);
  });
});

// ============================================================================
// isAllowed Tests
// ============================================================================

describe("isAllowed", () => {
  it("should return true for allowed paths", () => {
    expect(isAllowed(ROBOTS_COMPLEX, "Googlebot", "/")).toBe(true);
    expect(isAllowed(ROBOTS_COMPLEX, "Googlebot", "/blog/")).toBe(true);
  });

  it("should return false for disallowed paths", () => {
    expect(isAllowed(ROBOTS_COMPLEX, "Googlebot", "/private/secret")).toBe(false);
    expect(isAllowed(ROBOTS_BLOCK_ALL, "AnyBot", "/")).toBe(false);
  });

  it("should handle wildcard user-agent", () => {
    expect(isAllowed(ROBOTS_COMPLEX, "RandomBot", "/admin/")).toBe(false);
    expect(isAllowed(ROBOTS_COMPLEX, "RandomBot", "/public/")).toBe(true);
  });

  it("should return true when no rules apply", () => {
    expect(isAllowed(ROBOTS_EMPTY, "AnyBot", "/")).toBe(true);
  });

  it("should prefer longer path matches", () => {
    const robots = `
User-agent: *
Disallow: /
Allow: /public/
`;
    expect(isAllowed(robots, "AnyBot", "/")).toBe(false);
    expect(isAllowed(robots, "AnyBot", "/public/")).toBe(true);
    expect(isAllowed(robots, "AnyBot", "/public/page.html")).toBe(true);
  });

  it("should handle path wildcards", () => {
    expect(isAllowed(ROBOTS_WITH_WILDCARDS, "Googlebot", "/document.pdf")).toBe(
      false
    );
    expect(isAllowed(ROBOTS_WITH_WILDCARDS, "Googlebot", "/tmpfile")).toBe(false);
    expect(isAllowed(ROBOTS_WITH_WILDCARDS, "Googlebot", "/document.html")).toBe(
      true
    );
  });

  it("should handle $ anchor for exact matches", () => {
    const robots = `
User-agent: *
Disallow: /exact$
`;
    expect(isAllowed(robots, "AnyBot", "/exact")).toBe(false);
    expect(isAllowed(robots, "AnyBot", "/exact/more")).toBe(true);
  });
});

// ============================================================================
// listUserAgents Tests
// ============================================================================

describe("listUserAgents", () => {
  it("should list all user agents", () => {
    const userAgents = listUserAgents(ROBOTS_COMPLEX);

    expect(userAgents).toContain("*");
    expect(userAgents).toContain("googlebot");
    expect(userAgents).toContain("chatgpt-user");
    expect(userAgents).toContain("claude-user");
    expect(userAgents).toContain("ccbot");
  });

  it("should return sorted list", () => {
    const userAgents = listUserAgents(ROBOTS_COMPLEX);
    const sorted = [...userAgents].sort();
    expect(userAgents).toEqual(sorted);
  });

  it("should return unique user agents", () => {
    const robots = `
User-agent: Googlebot
Disallow: /a

User-agent: Googlebot
Disallow: /b
`;
    const userAgents = listUserAgents(robots);
    expect(userAgents.filter((ua) => ua === "googlebot")).toHaveLength(1);
  });

  it("should return empty array for empty robots.txt", () => {
    expect(listUserAgents(ROBOTS_EMPTY)).toEqual([]);
  });
});

// ============================================================================
// Default Patterns Tests
// ============================================================================

describe("Default Patterns", () => {
  it("should have red patterns defined with AI visitors and search crawlers", () => {
    expect(DEFAULT_RED_PATTERNS.length).toBeGreaterThan(0);
    // AI Assistants
    expect(DEFAULT_RED_PATTERNS.some((p) => p.name === "ChatGPT User")).toBe(true);
    expect(DEFAULT_RED_PATTERNS.some((p) => p.name === "Claude User")).toBe(true);
    expect(DEFAULT_RED_PATTERNS.some((p) => p.name === "Perplexity User")).toBe(true);
    // Search Crawlers
    expect(DEFAULT_RED_PATTERNS.some((p) => p.name === "Googlebot")).toBe(true);
    expect(DEFAULT_RED_PATTERNS.some((p) => p.name === "Bingbot")).toBe(true);
  });

  it("should have yellow patterns defined with model training crawlers", () => {
    expect(DEFAULT_YELLOW_PATTERNS.length).toBeGreaterThan(0);
    expect(DEFAULT_YELLOW_PATTERNS.some((p) => p.name === "GPTBot")).toBe(true);
    expect(DEFAULT_YELLOW_PATTERNS.some((p) => p.name === "ClaudeBot")).toBe(true);
    expect(DEFAULT_YELLOW_PATTERNS.some((p) => p.name === "CCBot")).toBe(true);
    expect(DEFAULT_YELLOW_PATTERNS.some((p) => p.name === "Google-Extended")).toBe(true);
  });

  it("should have non-overlapping patterns between red and yellow", () => {
    const redNames = new Set(DEFAULT_RED_PATTERNS.map((p) => p.name));
    const yellowNames = DEFAULT_YELLOW_PATTERNS.map((p) => p.name);

    for (const name of yellowNames) {
      expect(redNames.has(name)).toBe(false);
    }
  });

  it("should categorize AI visitors as red and training crawlers as yellow", () => {
    // Verify the conceptual split: real-time visitors vs training crawlers
    const redCategories = DEFAULT_RED_PATTERNS
      .map((p) => p.metadata?.category)
      .filter(Boolean);
    const yellowCategories = DEFAULT_YELLOW_PATTERNS
      .map((p) => p.metadata?.category)
      .filter(Boolean);

    // Red should have AI Assistants, AI Agents, and Search Crawlers
    expect(redCategories).toContain("AI Assistant");
    expect(redCategories).toContain("Search Crawler");

    // Yellow should have Model Training
    expect(yellowCategories).toContain("Model Training");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle malformed robots.txt gracefully", () => {
    const malformed = `
This is not valid robots.txt
Random text here
User-agent without colon Googlebot
DisallowTypo: /
User-agent: ValidBot
Disallow: /valid/
`;
    const blocks = parseRobotsTxt(malformed);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some((b) => b.userAgents.includes("validbot"))).toBe(true);
  });

  it("should handle robots.txt with only comments", () => {
    const onlyComments = `
# This is a comment
# Another comment
# User-agent: * (commented out)
`;
    const blocks = parseRobotsTxt(onlyComments);
    expect(blocks).toEqual([]);
  });

  it("should handle Windows-style line endings", () => {
    const windowsRobots = "User-agent: *\r\nDisallow: /\r\n";
    const blocks = parseRobotsTxt(windowsRobots);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].disallowRules).toContain("/");
  });

  it("should handle mixed case directives", () => {
    const mixedCase = `
USER-AGENT: Googlebot
DISALLOW: /admin/
user-agent: *
disallow: /private/
`;
    const blocks = parseRobotsTxt(mixedCase);
    expect(blocks).toHaveLength(2);
  });

  it("should handle inline comments", () => {
    // Note: Standard robots.txt doesn't support inline comments,
    // but some parsers might encounter them
    const withInlineComments = `
User-agent: * # all bots
Disallow: /admin/ # admin area
`;
    const blocks = parseRobotsTxt(withInlineComments);
    expect(blocks).toHaveLength(1);
    // The value includes the comment text (this is technically correct per spec)
    expect(blocks[0].userAgents[0]).toContain("*");
  });
});

// ============================================================================
// extractSitemaps Tests
// ============================================================================

const ROBOTS_WITH_SITEMAPS = `
User-agent: *
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml
Sitemap: https://example.com/sitemap-images.xml
`;

const ROBOTS_WITH_MIXED_CASE_SITEMAP = `
User-agent: *
Disallow:

sitemap: https://example.com/lower.xml
SITEMAP: https://example.com/upper.xml
Sitemap: https://example.com/mixed.xml
`;

const ROBOTS_WITH_NO_SITEMAPS = `
User-agent: *
Disallow: /private/
Allow: /public/
`;

describe("extractSitemaps", () => {
  it("should extract sitemap URLs from robots.txt", () => {
    const result = extractSitemaps(ROBOTS_WITH_SITEMAPS);
    expect(result.sitemapUrls).toHaveLength(3);
    expect(result.sitemapUrls).toContain("https://example.com/sitemap.xml");
    expect(result.sitemapUrls).toContain("https://example.com/sitemap-news.xml");
    expect(result.sitemapUrls).toContain("https://example.com/sitemap-images.xml");
  });

  it("should handle case-insensitive Sitemap directive", () => {
    const result = extractSitemaps(ROBOTS_WITH_MIXED_CASE_SITEMAP);
    expect(result.sitemapUrls).toHaveLength(3);
    expect(result.sitemapUrls).toContain("https://example.com/lower.xml");
    expect(result.sitemapUrls).toContain("https://example.com/upper.xml");
    expect(result.sitemapUrls).toContain("https://example.com/mixed.xml");
  });

  it("should return empty array when no sitemaps are present", () => {
    const result = extractSitemaps(ROBOTS_WITH_NO_SITEMAPS);
    expect(result.sitemapUrls).toEqual([]);
  });

  it("should return empty array for empty robots.txt", () => {
    const result = extractSitemaps("");
    expect(result.sitemapUrls).toEqual([]);
  });

  it("should ignore invalid URLs in Sitemap directives", () => {
    const robots = `
Sitemap: https://example.com/valid.xml
Sitemap: not-a-url
Sitemap: ftp://example.com/bad-protocol.xml
Sitemap: https://example.com/also-valid.xml
`;
    const result = extractSitemaps(robots);
    expect(result.sitemapUrls).toHaveLength(2);
    expect(result.sitemapUrls).toContain("https://example.com/valid.xml");
    expect(result.sitemapUrls).toContain("https://example.com/also-valid.xml");
  });

  it("should handle Sitemap directives with extra whitespace", () => {
    const robots = `
Sitemap:   https://example.com/spaced.xml  
Sitemap:	https://example.com/tabbed.xml
`;
    const result = extractSitemaps(robots);
    expect(result.sitemapUrls).toHaveLength(2);
    expect(result.sitemapUrls).toContain("https://example.com/spaced.xml");
    expect(result.sitemapUrls).toContain("https://example.com/tabbed.xml");
  });

  it("should handle http:// sitemap URLs", () => {
    const robots = `Sitemap: http://example.com/sitemap.xml`;
    const result = extractSitemaps(robots);
    expect(result.sitemapUrls).toHaveLength(1);
    expect(result.sitemapUrls[0]).toBe("http://example.com/sitemap.xml");
  });

  it("should skip commented-out Sitemap directives", () => {
    const robots = `
# Sitemap: https://example.com/commented-out.xml
Sitemap: https://example.com/real.xml
`;
    const result = extractSitemaps(robots);
    expect(result.sitemapUrls).toHaveLength(1);
    expect(result.sitemapUrls[0]).toBe("https://example.com/real.xml");
  });
});

// ============================================================================
// detectCloudflareChallenge Tests
// ============================================================================

const CF_MANAGED_CHALLENGE_HTML = `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body><div class="main-wrapper" role="main"><div class="main-content"><noscript><div class="h2"><span id="challenge-error-text">Enable JavaScript and cookies to continue</span></div></noscript></div></div><script>(function(){window._cf_chl_opt = {cvId: '3',cZone: 'www.example.com',cType: 'managed'};var a = document.createElement('script');a.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=abc123';document.getElementsByTagName('head')[0].appendChild(a);}());</script></body></html>`;

const CF_JS_CHALLENGE_HTML = `<html><head><title>Checking your browser</title></head><body><form id="challenge-form" action="/cdn-cgi/l/chk_jschl" method="get"><input name="jschl_vc" value="abc123"/><input name="jschl_answer"/></form></body></html>`;

const CF_TURNSTILE_HTML = `<html><head><title>Verify you are human</title></head><body><div class="cf-turnstile" data-sitekey="0x4AAAA"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script></body></html>`;

const CF_BLOCK_HTML = `<html><head><title>Access denied</title></head><body><div class="cf-error-details"><h1>Error 1020: Access Denied</h1></div></body></html>`;

const NORMAL_HTML = `<!DOCTYPE html><html><head><title>Example</title></head><body><h1>Hello World</h1></body></html>`;

const NORMAL_ROBOTS_TXT = `User-agent: *\nDisallow: /private/\n\nSitemap: https://example.com/sitemap.xml`;

describe("detectCloudflareChallenge", () => {
  it("should detect managed challenge", () => {
    const result = detectCloudflareChallenge(CF_MANAGED_CHALLENGE_HTML);
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.protectionType).toBe("managed_challenge");
  });

  it("should detect JS challenge", () => {
    const result = detectCloudflareChallenge(CF_JS_CHALLENGE_HTML);
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.protectionType).toBe("js_challenge");
  });

  it("should detect Turnstile challenge", () => {
    const result = detectCloudflareChallenge(CF_TURNSTILE_HTML);
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.protectionType).toBe("turnstile");
  });

  it("should detect Cloudflare block (1020)", () => {
    const result = detectCloudflareChallenge(CF_BLOCK_HTML);
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.protectionType).toBe("block");
  });

  it("should not flag normal HTML pages", () => {
    const result = detectCloudflareChallenge(NORMAL_HTML);
    expect(result.isCloudflareProtected).toBe(false);
    expect(result.protectionType).toBeUndefined();
  });

  it("should not flag normal robots.txt content", () => {
    const result = detectCloudflareChallenge(NORMAL_ROBOTS_TXT);
    expect(result.isCloudflareProtected).toBe(false);
  });

  it("should set supportsWebBotAuth when server header indicates Cloudflare", () => {
    const result = detectCloudflareChallenge(CF_MANAGED_CHALLENGE_HTML, {
      server: "cloudflare",
    });
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.supportsWebBotAuth).toBe(true);
  });

  it("should set supportsWebBotAuth when cf-ray header is present", () => {
    const result = detectCloudflareChallenge(CF_MANAGED_CHALLENGE_HTML, {
      cfRay: "abc123-IAD",
    });
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.supportsWebBotAuth).toBe(true);
  });

  it("should not set supportsWebBotAuth when no Cloudflare headers are present", () => {
    const result = detectCloudflareChallenge(CF_MANAGED_CHALLENGE_HTML);
    expect(result.isCloudflareProtected).toBe(true);
    expect(result.supportsWebBotAuth).toBeUndefined();
  });

  it("should handle empty string", () => {
    const result = detectCloudflareChallenge("");
    expect(result.isCloudflareProtected).toBe(false);
  });
});

// ============================================================================
// Web Bot Auth Helper Tests
// ============================================================================

describe("buildKeyDirectoryUrl", () => {
  it("should build correct well-known URL from bare domain", () => {
    expect(buildKeyDirectoryUrl("mybot.example.com")).toBe(
      "https://mybot.example.com/.well-known/http-message-signatures-directory"
    );
  });

  it("should strip protocol prefix", () => {
    expect(buildKeyDirectoryUrl("https://mybot.example.com")).toBe(
      "https://mybot.example.com/.well-known/http-message-signatures-directory"
    );
    expect(buildKeyDirectoryUrl("http://mybot.example.com")).toBe(
      "https://mybot.example.com/.well-known/http-message-signatures-directory"
    );
  });

  it("should strip trailing slashes", () => {
    expect(buildKeyDirectoryUrl("mybot.example.com/")).toBe(
      "https://mybot.example.com/.well-known/http-message-signatures-directory"
    );
  });
});

describe("validateWebBotAuthConfig", () => {
  const validConfig = {
    keyDirectoryUrl:
      "https://mybot.example.com/.well-known/http-message-signatures-directory",
    keyId: "poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U",
    userAgent: "MyBot/1.0",
  };

  it("should accept a valid config", () => {
    const result = validateWebBotAuthConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject missing keyDirectoryUrl", () => {
    const { keyDirectoryUrl, ...rest } = validConfig;
    const result = validateWebBotAuthConfig(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyDirectoryUrl is required");
  });

  it("should reject non-HTTPS keyDirectoryUrl", () => {
    const result = validateWebBotAuthConfig({
      ...validConfig,
      keyDirectoryUrl: "http://mybot.example.com/.well-known/http-message-signatures-directory",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyDirectoryUrl must use HTTPS");
  });

  it("should warn if keyDirectoryUrl is missing well-known path", () => {
    const result = validateWebBotAuthConfig({
      ...validConfig,
      keyDirectoryUrl: "https://mybot.example.com/keys",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("/.well-known/http-message-signatures-directory");
  });

  it("should reject missing keyId", () => {
    const { keyId, ...rest } = validConfig;
    const result = validateWebBotAuthConfig(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyId (JWK thumbprint) is required");
  });

  it("should reject missing userAgent", () => {
    const { userAgent, ...rest } = validConfig;
    const result = validateWebBotAuthConfig(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("userAgent is required");
  });

  it("should collect multiple errors", () => {
    const result = validateWebBotAuthConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});
