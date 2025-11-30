/**
 * Lambda handler for /preview-digest endpoint
 * Admin-only endpoint for previewing digest HTML (no send)
 */

const { 
  CONFIG, 
  createResponse, 
  verifyAdminToken,
  parseISODate,
  getTodayInLondon
} = require('./shared/utils');
const { generateDigest } = require('./shared/digest');

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
    
    // Parse request body
    let payload;
    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body.'
      }, {}, origin);
    }
    
    // Validate required fields
    if (!payload.region || !payload.disciplines || !Array.isArray(payload.disciplines) || payload.disciplines.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'region and disciplines (array) are required.'
      }, {}, origin);
    }
    
    // Parse date override if provided
    let dateOverride = null;
    if (payload.date) {
      dateOverride = parseISODate(payload.date);
      if (!dateOverride) {
        return createResponse(400, {
          success: false,
          message: 'Invalid date format. Use ISO8601.'
        }, {}, origin);
      }
    } else {
      dateOverride = getTodayInLondon();
    }
    
    // Create test subscriber object
    const testSubscriber = {
      id: 'preview',
      email: 'preview@letsrace.cc',
      region: payload.region,
      disciplines: payload.disciplines,
      send_day: 'Friday',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Generate digest
    const digest = await generateDigest(testSubscriber, dateOverride);
    
    return createResponse(200, {
      success: true,
      html: digest.html,
      subject: digest.subject,
      hasContent: digest.hasContent
    }, {}, origin);
    
  } catch (error) {
    console.error('Preview digest error:', error);
    
    const origin = event.headers?.origin || event.headers?.Origin || null;
    return createResponse(500, {
      success: false,
      message: 'Failed to generate preview. ' + error.message
    }, {}, origin);
  }
};

