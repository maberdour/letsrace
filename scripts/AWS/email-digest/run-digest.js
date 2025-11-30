/**
 * Lambda handler for scheduled digest runner
 * Runs daily to send emails to subscribers based on their send_day
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { 
  CONFIG, 
  getTodayInLondon, 
  getWeekday,
  parseISODate
} = require('./shared/utils');
const { loadSubscribers, saveSubscribers } = require('./shared/s3');
const { generateDigest, loadEvents } = require('./shared/digest');

const sesClient = new SESClient({ region: CONFIG.SES_REGION });

/**
 * CloudWatch Events Lambda handler (scheduled)
 */
exports.handler = async (event) => {
  try {
    const today = getTodayInLondon();
    const todayWeekday = getWeekday(today);
    
    console.log(`Starting digest run for ${todayWeekday} (${today.toISOString()})`);
    
    // Load subscribers
    const allSubscribers = await loadSubscribers();
    
    // Filter subscribers for today
    const subscribersToProcess = allSubscribers.filter(sub => {
      return sub.status === 'active' && 
             sub.send_day === todayWeekday &&
             (!sub.last_error || sub.last_error === null);
    });
    
    console.log(`Found ${subscribersToProcess.length} subscribers to process`);
    
    if (subscribersToProcess.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No subscribers to process today.' })
      };
    }
    
    // Load events once
    const allEvents = await loadEvents(today);
    console.log(`Loaded ${allEvents.length} events`);
    
    // Process each subscriber
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    const updatedSubscribers = [...allSubscribers];
    
    for (const subscriber of subscribersToProcess) {
      try {
        // Generate digest
        const digest = await generateDigest(subscriber, today);
        
        // Skip if no content
        if (!digest.hasContent) {
          console.log(`Skipping ${subscriber.email} - no content`);
          results.skipped++;
          continue;
        }
        
        // Send email via SES
        const command = new SendEmailCommand({
          Source: CONFIG.SES_FROM_ADDRESS,
          Destination: {
            ToAddresses: [subscriber.email]
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
        
        // Update subscriber
        const index = updatedSubscribers.findIndex(sub => sub.id === subscriber.id);
        if (index !== -1) {
          updatedSubscribers[index] = {
            ...updatedSubscribers[index],
            last_sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString()
          };
        }
        
        results.sent++;
        console.log(`Sent digest to ${subscriber.email}`);
        
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        results.failed++;
        results.errors.push({
          email: subscriber.email,
          error: error.message
        });
        
        // Update subscriber with error
        const index = updatedSubscribers.findIndex(sub => sub.id === subscriber.id);
        if (index !== -1) {
          updatedSubscribers[index] = {
            ...updatedSubscribers[index],
            last_error: error.message.substring(0, 200), // Limit error message length
            updated_at: new Date().toISOString()
          };
        }
      }
    }
    
    // Save updated subscribers
    await saveSubscribers(updatedSubscribers);
    
    console.log(`Digest run complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Digest run complete',
        results
      })
    };
    
  } catch (error) {
    console.error('Digest runner error:', error);
    throw error; // Let Lambda retry on failure
  }
};

