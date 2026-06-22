import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, Profile, Repository, Analytics, Bookmark } from './db.js';
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

// Connect to MongoDB
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

    // Store profile
    await Profile.updateOne(
      { username: profile.login },
      {
        username: profile.login,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        website: profile.blog,
        followers: profile.followers,
        following: profile.following,
        public_repos: profile.public_repos,
        public_gists: profile.public_gists,
        updated_at: new Date(),
      },
      { upsert: true }
    );

    // Store repositories
    for (const repo of repos) {
      await Repository.updateOne(
        { profile_username: profile.login, repo_name: repo.name },
        {
          profile_username: profile.login,
          repo_name: repo.name,
          repo_url: repo.html_url,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updated_at: repo.updated_at,
        },
        { upsert: true }
      );
    }

    // Store analytics
    await Analytics.updateOne(
      { profile_username: profile.login },
      {
        profile_username: profile.login,
        total_stars: analytics.totalStars,
        total_forks: analytics.totalForks,
        repo_count: analytics.repoCount,
        most_starred_repo: analytics.mostStarredRepo,
        average_stars: analytics.averageStars,
        top_language: analytics.topLanguage,
        updated_at: new Date(),
      },
      { upsert: true }
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

    const profile = await Profile.findOne({ username });
    const analytics = await Analytics.findOne({ profile_username: username });
    const repos = await Repository.find({ profile_username: username })
      .sort({ stars: -1 })
      .limit(10);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      profile,
      analytics: analytics || {},
      topRepositories: repos,
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
    const skip = (pageNum - 1) * limitNum;

    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const profiles = await Profile.find(searchFilter)
      .sort({ [sort]: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Profile.countDocuments(searchFilter);

    res.json({
      profiles,
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

    // Update profile
    await Profile.updateOne(
      { username: profile.login },
      {
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        website: profile.blog,
        followers: profile.followers,
        following: profile.following,
        public_repos: profile.public_repos,
        public_gists: profile.public_gists,
        updated_at: new Date(),
      }
    );

    // Update analytics
    await Analytics.updateOne(
      { profile_username: profile.login },
      {
        total_stars: analytics.totalStars,
        total_forks: analytics.totalForks,
        repo_count: analytics.repoCount,
        most_starred_repo: analytics.mostStarredRepo,
        average_stars: analytics.averageStars,
        top_language: analytics.topLanguage,
        updated_at: new Date(),
      }
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

    await Profile.deleteOne({ username });

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

    const bookmark = await Bookmark.updateOne(
      { profile_username: username, recruiter_id: recruiterId },
      {
        profile_username: username,
        recruiter_id: recruiterId,
        notes,
        status,
        updated_at: new Date(),
      },
      { upsert: true }
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

    const bookmark = await Bookmark.findOne({ profile_username: username, recruiter_id: recruiterId });

    res.json({ bookmark: bookmark || null });
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

    await Bookmark.deleteOne({ profile_username: username, recruiter_id: recruiterId });

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

    let filter = { recruiter_id: recruiterId };
    if (status) {
      filter.status = status;
    }

    const bookmarks = await Bookmark.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'profiles',
          localField: 'profile_username',
          foreignField: 'username',
          as: 'profile',
        },
      },
      { $unwind: '$profile' },
      {
        $project: {
          _id: 1,
          profile_username: 1,
          recruiter_id: 1,
          notes: 1,
          status: 1,
          created_at: 1,
          updated_at: 1,
          name: '$profile.name',
          username: '$profile.username',
          avatar_url: '$profile.avatar_url',
        },
      },
      { $sort: { updated_at: -1 } },
    ]);

    res.json({ bookmarks });
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

    // Store profile
    await query(
      `INSERT INTO profiles (username, name, avatar_url, bio, company, location, website, followers, following, public_repos, public_gists)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name = VALUES(name), avatar_url = VALUES(avatar_url), bio = VALUES(bio),
       company = VALUES(company), location = VALUES(location), website = VALUES(website),
       followers = VALUES(followers), following = VALUES(following),
       public_repos = VALUES(public_repos), public_gists = VALUES(public_gists)`,
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
      await query(
        `INSERT INTO repositories (profile_username, repo_name, repo_url, description, language, stars, forks, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         description = VALUES(description), language = VALUES(language),
         stars = VALUES(stars), forks = VALUES(forks), updated_at = VALUES(updated_at)`,
        [
          profile.login,
          repo.name,
          repo.html_url,
          repo.description,
          repo.language,
          repo.stargazers_count,
          repo.forks_count,
          repo.updated_at,
        ]
      );
    }

    // Store analytics
    await query(
      `INSERT INTO analytics (profile_username, total_stars, total_forks, repo_count, most_starred_repo, average_stars, top_language)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_stars = VALUES(total_stars), total_forks = VALUES(total_forks),
       repo_count = VALUES(repo_count), most_starred_repo = VALUES(most_starred_repo),
       average_stars = VALUES(average_stars), top_language = VALUES(top_language)`,
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

    const profileRows = await query('SELECT * FROM profiles WHERE username = ?', [username]);
    const analyticsRows = await query('SELECT * FROM analytics WHERE profile_username = ?', [username]);
    const reposRows = await query('SELECT * FROM repositories WHERE profile_username = ? ORDER BY stars DESC LIMIT 10', [username]);

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      profile: profileRows[0],
      analytics: analyticsRows[0] || {},
      topRepositories: reposRows,
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
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE username LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const profilesRows = await query(
      `SELECT * FROM profiles ${whereClause} ORDER BY ${sort} DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const countRows = await query(`SELECT COUNT(*) as count FROM profiles ${whereClause}`, params);
    const total = countRows[0].count;

    res.json({
      profiles: profilesRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
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

    // Update profile
    await query(
      `UPDATE profiles SET name = ?, avatar_url = ?, bio = ?, company = ?, location = ?, website = ?, 
       followers = ?, following = ?, public_repos = ?, public_gists = ? WHERE username = ?`,
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
    await query(
      `UPDATE analytics SET total_stars = ?, total_forks = ?, repo_count = ?, 
       most_starred_repo = ?, average_stars = ?, top_language = ? WHERE profile_username = ?`,
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

    await query('DELETE FROM profiles WHERE username = ?', [username]);

    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error.message);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// Bookmark endpoints
// POST /api/bookmarks - Create or update bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { username, notes = '', status = 'interested', recruiterId = 'default' } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await query(
      `INSERT INTO bookmarks (profile_username, recruiter_id, notes, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       notes = VALUES(notes), status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
      [username, recruiterId, notes, status]
    );

    res.json({ success: true, message: 'Bookmark saved', id: result.insertId });
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

    const bookmarkRows = await query(
      'SELECT * FROM bookmarks WHERE profile_username = ? AND recruiter_id = ?',
      [username, recruiterId]
    );

    if (bookmarkRows.length === 0) {
      return res.json({ bookmark: null });
    }

    res.json({ bookmark: bookmarkRows[0] });
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

    await query(
      'DELETE FROM bookmarks WHERE profile_username = ? AND recruiter_id = ?',
      [username, recruiterId]
    );

    res.json({ success: true, message: 'Bookmark deleted' });
  } catch (error) {
    console.error('Error deleting bookmark:', error.message);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// GET /api/bookmarks - Get all bookmarks for recruiter
app.get('/api/recruiter/bookmarks', async (req, res) => {
  try {
    const { recruiterId = 'default', status } = req.query;

    let whereClause = 'WHERE recruiter_id = ?';
    const params = [recruiterId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const bookmarkRows = await query(
      `SELECT b.*, p.name, p.username, p.avatar_url FROM bookmarks b
       JOIN profiles p ON b.profile_username = p.username
       ${whereClause} ORDER BY b.updated_at DESC`,
      params
    );

    res.json({ bookmarks: bookmarkRows });
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
