import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getPool } from './db.js';
import {
  getUserProfile,
  getUserRepositories,
  extractUsernameFromUrl,
  analyzeRepositories,
  calculateTechStack,
  calculateActivityMetrics,
} from './github.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Connect to MySQL database
connectDB();

// POST /api/analyze - Analyze a GitHub profile
app.post('/api/analyze', async (req, res) => {
  try {
    const { username, url } = req.body;

    if (!username && !url) {
      return res.status(400).json({ error: 'Please provide username or GitHub URL' });
    }

    const finalUsername = url ? extractUsernameFromUrl(url) : username;

    // Fetch from GitHub
    const profile = await getUserProfile(finalUsername);
    const repos = await getUserRepositories(finalUsername);
    const analytics = analyzeRepositories(repos);
    const techStack = calculateTechStack(repos);
    const activityMetrics = calculateActivityMetrics(repos, profile);

    const pool = getPool();

    // Store profile
    await pool.query(
      `INSERT INTO profiles (username, name, avatar_url, bio, company, location, website, followers, following, public_repos, public_gists, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         avatar_url = VALUES(avatar_url),
         bio = VALUES(bio),
         company = VALUES(company),
         location = VALUES(location),
         website = VALUES(website),
         followers = VALUES(followers),
         following = VALUES(following),
         public_repos = VALUES(public_repos),
         public_gists = VALUES(public_gists),
         updated_at = NOW()`,
      [
        profile.login,
        profile.name,
        profile.avatar_url,
        profile.bio,
        profile.company,
        profile.location,
        profile.blog,
        profile.followers,
        profile.following,
        profile.public_repos,
        profile.public_gists,
      ]
    );

    // Store repositories
    for (const repo of repos) {
      await pool.query(
        `INSERT INTO repositories (profile_username, repo_name, repo_url, description, language, stars, forks, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           repo_url = VALUES(repo_url),
           description = VALUES(description),
           language = VALUES(language),
           stars = VALUES(stars),
           forks = VALUES(forks),
           updated_at = VALUES(updated_at)`,
        [
          profile.login,
          repo.name,
          repo.html_url,
          repo.description,
          repo.language,
          repo.stargazers_count,
          repo.forks_count,
          repo.updated_at ? new Date(repo.updated_at) : null,
        ]
      );
    }

    // Store analytics
    await pool.query(
      `INSERT INTO analytics (profile_username, total_stars, total_forks, repo_count, most_starred_repo, average_stars, top_language, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         total_stars = VALUES(total_stars),
         total_forks = VALUES(total_forks),
         repo_count = VALUES(repo_count),
         most_starred_repo = VALUES(most_starred_repo),
         average_stars = VALUES(average_stars),
         top_language = VALUES(top_language),
         updated_at = NOW()`,
      [
        profile.login,
        analytics.totalStars,
        analytics.totalForks,
        analytics.repoCount,
        analytics.mostStarredRepo,
        analytics.averageStars,
        analytics.topLanguage,
      ]
    );

    res.json({
      success: true,
      profile: {
        username: profile.login,
        name: profile.name,
        avatar: profile.avatar_url,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        website: profile.blog,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.public_repos,
        publicGists: profile.public_gists,
        createdAt: profile.created_at,
      },
      analytics,
      techStack: techStack.languages,
      activityMetrics,
      topRepositories: repos.slice(0, 10).map((repo) => ({
        name: repo.name,
        url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error analyzing profile:', error.message);
    res.status(400).json({ error: error.message || 'Failed to analyze profile' });
  }
});

// GET /api/profile/:username - Get stored profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const pool = getPool();

    const [profiles] = await pool.query('SELECT * FROM profiles WHERE username = ?', [username]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profile = profiles[0];

    const [analyticsRows] = await pool.query('SELECT * FROM analytics WHERE profile_username = ?', [username]);
    const analytics = analyticsRows[0] || {};

    const [repos] = await pool.query(
      'SELECT * FROM repositories WHERE profile_username = ? ORDER BY stars DESC LIMIT 10',
      [username]
    );

    // Map profile fields to camelCase to match the frontend expectations
    const mappedProfile = {
      username: profile.username,
      name: profile.name,
      avatar: profile.avatar_url,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      website: profile.website,
      followers: profile.followers,
      following: profile.following,
      publicRepos: profile.public_repos,
      publicGists: profile.public_gists,
      createdAt: profile.created_at,
    };

    // Map analytics fields to camelCase
    const mappedAnalytics = {
      totalStars: analytics.total_stars || 0,
      totalForks: analytics.total_forks || 0,
      repoCount: analytics.repo_count || 0,
      mostStarredRepo: analytics.most_starred_repo || null,
      averageStars: parseFloat(analytics.average_stars || 0),
      topLanguage: analytics.top_language || null,
    };

    // Map repos fields to camelCase
    const mappedRepos = repos.map((repo) => ({
      name: repo.repo_name,
      url: repo.repo_url,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      updatedAt: repo.updated_at,
    }));

    // Reconstruct techStack and activityMetrics from stored repos and profile
    const techStack = calculateTechStack(repos.map(r => ({ language: r.language })));
    const activityMetrics = calculateActivityMetrics(
      repos.map(r => ({ updated_at: r.updated_at })),
      { created_at: profile.created_at }
    );

    res.json({
      profile: mappedProfile,
      analytics: mappedAnalytics,
      topRepositories: mappedRepos,
      techStack: techStack.languages,
      activityMetrics,
    });
  } catch (error) {
    console.error('Error fetching profile:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profiles - Get all profiles with search, pagination, and sorting
app.get('/api/profiles', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, sort = 'updated_at' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const pool = getPool();
    
    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['updated_at', 'created_at', 'followers', 'public_repos', 'username'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'updated_at';

    let profiles;
    let total;

    if (search) {
      const searchPattern = `%${search}%`;
      const [rows] = await pool.query(
        `SELECT * FROM profiles 
         WHERE username LIKE ? OR name LIKE ? 
         ORDER BY ${sortColumn} DESC 
         LIMIT ? OFFSET ?`,
        [searchPattern, searchPattern, limitNum, offset]
      );
      profiles = rows;

      const [countRows] = await pool.query(
        'SELECT COUNT(*) as total FROM profiles WHERE username LIKE ? OR name LIKE ?',
        [searchPattern, searchPattern]
      );
      total = countRows[0].total;
    } else {
      const [rows] = await pool.query(
        `SELECT * FROM profiles 
         ORDER BY ${sortColumn} DESC 
         LIMIT ? OFFSET ?`,
        [limitNum, offset]
      );
      profiles = rows;

      const [countRows] = await pool.query('SELECT COUNT(*) as total FROM profiles');
      total = countRows[0].total;
    }

    const mappedProfiles = profiles.map((p) => ({
      username: p.username,
      name: p.name,
      avatar: p.avatar_url,
      bio: p.bio,
      company: p.company,
      location: p.location,
      website: p.website,
      followers: p.followers,
      following: p.following,
      publicRepos: p.public_repos,
      publicGists: p.public_gists,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json({
      profiles: mappedProfiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching profiles:', error.message);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// PUT /api/profile/:username - Refresh profile data
app.put('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Fetch fresh data from GitHub
    const profile = await getUserProfile(username);
    const repos = await getUserRepositories(username);
    const analytics = analyzeRepositories(repos);

    const pool = getPool();

    // Update profile
    await pool.query(
      `UPDATE profiles SET
         name = ?,
         avatar_url = ?,
         bio = ?,
         company = ?,
         location = ?,
         website = ?,
         followers = ?,
         following = ?,
         public_repos = ?,
         public_gists = ?,
         updated_at = NOW()
       WHERE username = ?`,
      [
        profile.name,
        profile.avatar_url,
        profile.bio,
        profile.company,
        profile.location,
        profile.blog,
        profile.followers,
        profile.following,
        profile.public_repos,
        profile.public_gists,
        profile.login,
      ]
    );

    // Update analytics
    await pool.query(
      `UPDATE analytics SET
         total_stars = ?,
         total_forks = ?,
         repo_count = ?,
         most_starred_repo = ?,
         average_stars = ?,
         top_language = ?,
         updated_at = NOW()
       WHERE profile_username = ?`,
      [
        analytics.totalStars,
        analytics.totalForks,
        analytics.repoCount,
        analytics.mostStarredRepo,
        analytics.averageStars,
        analytics.topLanguage,
        profile.login,
      ]
    );

    res.json({ success: true, message: 'Profile refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing profile:', error.message);
    res.status(400).json({ error: error.message || 'Failed to refresh profile' });
  }
});

// DELETE /api/profile/:username - Delete profile
app.delete('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM profiles WHERE username = ?', [username]);

    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error.message);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// POST /api/bookmarks - Create or update bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { username, notes = '', status = 'interested', recruiterId = 'default' } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const pool = getPool();

    await pool.query(
      `INSERT INTO bookmarks (profile_username, recruiter_id, notes, status, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         notes = VALUES(notes),
         status = VALUES(status),
         updated_at = NOW()`,
      [username, recruiterId, notes, status]
    );

    res.json({ success: true, message: 'Bookmark saved' });
  } catch (error) {
    console.error('Error saving bookmark:', error.message);
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

// GET /api/bookmarks/:username - Get bookmark for a profile
app.get('/api/bookmarks/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { recruiterId = 'default' } = req.query;

    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT * FROM bookmarks WHERE profile_username = ? AND recruiter_id = ?',
      [username, recruiterId]
    );

    res.json({ bookmark: rows[0] || null });
  } catch (error) {
    console.error('Error fetching bookmark:', error.message);
    res.status(500).json({ error: 'Failed to fetch bookmark' });
  }
});

// DELETE /api/bookmarks/:username - Delete bookmark
app.delete('/api/bookmarks/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { recruiterId = 'default' } = req.query;

    const pool = getPool();

    await pool.query(
      'DELETE FROM bookmarks WHERE profile_username = ? AND recruiter_id = ?',
      [username, recruiterId]
    );

    res.json({ success: true, message: 'Bookmark deleted' });
  } catch (error) {
    console.error('Error deleting bookmark:', error.message);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// GET /api/recruiter/bookmarks - Get all bookmarks for recruiter
app.get('/api/recruiter/bookmarks', async (req, res) => {
  try {
    const { recruiterId = 'default', status } = req.query;
    const pool = getPool();

    let query = `
      SELECT b.id, b.profile_username, b.recruiter_id, b.notes, b.status, b.created_at, b.updated_at,
             p.name, p.username, p.avatar_url
      FROM bookmarks b
      JOIN profiles p ON b.profile_username = p.username
      WHERE b.recruiter_id = ?
    `;
    const params = [recruiterId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.updated_at DESC';

    const [rows] = await pool.query(query, params);

    const mappedBookmarks = rows.map((row) => ({
      _id: row.id,
      profile_username: row.profile_username,
      recruiter_id: row.recruiter_id,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      name: row.name,
      username: row.username,
      avatar_url: row.avatar_url,
    }));

    res.json({ bookmarks: mappedBookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error.message);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
