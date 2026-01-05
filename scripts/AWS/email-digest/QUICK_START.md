# Email Digest Quick Start Checklist

A condensed checklist version of the deployment guide. See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Prerequisites

- [ ] AWS Account
- [ ] AWS CLI installed and configured
- [ ] Node.js installed (16+ required for crypto.randomUUID, but Lambda uses 18.x)

## Step 1: Install Dependencies

```bash
cd scripts/AWS/email-digest
npm install
```

## Step 2: Create S3 Bucket

- [ ] Create bucket: `letsrace-subscribers-prod`
- [ ] Upload empty `subscribers.json`: `[]`

## Step 3: Configure SES

- [ ] Verify sender email or domain: `noreply@letsrace.cc` (domain verification recommended)
- [ ] Request production access (if in sandbox)
- [ ] Note your SES region

## Step 4: Create IAM Role

- [ ] Create role: `letsrace-email-digest-role`
- [ ] Attach policies: `AmazonS3FullAccess`, `AmazonSESFullAccess`

## Step 5: Create Lambda Functions

Create 6 functions with these names:

1. [ ] `letsrace-subscribe`
2. [ ] `letsrace-unsubscribe`
3. [ ] `letsrace-preview-digest`
4. [ ] `letsrace-test-digest`
5. [ ] `letsrace-run-digest-now`
6. [ ] `letsrace-run-digest` (timeout: 5 minutes)

### For Each Function:

- [ ] Runtime: Node.js 18.x
- [ ] Execution role: `letsrace-email-digest-role`
- [ ] Upload code (zip file with index.js + shared/ + node_modules/ - packaging script renames function files to index.js)
- [ ] Set environment variables:
  ```
  S3_BUCKET_SUBSCRIBERS=letsrace-subscribers-prod
  SUBSCRIBERS_OBJECT_KEY=subscribers.json
  EVENTS_BASE_URL=https://www.letsrace.cc
  SES_FROM_ADDRESS=noreply@letsrace.cc
  SES_REGION=us-east-1
  BASE_WEBSITE_URL=https://www.letsrace.cc
  UNSUBSCRIBE_PAGE_URL=https://www.letsrace.cc/pages/email-unsubscribed.html
  TOKEN_SECRET=[generate-random-secret]
  ADMIN_TOKEN=[generate-random-secret]
  ```
- [ ] Timeout: 30 seconds (5 minutes for `run-digest`)

### Package Functions

**Mac/Linux:**
```bash
chmod +x package-functions.sh
./package-functions.sh
```

**Windows:**
```powershell
.\package-functions.ps1
```

## Step 6: Create API Gateway

- [ ] Create REST API: `letsrace-email-digest-api`
- [ ] Enable CORS on API
- [ ] Create resources and methods:
  - [ ] `/subscribe` → POST → `letsrace-subscribe`
  - [ ] `/unsubscribe` → POST → `letsrace-unsubscribe`
  - [ ] `/preview-digest` → POST → `letsrace-preview-digest`
  - [ ] `/test-digest` → POST → `letsrace-test-digest`
  - [ ] `/run-digest-now` → POST → `letsrace-run-digest-now`
- [ ] Enable CORS on each resource
- [ ] Use Lambda Proxy integration (✅)
- [ ] Deploy to `prod` stage
- [ ] Copy Invoke URL (you'll need this)

## Step 7: Update Frontend

- [ ] Update `pages/weekly-email.html` with API Gateway URL
- [ ] Update `pages/email-unsubscribed.html` with API Gateway URL
- [ ] Update `pages/admin-email-digest.html` with API Gateway URL

## Step 8: Create CloudWatch Events Rule

- [ ] Create rule: `letsrace-daily-digest`
- [ ] Schedule: `cron(0 6 * * ? *)` (06:00 UK time in winter/GMT - adjust to `cron(0 5 * * ? *)` for summer/BST)
- [ ] Target: `letsrace-run-digest` Lambda function

## Step 9: Test

- [ ] Test subscribe endpoint (curl or frontend)
- [ ] Test unsubscribe endpoint
- [ ] Test preview-digest (admin)
- [ ] Test test-digest (admin)
- [ ] Test frontend form
- [ ] Test manual digest run
- [ ] Check CloudWatch logs

## Step 10: Generate Secrets

```bash
# Mac/Linux
openssl rand -hex 32

# Or use online generator
```

Save secrets securely!

## Common Commands

### Package functions for upload
```bash
./package-functions.sh    # Mac/Linux
.\package-functions.ps1   # Windows
```

### Test subscribe endpoint
```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","region":"London & South East","disciplines":["Road"],"send_day":"Friday"}'
```

### Update Lambda function via AWS CLI
```bash
aws lambda update-function-code \
  --function-name letsrace-subscribe \
  --zip-file fileb://subscribe.zip
```

## Environment Variables (Copy-Paste)

```
S3_BUCKET_SUBSCRIBERS=letsrace-subscribers-prod
SUBSCRIBERS_OBJECT_KEY=subscribers.json
EVENTS_BASE_URL=https://www.letsrace.cc
SES_FROM_ADDRESS=no-reply@letsrace.cc
SES_REGION=us-east-1
BASE_WEBSITE_URL=https://www.letsrace.cc
UNSUBSCRIBE_PAGE_URL=https://www.letsrace.cc/pages/email-unsubscribed.html
TOKEN_SECRET=CHANGE_ME_GENERATE_RANDOM_32_CHARS
ADMIN_TOKEN=CHANGE_ME_GENERATE_RANDOM_32_CHARS
```

## Troubleshooting

**Lambda errors?** → Check CloudWatch Logs  
**CORS errors?** → Verify CORS enabled on API Gateway resources  
**Access denied?** → Check IAM role permissions  
**Email not sent?** → Verify SES email, check sandbox mode  

## Cost Estimate

- **Free Tier**: Most services free for 1 year
- **After Free Tier**: ~$1-5/month for 1,000 subscribers
- **Monitor**: AWS Cost Explorer

