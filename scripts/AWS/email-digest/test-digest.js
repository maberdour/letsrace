/**
 * Lambda handler for /test-digest endpoint
 * Admin-only endpoint for sending test emails
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { 
  CONFIG, 
  createResponse, 
  verifyAdminToken,
  isValidEmail,
  parseISODate,
  getTodayInLondon
} = require('./shared/utils');
const { generateDigest } = require('./shared/digest');

const sesClient = new SESClient({ region: CONFIG.SES_REGION });

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
    if (!payload.email || !isValidEmail(payload.email)) {
      return createResponse(400, {
        success: false,
        message: 'Valid email address is required.'
      }, {}, origin);
    }
    
    // Support both old single region and new regions array for backwards compatibility
    let regions = [];
    if (payload.regions && Array.isArray(payload.regions)) {
      regions = payload.regions;
    } else if (payload.region) {
      regions = [payload.region];
    }
    
    if (regions.length === 0 || !payload.disciplines || !Array.isArray(payload.disciplines) || payload.disciplines.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'regions (array) and disciplines (array) are required.'
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
      id: 'test',
      email: payload.email.toLowerCase(),
      regions: regions,
      disciplines: payload.disciplines,
      send_day: 'Friday',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Generate digest
    const digest = await generateDigest(testSubscriber, dateOverride);
    
    // Send email via SES
    const command = new SendEmailCommand({
      Source: CONFIG.SES_FROM_ADDRESS,
      Destination: {
        ToAddresses: [payload.email]
      },
      Message: {
        Subject: {
          Data: digest.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: digest.html,
            Charset: 'UTF-8'
          }
        }
      }
    });
    
    await sesClient.send(command);
    
    return createResponse(200, {
      success: true,
      message: `Test email sent to ${payload.email}`,
      subject: digest.subject,
      hasContent: digest.hasContent
    }, {}, origin);
    
  } catch (error) {
    console.error('Test digest error:', error);
    
    const origin = event.headers?.origin || event.headers?.Origin || null;
    return createResponse(500, {
      success: false,
      message: 'Failed to send test email. ' + error.message
    }, {}, origin);
  }
};

