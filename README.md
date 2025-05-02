# Visitor Sign-In System

A comprehensive full-stack web application for visitor registration and event management.

## Features

- **User Authentication**: Secure login and registration system
- **Event Management**: Create, enable, and disable events
- **Scheduled Events**: Create recurring events with flexible scheduling options
- **Visitor Registration**: Simple sign-in form for visitors with validation
- **QR Code Generation**: Generate QR codes linking to the sign-in page
- **Real-time Dashboard**: Monitor visitor check-ins and event statistics
- **Analytics**: Visualize visitor data with interactive charts
- **Email Notifications**: Automatic emails for visitor check-ins and event updates
- **Responsive Design**: Works on desktop and mobile devices
- **PostgreSQL Database**: Persistent storage with fallback to in-memory when needed

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript with Bootstrap framework
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: Custom implementation with bcryptjs
- **Email**: Nodemailer with Ethereal Email for development
- **Charts**: Chart.js for data visualization
- **QR Codes**: Generated using QR Server API

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Local Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: (Optional) Port to run the server on (default: 5000)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: (Optional) SMTP server settings
   - `EMAIL_FROM`: (Optional) Sender email address
   - `ADMIN_EMAIL`: (Optional) Admin email for notifications

4. Start the server:
   ```
   npm start
   ```

### AWS Deployment

The application includes scripts and configuration for multiple AWS deployment options.

#### AWS Authentication Support

Our deployment scripts support two authentication methods:

1. **Standard AWS Credentials**: Traditional access key and secret key configured with `aws configure`
2. **AWS SSO (Single Sign-On)**: Modern authentication method using `aws configure sso`

The deployment scripts automatically detect and handle both authentication methods. Special wrapper scripts with `run-` prefix provide seamless SSO authentication support.

#### Option 1: AWS CodePipeline Deployment (Recommended)

This option sets up a complete CI/CD pipeline using AWS CodePipeline, CodeCommit, and CodeBuild.

##### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured (standard credentials or SSO)
- Git installed locally

##### Deployment Steps

1. Run the CodePipeline setup script:
   ```bash
   cd scripts
   
   # If using AWS SSO:
   ./run-setup-codepipeline.sh
   
   # If using standard AWS credentials:
   ./setup-codepipeline.sh
   ```

2. Run the one-click complete deployment:
   ```bash
   # If using AWS SSO:
   ./run-deploy-complete.sh
   
   # If using standard AWS credentials:
   ./deploy-complete.sh
   ```
   
   This will:
   - Set up IAM roles and policies
   - Create an S3 bucket for artifacts
   - Deploy the CloudFormation stack for CodePipeline
   - Set up scheduled events infrastructure
   - Configure monitoring and alarms

3. Monitor the pipeline in the AWS Console

For detailed CodePipeline deployment instructions, see the [deployment guide](deploy/DEPLOYMENT_GUIDE.md).

#### Option 2: Elastic Beanstalk Direct Deployment

For a more manual approach, you can deploy directly to Elastic Beanstalk.

##### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- EB CLI installed

##### Deployment Steps

See the [deployment guide](deploy/DEPLOYMENT_GUIDE.md) for detailed Elastic Beanstalk deployment instructions.

### Default Access

The application comes with a default admin user:
- Username: `admin`
- Password: `password`

It's recommended to change these credentials after first login.

## Application Structure

- `server.js`: Main Express server setup and API routes
- `database.js`: PostgreSQL database connection
- `schema.js`: Database schema setup
- `email-service.js`: Email notification services
- `next.js-frontend/public/`: Frontend static files
  - `index.html`: Login/registration page
  - `dashboard.html`: Admin dashboard
  - `analytics.html`: Data visualization
  - `signin.html`: Visitor registration form

## API Endpoints

### Authentication
- `POST /api/login`: User login
- `POST /api/register`: User registration
- `GET /api/users`: Get all users (development only)

### Events
- `GET /api/events`: Get all events
- `GET /api/events/current`: Get current active event
- `GET /api/events/:id`: Get event by ID
- `POST /api/events`: Create new event
- `PUT /api/events/:id/disable`: Disable event
- `PUT /api/events/:id/enable`: Enable event

### Visitors
- `GET /api/visitors`: Get all visitors (with optional eventId filter)
- `POST /api/visitors`: Register new visitor

### Scheduled Events
- `GET /api/scheduled-events`: List all scheduled event templates
- `POST /api/scheduled-events`: Create a new scheduled event template
- `GET /api/scheduled-events/:id`: Get a specific scheduled event
- `PUT /api/scheduled-events/:id`: Update a scheduled event
- `DELETE /api/scheduled-events/:id`: Delete a scheduled event
- `GET /api/scheduled-events/:id/instances`: List all instances of a scheduled event
- `POST /api/scheduled-events/:id/instances/generate`: Generate instances for a date range
- `POST /api/scheduled-events/:id/register`: Register a visitor for an event
- `DELETE /api/scheduled-events/:id/register/:visitorId`: Cancel a visitor registration

## Usage Workflow

1. **Admin Setup**:
   - Register or log in as an administrator
   - Create a new event from the dashboard or set up a recurring scheduled event
   - Generate and share the event QR code

2. **Visitor Registration**:
   - Visitors scan the QR code or visit the sign-in page
   - Fill out and submit the registration form
   - Receive confirmation of successful registration
   - For scheduled events, visitors can register in advance for upcoming events

3. **Admin Monitoring**:
   - View real-time visitor check-ins on the dashboard
   - Analyze visitor data with the analytics tools
   - Manage events (enable/disable) as needed
   - Review upcoming scheduled events and registrations

## Email Notifications

The system sends two types of email notifications:
1. **Welcome Emails**: Sent to visitors who opt in during registration
2. **Check-in Notifications**: Sent to administrators when new visitors register

In development mode, the system uses Ethereal Email to preview emails without actually sending them.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for the responsive UI components
- Chart.js for data visualization
- QR Server API for QR code generation

---

For any questions or issues, please contact the development team.