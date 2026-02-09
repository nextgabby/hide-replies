# X Reply Hider

A React web app that automatically hides replies on X (Twitter) based on user-defined keywords using the X API.

## Features

- OAuth 2.0 authentication with X
- Define keywords to filter unwanted replies
- Automatic monitoring via webhooks
- Manual scan for historical replies
- View and unhide previously hidden replies
- Stats dashboard

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express API    │────▶│   PostgreSQL    │
│  (Tailwind CSS) │     │  (Node.js)      │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    X API        │
                        │  - OAuth 2.0    │
                        │  - Webhooks     │
                        │  - Hide Reply   │
                        └─────────────────┘
```

## Prerequisites

- Node.js 18+
- PostgreSQL database
- X Developer Account with:
  - OAuth 2.0 credentials (Client ID & Secret)
  - Bearer Token
  - Webhook environment (for Account Activity API)

## Setup

### 1. Clone and install dependencies

```bash
cd x-reply-hider
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp server/.env.example server/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `X_CLIENT_ID` - X OAuth 2.0 Client ID
- `X_CLIENT_SECRET` - X OAuth 2.0 Client Secret
- `X_BEARER_TOKEN` - X App Bearer Token
- `JWT_SECRET` - Random string for JWT signing
- `FRONTEND_URL` - Frontend URL (http://localhost:5173 for dev)
- `BACKEND_URL` - Backend URL (http://localhost:3001 for dev)

### 3. Set up X Developer Portal

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new project/app
3. Enable OAuth 2.0 with these settings:
   - Type: Web App
   - Callback URL: `http://localhost:3001/api/auth/callback` (or your deployed URL)
4. Generate keys and tokens
5. Set up Account Activity API (optional, for real-time webhooks)

### 4. Initialize database

The database schema is automatically created when the server starts.

### 5. Run development servers

```bash
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Log out

### Keywords
- `GET /api/keywords` - List keywords
- `POST /api/keywords` - Add keywords (comma-separated in body)
- `DELETE /api/keywords/:id` - Remove keyword

### Replies
- `GET /api/replies/hidden` - List hidden replies (paginated)
- `POST /api/replies/:id/unhide` - Unhide a reply
- `GET /api/replies/stats` - Get statistics

### Monitoring
- `GET /api/monitoring/status` - Get monitoring status
- `POST /api/monitoring/toggle` - Enable/disable monitoring
- `POST /api/monitoring/scan` - Run historical scan

### Webhook
- `GET /webhook/twitter` - CRC challenge handler
- `POST /webhook/twitter` - Webhook event receiver

## Deployment

### Render

1. Create a PostgreSQL database on Render
2. Create a Web Service for the server:
   - Build Command: `npm install`
   - Start Command: `npm run start --workspace=server`
3. Create a Static Site for the client:
   - Build Command: `npm run build --workspace=client`
   - Publish Directory: `client/dist`
4. Set environment variables in Render dashboard
5. Update X Developer Portal callback URL to your deployed backend URL

## How It Works

1. User signs in with X OAuth 2.0
2. User adds keywords to filter (e.g., "spam", "crypto", "follow me")
3. When monitoring is enabled:
   - Webhooks receive new replies to user's tweets
   - Each reply is checked against user's keywords (case-insensitive)
   - Matching replies are hidden via X API
   - Hidden replies are logged for review
4. User can:
   - View all hidden replies
   - Unhide any reply
   - Run manual scans for historical replies
   - Toggle monitoring on/off

## License

MIT
