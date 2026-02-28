# Wuher

That bartender from Star Wars who wouldn't let the droids in. Now he helps you figure out if a 
robots.txt is blocking AI.

> "Hey! We don't serve their kind here!"
> "Your droids. They'll have to wait outside. We don't want them here."
> — [Wuher](https://starwars.fandom.com/wiki/Wuher), the Mos Eisley Cantina bartender

A robots.txt parser and classifier that helps you understand which bots are being blocked from your site—especially AI crawlers and search engines.

[![npm version](https://badge.fury.io/js/wuher.svg)](https://www.npmjs.com/package/wuher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

**This library powers part of [Spyglasses AI Visibility Reports](https://www.spyglasses.io/ai-visibility-report)** — free tools that show you exactly how ChatGPT, Google AI Overviews, Perplexity, Claude, and Gemini describe your brand and where you're recommended by AI.

---

## How Wuher can help for PR, SEO, and Marketing teams

In the age of AI search, **where you get linked matters more than ever**. But not all links are created equal.

### The Problem

When a website blocks AI crawlers in their `robots.txt`, any links from that site to your content become **invisible to AI**. This means:

- **ChatGPT, Claude, and Perplexity** can't see or cite those pages
- **AI Model Trainers** can't leverage the link to build brand authority in future model releases
- Your carefully earned backlinks and press coverage may provide **zero AI visibility value**

| Role | Impact |
|------|--------|
| **PR Professionals** | That Forbes or TechCrunch feature you landed? If they block AI crawlers, ChatGPT will never mention it when users ask about your client. |
| **SEO/AEO Specialists** | Traditional link-building metrics don't account for AI visibility. A DA 90 site that blocks ChatGPT-User provides zero AI citation value. |
| **Marketing Teams** | When evaluating partnerships, guest posts, or media placements, AI accessibility should be part of your criteria. |

### Use Wuher to Answer

- "Will this backlink help us appear in AI search results?"
- "Is our press coverage visible to ChatGPT and Google AI Overviews?"
- "Which of our referring domains are blocking AI crawlers?"

## Installation

```bash
npm install wuher
# or
yarn add wuher
# or
pnpm add wuher
```

## Quick Start

```typescript
import { analyze } from 'wuher';

// Pass the robots.txt content as a plain text string
const robotsTxt = `
User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /private/
`;

const result = analyze(robotsTxt);

console.log(result.classification); // 'yellow' - GPTBot is a training crawler
console.log(result.severity);       // 'warning'
console.log(result.summary);        // 'Additional bots blocked: GPTBot.'
```

## Input Format

**Wuher accepts robots.txt content as a plain text string.** 

Fetching the robots.txt is outside the scope of this library—this keeps it lightweight, testable, and usable in any environment (browser, Node.js, edge functions, Cloudflare Workers, etc.).

```typescript
// Example: Fetching and analyzing
const response = await fetch('https://example.com/robots.txt');
const robotsTxt = await response.text(); 
const result = analyze(robotsTxt);

// Example: From a file
import { readFileSync } from 'fs';
const robotsTxt = readFileSync('robots.txt', 'utf-8');
const result = analyze(robotsTxt);

// Example: Inline string
const robotsTxt = `
User-agent: *
Disallow: /
`;
const result = analyze(robotsTxt);
```

## API Reference

### `analyze(robotsTxt, options?)`

The main function to analyze a robots.txt file.

```typescript
import { analyze } from 'wuher';

const result = analyze(robotsTxt, {
  // Bot patterns that trigger 'red' classification
  redPatterns: [
    { name: 'ChatGPT User', patterns: ['chatgpt-user'] },
    { name: 'Googlebot', patterns: ['googlebot'] },
  ],
  
  // Bot patterns that trigger 'yellow' classification
  yellowPatterns: [
    { name: 'GPTBot', patterns: ['gptbot'] },
  ],
  
  // Whether User-agent: * with Disallow: / should be 'red' (default: true)
  wildcardDisallowIsRed: true,
  
  // Paths considered "significant" blocks (default: ['/'])
  // Set to null to flag ANY disallow as significant
  significantPaths: ['/'],
});
```

#### Returns: `WuherResult`

```typescript
interface WuherResult {
  classification: 'red' | 'yellow' | 'green';
  severity: 'error' | 'warning' | 'ok';
  hasWildcardDisallow: boolean;
  redMatches: MatchedBot[];
  yellowMatches: MatchedBot[];
  summary: string;
  parsedBlocks: ParsedUserAgentBlock[];
}
```

### `isBotBlocked(robotsTxt, pattern, significantPaths?)`

Quick check if a specific bot pattern is blocked.

```typescript
import { isBotBlocked } from 'wuher';

isBotBlocked(robotsTxt, 'chatgpt-user');  // true/false - AI assistant
isBotBlocked(robotsTxt, 'googlebot');     // true/false - Search crawler
isBotBlocked(robotsTxt, 'gptbot');        // true/false - Training crawler

// Check any disallow, not just root
isBotBlocked(robotsTxt, 'gptbot', null);  // true if ANY disallow exists
```

### `isAllowed(robotsTxt, userAgent, path?)`

Check if a user-agent is allowed to access a specific path.

```typescript
import { isAllowed } from 'wuher';

isAllowed(robotsTxt, 'ChatGPT-User', '/');        // Can ChatGPT browse this site?
isAllowed(robotsTxt, 'Googlebot', '/blog/');      // Can Google index this page?
isAllowed(robotsTxt, 'GPTBot', '/public/');       // Can OpenAI train on this?
```

### `parseRobotsTxt(robotsTxt)`

Parse a robots.txt into structured blocks.

```typescript
import { parseRobotsTxt } from 'wuher';

const blocks = parseRobotsTxt(robotsTxt);

// Each block contains:
// - userAgents: string[]
// - disallowRules: string[]
// - allowRules: string[]
// - crawlDelay?: number
// - rawLines: string[]
```

### `listUserAgents(robotsTxt)`

Get all user-agents mentioned in a robots.txt.

```typescript
import { listUserAgents } from 'wuher';

const agents = listUserAgents(robotsTxt);
// ['*', 'googlebot', 'gptbot', 'chatgpt-user', ...]
```

### `hasWildcardDisallow(blocks)`

Check if parsed blocks contain a wildcard disallow rule.

```typescript
import { parseRobotsTxt, hasWildcardDisallow } from 'wuher';

const blocks = parseRobotsTxt(robotsTxt);
const isBlocked = hasWildcardDisallow(blocks); // true if User-agent: * has Disallow: /
```

### `findBlockedBots(blocks, patterns, significantPaths?)`

Find which bots from a pattern list are blocked.

```typescript
import { parseRobotsTxt, findBlockedBots, DEFAULT_RED_PATTERNS } from 'wuher';

const blocks = parseRobotsTxt(robotsTxt);
const blocked = findBlockedBots(blocks, DEFAULT_RED_PATTERNS);
```

### `extractSitemaps(robotsTxt)`

Extract sitemap URLs from `Sitemap:` directives in a robots.txt file.

```typescript
import { extractSitemaps } from 'wuher';

const robotsTxt = `
User-agent: *
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml
`;

const { sitemapUrls } = extractSitemaps(robotsTxt);
console.log(sitemapUrls);
// ['https://example.com/sitemap.xml', 'https://example.com/sitemap-news.xml']
```

Not all sites put their sitemap at `/sitemap.xml`. Many declare the location in robots.txt using the `Sitemap:` directive. Use this function to find sitemaps when the well-known path doesn't work.

### `detectCloudflareChallenge(responseBody, responseHeaders?)`

Detect whether an HTTP response is a Cloudflare bot challenge instead of actual content.

```typescript
import { detectCloudflareChallenge } from 'wuher';

const response = await fetch('https://example.com/robots.txt');
const body = await response.text();

const detection = detectCloudflareChallenge(body, {
  server: response.headers.get('server') ?? undefined,
  cfRay: response.headers.get('cf-ray') ?? undefined,
});

if (detection.isCloudflareProtected) {
  console.log(`Blocked by Cloudflare: ${detection.protectionType}`);
  // protectionType: 'managed_challenge' | 'js_challenge' | 'turnstile' | 'block'
  
  if (detection.supportsWebBotAuth) {
    console.log('This site may accept Web Bot Auth signed requests');
  }
}
```

This is useful when fetching robots.txt or sitemaps programmatically. Many sites behind Cloudflare return a JavaScript challenge page (the "Just a moment..." page) instead of the actual content, even with a legitimate User-Agent. The detection identifies four types of Cloudflare protection:

| Type | Description |
|------|-------------|
| `managed_challenge` | Standard Cloudflare challenge page ("Just a moment...") |
| `js_challenge` | Legacy JavaScript challenge |
| `turnstile` | Cloudflare Turnstile CAPTCHA |
| `block` | Direct block (Error 1020: Access Denied) |

## Cloudflare Web Bot Auth

Sites protected by Cloudflare can use [Web Bot Auth](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/) to allow verified bots through their protection. Web Bot Auth uses HTTP Message Signatures ([RFC 9421](https://www.rfc-editor.org/rfc/rfc9421)) with Ed25519 keys to cryptographically prove a request comes from a known bot.

Wuher provides types and validation helpers for Web Bot Auth configuration. **Wuher does not handle key generation or request signing** — use Cloudflare's [`web-bot-auth`](https://www.npmjs.com/package/web-bot-auth) npm package for that.

### How It Works

1. **You generate** an Ed25519 key pair
2. **You host** a [key directory](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/#2-host-a-key-directory) at `/.well-known/http-message-signatures-directory` on your bot's domain
3. **You register** with Cloudflare via the Bot Submission Form
4. **Your bot signs** each request with `Signature`, `Signature-Input`, and `Signature-Agent` headers

### Wuher Helpers

```typescript
import {
  buildKeyDirectoryUrl,
  validateWebBotAuthConfig,
  detectCloudflareChallenge,
  type WebBotAuthConfig,
  type WebBotAuthHeaders,
} from 'wuher';

// Build the well-known URL for your key directory
const directoryUrl = buildKeyDirectoryUrl('mybot.example.com');
// 'https://mybot.example.com/.well-known/http-message-signatures-directory'

// Validate your Web Bot Auth configuration
const validation = validateWebBotAuthConfig({
  keyDirectoryUrl: directoryUrl,
  keyId: 'poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U',
  userAgent: 'MyBot/1.0',
});

if (!validation.valid) {
  console.error('Config errors:', validation.errors);
}

// Detect when Cloudflare is blocking your bot
const response = await fetch('https://target-site.com/robots.txt');
const body = await response.text();
const detection = detectCloudflareChallenge(body, {
  server: response.headers.get('server') ?? undefined,
  cfRay: response.headers.get('cf-ray') ?? undefined,
});

if (detection.isCloudflareProtected && detection.supportsWebBotAuth) {
  // This site is on Cloudflare and may accept signed requests.
  // Use the `web-bot-auth` npm package to sign your requests:
  //   npm install web-bot-auth
  // See: https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/
}
```

### Full Integration Example

```typescript
import { detectCloudflareChallenge, validateWebBotAuthConfig } from 'wuher';
// For actual signing, use Cloudflare's package:
// import { sign } from 'web-bot-auth';

async function fetchWithBotAuth(url: string) {
  // First attempt: normal fetch
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MyBot/1.0' },
  });
  const body = await response.text();

  // Check if blocked by Cloudflare
  const detection = detectCloudflareChallenge(body, {
    server: response.headers.get('server') ?? undefined,
    cfRay: response.headers.get('cf-ray') ?? undefined,
  });

  if (!detection.isCloudflareProtected) {
    return body; // Not blocked, use the response
  }

  if (!detection.supportsWebBotAuth) {
    throw new Error('Blocked by Cloudflare, Web Bot Auth not available');
  }

  // Second attempt: signed request using web-bot-auth package
  // const signedHeaders = await sign(url, privateKey, keyId, ...);
  // const signedResponse = await fetch(url, { headers: signedHeaders });
  // return await signedResponse.text();

  throw new Error('Web Bot Auth signing not configured');
}
```

## Understanding Classifications

Wuher classifies robots.txt restrictions into three levels based on their impact on your AI and search visibility:

### 🔴 Red (Critical)

**Immediate visibility impact.** This site is blocking some conbination of AI Assistants (ChatGPT, Claude, Gemini, etc.) or traditional search crawlers (Googlebot, Bingbot, etc.). Depending on what's blocked, your site will lose out on being included in 
- AI search results (Google AI Overviews & AI Mode)
- AI assistant responses when users browse the web (ChatGPT, Claude, Gemini)
- Traditional search engine results (Google, Bing)

### 🟡 Yellow (Warning)

**Future visibility impact.** These bots collect training data for AI models. Blocking them is a potentially valid choice (for copyright or competitive reasons), but means:
- Future AI models won't include your content in their training
- AI may have outdated or no knowledge of your brand/content
- You're opting out of the AI knowledge base

### 🟢 Green (OK)

**No significant restrictions.** This website's content is accessible to AI visitors and search crawlers.

## Default Bot Patterns

### Red Patterns (Critical) — AI Visitors & Search Crawlers

| Bot | Patterns | Company | Category |
|-----|----------|---------|----------|
| ChatGPT User | `chatgpt-user` | OpenAI | AI Assistant |
| Claude User | `claude-user` | Anthropic | AI Assistant |
| Gemini User | `gemini` | Google | AI Assistant |
| Mistral User | `mistral-user`, `mistral` | Mistral | AI Assistant |
| Perplexity User | `perplexitybot`, `perplexity-user` | Perplexity AI | AI Assistant |
| GoogleAgent URL Context | `google-agentspace`, `googleagent` | Google | AI Agent |
| LangChain | `langchain` | LangChain | AI Agent |
| Googlebot | `googlebot` | Google | Search Crawler |
| Bingbot | `bingbot` | Microsoft | Search Crawler |
| DuckDuckBot | `duckduckbot` | DuckDuckGo | Search Crawler |
| Yandex | `yandexbot`, `yandex` | Yandex | Search Crawler |
| Baiduspider | `baiduspider` | Baidu | Search Crawler |

### Yellow Patterns (Warning) — Model Training Crawlers

| Bot | Patterns | Company |
|-----|----------|---------|
| GPTBot | `gptbot` | OpenAI |
| ClaudeBot | `claudebot`, `claude-web` | Anthropic |
| Google-Extended | `google-extended` | Google |
| CCBot | `ccbot` | Common Crawl |
| Bytespider | `bytespider` | ByteDance |
| Amazonbot | `amazonbot` | Amazon |
| Applebot-Extended | `applebot-extended` | Apple |
| DeepSeek Bot | `deepseekbot`, `deepseek` | DeepSeek |
| Meta-ExternalAgent | `meta-externalagent`, `meta-externalfetcher`, `facebookbot` | Meta |
| Cohere | `cohere-ai`, `cohere` | Cohere |
| Diffbot | `diffbot` | Diffbot |

You can import and extend these:

```typescript
import { DEFAULT_RED_PATTERNS, DEFAULT_YELLOW_PATTERNS } from 'wuher';

const myRedPatterns = [
  ...DEFAULT_RED_PATTERNS,
  { name: 'MyCustomBot', patterns: ['mycustombot'] },
];
```

## Use Cases

### PR: Evaluate Media Placement Value

Check if a publication's robots.txt allows AI visibility before pitching:

```typescript
import { analyze, isBotBlocked } from 'wuher';

async function evaluateMediaOutlet(domain: string) {
  const response = await fetch(`https://${domain}/robots.txt`);
  const robotsTxt = await response.text();
  
  const result = analyze(robotsTxt);
  
  const report = {
    domain,
    aiVisibilityValue: result.classification === 'green' ? 'high' : 
                       result.classification === 'yellow' ? 'medium' : 'low',
    chatGptCanCite: !isBotBlocked(robotsTxt, 'chatgpt-user'),
    googleAiOverviews: !isBotBlocked(robotsTxt, 'googlebot'),
    recommendation: result.classification === 'red' 
      ? 'Consider alternative placements with AI-accessible sites'
      : 'Good for AI visibility'
  };
  
  return report;
}
```

### SEO/AEO: Audit Backlink AI Value

Analyze your backlink profile for AI visibility:

```typescript
import { analyze } from 'wuher';

async function auditBacklinkAIValue(referringDomains: string[]) {
  const results = await Promise.all(
    referringDomains.map(async (domain) => {
      try {
        const response = await fetch(`https://${domain}/robots.txt`);
        const robotsTxt = await response.text();
        const result = analyze(robotsTxt);
        
        return {
          domain,
          classification: result.classification,
          aiVisibilityScore: result.classification === 'green' ? 100 :
                            result.classification === 'yellow' ? 50 : 0,
          blockedBots: [...result.redMatches, ...result.yellowMatches]
            .map(m => m.name),
        };
      } catch {
        return { domain, classification: 'unknown', aiVisibilityScore: null };
      }
    })
  );
  
  const totalScore = results
    .filter(r => r.aiVisibilityScore !== null)
    .reduce((sum, r) => sum + (r.aiVisibilityScore ?? 0), 0);
  
  const avgScore = totalScore / results.filter(r => r.aiVisibilityScore !== null).length;
  
  return {
    domains: results,
    averageAIVisibilityScore: avgScore,
    redFlagDomains: results.filter(r => r.classification === 'red'),
  };
}
```

### Marketing: Validate Partnership Sites

Before investing in content partnerships or guest posts:

```typescript
import { analyze } from 'wuher';

async function validatePartnerSite(domain: string) {
  const response = await fetch(`https://${domain}/robots.txt`);
  const robotsTxt = await response.text();
  
  const result = analyze(robotsTxt);
  
  if (result.classification === 'red') {
    console.warn(`⚠️ ${domain} blocks AI visitors!`);
    console.warn('Content on this site will NOT appear in:');
    console.warn('  - ChatGPT browsing results');
    console.warn('  - Google AI Overviews');
    console.warn('  - Perplexity search results');
    result.redMatches.forEach(bot => {
      console.warn(`  - Blocked: ${bot.name} (${bot.metadata?.category})`);
    });
  }
  
  return result;
}
```

### Build Pipelines: Validate Your Own robots.txt

Ensure you're not accidentally blocking important crawlers:

```typescript
import { analyze } from 'wuher';
import { readFileSync } from 'fs';

const robotsTxt = readFileSync('public/robots.txt', 'utf-8');
const result = analyze(robotsTxt);

if (result.hasWildcardDisallow) {
  console.error('ERROR: robots.txt blocks all crawlers!');
  process.exit(1);
}

if (result.redMatches.length > 0) {
  console.error('ERROR: Critical bots are blocked:');
  result.redMatches.forEach(bot => {
    console.error(`  - ${bot.name}`);
  });
  process.exit(1);
}

console.log('✅ robots.txt allows AI visitors and search crawlers');
```

## TypeScript Support

Wuher is written in TypeScript and includes full type definitions:

```typescript
import type {
  WuherResult,
  WuherOptions,
  BotPattern,
  MatchedBot,
  ParsedUserAgentBlock,
  Classification,
  ClassificationSeverity,
  CloudflareDetectionResult,
  SitemapExtractionResult,
  WebBotAuthConfig,
  WebBotAuthHeaders,
} from 'wuher';
```

## FAQ

### Why "Wuher"?

Wuher is the bartender at the Mos Eisley Cantina in Star Wars who famously tells Luke Skywalker, "Your droids. They can't come in here." This is a perfect metaphor for what `robots.txt` does. It tells bots which parts of a website they can't access.

### Does this fetch robots.txt files?

No. Wuher only parses robots.txt content that you provide as a plain text string. Fetching is outside the scope of this library. This keeps it lightweight, testable, and usable in any JavaScript environment (browser, Node.js, edge functions, etc.).

### What's the difference between red and yellow bots?

**Red bots** are AI visitors that cite content in real-time (ChatGPT browsing, Perplexity search, Google AI Overviews) and search crawlers. Blocking them has immediate visibility impact.

**Yellow bots** are training crawlers that collect data for future AI models. Blocking them is a valid choice, but means future AI won't include your content in their knowledge base.

### How accurate is the classification?

The classification is based on pattern matching against user-agent strings. It uses sensible defaults based on the [Spyglasses AI bot database](https://www.spyglasses.io/bots), but you can customize the patterns for your specific needs.

### Can I use this in the browser?

Yes! Wuher has no Node.js-specific dependencies and works in any JavaScript environment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Orchestra AI, Inc.](https://orchestra.ai)

---

**Built with ❤️ by [Spyglasses](https://www.spyglasses.io)** — Complete visibility into your website's AI traffic.
