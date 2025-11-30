/**
 * Lambda handler for /run-digest-now endpoint
 * Admin-only manual trigger for digest runner (same logic as scheduled)
 */

const { 
  createResponse, 
  verifyAdminToken,
  parseISODate,
  getTodayInLondon
} = require('./shared/utils');
const runDigestHandler = require('./run-digest');

/**
 * API Gateway Lambda handler
 */
exports.handler = async (event) => {
  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...require('./shared/utils').getCorsHeaders(event.headers.origin),
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  try {
    // Get origin for CORS
    const origin = event.headers?.origin || event.headers?.Origin || null;
    
    // Verify admin token
    const adminToken = event.headers['X-Admin-Token'] || event.headers['x-admin-token'];
    if (!verifyAdminToken(adminToken)) {
      return createResponse(401, {
        success: false,
        message: 'Unauthorized. Admin token required.'
      }, {}, origin);
    }
    
    // Parse request body (optional date override)
    let dateOverride = null;
    if (event.body) {
      try {
        const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (payload.date) {
          dateOverride = parseISODate(payload.date);
          if (!dateOverride) {
            return createResponse(400, {
              success: false,
              message: 'Invalid date format. Use ISO8601.'
            }, {}, origin);
          }
        }
      } catch (e) {
        // Ignore parse errors for empty body
      }
    }
    
    // Call the scheduled digest runner logic
    const result = await runDigestHandler.handler({});
    
    // Convert scheduled format to API Gateway format
    const body = JSON.parse(result.body);
    
    return createResponse(200, {
      success: true,
      message: 'Digest run triggered',
      results: body.results
    }, {}, origin);
    
  } catch (error) {
    console.error('Run digest now error:', error);
    
    const origin = event.headers?.origin || event.headers?.Origin || null;
    return createResponse(500, {
      success: false,
      message: 'Failed to run digest. ' + error.message
    }, {}, origin);
  }
};

