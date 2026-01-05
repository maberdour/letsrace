# Email Digest Functional Test Plan

This document provides comprehensive functional testing procedures for the LetsRace.cc email digest system. Functional testing verifies that the system behaves correctly from a business logic perspective - ensuring the right events appear in the right emails, emails are sent at the correct times, and all workflows function as expected.

**Prerequisites**: Before performing functional testing, ensure you have completed API testing as described in `API_TESTING_GUIDE.md`. API testing verifies that endpoints work correctly; functional testing verifies that business logic works correctly.

## Overview

Functional testing verifies:
- ✅ Events are correctly filtered by region and discipline
- ✅ Email content is accurate and complete
- ✅ Emails are sent at the scheduled times
- ✅ Unsubscribe functionality works correctly
- ✅ Edge cases are handled properly
- ✅ End-to-end workflows function correctly

## Prerequisites

Before functional testing, ensure you have:
- Completed API testing (see `API_TESTING_GUIDE.md`)
- Your API Gateway Invoke URL
- Your `ADMIN_TOKEN` (from Lambda environment variables)
- Access to your S3 bucket (`letsrace-subscribers-prod`)
- Test email addresses you can access
- Access to CloudWatch logs
- Knowledge of your event data structure and locations

## Test Scenario 1: Event Filtering by Region

**Objective**: Verify that subscribers only receive events matching their selected region.

**Steps**:

1. **Set up test data**:
   - Subscribe a test email with region: `"London & South East"`
   - Subscribe another test email with region: `"Scotland"`
   - Ensure you have events in your system for both regions

2. **Send test digests**:
   - Use `/test-digest` endpoint to send a digest to the London subscriber
   - Use `/test-digest` endpoint to send a digest to the Scotland subscriber

3. **Verify email content**:
   - **London subscriber's email**:
     - Should ONLY contain events in "London & South East" region
     - Should NOT contain events from other regions (Scotland, North West, etc.)
     - Check the email HTML source or rendered view
   - **Scotland subscriber's email**:
     - Should ONLY contain events in "Scotland" region
     - Should NOT contain events from other regions

4. **Check event data**:
   - Compare events in the emails against your event JSON files
   - Verify each event's `region` field matches the subscriber's region
   - Count events: The number should match events in your JSON files for that region

**Expected Result**: Each subscriber receives only events matching their selected region.

**How to Verify**:
- Open the email HTML source (view source in email client)
- Search for event titles or locations
- Cross-reference with your event JSON files at `https://www.letsrace.cc/events/road.json` (or other discipline files)
- Manually check that each event's region matches the subscriber's region

## Test Scenario 2: Event Filtering by Discipline

**Objective**: Verify that subscribers only receive events matching their selected disciplines.

**Steps**:

1. **Set up test data**:
   - Subscribe a test email with disciplines: `["Road"]`
   - Subscribe another test email with disciplines: `["Track", "BMX"]`
   - Ensure you have events in your system for Road, Track, and BMX

2. **Send test digests**:
   - Use `/test-digest` endpoint for the Road-only subscriber
   - Use `/test-digest` endpoint for the Track+BMX subscriber

3. **Verify email content**:
   - **Road subscriber's email**:
     - Should ONLY contain Road events
     - Should NOT contain Track, BMX, or other discipline events
   - **Track+BMX subscriber's email**:
     - Should contain BOTH Track AND BMX events
     - Should NOT contain Road events (unless they also match Track/BMX)

4. **Check discipline matching**:
   - Verify each event's discipline matches the subscriber's selected disciplines
   - Events with multiple disciplines should appear if ANY discipline matches

**Expected Result**: Each subscriber receives only events matching their selected disciplines.

**How to Verify**:
- Check the email HTML - events should be grouped by discipline
- Cross-reference with event JSON files
- Verify discipline names match exactly (case-sensitive: "Road" not "road")

## Test Scenario 3: Combined Region and Discipline Filtering

**Objective**: Verify that events are filtered by BOTH region AND discipline simultaneously.

**Steps**:

1. **Set up test data**:
   - Subscribe with: `"region": "London & South East"`, `"disciplines": ["Road"]`
   - Ensure you have:
     - Road events in London & South East (should appear)
     - Track events in London & South East (should NOT appear)
     - Road events in Scotland (should NOT appear)

2. **Send test digest**:
   - Use `/test-digest` endpoint with the same region and discipline

3. **Verify email content**:
   - Email should contain ONLY:
     - Road events
     - In London & South East region
   - Email should NOT contain:
     - Track events (wrong discipline)
     - Road events in Scotland (wrong region)
     - Any other mismatched combinations

**Expected Result**: Only events matching BOTH the region AND discipline filters appear.

**How to Verify**:
- Manually check each event in the email
- Verify both `region` and `discipline` fields match the subscriber's preferences
- Count events and compare with filtered results from your event JSON files

## Test Scenario 4: Email Content Accuracy

**Objective**: Verify that email content is accurate, complete, and properly formatted.

**Steps**:

1. **Send a test digest** using `/test-digest` endpoint

2. **Verify email structure**:
   - Email has a proper subject line
   - Email has a header/logo section
   - Events are organized into sections:
     - "New this week" (events from last 7 days)
     - "Coming up in the next 6 weeks" (upcoming events)
   - Email has an unsubscribe link at the bottom

3. **Verify event details**:
   For each event in the email, check:
   - **Event name/title** is present and correct
   - **Date** is displayed correctly
   - **Location** is present
   - **Discipline** is shown (if applicable)
   - **Link to event page** works (click it)
   - **Event description** is included (if available)

4. **Verify date ranges**:
   - "New this week" section:
     - Should only contain events from the last 7 days
     - Check event dates are within the correct range
   - "Coming up" section:
     - Should only contain events in the next 6 weeks
     - Check event dates are within the correct range
     - Should NOT contain events more than 6 weeks away

5. **Verify formatting**:
   - HTML renders correctly in email client
   - Links are clickable
   - Text is readable
   - No broken images or formatting issues

**Expected Result**: Email is well-formatted with accurate, complete event information.

**How to Verify**:
- Open email in multiple email clients (Gmail, Outlook, etc.)
- Click all links to verify they work
- Compare event details with source JSON files
- Check dates manually or use a date calculator

## Test Scenario 5: Scheduled Email Delivery

**Objective**: Verify that emails are sent at the scheduled time (e.g., 06:00 UK time on the subscriber's selected day).

**Steps**:

1. **Set up test subscribers**:
   - Subscribe with `"send_day": "Friday"`
   - Subscribe with `"send_day": "Monday"`
   - Note the current day and time

2. **Verify CloudWatch Events rule**:
   - Go to AWS Console → EventBridge (or CloudWatch → Events → Rules)
   - Find rule: `letsrace-daily-digest`
   - Verify:
     - Rule is enabled
     - Schedule is correct (e.g., `cron(0 6 * * ? *)` for 06:00 UTC)
     - Target is `letsrace-run-digest` Lambda function

3. **Wait for scheduled run** (or trigger manually):
   - **Option A**: Wait until the scheduled time (06:00 UK time)
   - **Option B**: Manually trigger using `/run-digest-now` endpoint (for immediate testing)

4. **Verify timing**:
   - Check CloudWatch logs for `letsrace-run-digest`
   - Verify execution time matches expected schedule
   - Check that emails were sent at the correct time

5. **Verify day matching**:
   - On Friday: Subscribers with `"send_day": "Friday"` should receive emails
   - On Monday: Subscribers with `"send_day": "Monday"` should receive emails
   - On other days: Subscribers should NOT receive emails (unless it's their send_day)

**Expected Result**: Emails are sent at the scheduled time, and only to subscribers whose `send_day` matches the current day.

**How to Verify**:
- Check email timestamps (when email was received)
- Check CloudWatch logs for execution times
- Verify only subscribers with matching `send_day` received emails
- Check S3 `subscribers.json` - `last_sent_at` field should be updated

## Test Scenario 6: Unsubscribe Functionality

**Objective**: Verify that unsubscribe requests are processed correctly and subscribers stop receiving emails.

**Steps**:

1. **Set up test subscriber**:
   - Subscribe a test email
   - Send a test digest to that email
   - Copy the unsubscribe token from the email

2. **Unsubscribe**:
   - Use the unsubscribe link from the email, OR
   - Use `/unsubscribe` API endpoint with the token

3. **Verify in S3**:
   - Open `subscribers.json` in S3
   - Find the subscriber record
   - Verify `"status": "unsubscribed"` (not `"active"`)

4. **Verify no further emails**:
   - Trigger a digest run using `/run-digest-now`
   - Check that the unsubscribed email did NOT receive an email
   - Verify in CloudWatch logs that the subscriber was skipped

5. **Verify unsubscribe confirmation**:
   - If using frontend: Verify confirmation page is displayed
   - If using API: Verify response indicates success

**Expected Result**: Unsubscribed users have status updated in S3 and do not receive further emails.

**How to Verify**:
- Check S3 `subscribers.json` file directly
- Check CloudWatch logs for `letsrace-run-digest` - should show subscriber skipped
- Verify email inbox - no new emails should arrive

## Test Scenario 7: Edge Cases and Error Handling

**Objective**: Verify the system handles edge cases and errors gracefully.

### 7.1 Empty Event Lists

**Steps**:
1. Subscribe with a region/discipline combination that has NO events
2. Send test digest
3. **Expected**: Email should still be sent, but with a message like "No new events this week" or empty sections

### 7.2 Invalid Region/Discipline

**Steps**:
1. Try to subscribe with invalid region (e.g., `"region": "Invalid Region"`)
2. **Expected**: API should return 400 error with validation message

### 7.3 Duplicate Subscriptions

**Steps**:
1. Subscribe the same email address twice with different preferences
2. **Expected**: Should update existing subscription (not create duplicate)
3. Verify in S3 - only one record exists for that email

### 7.4 Missing Event Data

**Steps**:
1. If event JSON files are temporarily unavailable
2. **Expected**: System should handle gracefully (log error, don't crash)
3. Check CloudWatch logs for error handling

### 7.5 Large Number of Subscribers

**Steps**:
1. Test with multiple subscribers (if possible)
2. Trigger digest run
3. **Expected**: All subscribers receive emails, no timeouts
4. Check Lambda timeout settings (should be 5 minutes for `run-digest`)

## Test Scenario 8: End-to-End Workflow

**Objective**: Verify the complete user journey from subscription to receiving emails.

**Steps**:

1. **Subscribe**:
   - Use frontend form or API to subscribe
   - Verify subscription confirmation message
   - Verify record created in S3

2. **Wait/Trigger Digest**:
   - Wait for scheduled time, OR
   - Use `/run-digest-now` to trigger immediately

3. **Receive Email**:
   - Check email inbox
   - Verify email contains correct events
   - Verify unsubscribe link is present

4. **Unsubscribe**:
   - Click unsubscribe link in email
   - Verify unsubscribe confirmation
   - Verify status updated in S3

5. **Verify No Further Emails**:
   - Trigger another digest run
   - Verify no email received

**Expected Result**: Complete workflow functions correctly from start to finish.

## Functional Testing Checklist

Use this checklist to ensure all functional aspects are tested:

**Event Filtering**:
- [ ] Events filtered correctly by region
- [ ] Events filtered correctly by discipline
- [ ] Combined region + discipline filtering works
- [ ] Events outside date ranges are excluded
- [ ] Events are grouped correctly in email

**Email Content**:
- [ ] Email structure is correct (header, sections, footer)
- [ ] Event details are accurate (name, date, location, discipline)
- [ ] Links to event pages work
- [ ] Unsubscribe link is present and functional
- [ ] Email renders correctly in multiple email clients

**Timing and Scheduling**:
- [ ] Scheduled digest runs at correct time
- [ ] Only subscribers with matching `send_day` receive emails
- [ ] `last_sent_at` is updated in S3 after sending
- [ ] Timezone handling is correct (UK time)

**Unsubscribe**:
- [ ] Unsubscribe link works
- [ ] Status updated to "unsubscribed" in S3
- [ ] Unsubscribed users don't receive further emails
- [ ] Unsubscribe confirmation is displayed

**Edge Cases**:
- [ ] Empty event lists handled gracefully
- [ ] Invalid input validation works
- [ ] Duplicate subscriptions handled correctly
- [ ] Missing data handled gracefully
- [ ] Large subscriber lists processed successfully

**End-to-End**:
- [ ] Complete subscription → email → unsubscribe workflow works
- [ ] Multiple subscribers processed correctly
- [ ] System handles errors without crashing

## How to Document Test Results

For each test scenario, document:

1. **Test Date/Time**: When the test was performed
2. **Test Environment**: Production, staging, or test
3. **Test Data Used**: Email addresses, regions, disciplines tested
4. **Results**: Pass/Fail for each verification point
5. **Issues Found**: Any problems discovered
6. **Screenshots/Evidence**: Email screenshots, S3 data, CloudWatch logs

**Example Test Result**:
```
Test Scenario 1: Event Filtering by Region
Date: 2024-01-15
Environment: Production
Test Data: 
  - Email1: london-test@example.com, Region: "London & South East"
  - Email2: scotland-test@example.com, Region: "Scotland"
Results:
  ✅ Email1 received only London & South East events
  ✅ Email2 received only Scotland events
  ✅ No cross-region events found
  ✅ Event counts matched expected values
Issues: None
```

## When to Run Functional Tests

- **After initial deployment**: Run all functional tests
- **After code changes**: Re-run relevant functional tests
- **Before production**: Complete functional test suite
- **Periodically**: Re-run critical tests (e.g., monthly)
- **After infrastructure changes**: Re-run timing/scheduling tests

## Troubleshooting Functional Test Failures

If a functional test fails:

1. **Check CloudWatch Logs**: Look for errors in Lambda execution logs
2. **Verify Event Data**: Check that event JSON files are correct and accessible
3. **Check S3 Data**: Verify subscriber records are correct
4. **Verify Configuration**: Check environment variables, IAM permissions
5. **Check Email Delivery**: Verify SES is working, check spam folders
6. **Compare with Expected**: Review what should happen vs. what actually happened

## Related Documentation

- **API Testing**: See `API_TESTING_GUIDE.md` for endpoint testing procedures
- **Deployment**: See `DEPLOYMENT_GUIDE.md` for deployment instructions
- **Quick Reference**: See `QUICK_START.md` for a quick checklist

---

**Recommended Testing Order**:
1. Complete API testing first (verify endpoints work) - see `API_TESTING_GUIDE.md`
2. Then perform functional testing (verify business logic works) - this document
3. Both are essential for a complete deployment

