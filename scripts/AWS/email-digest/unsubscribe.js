/**
 * Lambda handler for /unsubscribe endpoint
 * Public endpoint for unsubscribing via token
 */

const { 
  CONFIG,
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
      console.error('Unsubscribe request missing token');
      return createResponse(400, {
        success: false,
        message: 'Unsubscribe token is required.'
      }, {}, origin);
    }
    
    // Verify and decode token
    console.log('Verifying unsubscribe token (length:', payload.token.length, ', first 20 chars:', payload.token.substring(0, 20), '...)');
    console.log('TOKEN_SECRET configured:', !!CONFIG.TOKEN_SECRET && CONFIG.TOKEN_SECRET !== 'change-me-in-production');
    const tokenData = verifyUnsubscribeToken(payload.token);
    if (!tokenData) {
      console.error('Token verification failed for unsubscribe request');
      return createResponse(401, {
        success: false,
        message: 'We couldn\'t process your unsubscribe request. This might be because the link has expired.'
      }, {}, origin);
    }
    
    console.log('Token verified successfully for subscriber ID:', tokenData.id);
    
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

