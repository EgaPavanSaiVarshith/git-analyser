CREATE DATABASE IF NOT EXISTS github_insight;
USE github_insight;

CREATE TABLE profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  company VARCHAR(255),
  location VARCHAR(255),
  website VARCHAR(500),
  followers INT DEFAULT 0,
  following INT DEFAULT 0,
  public_repos INT DEFAULT 0,
  public_gists INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(username),
  INDEX(updated_at)
);

CREATE TABLE repositories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_username VARCHAR(255) NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  repo_url VARCHAR(500),
  description TEXT,
  language VARCHAR(100),
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  updated_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_username) REFERENCES profiles(username) ON DELETE CASCADE,
  UNIQUE KEY(profile_username, repo_name),
  INDEX(profile_username),
  INDEX(stars)
);

CREATE TABLE analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_username VARCHAR(255) NOT NULL,
  total_stars INT DEFAULT 0,
  total_forks INT DEFAULT 0,
  repo_count INT DEFAULT 0,
  most_starred_repo VARCHAR(255),
  average_stars DECIMAL(10, 2) DEFAULT 0,
  top_language VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_username) REFERENCES profiles(username) ON DELETE CASCADE,
  UNIQUE KEY(profile_username),
  INDEX(profile_username)
);

CREATE TABLE bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_username VARCHAR(255) NOT NULL,
  recruiter_id VARCHAR(255) DEFAULT 'default',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'interested',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_username) REFERENCES profiles(username) ON DELETE CASCADE,
  UNIQUE KEY(profile_username, recruiter_id),
  INDEX(recruiter_id),
  INDEX(status)
);
