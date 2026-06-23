import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function connectDB() {
  try {
    // First, connect without a database specified to ensure the database exists
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME || 'github_insight';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    // Now, create the pool with the database specified
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('MySQL connected and pool created successfully');

    // Initialize tables
    await initializeTables();
  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION FAILED:');
    console.error(error.message);
    console.error('\nPlease verify that:');
    console.error('1. Your MySQL server is running (e.g. XAMPP, WampServer, or local MySQL service).');
    console.error('2. The MySQL credentials in backend/.env are correct.');
    console.error('3. The database port (default 3306) matches your configuration.\n');
    process.exit(1);
  }
}

async function initializeTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS profiles (
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
    )`,
    `CREATE TABLE IF NOT EXISTS repositories (
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
    )`,
    `CREATE TABLE IF NOT EXISTS analytics (
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
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
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
    )`
  ];

  for (const query of queries) {
    await pool.query(query);
  }
  console.log('MySQL tables verified/created successfully');
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB first.');
  }
  return pool;
}
