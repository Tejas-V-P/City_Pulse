# Requirements Document: PostgreSQL Database Integration for PERN Stack

## Introduction

This document specifies requirements for integrating PostgreSQL database connectivity into an existing PERN (PostgreSQL, Express, React, Node.js) stack application. The application has an authentication system with user login and registration, along with a dashboard that displays user profiles, project statistics, and activity tracking. This feature will establish database models, connection infrastructure, and API integration to persist and retrieve user and project data from PostgreSQL.

## Glossary

- **User**: An authenticated person using the application
- **Database_Connection**: A connection pool between the Node.js server and PostgreSQL
- **User_Model**: Data structure representing a user in the database
- **Project**: A container for tasks created by a user
- **Task**: A unit of work assigned to a project
- **API_Endpoint**: A route that handles HTTP requests and returns data
- **Query**: A SQL statement executed against the PostgreSQL database
- **Migration**: A version-controlled database schema change
- **ORM**: Object-Relational Mapping library that abstracts SQL queries
- **Hash**: A one-way cryptographic encoding of a password
- **Authentication**: Process of verifying a user's identity
- **Session**: A period of time a user remains logged in

## Requirements

### Requirement 1: PostgreSQL Database Connection

**User Story:** As a developer, I want to establish a secure connection to PostgreSQL, so that the application can persist and retrieve data.

#### Acceptance Criteria

1. WHEN the server starts, THE Database_Connection SHALL connect to PostgreSQL using credentials from environment variables
2. WHERE the Database_Connection fails to establish, THE server SHALL log an error message and retry connection up to 3 times with 2-second intervals
3. WHEN the server successfully connects to PostgreSQL, THE console SHALL display a confirmation message
4. THE Database_Connection SHALL use a connection pool with a minimum of 5 connections and maximum of 20 connections

---

### Requirement 2: User Model Definition

**User Story:** As a developer, I want to define a User model with authentication fields, so that I can store and retrieve user information securely.

#### Acceptance Criteria

1. THE User_Model SHALL include the following fields: id (unique identifier), name (string), email (unique string), password_hash (string), created_at (timestamp), updated_at (timestamp)
2. WHEN a User is created, THE id field SHALL be auto-generated as a UUID
3. WHEN a User is created, THE created_at and updated_at fields SHALL be automatically set to the current timestamp
4. WHEN a User is updated, THE updated_at field SHALL be automatically updated to the current timestamp
5. THE email field SHALL enforce a UNIQUE constraint at the database level
6. WHERE a User is deleted, THE User record SHALL be soft-deleted with an is_deleted flag instead of being permanently removed from the database

---

### Requirement 3: Project and Task Models Definition

**User Story:** As a developer, I want to define Project and Task models, so that the dashboard can display user project statistics and activity.

#### Acceptance Criteria

1. THE Project_Model SHALL include the following fields: id (unique identifier), user_id (foreign key to User), title (string), description (text), created_at (timestamp), updated_at (timestamp)
2. THE Task_Model SHALL include the following fields: id (unique identifier), project_id (foreign key to Project), title (string), status (string: pending/in_progress/completed), created_at (timestamp), updated_at (timestamp)
3. WHEN a Project is created, THE user_id field SHALL reference an existing User in the database
4. WHEN a Task is created, THE project_id field SHALL reference an existing Project in the database
5. WHERE a Project is deleted, THE Project and all associated Tasks SHALL be cascade-deleted from the database
6. THE Project_Model SHALL enforce a foreign key constraint with the User_Model on the user_id field

---

### Requirement 4: User Registration API Integration

**User Story:** As a developer, I want to create a POST /auth/register API endpoint, so that users can create accounts with data persistence.

#### Acceptance Criteria

1. WHEN a POST request is sent to /auth/register with name, email, and password in the request body, THE API_Endpoint SHALL validate that all three fields are provided and non-empty
2. IF the email already exists in the database, THEN THE API_Endpoint SHALL return a 409 Conflict status with an error message
3. WHEN valid registration data is provided, THE password SHALL be hashed using bcrypt with a salt rounds of 10
4. WHEN a user is successfully registered, THE User_Model SHALL be created in PostgreSQL with the hashed password and a success response with status 201 SHALL be returned
5. WHEN registration fails due to database error, THE API_Endpoint SHALL return a 500 status and log the error without exposing internal details

---

### Requirement 5: User Login API Integration

**User Story:** As a developer, I want to create a POST /auth/login API endpoint, so that users can authenticate and access the dashboard.

#### Acceptance Criteria

1. WHEN a POST request is sent to /auth/login with email and password in the request body, THE API_Endpoint SHALL validate that both fields are provided
2. IF the email does not exist in the database, THEN THE API_Endpoint SHALL return a 401 Unauthorized status with a generic error message
3. WHEN a user with the matching email exists, THE API_Endpoint SHALL compare the provided password with the stored password_hash using bcrypt
4. IF the password does not match the password_hash, THEN THE API_Endpoint SHALL return a 401 Unauthorized status with a generic error message
5. WHEN credentials are valid, THE API_Endpoint SHALL return a 200 status with the user data (excluding password_hash) and a session token
6. WHEN login fails due to database error, THE API_Endpoint SHALL return a 500 status and log the error without exposing internal details

---

### Requirement 6: Dashboard Data API Endpoint

**User Story:** As a developer, I want to create a GET /api/dashboard API endpoint, so that the dashboard can retrieve user profile and statistics data from the database.

#### Acceptance Criteria

1. WHEN a GET request is sent to /api/dashboard with valid authentication, THE API_Endpoint SHALL retrieve the authenticated user's profile from the User_Model
2. WHEN a GET request is sent to /api/dashboard, THE API_Endpoint SHALL retrieve all Projects belonging to the authenticated user from the Project_Model
3. WHEN Projects are retrieved, THE API_Endpoint SHALL also retrieve all Tasks for each Project and calculate: total project count, active task count (status = 'in_progress'), and completed task count (status = 'completed')
4. WHEN a GET request is sent to /api/dashboard, THE API_Endpoint SHALL retrieve recent activity (created_at within last 30 days) from the Task_Model sorted by most recent first
5. WHEN data is successfully retrieved, THE API_Endpoint SHALL return a 200 status with a JSON object containing user profile, project statistics, and recent activity
6. IF the user is not authenticated, THEN THE API_Endpoint SHALL return a 401 Unauthorized status

---

### Requirement 7: Database Migrations

**User Story:** As a developer, I want to version-control database schema changes, so that I can track schema evolution and deploy to different environments.

#### Acceptance Criteria

1. THE application SHALL maintain migration files in a server/migrations directory with a timestamp-based naming convention (YYYYMMDDHHMMSS_description.js)
2. WHEN the server starts, THE application SHALL execute all unapplied migrations in sequential order based on timestamp
3. THE application SHALL maintain a migrations_log table in PostgreSQL that tracks which migrations have been executed
4. WHEN a migration is successfully executed, THE migrations_log table SHALL record the migration name, execution timestamp, and status (success)
5. IF a migration fails during execution, THEN the application SHALL log the error, stop the migration process, and prevent the server from starting
6. WHERE a developer needs to rollback a migration, THE application SHALL provide a rollback mechanism that reverses the migration's changes

---

### Requirement 8: Environment Configuration

**User Story:** As a developer, I want to configure database credentials via environment variables, so that the database connection is secure and environment-specific.

#### Acceptance Criteria

1. THE server/\.env file SHALL contain the following variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
2. WHEN the server starts, THE application SHALL load environment variables from the server/\.env file using dotenv
3. IF required environment variables are missing, THEN the application SHALL log an error message specifying which variables are missing and exit without starting the server
4. WHEN the database connection is established, THE application SHALL use the environment variables without logging their values (to prevent credential exposure in logs)
5. WHERE different deployment environments are used (development, staging, production), THE database configuration SHALL be switched based on the NODE_ENV environment variable

---

### Requirement 9: Error Handling and Logging

**User Story:** As a developer, I want robust error handling and logging for database operations, so that I can debug issues and monitor application health.

#### Acceptance Criteria

1. WHEN a database query fails, THE application SHALL log the error with a timestamp, error message, affected endpoint, and query details (without sensitive data)
2. IF a database connection is lost, THEN the application SHALL attempt to reconnect automatically and log the reconnection attempt
3. WHEN an API endpoint encounters a database error, THE endpoint SHALL return an appropriate HTTP status code (5xx for server errors) with a user-friendly error message
4. THE application SHALL NOT expose SQL queries, database schema details, or internal error stack traces in API responses to clients
5. WHERE database operations complete successfully, THE application SHALL log operation success with timestamp and endpoint information

---

### Requirement 10: Data Validation

**User Story:** As a developer, I want to validate data before inserting into the database, so that database integrity is maintained.

#### Acceptance Criteria

1. WHEN user registration data is received, THE application SHALL validate that email matches a valid email format
2. WHEN user registration data is received, THE application SHALL validate that password is at least 8 characters long
3. WHEN user registration data is received, THE application SHALL validate that name is not empty and contains only alphanumeric characters and spaces
4. WHEN project or task data is received, THE application SHALL validate that all required fields are provided before database insertion
5. WHERE validation fails, THE application SHALL return a 400 Bad Request status with specific error messages for each failed validation rule
6. WHEN data passes validation, THE data SHALL be sanitized to prevent SQL injection attacks before being sent to the database

