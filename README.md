# MailChimp-service

# Mailchimp Backend

A secure, scalable Node.js backend for managing Mailchimp-related functionality, built with Express.js and Prisma ORM. This project includes authentication, email handling, rate limiting, and background job processing, among other features.

## Features
- **Authentication**: JWT-based authentication with Google OAuth2 support via Passport.js.
- **Security**: Helmet for HTTP headers, CSRF protection, rate limiting, and bcrypt for password hashing.
- **Database**: Prisma ORM for database management (replace Sequelize scripts if fully migrated to Prisma).
- **Email**: Nodemailer for sending emails.
- **Background Jobs**: Bull for queue management with Redis as the backing store.
- **Middleware**: CORS, cookie-parser, and session management with Express.
- **Validation**: Input validation using express-validator.

## Prerequisites
- **Node.js**: v20.16.0 or higher
- **npm**: v10.x or higher
- **Redis**: For queue management and session storage
- **PostgreSQL**: For the database (or adjust based on your Prisma setup)
- **Mailchimp API Key**: If integrating with Mailchimp services
- **Google OAuth Credentials**: For Google login

## Installation

1. **Clone the Repository**:
   bash
   git clone https://github.com/Diliate/Mailchimp-Backend.git
   cd Mailchimp-Backend
   

2. **Install Dependencies**:
   bash
   npm install
   

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   env
   PORT=3000
   DATABASE_URL="postgresql://user:password@localhost:5432/mailchimp?schema=public"
   JWT_SECRET="your_jwt_secret"
   REDIS_URL="redis://localhost:6379"
   SESSION_SECRET="your_session_secret"
   GOOGLE_CLIENT_ID="your_google_client_id"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   NODEMAILER_EMAIL="your_email@example.com"
   NODEMAILER_PASSWORD="your_email_password"

   Adjust values based on your setup (e.g., database credentials, Mailchimp API keys).

4. **Initialize the Database**:
   If using Prisma:
   bash
   npx prisma migrate dev --name init
   
   *Note*: The `scripts` section in your `package.json` mentions Sequelize migrations. If you’ve fully switched to Prisma, remove those scripts or update this step to reflect your current ORM.*

## Usage

1. **Start the Server**:
   bash
   npm start
   The server will run on `http://localhost:5000` (or your configured `PORT`).



## Scripts
- **`npm run migrate`**: Run Sequelize migrations (update if using Prisma).
- **`npm run undo:migrate`**: Undo the last Sequelize migration.
- **`npm run migrate:reset`**: Reset and reapply all Sequelize migrations.

*If you’re using Prisma instead of Sequelize, replace these with:*
```json
"scripts": {
  "migrate": "npx prisma migrate dev",
  "undo:migrate": "npx prisma migrate reset"
}
```

## Dependencies
- **@prisma/client**: Prisma ORM client for database operations.
- **bcryptjs**: Password hashing.
- **bull**: Job queue system with Redis.
- **cookie-parser**: Parse cookies in requests.
- **cors**: Enable Cross-Origin Resource Sharing.
- **csurf**: CSRF protection middleware.
- **dotenv**: Load environment variables from `.env`.
- **express**: Web framework for Node.js.
- **express-rate-limit**: Rate limiting middleware.
- **express-session**: Session management.
- **express-validator**: Input validation.
- **helmet**: Security headers.
- **jsonwebtoken**: JWT authentication.
- **nodemailer**: Email sending.
- **passport**: Authentication middleware.
- **passport-google-oauth20**: Google OAuth2 strategy.
- **redis**: Redis client for caching and queues.

## Dev Dependencies
- **prisma**: Prisma CLI for database migrations and schema management.


*Adjust this structure based on your actual setup.*

## Contributing
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m "Add your feature"`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a pull request.

## License
This project is licensed under the MIT License (or specify your preferred license).

## Contact
For issues or questions, reach out to [DanishAbdullahPy](https://github.com/DanishAbdullahPy) at danishabdullah276@gmail.com.



