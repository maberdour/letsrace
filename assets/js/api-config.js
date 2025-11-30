/**
 * API Gateway Configuration
 * 
 * Set your API Gateway base URL here once, and all pages will use it.
 * This is the ONLY place you need to update your API Gateway URL.
 * 
 * To configure:
 * 1. Deploy your API Gateway (see DEPLOYMENT_GUIDE.md)
 * 2. Copy your Invoke URL (e.g., https://abc123.execute-api.us-east-1.amazonaws.com/prod)
 * 3. Replace the API_BASE_URL value below with your actual URL
 * 
 * Note: The Content Security Policy (CSP) in HTML files uses a wildcard pattern
 * (https://*.amazonaws.com) to allow any AWS API Gateway URL, so you don't need
 * to update CSP when changing this URL. The config file is the single source of truth.
 */

// Set this to your actual API Gateway Invoke URL (without trailing slash)
// Example: 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod'
const API_BASE_URL = 'https://syf5vvs75c.execute-api.eu-west-2.amazonaws.com/prod'; // Update this with your actual API Gateway URL

// API endpoint paths
const API_ENDPOINTS = {
  subscribe: `${API_BASE_URL}/subscribe`,
  unsubscribe: `${API_BASE_URL}/unsubscribe`,
  previewDigest: `${API_BASE_URL}/preview-digest`,
  testDigest: `${API_BASE_URL}/test-digest`,
  runDigestNow: `${API_BASE_URL}/run-digest-now`
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS
  module.exports = { API_BASE_URL, API_ENDPOINTS };
} else {
  // Browser/global scope
  window.API_CONFIG = {
    API_BASE_URL,
    API_ENDPOINTS
  };
}

