# GitHub Insight - Backend

A production-ready Node.js backend for GitHub analytics and profile analysis.

## Setup

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- GitHub Personal Access Token

### Installation

1. Clone the repository
2. Navigate to the backend folder
3. Install dependencies:
```bash
npm install
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Update `.env` with your credentials:
```
PORT=5000
GITHUB_API_TOKEN=your_github_personal_access_token
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_insight
CORS_ORIGIN=http://localhost:5173
```

### Database Setup

1. Create the database and tables:
```bash
mysql -u root -p < schema.sql
```

Or manually in MySQL:
```sql
SOURCE schema.sql;
```

### Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/analyze
Analyze a GitHub profile.

**Request:**
```json
{
  "username": "torvalds"
}
```
or
```json
{
  "url": "https://github.com/torvalds"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "username": "torvalds",
    "name": "Linus Torvalds",
    "avatar": "...",
    "followers": 123456,
    ...
  },
  "analytics": {
    "totalStars": 1000,
    "totalForks": 500,
    ...
  },
  "topRepositories": [...]
}
```

### GET /api/profile/:username
Get stored profile data.

### GET /api/profiles
Get all stored profiles with pagination and search.

**Query Parameters:**
- `search`: Search term
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Sort field (default: updated_at)

### PUT /api/profile/:username
Refresh profile data from GitHub.

### DELETE /api/profile/:username
Delete a stored profile.

## Environment Variables

- `PORT`: Server port (default: 5000)
- `GITHUB_API_TOKEN`: GitHub personal access token
- `DB_HOST`: MySQL host
- `DB_PORT`: MySQL port (default: 3306)
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name
- `CORS_ORIGIN`: Frontend URL for CORS
- `NODE_ENV`: Environment (development/production)

## Deployment

### On Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy

### Database on Railway or Cloud SQL

1. Set up MySQL database on Railway or Google Cloud
2. Update DB_HOST and other DB credentials
3. Run schema.sql on the cloud database
4. Update CORS_ORIGIN to your frontend URL

## Technologies

- Express.js
- MySQL2
- Axios
- CORS
- dotenv
