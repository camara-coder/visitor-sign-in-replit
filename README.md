# Visitor Sign-In System

A comprehensive full-stack web application for visitor registration and event management.

## Features

- **User Authentication**: Secure login and registration system
- **Event Management**: Create, enable, and disable events
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

#### Option 1: Elastic Beanstalk Deployment

##### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- EB CLI installed

##### Deployment Steps

1. Setup AWS Parameters:
   ```
   ./scripts/setup-aws-params.sh
   ```
   This will securely store database passwords, secrets, and other configuration in AWS Parameter Store.

2. Deploy the application:
   ```
   ./scripts/aws-deploy.sh
   ```
   This script will package and deploy the application to AWS Elastic Beanstalk.

For detailed Elastic Beanstalk deployment instructions, see the [deployment guide](deploy/README.md).

#### Option 2: AWS CodePipeline Deployment

This option sets up a complete CI/CD pipeline using AWS CodePipeline, CodeCommit, and CodeBuild.

##### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Git installed locally

##### Deployment Steps

1. Run the all-in-one deployment script:
   ```
   cd scripts
   ./deploy-with-codepipeline.sh
   ```
   This script will:
   - Set up IAM roles and policies
   - Create an S3 bucket for artifacts
   - Deploy the CloudFormation stack for CodePipeline
   - Optionally clone and push code to CodeCommit

2. Monitor the pipeline in the AWS Console

For step-by-step CodePipeline deployment instructions, see the [CodePipeline deployment guide](deploy/CODEPIPELINE_DEPLOYMENT_STEPS.md).

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

## Usage Workflow

1. **Admin Setup**:
   - Register or log in as an administrator
   - Create a new event from the dashboard
   - Generate and share the event QR code

2. **Visitor Registration**:
   - Visitors scan the QR code or visit the sign-in page
   - Fill out and submit the registration form
   - Receive confirmation of successful registration

3. **Admin Monitoring**:
   - View real-time visitor check-ins on the dashboard
   - Analyze visitor data with the analytics tools
   - Manage events (enable/disable) as needed

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