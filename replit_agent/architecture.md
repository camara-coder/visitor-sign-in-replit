# Architecture Overview

## 1. Overview

The Visitor Sign-In System is a full-stack web application designed to manage visitor registrations for events. The system allows event hosts to create and manage events, generate QR codes for easy sign-in, and track visitor attendance. Visitors can sign in to events using a simple form, which records their information and notifies the event host.

The application follows a modern web architecture with a clear separation between frontend and backend components, using Node.js with Express for the backend and Next.js for the frontend. It utilizes a PostgreSQL database for persistent storage with a fallback to in-memory storage when needed.

## 2. System Architecture

The application follows a client-server architecture with the following high-level components:

### 2.1 Frontend

- **Technology**: Next.js (React framework)
- **Architecture Pattern**: Pages Router with shared components
- **State Management**: React Query for server state, React Context for auth state
- **UI Framework**: Custom CSS with styles modules, potentially Tailwind CSS (configuration files present)

### 2.2 Backend

- **Technology**: Node.js with Express.js
- **Architecture Pattern**: RESTful API endpoints with middleware-based request processing
- **Authentication**: Custom token-based authentication with bcryptjs for password hashing
- **API Structure**: Modular API endpoints organized by functionality (events, authentication, visitors)

### 2.3 Database

- **Primary**: PostgreSQL (relational database)
- **Fallback**: In-memory data storage when database connection fails
- **Schema**: Structured tables for users, events, visitors, and more

### 2.4 Infrastructure

- **Deployment Options**:
  - AWS Elastic Beanstalk (primary deployment target)
  - AWS Lambda with API Gateway (alternative serverless option, defined in Terraform)
- **CI/CD**: AWS CodePipeline with CodeBuild
- **Infrastructure as Code**: Terraform configurations for AWS resources

## 3. Key Components

### 3.1 Frontend Components

#### 3.1.1 Pages

- **Authentication** (`/auth`): User login and registration
- **Dashboard** (`/dashboard`): Admin interface for event management
- **Visitor Sign-In** (`/signin/[eventId]`): Form for visitors to sign in to events
- **Confirmation** (`/confirmation/[eventId]`): Confirmation page after sign-in

#### 3.1.2 Core Components

- **Authentication**: Context-based auth with token storage
- **Forms**: Reusable form components with validation
- **UI Components**: Button, Input, and other shared UI elements
- **Layout**: Shared layout components (Navbar, Footer)

### 3.2 Backend Components

#### 3.2.1 Core Services

- **Authentication Service**: User registration, login, and session management
- **Event Service**: Creating, retrieving, and managing events
- **Visitor Service**: Processing visitor sign-ins and tracking
- **Email Service**: Sending notifications for new sign-ins

#### 3.2.2 API Structure

- **REST API**: Standards-based HTTP endpoints
- **Authentication Middleware**: Secures routes requiring authentication
- **Error Handling**: Centralized error handling and response formatting

#### 3.2.3 Database Schema

The schema includes the following primary entities:
- **Users**: Admin/host accounts managing events
- **Events**: Event details, status, and scheduling information
- **Visitors**: Information about people who have signed in
- **Scheduled Events**: Recurring events with flexible scheduling options

### 3.3 Infrastructure Components

- **Database**: PostgreSQL instance (RDS in AWS)
- **Web Server**: Express.js server on Elastic Beanstalk
- **File Storage**: S3 for static assets (frontend build)
- **CDN**: CloudFront for content delivery
- **Monitoring**: CloudWatch for logs and metrics

## 4. Data Flow

### 4.1 Authentication Flow

1. User submits credentials through the frontend auth form
2. Backend validates credentials and issues a token
3. Frontend stores the token for subsequent requests
4. Protected routes check for valid token before serving content

### 4.2 Event Creation Flow

1. Authenticated host creates an event through the dashboard
2. Backend validates and stores event details in the database
3. Event appears in the host's dashboard for management
4. Host can generate and share a QR code linking to the sign-in page

### 4.3 Visitor Sign-In Flow

1. Visitor scans QR code or accesses sign-in URL
2. Visitor fills out personal information in the sign-in form
3. Backend validates and stores visitor information
4. Email notification is sent to the event host (if configured)
5. Visitor is redirected to a confirmation page

### 4.4 Data Storage Flow

1. Application attempts to connect to PostgreSQL database
2. If connection succeeds, all data operations use the database
3. If connection fails, application falls back to in-memory storage
4. Scheduled tasks synchronize in-memory data with the database when available

## 5. External Dependencies

### 5.1 Runtime Dependencies

- **bcryptjs**: Password hashing and verification
- **body-parser**: Request body parsing middleware
- **cors**: Cross-origin resource sharing support
- **express**: Web server framework
- **nodemailer**: Email sending functionality
- **pg**: PostgreSQL client
- **qrcode.react**: QR code generation (frontend)
- **react-query**: Data fetching and caching
- **axios**: HTTP client for frontend API calls
- **moment**: Date/time manipulation

### 5.2 External Services

- **SMTP Server**: For sending email notifications
  - Configured through environment variables
  - Falls back to Ethereal Email (fake SMTP service) for development

### 5.3 Development Dependencies

- **TypeScript**: Type checking
- **Tailwind CSS**: Utility-first CSS framework
- **AWS CLI**: AWS resource management during deployment
- **Terraform**: Infrastructure as code

## 6. Deployment Strategy

The application supports multiple deployment strategies:

### 6.1 AWS Elastic Beanstalk

- **Approach**: Packaged application deployed to managed environment
- **Configuration**: `.ebextensions` directory and `Procfile`
- **Advantages**: Simplified deployment, auto-scaling, and load balancing
- **CI/CD**: CodePipeline with CodeBuild for automated deployment

### 6.2 AWS Serverless (via Terraform)

- **Components**:
  - Lambda functions for API endpoints
  - API Gateway for request routing
  - RDS Aurora for database
  - S3 and CloudFront for frontend hosting
- **Advantages**: Reduced operational overhead, pay-per-use pricing

### 6.3 Deployment Process

1. Code is pushed to repository (GitHub or CodeCommit)
2. CI/CD pipeline is triggered:
   - Code is tested
   - Build artifacts are created
   - Infrastructure is updated if needed
   - New version is deployed
3. Deployment scripts manage environment configuration

### 6.4 Environment Configuration

- **Environment Variables**: Runtime configuration via `.env` files and AWS Parameter Store
- **Infrastructure Configuration**: Terraform variables or CloudFormation parameters
- **Region-specific Settings**: Adjustable through deployment variables

## 7. Security Considerations

### 7.1 Authentication Security

- Password hashing with bcryptjs
- Session-based authentication with secure cookies
- Rate limiting on login attempts (implied)

### 7.2 Database Security

- Parameterized queries to prevent SQL injection
- SSL connections to database
- Restricted network access via security groups

### 7.3 API Security

- CORS configuration to limit origins
- Input validation and sanitization
- Authentication middleware on protected routes

### 7.4 Infrastructure Security

- IAM roles with least privilege principle
- VPC configuration for network isolation
- Security groups for firewall rules