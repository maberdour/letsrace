# Email Digest Deployment Guide

This is a step-by-step guide to deploy the LetsRace.cc email digest system to AWS.

## Prerequisites

1. **AWS Account** - You need an AWS account with appropriate permissions

## Step 1: Create S3 Bucket for Subscribers (PROGRESS: Completed)

1. **Open AWS Console** → Go to S3
2. **Click "Create bucket"**
3. **Bucket name**: `letsrace-subscribers-prod` (or your preferred name)
4. **Region**: Choose your preferred region (e.g., `us-east-1`, `eu-west-2` for London)
5. **Keep "Block all public access" checked** (recommended for security - Lambda functions access via IAM, not public URLs)
6. **Versioning**: Optional, but recommended for backups
7. **Click "Create bucket"**

8. **Create initial subscribers.json file**:
   - Click into your bucket
   - Click "Upload"
   - Create a file called `subscribers.json` with this content:
   ```json
   []
   ```
   - Upload it to the root of the bucket

## Step 2: Configure Amazon SES (Simple Email Service)

### 2.1 Verify Your Domain and Move Out of Sandbox (PROGRESS: Completed)

1. **Open AWS Console** → Go to SES (Simple Email Service)

2. **Verify your domain** (required for `noreply@letsrace.cc` and recommended for production): 
   - Go to "Verified identities" → "Create identity"
   - Choose "Domain"
   - Enter: `letsrace.cc` (verify the root domain, not just www.letsrace.cc)
   - Click "Create identity"
   - AWS will provide DNS records (TXT and/or CNAME) that you need to add to your domain's DNS settings
   - Add these records to your domain's DNS (wherever you manage DNS for letsrace.cc)
   - Wait for verification (usually a few minutes, but can take up to 72 hours)
   - Once verified, you can send from ANY email address under that domain (e.g., `noreply@letsrace.cc`, `hello@letsrace.cc`, etc.)
   - **This is the only way to use addresses like `noreply@` that don't have inboxes for email verification**
   
   **Alternative: Verify individual email addresses** (only if you have inbox access):
   - Go to "Verified identities" → "Create identity"
   - Choose "Email address"
   - Enter the email address (e.g., `hello@letsrace.cc`)
   - Click "Create identity"
   - Check your email inbox and click the verification link
   - **Note**: This only works for addresses with accessible inboxes. For `noreply@` addresses, you must use domain verification.

3. **If you're in SES Sandbox** (most new accounts are):
   - You'll need to verify both sender AND recipient email addresses
   - In sandbox mode, you can only send to verified email addresses
   - This is for testing purposes only

4. **To move out of Sandbox** (required for production): 
   - Go to "Account dashboard"
   - Click "Request production access"
   - Fill out the form explaining your use case
   - Wait for approval (usually 24-48 hours)

### 2.2 Note Your SES Region (PROGRESS: eu-west-2)

- Remember which region you're using SES in (e.g., `us-east-1`)
- You'll need this for the Lambda environment variables

## Step 3: Create IAM Role for Lambda Functions (PROGRESS: Completed)

1. **Open AWS Console** → Go to IAM
2. **Click "Roles"** → "Create role"
3. **Select "AWS service"** → Choose "Lambda"
4. **Click "Next"**

5. **Attach policies**:
   - Search and attach: `AmazonS3FullAccess` (or create a more restricted policy)
   - Search and attach: `AmazonSESFullAccess` (or create a more restricted policy)

6. **Click "Next"**

7. **Role name**: `letsrace-email-digest-role`
8. **Click "Create role"**

## Step 4: Create Lambda Functions (PROGRESS: Completed)

**IMPORTANT - Install Dependencies First**:
Before creating Lambda functions, you need to install the AWS SDK v3 dependencies:

1. Open a terminal/command prompt
2. Navigate to the email-digest directory:
   ```bash
   cd scripts/AWS/email-digest
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. This will create a `node_modules` folder with `@aws-sdk/client-s3` and `@aws-sdk/client-ses` packages

You need to create **6 Lambda functions**. I'll show you how to create the first one, then repeat for the others.

### 4.1 Create Subscribe Lambda (PROGRESS: Completed)

1. **Open AWS Console** → Go to Lambda
2. **Click "Create function"**
3. **Choose "Author from scratch"**
4. **Function name**: `letsrace-subscribe`
5. **Runtime**: `Node.js 18.x` (or latest available)
6. **Architecture**: `x86_64`
7. **Execution role**: Choose "Use an existing role" → Select `letsrace-email-digest-role`
8. **Click "Create function"**

9. **Package and upload code**:
   
   **IMPORTANT**: The code uses AWS SDK v3, which must be packaged with your Lambda function. You have two options:
   
   **Option A: Use Lambda Layers (Recommended for multiple functions)**
   - Create a Lambda Layer with AWS SDK v3 packages
   - Attach the layer to all Lambda functions
   - Then upload just your code files
   
   **Option B: Package dependencies with code (Easier for first-time setup)**
   - Use the packaging scripts provided (`package-functions.sh` or `package-functions.ps1`)
   - Or manually create a ZIP file with `node_modules` included
   
   **Manual Upload Steps (if not using packaging script)**:
   - Scroll down to "Code source"
   - Lambda creates a default `index.js` file - **keep this file name** (don't rename it)
   - Delete the default code in `index.js`
   - Open `scripts/AWS/email-digest/subscribe.js` from your computer
   - Copy the entire file contents
   - Paste into the `index.js` file in the Lambda editor
   - Click "Deploy"
   
   **Important**: You also need to include the shared utility files. After pasting the code into `index.js`, you'll need to:
   - In the Lambda code editor, create a new folder called `shared` (click the folder icon or "Add file" → "Add folder")
   - Create a new file in the `shared` folder called `utils.js` and paste the contents from `scripts/AWS/email-digest/shared/utils.js`
   - Create a new file in the `shared` folder called `s3.js` and paste the contents from `scripts/AWS/email-digest/shared/s3.js`
   - Create a new file in the `shared` folder called `digest.js` and paste the contents from `scripts/AWS/email-digest/shared/digest.js`
   - **For AWS SDK v3**: You need to include `node_modules` folder with `@aws-sdk/client-s3` and `@aws-sdk/client-ses` packages
   - Click "Deploy" again
   
   **Recommended: Use packaging script** (see below)
   
   **9b. Package using script (Recommended)**:
   - After installing dependencies with `npm install`, use the packaging script:
     - **Windows**: Run `.\package-functions.ps1` in PowerShell
     - **Mac/Linux**: Run `./package-functions.sh` (make executable first: `chmod +x package-functions.sh`)
   - This creates ZIP files for each function with all dependencies included
   - Upload each ZIP file to its corresponding Lambda function:
     - Lambda Console → Function → Code tab → Upload from → ".zip file"
     - Select the appropriate ZIP file (e.g., `subscribe.zip` for `letsrace-subscribe`)
     - Click "Save"
   
   **Important - Handler Configuration**:
   - The handler tells Lambda which file and function to run
   - In the Lambda console, look for "Runtime settings" (might be in Configuration → Runtime settings, or at the top of the Code tab)
   - Handler should be: `index.handler` (not `index.mjs.handler` or anything else)
   - If you see `index.mjs` or anything else, change it to `index.handler`
   - Click "Save"
   
   **Note**: If you don't see a Handler field, it might be automatically set. Make sure your main file is named `index.js` (not `index.mjs`)
   
   **Note**: The code uses Node.js's built-in `crypto.randomUUID()` for generating UUIDs (available in Node.js 16+). The code uses AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/client-ses`), which must be included in the Lambda deployment package. Install dependencies with `npm install` in the `scripts/AWS/email-digest` directory before packaging.

10. **Set environment variables**:
    - Scroll to "Configuration" tab → "Environment variables"
    - Click "Edit" → "Add environment variable" for each:
    
    | Key | Value | Notes |
    |-----|-------|-------|
    | `S3_BUCKET_SUBSCRIBERS` | `letsrace-subscribers-prod` | Your S3 bucket name |
    | `SUBSCRIBERS_OBJECT_KEY` | `subscribers.json` | |
    | `EVENTS_BASE_URL` | `https://www.letsrace.cc` | |
    | `SES_FROM_ADDRESS` | `noreply@letsrace.cc` | Your verified SES email |
    | `SES_REGION` | `eu-west-2` | Your SES region |
    | `BASE_WEBSITE_URL` | `https://www.letsrace.cc` | |
    | `UNSUBSCRIBE_PAGE_URL` | `https://www.letsrace.cc/pages/email-unsubscribed.html` | |
    | `TOKEN_SECRET` | `[Generate a random secret]` | See below |
    | `ADMIN_TOKEN` | `[Generate a random secret]` | See below |

    **To generate secrets**:
    - Use an online generator like: https://randomkeygen.com/
    - Generate a random 32+ character string for each secret
    
    - Save the secrets somewhere secure (password manager)
    - Click "Save"

11. **Set timeout**:
    - Configuration tab → "General configuration" → "Edit"
    - Timeout: `30 seconds` (should be enough)
    - Click "Save"

### 4.2 Repeat for Other Lambda Functions (PROGRESS: Completed)

Repeat steps 4.1 for each of these functions (use the same environment variables):

1. **`letsrace-unsubscribe`**
   - Copy/paste `unsubscribe.js` + create `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` files

2. **`letsrace-preview-digest`**
   - Copy/paste `preview-digest.js` + create `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` files

3. **`letsrace-test-digest`**
   - Copy/paste `test-digest.js` + create `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` files

4. **`letsrace-run-digest-now`**
   - Copy/paste `run-digest-now.js` + create `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` files

5. **`letsrace-run-digest`** (the scheduled one)
   - Copy/paste `run-digest.js` + create `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` files
   - Same environment variables
   - **Important**: For this one, also set:
     - Configuration → General configuration → Edit
     - Timeout: `5 minutes` (or more, depending on subscriber count)

**Note**: For each Lambda function, you need to create the `shared/` folder structure in the Lambda code editor and paste the contents of:
- `shared/utils.js`
- `shared/s3.js`
- `shared/digest.js`

## Step 5: Create API Gateway (PROGRESS: Completed)

**Payment Note**: With Amazon API Gateway, you only pay when your APIs are in use. There are no minimum fees or upfront commitments. For HTTP and REST APIs, you pay based on API calls received and amount of data transferred out. For WebSocket APIs, you pay based on number of messages and connection duration.

1. **Open AWS Console** → Go to API Gateway
2. **Click "Create API"**
3. **Choose "REST API"** → "Build"
4. **API name**: `letsrace-email-digest-api`
5. **Description**: `API for LetsRace.cc email digest`
6. **Endpoint Type**: `Regional` (or Edge if you want)
7. **Click "Create API"**

### 5.1 Create Resources and Methods (PROGRESS: Completed)

For each endpoint, create a resource and method. The UI may look slightly different depending on which version of the AWS Console you're using.

#### Subscribe Endpoint

1. **In the left sidebar, click on "Resources"** (or you might already be on the Resources page)
2. **Create a new resource**:
   - Look for a button or menu that says **"Create Resource"** or **"Actions"** → "Create Resource"
   - Resource Name: `subscribe`
   - Resource Path: `subscribe`
   - Enable API Gateway CORS: ✅ (check this box if available)
   - Click "Create Resource"

3. **Click on the `subscribe` resource** you just created (in the left sidebar or in the main panel)

4. **Create a POST method**:
   - Look for **"Create Method"** button, or **"Actions"** menu → "Create Method"
   - From the dropdown, choose `POST`
   - Click the checkmark or "Create Method" button
   - You'll see method details/settings:
     - **Integration type**: Choose `Lambda Function`
     - **Use Lambda Proxy integration**: ✅ **CHECK THIS** (very important!)
     - **Lambda Region**: Select your region (e.g., `us-east-1`)
     - **Lambda Function**: Type `letsrace-subscribe` or select it from dropdown
     - Click **"Save"**
     - **Note**: You may or may not see a permission prompt. If you see a message about giving API Gateway permission to invoke your Lambda function, click **"OK"** or **"Add Permission"**. If you don't see this message, that's fine - the permissions are usually created automatically.

5. **Enable CORS on this method**:
   - With the `POST` method selected, look for:
     - **"Actions"** menu → "Enable CORS"
     - Or in the **"Resource details"** panel → **"Enable CORS"**
     - Or a **"CORS"** tab/section
   - You'll see a CORS configuration dialog
   
   **Gateway responses** (check these boxes):
   - ✅ **Default 4XX**
   - ✅ **Default 5XX**
   
   **Configure the following values**:
   - **Access-Control-Allow-Methods**: Should already have `OPTIONS` and `POST` - if not, add them
   - **Access-Control-Allow-Headers**: 
     - You'll see a default list: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
     - **Add `X-Admin-Token`** to this list, so it should be: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Admin-Token`
     - Or replace it entirely with: `Content-Type,X-Admin-Token`
   - **Access-Control-Allow-Origin**: 
     - Enter: `*` (single asterisk, no quotes)
     - **IMPORTANT**: Use `*` (wildcard) - this works for both `http://localhost:8000` (testing) and `https://www.letsrace.cc` (production)
     - **DO NOT** enter multiple origins separated by commas (like `https://www.letsrace.cc,http://localhost:8000`) - that causes CORS errors
     - The Lambda function code validates origins, so only allowed origins will be processed
   
   **Additional settings** (leave as defaults or set if needed):
   - **Access-Control-Expose-Headers**: Leave empty (or add headers if needed)
   - **Access-Control-Max-Age**: Leave empty (default is usually fine) or enter `86400` (24 hours)
   - **Access-Control-Allow-Credentials**: Leave unchecked (unless you need credentials)
   
   - Click **"Save"** or **"Enable CORS and replace existing CORS headers"**
   - If you see a warning about overwriting existing methods, click **"Yes, replace existing values"** or **"OK"**

#### Repeat for Other Endpoints

Repeat the same process (Steps 1-5 above) for each of these endpoints:

1. **`/unsubscribe`** → POST → `letsrace-unsubscribe`
2. **`/preview-digest`** → POST → `letsrace-preview-digest`
3. **`/test-digest`** → POST → `letsrace-test-digest`
4. **`/run-digest-now`** → POST → `letsrace-run-digest-now`

For each one:
- Create a resource with the name (e.g., `unsubscribe`, `preview-digest`, etc.)
- Create a POST method
- Connect it to the corresponding Lambda function
- **Enable CORS** with the same settings as above:
  - **Gateway responses**: Check ✅ **Default 4XX** and ✅ **Default 5XX**
  - **Access-Control-Allow-Methods**: `OPTIONS,POST`
  - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Admin-Token` (or just `Content-Type,X-Admin-Token`)
  - **Access-Control-Allow-Origin**: `*` (single asterisk - works for both localhost and production)
  - **IMPORTANT**: Use `*` only, NOT a comma-separated list
  - Leave additional settings as defaults
- Use **Lambda Proxy integration** (very important!)

**Remember**:
- ✅ Enable CORS on each resource/method
- ✅ Use Lambda Proxy integration (check the box!)
- ✅ Allow API Gateway to create permissions automatically when prompted
- ✅ The UI might look slightly different - look for "Actions", "Create Resource", "Enable CORS" buttons/menus

**Tip**: The API Gateway console UI can vary, but the key steps are always the same:
1. Create resource
2. Create method (POST)
3. Connect to Lambda function
4. Enable Lambda Proxy integration
5. Enable CORS

### 5.2 Deploy API (PROGRESS: Completed)

1. **Deploy the API**:
   - Look for **"Actions"** button/menu at the top of the page → **"Deploy API"**
   - Or look for a **"Deploy"** button or **"Deployments"** link in the left sidebar
   
2. **Deployment settings**:
   - **Deployment stage**: Choose `[New Stage]` or select an existing one
   - **Stage name**: `prod` (or `production`)
   - **Stage description**: `Production` (optional)
   - **Deployment description**: `Initial deployment` (optional)
   
3. **Click "Deploy"**

4. **Copy the Invoke URL**:
   - After deployment, you'll see your **Invoke URL** at the top of the stage page
   - It will look something like: `https://syf5vvs75c.execute-api.eu-west-2.amazonaws.com/prod`
   - **IMPORTANT**: Copy this entire URL - you'll need it to update your frontend
   - The full endpoint URLs will be:
     - Subscribe: `{YOUR-API-URL}/subscribe`
     - Unsubscribe: `{YOUR-API-URL}/unsubscribe`
     - Preview: `{YOUR-API-URL}/preview-digest`
     - Test: `{YOUR-API-URL}/test-digest`
     - Run: `{YOUR-API-URL}/run-digest-now`

### 5.3 Update Frontend with API URL (PROGRESS: Completed)

The easiest way is to set your API Gateway URL once in a config file, and all pages will use it automatically.

1. **Open `assets/js/api-config.js`** in your code editor

2. **Find this line** (around line 17):
   ```javascript
   const API_BASE_URL = 'https://api.letsrace.cc'; // Replace with your actual API Gateway URL
   ```

3. **Replace `'https://api.letsrace.cc'` with your actual API Gateway Invoke URL** (from Step 5.3):
   ```javascript
   const API_BASE_URL = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod';
   ```
   
   **Example**: If your Invoke URL is `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`, use:
   ```javascript
   const API_BASE_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod';
   ```
   
   **Important**: 
   - Don't include a trailing slash (`/`) at the end
   - Use your actual Invoke URL from Step 5.3

4. **Save the file**

That's it! The following pages already reference this config file and will automatically use your API Gateway URL:
- `pages/weekly-email.html` - for `/subscribe` endpoint
- `pages/email-unsubscribed.html` - for `/unsubscribe` endpoint  
- `pages/admin-email-digest.html` - for all admin endpoints (`/preview-digest`, `/test-digest`, `/run-digest-now`)

**To verify it's working**:
- Open any of these pages in your browser
- Check the browser console (F12) - you should see the correct API calls going to your API Gateway URL
- Or test the subscribe form - it should call your API Gateway endpoint

## Step 6: Create CloudWatch Events Rule (Scheduled Digest) (PROGRESS: Completed)

1. **Open AWS Console** → Go to **EventBridge** (or CloudWatch → Events → Rules)
2. **Click "Create rule"**
3. **Name**: `letsrace-daily-digest`
4. **Description**: `Daily digest run at 06:00 UK time`
5. **Event bus**: `default`
6. **Rule type**: `Schedule`
7. **Schedule pattern**: `Rate expression` or `Cron expression`
   - **For 06:00 UK time**: UK time is UTC+0 in winter (GMT), UTC+1 in summer (BST)
   - **06:00 UK (winter/GMT)**: 06:00 UK = 06:00 UTC → `cron(0 6 * * ? *)`
   - **06:00 UK (summer/BST)**: 06:00 UK = 05:00 UTC → `cron(0 5 * * ? *)`
   
   **Recommended**: Use `cron(0 6 * * ? *)` for winter/GMT (06:00 UTC = 06:00 UK). For summer/BST, you'll need to manually change to `cron(0 5 * * ? *)` twice a year, or use a Lambda that handles timezone conversion.
   
   **Note**: AWS EventBridge cron uses UTC. You'll need to adjust twice a year for daylight saving time, or use a Lambda that handles timezone conversion automatically.

8. **Target**: 
   - Target type: `AWS service`
   - Select target: `Lambda function`
   - Function: `letsrace-run-digest`
   - Click "Add"

9. **Click "Create"**

## Step 7: Test Everything

This section is your **end-to-end test plan**. Follow each subsection in order.

### 7.1 Test Subscribe Endpoint (API only) (PROGRESS: Completed)

**Endpoint**: `POST {YOUR-API-URL}/subscribe`  
**Example**: `POST https://syf5vvs75c.execute-api.eu-west-2.amazonaws.com/prod/subscribe`  
(Replace `{YOUR-API-URL}` with your actual API Gateway Invoke URL from Step 5.2)

**Note**: The subscribe endpoint does **NOT** send an email. It only creates the subscriber record in S3. The subscriber will receive emails when:
- You send a test digest (Section 7.2), OR
- The scheduled daily digest runs (when their `send_day` matches)

You can test using the API Gateway console's built-in test feature, or use a browser extension like "REST Client" or "Postman":

1. **Using API Gateway Console**:
   - Go to your API Gateway → Select the `/subscribe` resource → Click on `POST` method
   - Click "TEST"
   - **Query Strings**: Leave blank
   - **Headers**: Leave blank (or add if needed)
   - **Request Body**:
   ```json
   {
     "email": "test@example.com",
     "region": "London & South East",
     "disciplines": ["Road", "Track"],
     "send_day": "Friday"
   }
   ```
   - Click "Test"
   - Check the response

2. **Expected response**:
   ```json
   {
     "success": true,
     "message": "Thanks! Your subscription is confirmed. You'll receive emails on Fridays."
   }
   ```
   **Note**: No email will be sent at this point - this just creates the subscriber record.

3. **Check S3**:
   - Go to your S3 bucket (`letsrace-subscribers-prod`)
   - Open `subscribers.json`
   - Confirm the new subscriber has been added (the record will have an `id`, `email`, `region`, `disciplines`, etc.)

### 7.2 Test Test-Send Digest (Admin) (PROGRESS: Completed)

**Endpoint**: `POST {YOUR-API-URL}/test-digest`  
**Example**: `POST https://syf5vvs75c.execute-api.eu-west-2.amazonaws.com/prod/test-digest`

This endpoint sends a test email with an unsubscribe link that contains a token. You'll need this token for testing the unsubscribe endpoint.

**To get your ADMIN_TOKEN** (required for admin endpoints):
- Go to AWS Console → Lambda
- Select any of your email digest Lambda functions (e.g., `letsrace-test-digest`)
- Go to "Configuration" tab → "Environment variables"
- Find the `ADMIN_TOKEN` variable and copy its value
- **Note**: If you don't see `ADMIN_TOKEN`, you need to set it first (see Step 4.1, section 10 in the deployment guide)

**Using API Gateway Console:**

1. Go to your API Gateway → Select the `/test-digest` resource → Click on `POST` method
2. Click "TEST"
3. **Query Strings**: Leave blank
4. **Headers**:  
   - Click "Add header" or use the headers section
   - **Header name**: `X-Admin-Token` (no quotes, just the text)
   - **Header value**: Paste your ADMIN_TOKEN value here (no quotes, no colons - just the token itself)
   - Example: If your ADMIN_TOKEN is `8HYyNgbha7omNKG5TlUVu5n7MK3UFWEH`, enter exactly that value (without quotes)
5. **Request Body**:
```json
{
  "email": "test@example.com",
  "region": "London & South East",
  "disciplines": ["Road"]
}
```
6. Click "Test"

Then:

1. Check the API response (should indicate email queued/sent successfully).
2. Check your email inbox (`test@example.com`) for the test digest.
3. **Important**: The email will contain an unsubscribe link like:
   - `https://www.letsrace.cc/pages/email-unsubscribed.html?token=XXXXX`
   - **Copy the token** (the part after `?token=`) - you'll need it for testing unsubscribe (Section 7.3)
4. If the email does not arrive:
   - Check SES "Sending statistics" and "Event publishing" if configured.
   - Check SES suppression list and bounces for that address.
   - Check CloudWatch logs for `letsrace-test-digest` and underlying send function.

### 7.3 Test Unsubscribe Endpoint

**Important**: The unsubscribe endpoint requires a **token** (not just an email). Tokens are generated when users subscribe and are included in unsubscribe links sent via email.

**⚠️ Common Error**: If you get a `400 Bad Request` with message "Unsubscribe token is required", this means you're sending `{"email": "..."}` instead of `{"token": "..."}`. The endpoint requires a token for security reasons.

**Option A: Test via Frontend (Recommended)**

1. **Subscribe a test email** using the subscribe endpoint (Section 7.1) to create a subscriber record in S3
   - **Important**: Use the same email address for both subscribe and test-digest
   - This ensures the subscriber exists in S3 when you unsubscribe
2. **Send a test email** using the test-digest endpoint (Section 7.2) to the same email address
   - This will generate a digest email that includes an unsubscribe link
   - The unsubscribe link will look like: `https://www.letsrace.cc/pages/email-unsubscribed.html?token=XXXXX`
3. **Copy the token from the email** (the part after `?token=` in the unsubscribe link)
4. **Test the unsubscribe page**:
   - Open: `https://www.letsrace.cc/pages/email-unsubscribed.html?token=YOUR_COPIED_TOKEN`
   - The page should automatically process the unsubscribe and show a confirmation message
5. **Verify in S3**:
   - Open `subscribers.json` in your S3 bucket
   - Confirm the subscriber's `status` field has been set to `"unsubscribed"`

**Option B: Test API Directly (Requires Token Generation)**

The unsubscribe endpoint expects a token, not just an email. To test the API directly:

1. **Subscribe a test email** first (Section 7.1)
2. **Get a token for testing** (tokens are NOT stored - they're generated on-demand):
   
   **Easiest method**: Use the test-digest endpoint (Section 7.2) to send a test email to your test subscriber's email address - the email will contain an unsubscribe link with a valid token in the URL. Copy the token from the URL (the part after `?token=`).
   
   **Alternative**: Generate a token manually using the subscriber's `id` and `email` from the S3 `subscribers.json` file. You would need to use the `generateUnsubscribeToken()` function with these values and your `TOKEN_SECRET` environment variable (requires writing code to generate the token).

3. **Using API Gateway Console**:
   - Go to your API Gateway → Select the `/unsubscribe` resource → Click on `POST` method
   - Click "TEST"
   - **Query Strings**: Leave blank
   - **Headers**: Leave blank (or add if needed)
   - **Request Body**:
   ```json
   {
     "token": "YOUR_UNSUBSCRIBE_TOKEN_HERE"
   }
   ```
   - Click "Test"
   - Check the response (should indicate success)

4. **Check S3**:
   - Open `subscribers.json` again
   - Confirm the subscriber's `status` field has been set to `"unsubscribed"`

**Note**: Since token generation is complex, it's easier to test the unsubscribe flow via the frontend page (`pages/email-unsubscribed.html`) which handles token extraction from URL parameters automatically.

**⚠️ Troubleshooting "Invalid or expired unsubscribe token" error:**

If you see the error "We couldn't process your unsubscribe request. This might be because the link has expired" when clicking an unsubscribe link:

1. **Check TOKEN_SECRET consistency**: The `TOKEN_SECRET` environment variable must be **identical** across ALL Lambda functions:
   - `letsrace-subscribe`
   - `letsrace-unsubscribe`
   - `letsrace-test-digest`
   - `letsrace-run-digest-now`
   - Any other Lambda that generates or verifies tokens
   
   If they don't match, tokens generated by one Lambda won't verify in another Lambda.

2. **For test-digest tokens**: The test-digest endpoint creates a temporary subscriber with `id: 'test'` that is NOT saved to S3. The unsubscribe endpoint will still work (it returns success even if subscriber not found), but the token must verify correctly.

3. **Check CloudWatch logs**:
   - Go to CloudWatch → Log groups
   - Check `letsrace-unsubscribe` logs for detailed error messages
   - Look for token verification errors or signature mismatches

4. **Verify environment variables**:
   - Go to each Lambda function → Configuration → Environment variables
   - Ensure `TOKEN_SECRET` has the exact same value in all functions
   - Copy the value from one function and paste it into all others if needed

### 7.4 Test Preview Digest (Admin)

**Using API Gateway Console:**

1. Go to your API Gateway → Select the `/preview-digest` resource → Click on `POST` method
2. Click "TEST"
3. **Query Strings**: Leave blank
4. **Headers**:  
   - Click "Add header" or use the headers section
   - **Header name**: `X-Admin-Token` (no quotes)
   - **Header value**: Paste your ADMIN_TOKEN value (no quotes, just the token itself)
5. **Request Body**:
```json
{
  "region": "London & South East",
  "disciplines": ["Road"]
}
```
6. Click "Test"

Check:

- Response is `success: true` (or appropriate data structure)
- Any HTML/preview payload looks sensible for the chosen region/discipline
- CloudWatch logs for `letsrace-preview-digest` show no errors

### 7.5 Test Frontend Forms

1. Open `https://www.letsrace.cc/pages/weekly-email.html`
2. Fill out the form with a real email and choices:
   - Email: your test email
   - Region: e.g. `London & South East`
   - Disciplines: e.g. `Road`, `Track`
   - Day: e.g. `Friday`
3. Submit
4. In your browser:
   - Open DevTools (F12) → Network tab
   - Confirm a `POST` request is sent to `{YOUR-API-URL}/subscribe`
   - Confirm the response is a 200 with a success message
5. In S3:
   - Open `subscribers.json`
   - Confirm the new subscriber entry is present

6. **Test unsubscribe via frontend**:
   - Open the unsubscribe link as implemented in your emails (or directly: `https://www.letsrace.cc/pages/email-unsubscribed.html` if that’s where the token flow lands)
   - Complete the unsubscribe flow
   - Confirm:
     - Browser shows the unsubscribe confirmation page
     - The corresponding record in `subscribers.json` is updated/removed

7. **Admin frontend**:
   - Open `https://www.letsrace.cc/pages/admin-email-digest.html`
   - Use the UI to:
     - Preview a digest
     - Send a test digest
   - Confirm:
     - Requests go to the right endpoints (`/preview-digest`, `/test-digest`, `/run-digest-now`)
     - Responses are successful
     - Emails arrive where expected

### 7.6 Test Manual Digest Run (Admin)

**Using API Gateway Console:**

1. Go to your API Gateway → Select the `/run-digest-now` resource → Click on `POST` method
2. Click "TEST"
3. **Query Strings**: Leave blank
4. **Headers**:  
   - Click "Add header" or use the headers section
   - **Header name**: `X-Admin-Token` (no quotes)
   - **Header value**: Paste your ADMIN_TOKEN value (no quotes, just the token itself)
5. **Request Body**:
```json
{}
```
6. Click "Test"

**Check:**

1. Response indicates the digest was triggered.
2. CloudWatch logs for `letsrace-run-digest-now` (and any underlying functions) show:
   - No errors
   - Reasonable execution time
3. Test recipients (as configured in your code) receive a digest email that:
   - Includes the expected events
   - Respects region/discipline filters

## Step 8: Monitor and Debug

### CloudWatch Logs

1. **Open AWS Console** → Go to CloudWatch → Logs → Log groups
2. You should see log groups like:
   - `/aws/lambda/letsrace-subscribe`
   - `/aws/lambda/letsrace-run-digest`
   - etc.
3. Click on a log group to see recent invocations
4. Check for errors

### Testing Lambda Functions Directly

**To test a Lambda function directly** (this will create CloudWatch logs and show errors):

1. **Lambda Console** → Click on your function (e.g., `letsrace-subscribe`)
2. **Click "Test"** tab (or create a new test event)
3. **Create a test event** with this JSON (copy the entire block):

```json
{
  "httpMethod": "POST",
  "headers": {
    "origin": "http://localhost:8000"
  },
  "body": "{\"email\":\"test@example.com\",\"region\":\"London & South East\",\"disciplines\":[\"Road\",\"Track\"],\"send_day\":\"Friday\"}"
}
```

4. **Event name**: `test-subscribe` (or any name)
5. **Click "Save"** and then **"Test"**
6. Check the execution result for any errors

### Common Issues

**Issue**: "AccessDenied" when accessing S3  
- **Fix**: Check IAM role has `AmazonS3FullAccess` or create a policy that allows access to your specific bucket

**Issue**: "Email address not verified" from SES  
- **Fix**: Verify your sender email in SES, and if in sandbox, verify recipient emails too

**Issue**: CORS errors in browser  
- **Fix**: Make sure CORS is enabled on API Gateway resources AND the Lambda functions return CORS headers

**Issue**: "Invalid token" errors  
- **Fix**: Make sure `TOKEN_SECRET` and `ADMIN_TOKEN` environment variables are set correctly in ALL Lambda functions

**Issue**: Lambda timeout  
- **Fix**: Increase timeout in Lambda configuration (especially for `run-digest`)

## Step 9: Production Checklist

- [ ] All Lambda functions deployed with correct code
- [ ] All environment variables set in all Lambda functions
- [ ] API Gateway deployed to production stage
- [ ] Frontend updated with correct API Gateway URLs
- [ ] SES sender email verified
- [ ] SES out of sandbox mode (for production)
- [ ] CloudWatch Events rule created and enabled
- [ ] S3 bucket created with initial `subscribers.json`
- [ ] IAM role has correct permissions
- [ ] Tested subscribe endpoint (API)
- [ ] Tested unsubscribe endpoint (API)
- [ ] Tested frontend subscribe flow
- [ ] Tested frontend unsubscribe flow
- [ ] Tested admin preview endpoint
- [ ] Tested admin test-send endpoint
- [ ] Tested manual digest run endpoint
- [ ] CloudWatch logs working
- [ ] Monitoring/alerts set up (optional but recommended)

## Cost Estimation

**Free Tier** (first year):
- Lambda: 1M requests/month free
- S3: 5GB storage free
- SES: 62,000 emails/month free (if verified)
- API Gateway: 1M requests/month free
- CloudWatch: 5GB logs free

**After Free Tier** (very rough estimates for low volume):
- Lambda: ~$0.20 per 1M requests
- S3: ~$0.023 per GB/month
- SES: ~$0.10 per 1,000 emails
- API Gateway: ~$3.50 per 1M requests
- CloudWatch: ~$0.50 per GB logs/month

**Estimated monthly cost** for ~1,000 subscribers: **$1-5/month**

## Security Notes

1. **Never commit** `ADMIN_TOKEN` or `TOKEN_SECRET` to git
2. **Rotate secrets** periodically
3. **Use IAM policies** that grant minimum required permissions (not full S3/SES access)
4. **Enable CloudTrail** to log API calls (optional but recommended)
5. **Set up alerts** for unusual Lambda invocations or errors

## Troubleshooting

If something doesn't work:

1. **Check CloudWatch Logs** - Most errors appear here
   - AWS Console → CloudWatch → Logs → Log groups
   - Find `/aws/lambda/letsrace-subscribe` (or the function that's failing)
   - Click on the latest log stream
   - Look for error messages (red text)

2. **502 Bad Gateway Error** (most common when starting):
   
   **If CloudWatch log group doesn't exist** (`/aws/lambda/letsrace-subscribe` not found):
   - ❌ **Lambda function doesn't exist** → Go to Lambda Console, verify `letsrace-subscribe` exists
   - ❌ **Wrong Lambda function name in API Gateway** → API Gateway → Resources → `/subscribe` → POST → Integration → Check Lambda function name matches exactly (case-sensitive)
   - ❌ **Lambda function not invoked yet** → The log group is created on first invocation - but if you're getting a 502, it should exist. Check API Gateway integration configuration.
   - ❌ **Wrong region** → Make sure API Gateway Lambda integration uses the same region as your Lambda function
   
   **"require is not defined in ES module scope" error:**
   - ❌ **Handler set incorrectly** → Configuration → Runtime settings → Handler must be `index.handler` (not `index.mjs.handler` or anything else)
   - ❌ **File named incorrectly** → The main file must be named `index.js` (not `index.mjs` or `subscribe.js`)
   - ❌ **Package.json with "type": "module"** → If you created a `package.json` file, make sure it doesn't have `"type": "module"` or delete the package.json file
   - **Fix**: 
     1. Lambda Console → `letsrace-subscribe` → Code tab
     2. Make sure the main file is named `index.js` (not `index.mjs`)
     3. Configuration tab → Runtime settings → Edit → Handler: `index.handler`
     4. Click "Save"
     5. Click "Deploy" in the Code tab
   
   **If CloudWatch log group exists but still getting 502:**
   - **Check CloudWatch Logs** - The error message will tell you what's wrong
   - **Common causes:**
     - ❌ S3 bucket doesn't exist → Create the bucket (Step 1)
     - ❌ Wrong S3 bucket name in environment variables → Check `S3_BUCKET_SUBSCRIBERS` matches your actual bucket name
     - ❌ Missing environment variables → Verify all env vars are set (Step 4.1, section 10)
     - ❌ Missing shared files in Lambda → Make sure `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` are in the Lambda function code
     - ❌ IAM permissions → Check the Lambda execution role has `AmazonS3FullAccess` (Step 3)
     - ❌ Lambda timeout → Check timeout is set to at least 30 seconds
     - ❌ Lambda Proxy integration not enabled → API Gateway → `/subscribe` → POST → Integration → Must have "Use Lambda Proxy integration" checked

3. **Test each endpoint individually** using the API Gateway console test feature or a REST client
4. **Verify environment variables** are set correctly in ALL Lambda functions
5. **Check IAM permissions** - Lambda needs S3 and SES access
6. **Verify SES is out of sandbox** if sending to unverified emails
7. **Check API Gateway logs** (enable if needed)

## Updating Code After Changes

When you make code changes (like adding features or fixing bugs), you need to redeploy the Lambda functions:

1. **Update the code files** in your local repository
2. **Package the functions** using the packaging script (see Step 4.1, section 9b):
   - **Windows**: Run `.\package-functions.ps1` in PowerShell from `scripts/AWS/email-digest` directory
   - **Mac/Linux**: Run `./package-functions.sh` from `scripts/AWS/email-digest` directory
3. **Upload the updated ZIP files** to each Lambda function:
   - Lambda Console → Function → Code tab → Upload from → ".zip file"
   - Select the updated ZIP file (e.g., `subscribe.zip`)
   - Click "Save"
4. **For shared code changes** (like `shared/utils.js`, `shared/digest.js`, `shared/s3.js`):
   - You need to redeploy ALL Lambda functions that use them:
     - `letsrace-subscribe`
     - `letsrace-unsubscribe`
     - `letsrace-test-digest`
     - `letsrace-preview-digest`
     - `letsrace-run-digest-now`
     - `letsrace-digest-runner` (scheduled)

**Note**: No changes needed to:
- API Gateway configuration (just routing, no code)
- S3 bucket structure
- IAM roles/permissions
- Environment variables (unless explicitly changed)
- CloudWatch Events/triggers
- SES configuration

## Next Steps

- Set up CloudWatch alarms for errors
- Set up email notifications for failures
- Consider backing up `subscribers.json` regularly (S3 versioning helps)
- Monitor costs in AWS Cost Explorer
- Set up AWS Budget alerts

## Support

If you get stuck:

1. Check CloudWatch logs first
2. Test endpoints individually using the API Gateway console test feature
3. Verify all environment variables match across functions
4. Make sure IAM role has correct permissions

Good luck! 🚀


