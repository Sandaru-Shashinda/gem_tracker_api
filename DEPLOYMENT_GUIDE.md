# 🚀 Vercel Deployment Guide for Gem Tracker API

This guide will walk you through deploying your Gem Tracker API to Vercel.

## 📋 Prerequisites

Before you begin, make sure you have:

- [ ] A [Vercel account](https://vercel.com/signup) (free plan is fine)
- [ ] A [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas/register) for production database
- [ ] Your code committed to a GitHub repository

## 🎯 Deployment Methods

You can deploy using either:

1. **GitHub Integration (Recommended)** - Automatic deployments on every push
2. **Vercel CLI** - Manual deployments from your terminal

---

## Method 1: GitHub Integration (Recommended) ⭐

This method provides automatic deployments whenever you push to GitHub.

### Step 1: Prepare Your Code

1. **Check your current status:**

   ```bash
   git status
   ```

2. **Add and commit all changes:**

   ```bash
   git add .
   git commit -m "Add Vercel configuration and environment setup"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

### Step 2: Set Up MongoDB Atlas (Production Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is available)
3. Create a database user with username and password
4. Whitelist all IP addresses (0.0.0.0/0) for Vercel access
5. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster.mongodb.net/gem-tracker`
   - Replace `<password>` with your actual password

### Step 3: Deploy to Vercel via GitHub

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New" → "Project"**

3. **Import your GitHub repository:**
   - If this is your first time, you'll need to authorize Vercel to access GitHub
   - Select your `gem-tracker-api` repository
   - Click "Import"

4. **Configure the project:**
   - **Project Name:** `gem-tracker-api` (or your preferred name)
   - **Framework Preset:** Select "Other" (it will use our vercel.json)
   - **Root Directory:** Leave as `.` (current directory)
   - **Build Command:** Leave empty (not needed for Express API)
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`

5. **Add Environment Variables:**
   Click "Environment Variables" and add the following:

   | Name         | Value                                               | Environment |
   | ------------ | --------------------------------------------------- | ----------- |
   | `MONGO_URI`  | Your MongoDB Atlas connection string                | Production  |
   | `JWT_SECRET` | A strong random secret (see below)                  | Production  |
   | `NODE_ENV`   | `production`                                        | Production  |
   | `PUBLIC_URL` | Leave empty for now (we'll add it after deployment) | Production  |

   **Generating a strong JWT_SECRET:**
   Run this in your terminal:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Copy the output and use it as your JWT_SECRET.

6. **Deploy:**
   - Click "Deploy"
   - Wait for the deployment to complete (usually 1-2 minutes)
   - You'll get a URL like: `https://gem-tracker-api-xyz.vercel.app`

7. **Update PUBLIC_URL:**
   - Go to your project settings on Vercel
   - Navigate to "Environment Variables"
   - Add or update `PUBLIC_URL` with your deployment URL
   - Redeploy the project

### Step 4: Test Your Deployment

Visit `https://your-deployment-url.vercel.app` in your browser. You should see:

```
Gem Tracker API is running...
```

Test an API endpoint:

```
https://your-deployment-url.vercel.app/api/auth/login
```

---

## Method 2: Vercel CLI (Alternative)

This method allows you to deploy directly from your terminal.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Deploy

1. **From your project directory, run:**

   ```bash
   vercel
   ```

2. **Answer the prompts:**
   - Set up and deploy? → `Y`
   - Which scope? → Select your account
   - Link to existing project? → `N`
   - Project name? → `gem-tracker-api`
   - In which directory is your code located? → `./`

3. **The CLI will give you a preview URL** (for testing)

4. **To deploy to production:**
   ```bash
   vercel --prod
   ```

### Step 4: Add Environment Variables via CLI

```bash
vercel env add MONGO_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV
vercel env add PUBLIC_URL
```

Follow the prompts for each variable and select "Production" environment.

---

## 🔧 Post-Deployment Configuration

### Update Your Frontend

If you have a frontend application, update its environment variable:

```env
VITE_API_BASE_URL=https://your-api-url.vercel.app/api
```

### Set Up Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS settings as instructed

---

## 🔍 Troubleshooting

### Deployment Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify `vercel.json` configuration

### Database Connection Issues

- Verify MongoDB Atlas connection string
- Ensure IP whitelist includes `0.0.0.0/0`
- Check database user credentials

### API Returns 404

- Verify routes are correctly configured in `vercel.json`
- Check that `src/index.js` exports the Express app

### Environment Variables Not Working

- Ensure variables are added to the correct environment (Production)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

---

## 📊 Monitoring

### View Deployment Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click on a deployment
4. View "Functions" logs for runtime errors

### Check API Health

Visit: `https://your-api-url.vercel.app/`

---

## 🔄 Continuous Deployment

With GitHub integration:

- Every push to `main` branch automatically deploys to production
- Pull requests create preview deployments
- You can configure deployment branches in Vercel settings

---

## 📝 Important Notes

✅ **Do's:**

- Use MongoDB Atlas for production (not localhost)
- Use strong, unique JWT_SECRET in production
- Keep environment variables secure
- Test thoroughly before deploying to production

❌ **Don'ts:**

- Don't commit `.env` file to Git
- Don't use weak secrets in production
- Don't expose sensitive data in logs
- Don't forget to update PUBLIC_URL after deployment

---

## 🆘 Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)
- Check deployment logs for specific errors
