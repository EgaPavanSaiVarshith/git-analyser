# GitHub Insight - Setup & Deployment Guide

## Complete Setup Instructions

This guide walks you through setting up, testing, and deploying GitHub Insight.

---

## Part 1: Local Development Setup

### Step 1: Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### Step 2: Database Setup

#### Option A: Local MySQL (Recommended for Development)

**Windows (using XAMPP or MySQL installer):**
1. Start MySQL service
2. Open terminal and run:
```bash
mysql -u root -p
```
3. Create the database:
```bash
SOURCE schema.sql;
```

**macOS:**
```bash
brew install mysql
brew services start mysql
mysql -u root < backend/schema.sql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mysql-server
sudo mysql < backend/schema.sql
```

### Step 3: Environment Variables

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
GITHUB_API_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_insight
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Get GitHub Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select `public_repo` scope
4. Copy the token to `GITHUB_API_TOKEN`

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# or: npm run dev (for auto-reload)
```

Expected output:
```
Server is running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.0.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 5: Test the Application

1. Open http://localhost:5173 in your browser
2. Try analyzing: `torvalds`
3. Expected result: GitHub profile analysis displays
4. Check backend logs for successful API calls

---

## Part 2: Testing

### Manual Testing Checklist

```
Hero Section:
☐ Input accepts GitHub username
☐ Input accepts GitHub URL
☐ Error message shows for invalid input
☐ Loading state works during analysis
☐ Responsive on mobile

Dashboard:
☐ Profile card displays correctly
☐ Avatar loads
☐ Stats cards show numbers
☐ Repository list displays top 10 repos
☐ Links to repositories work

Responsive:
☐ Desktop (1200px+) - 3 column layout
☐ Tablet (768px) - 2 column layout
☐ Mobile (< 768px) - 1 column layout
☐ Hamburger menu works on mobile

API:
☐ POST /api/analyze works
☐ GET /api/profile/:username works
☐ Database stores data correctly
☐ Duplicate profiles update correctly
```

### Test Users
```
torvalds     → Linux creator
gvanrossum   → Python creator
octocat      → GitHub official
rust-lang    → Rust team
```

---

## Part 3: Production Build

### Frontend Build

```bash
cd frontend
npm run build
```

This creates optimized files in `frontend/dist/`

Verify:
```bash
npm run preview
# Serves dist/ locally at http://localhost:4173
```

### Backend Production Setup

1. Install production process manager:
```bash
npm install -g pm2
# or use: npx pm2
```

2. Start with PM2:
```bash
cd backend
pm2 start server.js --name "github-insight"
pm2 save
pm2 startup
```

---

## Part 4: Deploy to Production

### Option A: Deploy Frontend to Vercel

**Method 1: CLI**
```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

**Method 2: GitHub Integration**
1. Push code to GitHub
2. Go to https://vercel.com/import
3. Import the repository
4. Set up environment variables:
   - `VITE_API_URL=https://your-backend-domain.com`
5. Deploy

### Option B: Deploy Backend to Render

**Steps:**
1. Push code to GitHub
2. Sign up at https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables (same as .env)
7. Deploy

**Note:** MySQL database needs separate setup

### Database Hosting Options

#### Option 1: Railway (Recommended)
1. Create account at https://railway.app
2. Create new MySQL project
3. Get connection details
4. Update backend environment variables

#### Option 2: PlanetScale (MySQL Serverless)
1. Create account at https://planetscale.com
2. Create new database
3. Get connection string
4. Update backend environment variables

#### Option 3: Google Cloud SQL
1. Create Cloud SQL instance
2. Configure network access
3. Update backend environment variables

#### Option 4: AWS RDS
1. Create RDS MySQL instance
2. Configure security groups
3. Update backend environment variables

### Post-Deployment Checklist

```
Vercel Frontend:
☐ Domain is working
☐ Environment variables set
☐ Can reach backend API
☐ Mobile responsive
☐ All components render

Render Backend:
☐ Server is running
☐ Health check: /health endpoint works
☐ Environment variables configured
☐ Database connection working
☐ CORS allows Vercel domain

Database:
☐ Connection successful
☐ Schema tables exist
☐ Can insert/read data
☐ Backups configured

Full Integration:
☐ Frontend → Backend communication works
☐ API endpoints respond
☐ Data persists in database
☐ Can analyze profiles end-to-end
```

---

## Part 5: Custom Domain Setup

### Vercel Custom Domain
1. In Vercel dashboard → Settings → Domains
2. Add your domain
3. Follow DNS instructions

### Render Custom Domain
1. In Render dashboard → Environment → Custom Domain
2. Add your domain
3. Follow DNS instructions

### Update API URL
After deploying backend to custom domain, update:
- Vercel environment variable `VITE_API_URL`

---

## Part 6: Monitoring & Logs

### Vercel Logs
- Dashboard → Deployments → View Logs

### Render Logs
- Dashboard → Service → Logs

### PM2 Logs (Local)
```bash
pm2 logs github-insight
pm2 monit
```

---

## Troubleshooting

### Backend won't start
```bash
# Check port is available
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database connection fails
```bash
# Test MySQL connection
mysql -u root -p -h localhost

# Check credentials in .env
# Verify database exists: SHOW DATABASES;
```

### CORS errors
- Check `CORS_ORIGIN` in backend .env
- Should match frontend URL exactly
- Include protocol (http/https)

### GitHub API errors
- Verify token: `echo $GITHUB_API_TOKEN`
- Check rate limit: https://api.github.com/rate_limit
- Add token to .env with `ghp_` prefix

### Frontend can't reach backend
- Check `VITE_API_URL` in frontend .env
- Verify backend is running
- Check network tab in browser DevTools
- Verify CORS is configured

---

## Performance Optimization

### Frontend
```bash
# Check bundle size
npm run build
# View dist/ size
```

### Backend
```bash
# Add database indexes (already in schema.sql)
# Monitor with:
pm2 monit
```

---

## Security Checklist

```
☐ GitHub token not in code (use .env)
☐ MySQL password strong
☐ CORS configured to specific domain
☐ Environment variables not logged
☐ HTTPS enabled for production
☐ Database backups enabled
☐ API rate limiting considered
```

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Vite Documentation](https://vitejs.dev)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)

---

## Support

If you encounter issues:

1. Check error messages in browser console (F12)
2. Check backend logs
3. Verify environment variables
4. Test API endpoints with curl/Postman
5. Check GitHub API rate limits
6. Verify database connectivity

---

## Next Steps

After deployment:

1. ✅ Share your deployed link
2. ✅ Test with various GitHub profiles
3. ✅ Monitor logs for errors
4. ✅ Get feedback from users
5. ✅ Consider feature additions

Congratulations on deploying GitHub Insight! 🎉
