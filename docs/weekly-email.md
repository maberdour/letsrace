# Weekly Email Digest – Functional Specification

## Overview
A privacy-friendly weekly digest that emails LetsRace.cc visitors with upcoming youth cycling events filtered by their chosen regions, disciplines, and delivery day. The system lives entirely within existing LetsRace infrastructure (static site + Google Apps Script + Google Sheets).

## Components
1. **Public signup page** (`pages/weekly-email.html`)  
   - Accessible form that posts to an Apps Script Web App endpoint.  
   - Collects email, region(s), discipline(s), preferred weekday, consent checkbox.  
   - Displays confirmation instructions and error states inline.

2. **Subscriber datastore**  
   - Google Sheet: https://docs.google.com/spreadsheets/d/13d2cjHHjpHhV4QvY6OA6NkeK_Rm2Zf3x4YH_UpBSO3c/edit  
   - Columns: email, regions, disciplines, weekday, status, confirmation token, token expiry, subscribed_at, confirmed_at, last_sent_at, unsubscribe_at, bounce_status, bounce_notes, manage_token.  
   - All timestamps stored in ISO (UTC) for audit; reporting converts to UK local time as needed.

3. **Apps Script project** (`scripts/google-apps/WeeklyDigest.gs`)  
   - **Signup handler (doPost)**: validates payload, writes/updates row in `pending` state, sends confirmation email through `MailApp`.  
   - **Confirmation handler (doGet)**: verifies token, flips status to `active`, logs `confirmed_at`, redirects to branded confirmation page.  
   - **Unsubscribe handler**: invalidates tokens, sets status `unsubscribed`, logs timestamp, redirects to confirmation page.  
   - **Preference manager**: optional GET that renders current settings and accepts updates (future extension).  
   - **Weekly sender**: time-based trigger (02:30 UTC / 03:30 UK) walks active subscribers, batches by weekday, composes plain-text email, records `last_sent_at`.  
   - **Cleanup job**: monthly trigger purges rows with `unsubscribe_at` or `bounce_status=hard` older than 12 months.

4. **Content assets** (`content/Email.md`, `content/Adverts.md`)  
   - Source copy for form, confirmation email, weekly template, unsubscribe messaging.  
   - Advert catalogue with optional targeting metadata and logo guidance.

5. **Static confirmation pages**  
   - `pages/email-confirmed.html`, `pages/email-unsubscribed.html`, `pages/email-error.html`, `pages/email-preferences-saved.html`.  
   - Each page uses the shared header/footer renderer for consistent layout.

## Data Flow
1. User submits form → Apps Script validates & writes sheet row.  
2. Script emails confirmation link (`/weekly-digest?token=...&action=confirm`).  
3. On confirm, status becomes `active`; script redirects to `pages/email-confirmed.html`.  
4. Daily at 03:30 UK, scheduled function loads manifest → new events JSON → filters 4–6 weeks ahead.  
5. Email composed: event sections, “Last chance” (<4 weeks), “New this week” (`last_updated` ≤ 7 days), advert from matching entry, CTA + privacy note.  
6. After successful send, `last_sent_at` updated; script respects MailApp quota by slicing batches (≤450 messages per run).  
7. Unsubscribe link hits script (`action=unsubscribe`), marks row, adds timestamp, redirects to confirmation page.  
8. Monthly cleanup deletes or anonymises data older than 12 months (configurable constant).

## Bounce Handling
- Outgoing emails use `hello@letsrace.cc` as `from`/`replyTo`.  
- Delivery failure notices arrive in the hello@ mailbox.  
- Operators review the mailbox and mark the subscriber’s `bounce_status` column as `suspected` or `hard`.  
- Weekly send function skips any row with `bounce_status` ≠ `ok`. Notes can store the original bounce message for audit.

## Accessibility
- Form uses semantic `<fieldset>` and `<legend>` elements with WCAG AA colour contrast.  
- All copy is plain text; emails wrap at 70 characters.  
- Advert logos include alt text; if the image fails, text still conveys the message.  
- Confirmation/unsubscribe pages mirror standard layout with left-aligned H1s (per project rules).

## Privacy & Compliance
- Double opt-in enforced before any email goes out.  
- Consent statement shown at signup and confirmed via email template.  
- No analytics pixels; all data stays within LetsRace systems.  
- Single-click unsubscribe in every digest; manage link allows preference updates (optional).  
- 12-month retention of inactive/unsubscribed data, then deletion via scheduled job.  
- Documentation retained in Git for audit trail.

## Monitoring & Control
- Sheet contains a `paused` checkbox at the top; when true, weekly sender aborts without emailing.  
- Script logs each send (App Script `Logger` + optional Sheet “Send Log” tab).  
- Admin instructions included in this doc for re-deploying the Web App and adjusting triggers.  
- To temporarily stop all mail, remove the time-based trigger or set `PAUSE_ALL_MAIL=true` constant.

## Deployment Checklist
1. Copy `scripts/google-apps/WeeklyDigest.gs` into the existing Apps Script project.  
2. Update script properties (`SUBSCRIBER_SHEET_ID`, `WEB_APP_BASE_URL`, `SITE_BASE_URL`).  
3. Deploy as Web App with “Anyone, even anonymous” access (POST/GET).  
4. Add time-driven triggers via Apps Script UI:  
   - `sendWeeklyDigests` → Daily between 04:00–05:00 UK time.  
   - `cleanupWeeklyDigestData` → Weekly on Sunday between 00:00–01:00 UK time.  
5. Publish new static pages and update navigation in the repo; rebuild site.  
6. Create initial advert entries and verify fallback behaviour.  
7. Perform end-to-end test: signup, confirmation, weekly job (using manual trigger), unsubscribe.

## Support Contacts
- **Operational owner:** hello@letsrace.cc  
- **Technical maintainer:** hello@markaberdour.com  
- **Escalation path:** pause trigger → investigate sheet entries → update documentation as needed.

