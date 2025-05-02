# Scheduled Events Module Guide

The Scheduled Events module provides powerful event scheduling capabilities for the Visitor Sign-In application. This guide explains how to use the module and how it's deployed.

## Overview

The Scheduled Events module allows for:

- Creating recurring events (daily, weekly, monthly, yearly)
- Automatically generating event instances
- Notifying hosts and visitors of upcoming events
- Managing registrations for future events

## Architecture

The module consists of:

1. **Backend API** (`scheduled-events-api.js`)
   - RESTful endpoints for event management
   - Event instance generation logic
   
2. **Database Schema**
   - `scheduled_events` table - Stores event templates
   - `event_instances` table - Stores generated event occurrences
   - `registrations` table - Stores visitor registrations for events

3. **CloudWatch Resources**
   - EventBridge rules for scheduled tasks
   - Lambda functions for event instance generation
   - CloudWatch alarms for monitoring

## AWS Resources

The following AWS resources are used:

- **EventBridge Rules** - Trigger scheduled functions
- **CloudWatch Logs** - Store execution logs
- **CloudWatch Alarms** - Monitor for failures
- **IAM Roles** - Provide necessary permissions

## Deployment

### Automated Deployment

The scheduled events resources are deployed using CloudFormation:

```bash
cd scripts
./setup-scheduled-events.sh
```

The script will:
1. Create necessary CloudWatch resources
2. Set up EventBridge rules
3. Configure IAM permissions
4. Link to the main application resources

### Manual Deployment

If you need to deploy manually:

```bash
aws cloudformation deploy \
  --template-file deploy/scheduled-events-resources.yaml \
  --stack-name visitor-app-scheduled-events \
  --parameter-overrides \
    AppName=visitor-sign-in-app \
    EnvironmentName=production \
    DatabaseSecurityGroupId=[YOUR_DB_SG_ID] \
  --capabilities CAPABILITY_IAM
```

## EventBridge Rules

The following EventBridge rules are configured:

1. **Daily Event Generation** - Runs daily at 00:00 UTC to generate new event instances
2. **Notification Rule** - Runs daily at 08:00 UTC to send notifications for upcoming events
3. **Cleanup Rule** - Runs weekly to archive old event data

## API Reference

### Endpoints

- `GET /api/scheduled-events` - List all scheduled event templates
- `POST /api/scheduled-events` - Create a new scheduled event template
- `GET /api/scheduled-events/:id` - Get a specific scheduled event
- `PUT /api/scheduled-events/:id` - Update a scheduled event
- `DELETE /api/scheduled-events/:id` - Delete a scheduled event

- `GET /api/scheduled-events/:id/instances` - List all instances of a scheduled event
- `POST /api/scheduled-events/:id/instances/generate` - Generate instances for a date range

- `POST /api/scheduled-events/:id/register` - Register a visitor for an event
- `DELETE /api/scheduled-events/:id/register/:visitorId` - Cancel a visitor registration

### Example: Creating a Recurring Event

```json
POST /api/scheduled-events
{
  "title": "Weekly Team Meeting",
  "description": "Regular team sync meeting",
  "location": "Conference Room A",
  "organizationId": "1",
  "recurrence": {
    "type": "weekly",
    "interval": 1,
    "daysOfWeek": [2], // Tuesday
    "startTime": "10:00",
    "endTime": "11:00",
    "startDate": "2023-06-01",
    "endDate": "2023-12-31"
  }
}
```

## Monitoring

### CloudWatch Alarms

The following alarms are configured:

- **EventGenerationFailure** - Triggers if event generation fails
- **EventAPIErrors** - Monitors for high error rates in the API
- **EventInstanceCount** - Alerts on unusual spikes in event creation

### Logs

Logs are stored in CloudWatch Logs under:

- `/aws/lambda/visitor-app-event-generator`
- `/aws/lambda/visitor-app-notification-sender`

## Troubleshooting

### Common Issues

1. **Events not being generated**
   - Check EventBridge rule configuration
   - Review event generator Lambda logs
   
2. **Database connectivity issues**
   - Verify security group settings
   - Check database credentials
   
3. **Permission errors**
   - Review IAM role permissions
   - Check Lambda execution role

### Diagnostics

The health check endpoint provides information about the scheduled events module:

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "scheduledEvents": true,
  "database": "connected",
  "time": "2023-06-07T10:15:30.123Z"
}
```