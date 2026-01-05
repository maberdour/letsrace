# Email Digest API Testing Guide

This guide provides comprehensive API testing instructions for the LetsRace.cc email digest system. API testing verifies that API endpoints work correctly - that they accept requests, return proper responses, and handle errors.

**Note**: This guide focuses on API endpoint testing. For functional testing (verifying business logic, event filtering, email content, timing, etc.), see `FUNCTIONAL_TEST_PLAN.md`.

**Recommended Testing Order**:
1. Complete API testing first (this guide) - verify endpoints work
2. Then perform functional testing (`FUNCTIONAL_TEST_PLAN.md`) - verify business logic works
3. Both are essential for a complete deployment

## Prerequisites

Before testing, ensure you have:
- Completed all deployment steps from `DEPLOYMENT_GUIDE.md`
- Your API Gateway Invoke URL (from Step 5.2 of the deployment guide)
- Your `ADMIN_TOKEN` (from Lambda environment variables)
- Access to your S3 bucket (`letsrace-subscribers-prod`)
- A test email address you can access

## Understanding API Testing

If you're new to API testing, this section explains the basics. If you're already familiar with API testing, you can skip to the specific test sections below.

### What is an API?

An **API (Application Programming Interface)** is a way for different software applications to communicate with each other. In our case, the API allows your website to send requests to AWS Lambda functions that handle email subscriptions, unsubscribes, and digest sending.

Think of an API like a restaurant menu: you (the client) look at the menu (API documentation), choose what you want (make a request), and the kitchen (server) prepares it and brings it back (sends a response).

### Key Concepts

#### 1. **HTTP Methods**
APIs use HTTP methods to indicate what action you want to perform:
- **POST** - Used to send data to create or update something (like subscribing to emails)
- **GET** - Used to retrieve data (not used in this system)
- **PUT** - Used to update existing data (not used in this system)
- **DELETE** - Used to delete data (not used in this system)

For this email digest system, we only use **POST** requests.

#### 2. **Endpoint/URL**
An **endpoint** is the specific address where an API service is located. It looks like a website URL:
```
https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/subscribe
```

Breaking this down:
- `https://` - The protocol (secure connection)
- `YOUR-API-ID.execute-api.REGION.amazonaws.com` - The server address (replace with your actual API Gateway ID and region)
- `/prod` - The stage/environment
- `/subscribe` - The specific endpoint/function

#### 3. **Request Body**
The **request body** contains the data you're sending to the API. It's written in **JSON** format (JavaScript Object Notation), which looks like this:
```json
{
  "email": "test@example.com",
  "region": "London & South East",
  "disciplines": ["Road", "Track"],
  "send_day": "Friday"
}
```

**JSON Basics:**
- Data is organized in key-value pairs: `"key": "value"`
- Strings (text) are wrapped in double quotes: `"email": "test@example.com"`
- Numbers don't need quotes: `"age": 25`
- Arrays (lists) use square brackets: `["Road", "Track"]`
- Objects (groups of data) use curly braces: `{ "key": "value" }`

#### 4. **Headers**
**Headers** are additional information sent with your request. They're like metadata that tells the server how to handle your request. Common headers include:
- **Content-Type**: Tells the server what format your data is in (usually `application/json`)
- **X-Admin-Token**: A security token required for admin endpoints (like sending test emails)

Headers are written as key-value pairs:
```
Content-Type: application/json
X-Admin-Token: your-secret-token-here
```

#### 5. **Response**
The **response** is what the API sends back after processing your request. It includes:
- **Status Code**: A number indicating success or failure (see below)
- **Response Body**: The actual data returned, usually in JSON format

#### 6. **HTTP Status Codes**
Status codes tell you if your request was successful:
- **200 OK** - Request succeeded
- **201 Created** - Resource was created successfully
- **400 Bad Request** - Your request was malformed (wrong format, missing data)
- **401 Unauthorized** - You're not authorized (missing or wrong token)
- **403 Forbidden** - You don't have permission
- **404 Not Found** - The endpoint doesn't exist
- **500 Internal Server Error** - Something went wrong on the server

### Tools for API Testing

There are several ways to test APIs. We'll cover three methods:

#### Method 1: AWS API Gateway Console (Easiest - No Installation Required)
- **Pros**: Built into AWS, no software to install, works in any browser
- **Cons**: Requires AWS account access, less flexible than dedicated tools
- **Best for**: Quick testing, verifying endpoints work

#### Method 2: Browser Extensions (Moderate Difficulty)
- **Pros**: Easy to use, can save requests, works in your browser
- **Cons**: Requires browser extension installation
- **Best for**: Regular testing, saving test requests
- **Examples**: REST Client (Chrome), RESTer (Firefox), Postman (has browser version)

#### Method 3: Command Line (curl) (Advanced)
- **Pros**: Very powerful, can be automated, works everywhere
- **Cons**: Requires command line knowledge, less user-friendly
- **Best for**: Automation, scripting, advanced users

### Step-by-Step: Using AWS API Gateway Console

This is the easiest method and requires no additional software. Follow these steps:

1. **Open AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in to your AWS account

2. **Navigate to API Gateway**
   - In the search bar at the top, type "API Gateway"
   - Click on "API Gateway" service
   - Find your API (should be named `letsrace-email-digest-api`)

3. **Select Your Endpoint**
   - In the left sidebar, click on "Resources"
   - You'll see a list of endpoints like `/subscribe`, `/unsubscribe`, etc.
   - Click on the endpoint you want to test (e.g., `/subscribe`)

4. **Select the HTTP Method**
   - Under the endpoint, you'll see methods like `POST`, `GET`, etc.
   - Click on `POST` (this is the method we use for all endpoints)

5. **Open the Test Interface**
   - You'll see a page with integration details
   - Look for a button labeled "TEST" (usually in the top right or in a "Actions" menu)
   - Click "TEST"

6. **Fill in the Test Form**
   You'll see several fields:
   
   - **Query Strings**: Leave this blank (we don't use query strings)
   
   - **Headers**: 
     - For admin endpoints, click "Add header"
     - Header name: `X-Admin-Token`
     - Header value: Paste your ADMIN_TOKEN (from Lambda environment variables)
     - For non-admin endpoints, you can leave headers blank
   
   - **Request Body**: 
     - This is where you put your JSON data
     - Copy the example JSON from the test section below
     - Paste it into the request body field
     - Make sure it's valid JSON (proper quotes, commas, brackets)

7. **Run the Test**
   - Click the "Test" button (usually at the bottom)
   - Wait a few seconds for the response

8. **Read the Response**
   - You'll see a response section showing:
     - **Status**: The HTTP status code (200 = success)
     - **Response Body**: The JSON response from the API
     - **Logs**: Any execution logs (useful for debugging)

### Step-by-Step: Using a Browser Extension (REST Client)

If you prefer a dedicated tool, browser extensions are a good middle ground:

1. **Install a REST Client Extension**
   - For Chrome: Search "REST Client" in Chrome Web Store
   - For Firefox: Search "RESTer" in Firefox Add-ons
   - Install the extension

2. **Open the Extension**
   - Click the extension icon in your browser toolbar
   - A new window/tab will open

3. **Create a New Request**
   - Look for a "New Request" or "+" button
   - Click it to create a new request

4. **Configure the Request**
   - **Method**: Select "POST" from a dropdown
   - **URL**: Enter your API endpoint URL
     - Example: `https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/subscribe` (replace with your actual API Gateway URL)
   - **Headers**: Click "Add Header" and add:
     - `Content-Type`: `application/json`
     - `X-Admin-Token`: `your-admin-token-here` (only for admin endpoints)

5. **Add Request Body**
   - Look for a "Body" or "Request Body" section
   - Select "JSON" or "raw" format
   - Paste your JSON data:
     ```json
     {
       "email": "test@example.com",
       "region": "London & South East",
       "disciplines": ["Road", "Track"],
       "send_day": "Friday"
     }
     ```

6. **Send the Request**
   - Click "Send" or "Execute" button
   - Wait for the response

7. **View the Response**
   - You'll see the response in a section below
   - Look for:
     - Status code (200 = success)
     - Response body (JSON data)
     - Response time

### Step-by-Step: Using Command Line (curl)

For advanced users comfortable with command line:

**Basic curl command structure:**
```bash
curl -X POST https://your-api-url/subscribe \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-token-here" \
  -d '{"email":"test@example.com","region":"London & South East","disciplines":["Road"],"send_day":"Friday"}'
```

**Breaking it down:**
- `curl` - The command
- `-X POST` - HTTP method (POST)
- `https://your-api-url/subscribe` - The endpoint URL
- `-H "Header-Name: value"` - Add a header (repeat for multiple headers)
- `-d '{"json":"data"}'` - Request body (JSON data)

**Windows PowerShell Note:**
In PowerShell, you need to escape quotes differently:
```powershell
curl.exe -X POST https://your-api-url/subscribe `
  -H "Content-Type: application/json" `
  -H "X-Admin-Token: your-token-here" `
  -d '{\"email\":\"test@example.com\",\"region\":\"London & South East\",\"disciplines\":[\"Road\"],\"send_day\":\"Friday\"}'
```

### Understanding API Responses

When you make an API request, you'll get a response. Here's how to read it:

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Thanks! Your subscription is confirmed. You'll receive emails on Fridays."
}
```
- `success: true` means it worked
- `message` contains a human-readable description

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Please provide a valid email address."
}
```
- `success: false` means something went wrong
- `error` contains details about what was wrong

### Common Mistakes to Avoid

1. **Missing Quotes in JSON**: JSON requires double quotes around strings
   - ❌ Wrong: `{email: "test@example.com"}`
   - ✅ Right: `{"email": "test@example.com"}`

2. **Trailing Commas**: Don't put a comma after the last item
   - ❌ Wrong: `{"email": "test@example.com",}`
   - ✅ Right: `{"email": "test@example.com"}`

3. **Wrong Header Format**: Headers should be `Name: Value` (with colon and space)
   - ❌ Wrong: `X-Admin-Token=your-token`
   - ✅ Right: `X-Admin-Token: your-token`

4. **Missing Admin Token**: Admin endpoints require the `X-Admin-Token` header
   - If you get a 401 or 403 error, check that you included the header with the correct token

5. **Wrong Endpoint URL**: Make sure you're using the correct API Gateway URL
   - Check Step 5.2 in the deployment guide for your actual URL

### Next Steps

Now that you understand the basics of API testing, proceed to the specific test sections below. Each section will show you exactly what data to send and what response to expect.

## Test Subscribe Endpoint (API only)

**Endpoint**: `POST {YOUR-API-URL}/subscribe`  
**Example**: `POST https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/subscribe`  
(Replace `{YOUR-API-URL}` with your actual API Gateway Invoke URL from the deployment guide)

**Note**: The subscribe endpoint does **NOT** send an email. It only creates the subscriber record in S3. The subscriber will receive emails when:
- You send a test digest (see Section 2), OR
- The scheduled daily digest runs (when their `send_day` matches)

You can test using the API Gateway console's built-in test feature, or use a browser extension like "REST Client" or "Postman":

### Using API Gateway Console

**Step-by-step instructions:**

1. **Navigate to your API in AWS Console**
   - Go to https://console.aws.amazon.com
   - Search for "API Gateway" in the top search bar
   - Click on "API Gateway" service
   - Find and click on your API (named `letsrace-email-digest-api`)

2. **Select the subscribe endpoint**
   - In the left sidebar, click on "Resources"
   - You'll see a tree structure showing all your endpoints
   - Click on `/subscribe` to expand it
   - Click on `POST` (the HTTP method) - this should be directly under `/subscribe`

3. **Open the test interface**
   - You'll see a page showing the integration details
   - Look for a blue "TEST" button (usually in the top right corner, or in an "Actions" dropdown menu)
   - Click the "TEST" button
   - A test panel will appear on the right side or below

4. **Configure the test request**
   - **Query Strings**: Leave this field completely blank (we don't use query parameters)
   
   - **Headers**: 
     - For the subscribe endpoint, you don't need any headers
     - Leave this section blank or empty
     - (Note: Admin endpoints require headers, but subscribe is a public endpoint)
   
   - **Request Body**: 
     - This is where you enter the JSON data
     - Click in the "Request Body" text area
     - Copy and paste this exact JSON (or modify the email address):
     ```json
     {
       "email": "test@example.com",
       "region": "London & South East",
       "disciplines": ["Road", "Track"],
       "send_day": "Friday"
     }
     ```
     - **Important**: Make sure the JSON is properly formatted:
       - All text must be in double quotes (`"`)
       - Commas between items (but NOT after the last item)
       - Matching curly braces `{` and `}`
       - Matching square brackets `[` and `]` for arrays

5. **Execute the test**
   - Scroll down if needed to find the "Test" button (usually at the bottom of the test panel)
   - Click the "Test" button
   - Wait a few seconds - you'll see a loading indicator

6. **Review the response**
   - After a few seconds, you'll see the response appear
   - Look for these sections:
     - **Status**: Should show `200` (this means success)
     - **Response Body**: Should show JSON with `"success": true`
     - **Response Headers**: Shows metadata about the response
     - **Logs**: Shows execution details (useful if something goes wrong)

7. **Interpret the results**
   - If you see `Status: 200` and `"success": true` in the response body, the test was successful!
   - If you see a different status code (like 400, 401, 500), check the "Response Body" for error details
   - Common issues:
     - **400 Bad Request**: Your JSON might be malformed - check for typos, missing quotes, or extra commas
     - **500 Internal Server Error**: Something went wrong on the server - check CloudWatch logs

### Expected Response

```json
{
  "success": true,
  "message": "Thanks! Your subscription is confirmed. You'll receive emails on Fridays."
}
```

**Note**: No email will be sent at this point - this just creates the subscriber record.

### Verify in S3

1. Go to your S3 bucket (`letsrace-subscribers-prod`)
2. Open `subscribers.json`
3. Confirm the new subscriber has been added (the record will have an `id`, `email`, `region`, `disciplines`, etc.)

## Test Test-Send Digest (Admin)

**Endpoint**: `POST {YOUR-API-URL}/test-digest`  
**Example**: `POST https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/test-digest`  
(Replace with your actual API Gateway Invoke URL)

This endpoint sends a test email with an unsubscribe link that contains a token. You'll need this token for testing the unsubscribe endpoint.

### Get Your ADMIN_TOKEN

**To get your ADMIN_TOKEN** (required for admin endpoints):
- Go to AWS Console → Lambda
- Select any of your email digest Lambda functions (e.g., `letsrace-test-digest`)
- Go to "Configuration" tab → "Environment variables"
- Find the `ADMIN_TOKEN` variable and copy its value
- **Note**: If you don't see `ADMIN_TOKEN`, you need to set it first (see Step 4.1, section 10 in the deployment guide)

### Using API Gateway Console

**Step-by-step instructions:**

1. **Navigate to the test-digest endpoint**
   - In API Gateway, go to Resources → `/test-digest` → `POST` method
   - Click the "TEST" button

2. **Configure the test request**
   - **Query Strings**: Leave blank
   
   - **Headers** (This is important - admin endpoints require authentication):
     - Look for a section labeled "Headers" or "Request Headers"
     - Click "Add header" or look for a "+" button next to headers
     - In the header name field, type exactly: `X-Admin-Token`
       - **Important**: Type it exactly as shown - case sensitive, with the `X-` prefix and hyphens
     - In the header value field, paste your ADMIN_TOKEN
       - **How to get your ADMIN_TOKEN**:
         1. Go to AWS Console → Lambda
         2. Click on any of your email digest functions (e.g., `letsrace-test-digest`)
         3. Go to "Configuration" tab → "Environment variables"
         4. Find the row with key `ADMIN_TOKEN`
         5. Click the "Show" button next to the value (it might be hidden)
         6. Copy the entire token value
       - Paste it into the header value field
       - **Important**: 
         - Don't add quotes around the token
         - Don't add "Bearer" or any prefix
         - Just paste the token value exactly as it appears
       - Example: If your token is `example-token-abc123xyz456`, paste exactly that (this is just an example - use your actual ADMIN_TOKEN)
   
   - **Request Body**:
     - Click in the "Request Body" text area
     - Paste this JSON (modify the email address to your test email):
     ```json
     {
       "email": "test@example.com",
       "region": "London & South East",
       "disciplines": ["Road"]
     }
     ```
     - **Note**: You can test with multiple disciplines by adding them to the array:
     ```json
     {
       "email": "test@example.com",
       "region": "London & South East",
       "disciplines": ["Road", "Track"]
     }
     ```

3. **Execute and review**
   - Click "Test" button
   - Wait for the response
   - **Expected**: Status `200` with `"success": true` in the response body
   - **If you get 401 or 403**: Your ADMIN_TOKEN header is missing or incorrect - double-check the token value

### Verify Results

1. Check the API response (should indicate email queued/sent successfully).
2. Check your email inbox (`test@example.com`) for the test digest.
3. **Important**: The email will contain an unsubscribe link like:
   - `https://www.letsrace.cc/pages/email-unsubscribed.html?token=XXXXX`
   - **Copy the token** (the part after `?token=`) - you'll need it for testing unsubscribe (see Section 3)
4. If the email does not arrive:
   - Check SES "Sending statistics" and "Event publishing" if configured.
   - Check SES suppression list and bounces for that address.
   - Check CloudWatch logs for `letsrace-test-digest` and underlying send function.

## Test Unsubscribe Endpoint

**Important**: The unsubscribe endpoint requires a **token** (not just an email). Tokens are generated when users subscribe and are included in unsubscribe links sent via email.

**⚠️ Common Error**: If you get a `400 Bad Request` with message "Unsubscribe token is required", this means you're sending `{"email": "..."}` instead of `{"token": "..."}`. The endpoint requires a token for security reasons.

### Option A: Test via Frontend (Recommended)

1. **Subscribe a test email** using the subscribe endpoint (Section 1) to create a subscriber record in S3
   - **Important**: Use the same email address for both subscribe and test-digest
   - This ensures the subscriber exists in S3 when you unsubscribe
2. **Send a test email** using the test-digest endpoint (Section 2) to the same email address
   - This will generate a digest email that includes an unsubscribe link
   - The unsubscribe link will look like: `https://www.letsrace.cc/pages/email-unsubscribed.html?token=XXXXX`
3. **Copy the token from the email** (the part after `?token=` in the unsubscribe link)
4. **Test the unsubscribe page**:
   - Open: `https://www.letsrace.cc/pages/email-unsubscribed.html?token=YOUR_COPIED_TOKEN`
   - The page should automatically process the unsubscribe and show a confirmation message
5. **Verify in S3**:
   - Open `subscribers.json` in your S3 bucket
   - Confirm the subscriber's `status` field has been set to `"unsubscribed"`

### Option B: Test API Directly (Requires Token Generation)

The unsubscribe endpoint expects a token, not just an email. To test the API directly:

1. **Subscribe a test email** first (Section 1)
2. **Get a token for testing** (tokens are NOT stored - they're generated on-demand):
   
   **Easiest method**: Use the test-digest endpoint (Section 2) to send a test email to your test subscriber's email address - the email will contain an unsubscribe link with a valid token in the URL. Copy the token from the URL (the part after `?token=`).
   
   **Alternative**: Generate a token manually using the subscriber's `id` and `email` from the S3 `subscribers.json` file. You would need to use the `generateUnsubscribeToken()` function with these values and your `TOKEN_SECRET` environment variable (requires writing code to generate the token).

3. **Using API Gateway Console**:
   - Navigate to API Gateway → Resources → `/unsubscribe` → `POST` method
   - Click "TEST" button
   - **Query Strings**: Leave blank
   - **Headers**: Leave blank (unsubscribe is a public endpoint, no admin token needed)
   - **Request Body**:
     ```json
     {
       "token": "YOUR_UNSUBSCRIBE_TOKEN_HERE"
     }
     ```
     - **Important**: Replace `YOUR_UNSUBSCRIBE_TOKEN_HERE` with the actual token you copied from the email
     - The token is the part after `?token=` in the unsubscribe link
     - Example: If the link is `https://www.letsrace.cc/pages/email-unsubscribed.html?token=abc123xyz`, use `abc123xyz`
   - Click "Test"
   - **Expected Response**: Status `200` with `"success": true`
   - **If you get 400**: The token format is wrong - make sure you're sending `{"token": "..."}` not `{"email": "..."}`

4. **Check S3**:
   - Open `subscribers.json` again
   - Confirm the subscriber's `status` field has been set to `"unsubscribed"`

**Note**: Since token generation is complex, it's easier to test the unsubscribe flow via the frontend page (`pages/email-unsubscribed.html`) which handles token extraction from URL parameters automatically.

### Troubleshooting "Invalid or expired unsubscribe token" Error

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

## Test Preview Digest (Admin)

**Endpoint**: `POST {YOUR-API-URL}/preview-digest`

This endpoint allows you to preview the digest HTML without sending an email.

### Using API Gateway Console

**Step-by-step instructions:**

1. **Navigate to the preview-digest endpoint**
   - In API Gateway, go to Resources → `/preview-digest` → `POST` method
   - Click the "TEST" button

2. **Configure the test request**
   - **Query Strings**: Leave blank
   
   - **Headers** (Required - this is an admin endpoint):
     - Click "Add header"
     - Header name: `X-Admin-Token`
     - Header value: Paste your ADMIN_TOKEN (get it from Lambda environment variables - see Section 2 for instructions)
   
   - **Request Body**:
     ```json
     {
       "region": "London & South East",
       "disciplines": ["Road"]
     }
     ```
     - **Note**: You can test different combinations:
       - Multiple disciplines: `"disciplines": ["Road", "Track"]`
       - Different regions: Change `"region"` to any valid region from the list
       - All disciplines: `"disciplines": ["Road", "Track", "BMX", "MTB", "Cyclo Cross", "Speedway", "Time Trial", "Hill Climb"]`

3. **Execute and review**
   - Click "Test"
   - **Expected Response**: 
     - Status `200`
     - Response body should contain HTML content (the digest preview)
     - Look for `"success": true` or HTML content in the response
   - **If you see HTML**: The preview is working! You can copy the HTML to see how the email will look

### Verify Results

- Response is `success: true` (or appropriate data structure)
- Any HTML/preview payload looks sensible for the chosen region/discipline
- CloudWatch logs for `letsrace-preview-digest` show no errors

## Test Frontend Forms

### Test Subscribe Form

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

### Test Unsubscribe via Frontend

1. **Subscribe a test email** using the frontend form (above)
2. **Send a test digest** using the test-digest endpoint (Section 2) to the same email address
3. **Open the unsubscribe link** from the email (or directly: `https://www.letsrace.cc/pages/email-unsubscribed.html?token=YOUR_TOKEN`)
4. Complete the unsubscribe flow
5. Confirm:
   - Browser shows the unsubscribe confirmation page
   - The corresponding record in `subscribers.json` is updated (status set to `"unsubscribed"`)

### Test Admin Frontend

1. Open `https://www.letsrace.cc/pages/admin-email-digest.html`
2. Use the UI to:
   - Preview a digest
   - Send a test digest
3. Confirm:
   - Requests go to the right endpoints (`/preview-digest`, `/test-digest`, `/run-digest-now`)
   - Responses are successful
   - Emails arrive where expected

## Test Manual Digest Run (Admin)

**Endpoint**: `POST {YOUR-API-URL}/run-digest-now`

This endpoint manually triggers the digest to run immediately for all active subscribers.

### Using API Gateway Console

**Step-by-step instructions:**

1. **Navigate to the run-digest-now endpoint**
   - In API Gateway, go to Resources → `/run-digest-now` → `POST` method
   - Click the "TEST" button

2. **Configure the test request**
   - **Query Strings**: Leave blank
   
   - **Headers** (Required - this is an admin endpoint):
     - Click "Add header"
     - Header name: `X-Admin-Token`
     - Header value: Paste your ADMIN_TOKEN
   
   - **Request Body**:
     ```json
     {}
     ```
     - **Note**: This endpoint doesn't require any parameters - the empty object `{}` is correct
     - This will trigger the digest for ALL active subscribers in your S3 bucket
     - **Warning**: This will send emails to all subscribers! Only use this in production if you intend to send to everyone

3. **Execute and review**
   - Click "Test"
   - **Expected Response**: 
     - Status `200`
     - Response should indicate the digest was triggered
     - May take longer than other endpoints (30+ seconds) as it processes all subscribers
   - **What happens**: 
     - The system reads all active subscribers from S3
     - Generates and sends a digest email to each subscriber
     - This can take several minutes if you have many subscribers
   - **Check results**:
     - Wait a few minutes
     - Check your test email inbox (if you're a subscriber)
     - Check CloudWatch logs for execution details

### Verify Results

1. Response indicates the digest was triggered.
2. CloudWatch logs for `letsrace-run-digest-now` (and any underlying functions) show:
   - No errors
   - Reasonable execution time
3. Test recipients (as configured in your code) receive a digest email that:
   - Includes the expected events
   - Respects region/discipline filters

## Testing Lambda Functions Directly

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

## Common Testing Issues

### Issue: "AccessDenied" when accessing S3
- **Fix**: Check IAM role has `AmazonS3FullAccess` or create a policy that allows access to your specific bucket

### Issue: "Email address not verified" from SES
- **Fix**: Verify your sender email in SES, and if in sandbox, verify recipient emails too

### Issue: CORS errors in browser
- **Fix**: Make sure CORS is enabled on API Gateway resources AND the Lambda functions return CORS headers

### Issue: "Invalid token" errors
- **Fix**: Make sure `TOKEN_SECRET` and `ADMIN_TOKEN` environment variables are set correctly in ALL Lambda functions

### Issue: Lambda timeout
- **Fix**: Increase timeout in Lambda configuration (especially for `run-digest`)

### Issue: 502 Bad Gateway Error

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
  - ❌ S3 bucket doesn't exist → Create the bucket
  - ❌ Wrong S3 bucket name in environment variables → Check `S3_BUCKET_SUBSCRIBERS` matches your actual bucket name
  - ❌ Missing environment variables → Verify all env vars are set
  - ❌ Missing shared files in Lambda → Make sure `shared/utils.js`, `shared/s3.js`, and `shared/digest.js` are in the Lambda function code
  - ❌ IAM permissions → Check the Lambda execution role has `AmazonS3FullAccess`
  - ❌ Lambda timeout → Check timeout is set to at least 30 seconds
  - ❌ Lambda Proxy integration not enabled → API Gateway → `/subscribe` → POST → Integration → Must have "Use Lambda Proxy integration" checked

## Testing Checklist

Use this checklist to ensure you've tested all functionality:

- [ ] Subscribe endpoint (API)
- [ ] Subscribe endpoint (Frontend form)
- [ ] Test-digest endpoint (Admin)
- [ ] Unsubscribe endpoint (via frontend with token)
- [ ] Unsubscribe endpoint (API with token)
- [ ] Preview-digest endpoint (Admin)
- [ ] Run-digest-now endpoint (Admin)
- [ ] Frontend subscribe form
- [ ] Frontend unsubscribe page
- [ ] Admin frontend page
- [ ] CloudWatch logs show no errors
- [ ] S3 subscribers.json updates correctly
- [ ] Emails are received correctly
- [ ] Unsubscribe links work correctly
- [ ] Token generation/verification works

## Next Steps

After completing all tests:
- Review CloudWatch logs for any warnings or errors
- Monitor the scheduled digest run (if configured)
- Set up CloudWatch alarms for errors (optional but recommended)
- Document any issues found and their resolutions

## Quick Reference: API Testing Cheat Sheet

### Common Endpoints

| Endpoint | Method | Requires Admin Token? | Purpose |
|----------|--------|----------------------|---------|
| `/subscribe` | POST | No | Subscribe to email digest |
| `/unsubscribe` | POST | No | Unsubscribe from email digest |
| `/preview-digest` | POST | Yes | Preview digest HTML |
| `/test-digest` | POST | Yes | Send test email to one address |
| `/run-digest-now` | POST | Yes | Send digest to all subscribers |

### Request Format Template

**Public Endpoint (no token):**
```json
POST {YOUR-API-URL}/endpoint
Headers: (none needed)
Body: {
  "field1": "value1",
  "field2": "value2"
}
```

**Admin Endpoint (requires token):**
```json
POST {YOUR-API-URL}/endpoint
Headers: 
  X-Admin-Token: your-admin-token-here
Body: {
  "field1": "value1",
  "field2": "value2"
}
```

### Common Status Codes

- **200 OK** - Success! Request completed successfully
- **400 Bad Request** - Your request data is invalid (check JSON format, required fields)
- **401 Unauthorized** - Missing or invalid admin token (for admin endpoints)
- **403 Forbidden** - You don't have permission
- **500 Internal Server Error** - Server error (check CloudWatch logs)

### JSON Formatting Checklist

Before sending a request, verify:
- [ ] All strings are in double quotes: `"text"` not `text`
- [ ] No trailing commas after last item in objects/arrays
- [ ] All curly braces `{}` and square brackets `[]` are properly closed
- [ ] Commas between items (but not after the last one)
- [ ] Arrays use square brackets: `["item1", "item2"]`
- [ ] Objects use curly braces: `{"key": "value"}`

### Getting Your ADMIN_TOKEN

1. AWS Console → Lambda
2. Select any email digest function
3. Configuration tab → Environment variables
4. Find `ADMIN_TOKEN` → Click "Show" → Copy value

### Testing Tools Comparison

| Tool | Difficulty | Best For |
|------|-----------|----------|
| AWS API Gateway Console | Easy | Quick tests, no installation |
| Browser Extension (REST Client) | Medium | Regular testing, saving requests |
| Command Line (curl) | Advanced | Automation, scripting |

---

## Related Documentation

- **Functional Testing**: See `FUNCTIONAL_TEST_PLAN.md` for business logic and end-to-end testing
- **Deployment**: See `DEPLOYMENT_GUIDE.md` for deployment instructions
- **Quick Reference**: See `QUICK_START.md` for a quick checklist

**Recommended Testing Order**:
1. Complete API testing first (this guide) - verify endpoints work
2. Then perform functional testing (`FUNCTIONAL_TEST_PLAN.md`) - verify business logic works
3. Both are essential for a complete deployment

