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


