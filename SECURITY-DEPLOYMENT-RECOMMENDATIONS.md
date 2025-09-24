# Security Headers & Deployment Recommendations for LetsRace.cc

## Current Status ✅

**Implemented (GitHub Pages limitations):**
- ✅ Content Security Policy (CSP) meta tags added to all HTML files
- ✅ Improved CSP policy (removed `unsafe-eval`, tightened external domains)
- ✅ Added `frame-ancestors 'none'` for clickjacking protection via CSP
- ✅ Created `/.well-known/security.txt` for security contact
- ✅ Clear contact information on About page

## Limitations with GitHub Pages ⚠️

GitHub Pages **cannot set custom HTTP response headers**, which means:

- ❌ `X-Frame-Options` header cannot be set
- ❌ `X-Content-Type-Options: nosniff` cannot be set  
- ❌ `Strict-Transport-Security` (HSTS) cannot be set
- ❌ CSP `frame-ancestors` directive ignored when delivered via meta tag
- ❌ Other security headers cannot be set

## Recommended Solution: CDN/Proxy Implementation

To achieve full security header compliance, implement one of these solutions:

### Option 1: Cloudflare (Recommended - Free Plan Available)

**Setup:**
1. Sign up for Cloudflare (free plan sufficient)
2. Point domain `letsrace.cc` to Cloudflare nameservers
3. Configure GitHub Pages as origin server
4. Add security headers via Cloudflare Transform Rules

**Required Headers Configuration:**

```javascript
// Cloudflare Transform Rules - Response Headers
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://gc.zgo.at https://script.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://gc.zgo.at https://script.google.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Option 2: Netlify

**Setup:**
1. Create `_headers` file in repository root
2. Deploy to Netlify instead of GitHub Pages

**_headers file content:**
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://gc.zgo.at https://script.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://gc.zgo.at https://script.google.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Option 3: Vercel

**Setup:**
1. Create `vercel.json` in repository root
2. Deploy to Vercel

**vercel.json content:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://gc.zgo.at https://script.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://gc.zgo.at https://script.google.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

## Additional Security Improvements

### Future CSP Hardening (Remove unsafe-inline)

To further improve security, consider:

1. **Move inline styles to external files**
   - Extract critical CSS from HTML `<style>` blocks
   - Use external stylesheets with specific CSP sources

2. **Move inline scripts to external files**
   - Extract JavaScript from `<script>` blocks  
   - Use CSP nonces or hashes for remaining inline scripts

3. **Updated CSP (after removing inline content):**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' https://gc.zgo.at https://script.google.com; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://gc.zgo.at https://script.google.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
   ```

### DNS Security

- ✅ Verify A/AAAA records point to correct GitHub Pages IPs
- ✅ Ensure CNAME record is properly configured for `letsrace.cc`
- ✅ Enable DNSSEC if domain registrar supports it

### SSL/TLS

- ✅ GitHub Pages provides free SSL via Let's Encrypt
- ✅ Consider enabling HSTS preload list submission after implementing HSTS header

## Testing Tools

After implementing headers, test with:

- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Google Safe Browsing](https://transparencyreport.google.com/safe-browsing/search)

## Implementation Priority

**Immediate (Cloudflare recommended):**
1. Set up Cloudflare with security headers
2. Test all site functionality works correctly
3. Run security header tests

**Medium-term:**
1. Consider moving inline styles/scripts to files
2. Tighten CSP policy further
3. Monitor for any CSP violations

**Long-term:**
1. Regular security audits
2. Keep dependencies updated
3. Monitor for new security best practices