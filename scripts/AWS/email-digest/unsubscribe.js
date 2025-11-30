/**
 * Lambda handler for /unsubscribe endpoint
 * Public endpoint for unsubscribing via token
 */

const { 
  createResponse, 
  verifyUnsubscribeToken
} = require('./shared/utils');
const { findSubscriberById, updateSubscriber, loadSubscribers, saveSubscribers } = require('./shared/s3');

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
    
    // Validate token
    if (!payload.token) {
      return createResponse(400, {
        success: false,
        message: 'Unsubscribe token is required.'
      }, {}, origin);
    }
    
    // Verify and decode token
    const tokenData = verifyUnsubscribeToken(payload.token);
    if (!tokenData) {
      return createResponse(401, {
        success: false,
        message: 'Invalid or expired unsubscribe token.'
      }, {}, origin);
    }
    
    // Find subscriber
    const subscriber = await findSubscriberById(tokenData.id);
    if (!subscriber) {
      // Return success even if not found to avoid leaking information
      return createResponse(200, {
        success: true,
        message: 'You\'re unsubscribed. You won\'t receive further emails.'
      }, {}, origin);
    }
    
    // Update subscriber status
    await updateSubscriber(tokenData.id, {
      status: 'unsubscribed',
      updated_at: new Date().toISOString()
    });
    
    return createResponse(200, {
      success: true,
      message: 'You\'ve been unsubscribed. You won\'t receive further emails.'
    }, {}, origin);
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    
    const origin = event.headers?.origin || event.headers?.Origin || null;
    // Return generic success message to avoid leaking errors
    return createResponse(200, {
      success: true,
      message: 'You\'re unsubscribed. You won\'t receive further emails.'
    }, {}, origin);
  }
};

