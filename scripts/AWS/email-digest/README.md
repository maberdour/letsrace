# LetsRace.cc Email Digest - AWS Lambda Functions

This directory contains AWS Lambda functions for the LetsRace.cc email digest system, implementing the Email Digest Specification.

## Structure

- `shared/` - Shared utilities and modules
  - `utils.js` - Common utilities (validation, date handling, token generation)
  - `s3.js` - S3 operations for subscribers.json
  - `digest.js` - Digest generation logic (HTML, filtering, email content)
- `subscribe.js` - Public endpoint for subscriptions
- `preview-digest.js` - Admin endpoint for previewing digest HTML
- `test-digest.js` - Admin endpoint for sending test emails
- `unsubscribe.js` - Public endpoint for unsubscribing
- `run-digest.js` - Scheduled Lambda for daily digest sending
- `run-digest-now.js` - Admin endpoint for manually triggering digest run

## Setup

### 1. Install Dependencies

```bash
cd scripts/aws/email-digest
npm install
```

### 2. Configure Environment Variables

Set the following environment variables in your Lambda function configurations:

- `S3_BUCKET_SUBSCRIBERS` - S3 bucket name for subscribers.json (default: `letsrace-subscribers-prod`)
- `SUBSCRIBERS_OBJECT_KEY` - Object key for subscribers.json (default: `subscribers.json`)
- `EVENTS_BASE_URL` - Base URL for event JSON files (default: `https://www.letsrace.cc`)
- `SES_FROM_ADDRESS` - Email address to send from (default: `noreply@letsrace.cc`)
- `SES_REGION` - AWS SES region (default: `us-east-1`)
- `ADMIN_TOKEN` - Secret token for admin endpoints (REQUIRED)
- `BASE_WEBSITE_URL` - Base URL of the website (default: `https://www.letsrace.cc`)
- `UNSUBSCRIBE_PAGE_URL` - URL of unsubscribe confirmation page
- `TOKEN_SECRET` - Secret for signing unsubscribe tokens (defaults to ADMIN_TOKEN if not set)

### 3. Deploy to AWS Lambda

Each function should be deployed as a separate Lambda function:

1. **subscribe** - Public API endpoint for subscriptions
2. **preview-digest** - Admin API endpoint for previews
3. **test-digest** - Admin API endpoint for test sends
4. **unsubscribe** - Public API endpoint for unsubscribing
5. **run-digest** - Scheduled Lambda (triggered by CloudWatch Events)
6. **run-digest-now** - Admin API endpoint for manual runs

### 4. Configure API Gateway

Wire each function to API Gateway:

- `/subscribe` → `subscribe.js` (POST)
- `/preview-digest` → `preview-digest.js` (POST, requires X-Admin-Token)
- `/test-digest` → `test-digest.js` (POST, requires X-Admin-Token)
- `/unsubscribe` → `unsubscribe.js` (POST)
- `/run-digest-now` → `run-digest-now.js` (POST, requires X-Admin-Token)

Enable CORS for all endpoints:
- Allowed origins: `https://www.letsrace.cc`, `http://localhost:8000`
- Allowed methods: `POST`, `OPTIONS`
- Allowed headers: `Content-Type`, `X-Admin-Token`

### 5. Configure CloudWatch Events

Set up a scheduled rule to trigger `run-digest.js` daily at 06:00 Europe/London time:

```json
{
  "scheduleExpression": "cron(0 6 * * ? *)",
  "timezone": "Europe/London"
}
```

**Note**: For 06:00 UK time, use `cron(0 6 * * ? *)` in winter/GMT (06:00 UTC = 06:00 UK) or `cron(0 5 * * ? *)` in summer/BST (05:00 UTC = 06:00 UK). Adjust twice a year for daylight saving time, or use timezone-aware scheduling.

### 6. Set Up S3 Bucket

Create S3 bucket `letsrace-subscribers-prod` (or configure name via environment variable):

- Create bucket
- Set appropriate IAM permissions for Lambda functions to read/write
- Initial `subscribers.json` should be an empty array: `[]`

### 7. Configure IAM Permissions

Lambda functions need the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::letsrace-subscribers-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### 8. Verify SES Configuration

- Verify sender email address or domain (`SES_FROM_ADDRESS`) in SES (domain verification recommended for `noreply@` addresses)
- If SES is in sandbox mode, verify recipient addresses for testing
- Request production access for sending to any email address

## Testing

### Test Subscribe Endpoint

```bash
curl -X POST https://your-api-gateway-url/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "region": "London & South East",
    "disciplines": ["Road", "Track"],
    "send_day": "Friday"
  }'
```

### Test Preview Digest (Admin)

```bash
curl -X POST https://your-api-gateway-url/preview-digest \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "region": "London & South East",
    "disciplines": ["Road", "Track"]
  }'
```

### Test Digest Send (Admin)

```bash
curl -X POST https://your-api-gateway-url/test-digest \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "email": "your-email@example.com",
    "region": "London & South East",
    "disciplines": ["Road", "Track"]
  }'
```

## Data Format

### Subscriber Record

```json
{
  "id": "uuid",
  "email": "subscriber@example.com",
  "region": "London & South East",
  "disciplines": ["Road", "Track"],
  "send_day": "Friday",
  "status": "active",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "last_sent_at": "2024-01-05T06:00:00.000Z",
  "last_error": null
}
```

### subscribers.json Format

```json
[
  { /* subscriber1 */ },
  { /* subscriber2 */ }
]
```

## Notes

- All functions use Europe/London timezone for date calculations
- Unsubscribe tokens are valid for 30 days
- Digest includes events from the last 7 days (new) and next 6 weeks (upcoming)
- Individual send failures don't stop the batch process
- S3 uses last-write-wins concurrency model (acceptable for low subscriber volume)

