/**
 * Lambda handler for /subscribe endpoint
 * Public endpoint for subscribing to the email digest
 */

const crypto = require('crypto');
const { 
  CONFIG, 
  createResponse, 
  validateSubscriptionPayload,
  VALID_WEEKDAYS
} = require('./shared/utils');
const { loadSubscribers, saveSubscribers, findSubscriberByEmail } = require('./shared/s3');

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
    
    // Validate payload
    const validation = validateSubscriptionPayload(payload);
    if (!validation.valid) {
      return createResponse(400, {
        success: false,
        message: validation.errors.join(' ')
      }, {}, origin);
    }
    
    // Normalize email
    const email = payload.email.trim().toLowerCase();
    
    // Load existing subscribers
    const subscribers = await loadSubscribers();
    
    // Check if subscriber exists (case-insensitive)
    const existingSubscriber = subscribers.find(sub => sub.email.toLowerCase() === email);
    
    const now = new Date().toISOString();
    const sendDay = payload.send_day || 'Friday'; // Default to Friday
    
    if (existingSubscriber) {
      // Update existing subscriber
      if (existingSubscriber.status === 'unsubscribed') {
        // Resubscribe
        existingSubscriber.status = 'active';
        existingSubscriber.region = payload.region;
        existingSubscriber.disciplines = payload.disciplines;
        existingSubscriber.send_day = sendDay;
        existingSubscriber.updated_at = now;
        existingSubscriber.created_at = existingSubscriber.created_at || now;
        
        const index = subscribers.findIndex(sub => sub.id === existingSubscriber.id);
        subscribers[index] = existingSubscriber;
      } else if (existingSubscriber.status === 'active') {
        // Update preferences
        existingSubscriber.region = payload.region;
        existingSubscriber.disciplines = payload.disciplines;
        existingSubscriber.send_day = sendDay;
        existingSubscriber.updated_at = now;
        
        const index = subscribers.findIndex(sub => sub.id === existingSubscriber.id);
        subscribers[index] = existingSubscriber;
      } else {
        // Bounced or other status - treat as new subscription
        existingSubscriber.status = 'active';
        existingSubscriber.region = payload.region;
        existingSubscriber.disciplines = payload.disciplines;
        existingSubscriber.send_day = sendDay;
        existingSubscriber.updated_at = now;
        existingSubscriber.created_at = existingSubscriber.created_at || now;
        existingSubscriber.last_error = null;
        
        const index = subscribers.findIndex(sub => sub.id === existingSubscriber.id);
        subscribers[index] = existingSubscriber;
      }
    } else {
      // Create new subscriber
      const newSubscriber = {
        id: crypto.randomUUID(),
        email: email,
        region: payload.region,
        disciplines: payload.disciplines,
        send_day: sendDay,
        status: 'active',
        created_at: now,
        updated_at: now,
        last_sent_at: null,
        last_error: null
      };
      
      subscribers.push(newSubscriber);
    }
    
    // Save to S3
    await saveSubscribers(subscribers);
    
    return createResponse(200, {
      success: true,
      message: 'Thanks! Your subscription is confirmed. You\'ll receive emails on ' + sendDay + 's.'
    }, {}, origin);
    
  } catch (error) {
    console.error('Subscribe error:', error);
    
    const origin = event.headers?.origin || event.headers?.Origin || null;
    return createResponse(500, {
      success: false,
      message: 'We could not process your subscription. Please try again later.'
    }, {}, origin);
  }
};

