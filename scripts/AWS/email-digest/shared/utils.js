/**
 * Shared utilities for Email Digest Lambda functions
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

/**
 * Environment configuration
 */
const CONFIG = {
  S3_BUCKET_SUBSCRIBERS: process.env.S3_BUCKET_SUBSCRIBERS || 'letsrace-subscribers-prod',
  SUBSCRIBERS_OBJECT_KEY: process.env.SUBSCRIBERS_OBJECT_KEY || 'subscribers.json',
  EVENTS_BASE_URL: process.env.EVENTS_BASE_URL || 'https://www.letsrace.cc',
  SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS || 'noreply@letsrace.cc',
  SES_REGION: process.env.SES_REGION || 'us-east-1',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
  BASE_WEBSITE_URL: process.env.BASE_WEBSITE_URL || 'https://www.letsrace.cc',
  UNSUBSCRIBE_PAGE_URL: process.env.UNSUBSCRIBE_PAGE_URL || 'https://www.letsrace.cc/pages/email-unsubscribed.html',
  TOKEN_SECRET: process.env.TOKEN_SECRET || process.env.ADMIN_TOKEN || 'change-me-in-production',
  TIMEZONE: 'Europe/London'
};

const VALID_REGIONS = [
  'Central',
  'Eastern',
  'London & South East',
  'East Midlands',
  'West Midlands',
  'North East',
  'North West',
  'Scotland',
  'South',
  'South West',
  'Wales',
  'Yorkshire & Humber'
];

const VALID_DISCIPLINES = [
  'Road',
  'Track',
  'BMX',
  'MTB',
  'Cyclo Cross',
  'Speedway',
  'Time Trial',
  'Hill Climb'
];

const VALID_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * CORS headers for API Gateway responses
 */
function getCorsHeaders(origin = '*') {
  const allowedOrigins = ['https://www.letsrace.cc', 'http://localhost:8000'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Create API Gateway response
 */
function createResponse(statusCode, body, headers = {}, origin = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate subscription payload
 */
function validateSubscriptionPayload(payload) {
  const errors = [];
  
  if (!payload.email || !isValidEmail(payload.email)) {
    errors.push('Please provide a valid email address.');
  }
  
  if (!payload.region || !VALID_REGIONS.includes(payload.region)) {
    errors.push('Please select a valid region.');
  }
  
  if (!Array.isArray(payload.disciplines) || payload.disciplines.length === 0) {
    errors.push('Please select at least one discipline.');
  } else {
    const invalidDisciplines = payload.disciplines.filter(d => !VALID_DISCIPLINES.includes(d));
    if (invalidDisciplines.length > 0) {
      errors.push(`Invalid disciplines: ${invalidDisciplines.join(', ')}`);
    }
  }
  
  if (payload.send_day && !VALID_WEEKDAYS.includes(payload.send_day)) {
    errors.push('Please select a valid weekday.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get current date in Europe/London timezone
 */
function getTodayInLondon() {
  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  return new Date(londonTime.getFullYear(), londonTime.getMonth(), londonTime.getDate());
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get weekday name from date
 */
function getWeekday(date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'LetsRace-EmailDigest/1.0'
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });
    
    req.end();
  });
}

/**
 * Generate unsubscribe token
 */
function generateUnsubscribeToken(subscriberId, email) {
  const payload = {
    id: subscriberId,
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
  
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', CONFIG.TOKEN_SECRET);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');
  
  const token = Buffer.from(`${payloadString}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify and decode unsubscribe token
 */
function verifyUnsubscribeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [payloadString, signature] = decoded.split(':');
    
    if (!payloadString || !signature) {
      return null;
    }
    
    const hmac = crypto.createHmac('sha256', CONFIG.TOKEN_SECRET);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');
    
    // Constant-time comparison
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const payload = JSON.parse(payloadString);
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }
      
      return payload;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Verify admin token
 */
function verifyAdminToken(token) {
  if (!token || !CONFIG.ADMIN_TOKEN) {
    return false;
  }
  
  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(CONFIG.ADMIN_TOKEN)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get friendly name from email
 */
function getFriendlyName(email) {
  const localPart = email.split('@')[0];
  if (!localPart) return 'friend';
  const cleaned = localPart.replace(/[._-]/g, ' ');
  const firstWord = cleaned.split(' ')[0];
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

module.exports = {
  CONFIG,
  VALID_REGIONS,
  VALID_DISCIPLINES,
  VALID_WEEKDAYS,
  getCorsHeaders,
  createResponse,
  isValidEmail,
  validateSubscriptionPayload,
  getTodayInLondon,
  formatDate,
  parseISODate,
  getWeekday,
  fetchJSON,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  verifyAdminToken,
  escapeHtml,
  getFriendlyName
};

