# wuher

## 1.1.0

### Minor Changes

- Add `extractSitemaps()` to parse `Sitemap:` directives from robots.txt content
- Add `detectCloudflareChallenge()` to identify Cloudflare bot protection in HTTP responses (managed challenge, JS challenge, Turnstile, block)
- Add Web Bot Auth interoperability: `WebBotAuthConfig` / `WebBotAuthHeaders` types, `buildKeyDirectoryUrl()`, and `validateWebBotAuthConfig()` helpers for Cloudflare verified bot integration
- Add `CloudflareDetectionResult` and `SitemapExtractionResult` types

## 1.0.1

### Patch Changes

- adding changesets and npm publish
