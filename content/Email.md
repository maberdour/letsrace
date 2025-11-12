# Weekly Email Copy Library

## Signup Form
- **Title:** Stay ahead of the next start line
- **Intro:** Pick your regions, disciplines, and the weekday you’d like your update. We’ll send one plain-text email each week — no tracking, no spam.
- **Consent:** _Your details are only used to send this weekly digest. You can unsubscribe any time and we’ll remove your data within 12 months of leaving._
- **Submit button:** `Send me my weekly digest`
- **Success message (post-submit):** _Thanks! Please check your inbox to confirm your email address._

## Double Opt-In Email
- **Subject:** Confirm your LetsRace.cc weekly digest
- **Preview text:** Click the link below to start your customised race updates.
- **Body:**
  ```
  Hi there,

  You asked to receive the LetsRace.cc weekly email for youth cycling events.

  Please confirm by visiting the link below — it only takes a moment:
  {{CONFIRM_LINK}}

  We’ll send one plain-text email on {{WEEKDAY}} with events for:
  • Regions: {{REGIONS}}
  • Disciplines: {{DISCIPLINES}}

  If you didn’t make this request, you can ignore this email and nothing else will happen.

  Thanks for supporting youth cycling,
  The LetsRace.cc team
  ```

## Weekly Digest Template (Plain Text)
```
Hi {{FIRST_NAME_OR_FRIEND}},

Here’s what’s coming up in the next 4–6 weeks for {{DISCIPLINE_LIST}} riders in the {{REGION_LIST}} region(s).

Plan ahead — most events close entries about a week before race day, so enter early if you can.

{{ADVERT_SECTION}}

{{EVENT_GROUPS}}

Last chance to enter (happening within 4 weeks):
{{LAST_CHANCE_EVENTS}}

Newly added this week:
{{NEW_EVENTS}}

See the full calendar any time at https://letsrace.cc

Need to tweak your preferences or pause emails? Manage everything here:
{{MANAGE_LINK}}

You’re receiving this because you asked for the LetsRace.cc weekly digest on {{SUBSCRIBED_DATE}}.
Unsubscribe instantly: {{UNSUBSCRIBE_LINK}}
Privacy info: https://letsrace.cc/pages/privacy.html

Thanks for supporting youth cycling,
LetsRace.cc
```

### Event Group Rendering
- **Heading format:** `== {{DISCIPLINE}} ==`
- **Event line:** `• {{DATE}} — {{NAME}} ({{REGION}}){{NEW_FLAG}}{{CLOSING_SOON_FLAG}}`
- **New flag copy:** ` [New this week]`
- **Closing soon flag copy:** ` [Last chance]`

### Advert Section Guidance
- Default to: `Support from local partners keeps youth racing rolling. This week: {{ADVERT_COPY}}`
- If no advert matches, use: `Know a club or shop that should be here? Let them know about LetsRace.cc weekly emails.`

## Unsubscribe Confirmation Page
```
Title: You’re off the list
Body: You’ve been unsubscribed from the LetsRace.cc weekly digest. We’ll keep your settings for up to 12 months in case you change your mind — after that we delete everything. 
CTA: Want to come back later? Rejoin anytime at https://letsrace.cc/pages/weekly-email.html
```

## Preference-Updated Page
```
Title: Preferences saved
Body: Thanks — your weekly digest will now arrive on {{WEEKDAY}} with updates for {{REGIONS}} and {{DISCIPLINES}}. You can tweak this any time; each email includes a link back to this page.
```

## Error States
- **Expired/invalid confirmation link:** _Sorry, that confirmation link has expired. Please sign up again and we’ll send you a fresh email._
- **Already subscribed:** _You’re already confirmed. If you want to adjust your preferences, use the manage link inside any weekly email._
- **Unknown email:** _We couldn’t find that email address. It may have been removed after inactivity. Please sign up again if you’d like to restart the digest._


