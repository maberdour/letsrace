/**
 * S3 operations for subscribers.json
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CONFIG } = require('./utils');

const s3Client = new S3Client({ region: CONFIG.SES_REGION || 'eu-west-2' });

/**
 * Load subscribers from S3
 */
async function loadSubscribers() {
  try {
    const command = new GetObjectCommand({
      Bucket: CONFIG.S3_BUCKET_SUBSCRIBERS,
      Key: CONFIG.SUBSCRIBERS_OBJECT_KEY
    });
    
    const result = await s3Client.send(command);
    const bodyString = await result.Body.transformToString();
    const subscribers = JSON.parse(bodyString);
    return Array.isArray(subscribers) ? subscribers : [];
  } catch (error) {
    // AWS SDK v3 uses error.name for error codes
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      // File doesn't exist yet, return empty array
      return [];
    }
    throw error;
  }
}

/**
 * Save subscribers to S3
 */
async function saveSubscribers(subscribers) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.S3_BUCKET_SUBSCRIBERS,
    Key: CONFIG.SUBSCRIBERS_OBJECT_KEY,
    Body: JSON.stringify(subscribers, null, 2),
    ContentType: 'application/json'
  });
  
  await s3Client.send(command);
}

/**
 * Update a subscriber in the array
 */
async function updateSubscriber(subscriberId, updates) {
  const subscribers = await loadSubscribers();
  const index = subscribers.findIndex(sub => sub.id === subscriberId);
  
  if (index === -1) {
    throw new Error('Subscriber not found');
  }
  
  subscribers[index] = {
    ...subscribers[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  await saveSubscribers(subscribers);
  return subscribers[index];
}

/**
 * Find subscriber by email (case-insensitive)
 */
async function findSubscriberByEmail(email) {
  const subscribers = await loadSubscribers();
  const lowerEmail = email.toLowerCase();
  return subscribers.find(sub => sub.email.toLowerCase() === lowerEmail);
}

/**
 * Find subscriber by ID
 */
async function findSubscriberById(id) {
  const subscribers = await loadSubscribers();
  return subscribers.find(sub => sub.id === id);
}

module.exports = {
  loadSubscribers,
  saveSubscribers,
  updateSubscriber,
  findSubscriberByEmail,
  findSubscriberById
};

