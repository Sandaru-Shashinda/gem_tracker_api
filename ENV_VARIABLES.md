# Environment Configuration

This document explains the environment variables required for the Gem Tracker API.

## Required Environment Variables

### Database Configuration

- **MONGO_URI**: MongoDB connection string
  - Local development: `mongodb://localhost:27017/gem-tracker`
  - Production: Use MongoDB Atlas connection string
  - Example: `mongodb+srv://username:password@cluster.mongodb.net/gem-tracker`

### Authentication

- **JWT_SECRET**: Secret key for signing JWT tokens
  - **Important**: Change this to a strong, unique value in production
  - Generate a strong secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Example: `gem-tracker-secret-key-2026`

### Server Configuration

- **PORT**: Port number for the API server
  - Default: `5000`
  - Vercel will automatically set this in production

- **NODE_ENV**: Environment mode
  - Values: `development`, `production`, `test`
  - Default: `development`

- **PUBLIC_URL**: Public URL for accessing the API (used for reports and QR codes)
  - Local development: `http://localhost:5000`
  - Production: Your Vercel deployment URL or custom domain
  - Example: `https://your-app.vercel.app`

## Setup Instructions

### Local Development

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` as needed for your local setup

3. Make sure MongoDB is running locally or update `MONGO_URI` to point to your MongoDB instance

### Production Deployment (Vercel)

When deploying to Vercel, set these environment variables in your Vercel project settings:

```bash
MONGO_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-production-secret-key
NODE_ENV=production
PUBLIC_URL=https://your-vercel-app.vercel.app
```

## Security Notes

- **Never commit `.env` to version control** - it's already in `.gitignore`
- **Use strong, unique values for `JWT_SECRET` in production**
- **Keep database credentials secure**
- **`.env.example` is committed to git as a template** - never put real credentials there
