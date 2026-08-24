# Server

Backend server for the application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with required environment variables (see `.env` example)

3. Start the server:
   - Development: `npm run dev`
   - Production: `npm start`

## Project Structure

```
server/
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env               # Environment variables
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## API Routes

- `GET /` - Health check endpoint
