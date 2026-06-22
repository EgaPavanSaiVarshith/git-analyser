import { useState } from 'react';
import { analyzeProfile } from '../services/api';
import './Hero.css';

export default function Hero({ onAnalyze }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      setError('Please enter a GitHub username or URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data = {};
      if (input.includes('github.com')) {
        data = { url: input };
      } else {
        data = { username: input };
      }

      const response = await analyzeProfile(data);
      onAnalyze(response.data);
      setInput('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Analyze Any GitHub Profile Instantly
          </h1>
          <p className="hero-subtitle">
            Get deep insights into any GitHub user. View repositories, statistics, activity, and more in one beautiful dashboard.
          </p>

          <form className="hero-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter GitHub username or profile URL"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
          </form>

          <p className="hero-hint">
            Try: <code>torvalds</code> or <code>https://github.com/torvalds</code>
          </p>
        </div>

        <div className="hero-illustration">
          <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="360" height="240" fill="var(--bg-secondary)" rx="12" />
            <rect x="30" y="40" width="340" height="30" fill="var(--border-color)" rx="6" />
            <circle cx="45" cy="55" r="5" fill="var(--accent-color)" />
            <circle cx="65" cy="55" r="5" fill="var(--accent-color)" opacity="0.6" />
            <circle cx="85" cy="55" r="5" fill="var(--accent-color)" opacity="0.3" />
            
            <rect x="30" y="85" width="100" height="15" fill="var(--border-color)" rx="3" />
            <rect x="30" y="110" width="80" height="8" fill="var(--text-tertiary)" rx="2" />
            <rect x="30" y="125" width="120" height="8" fill="var(--text-tertiary)" rx="2" />
            
            <rect x="160" y="85" width="100" height="15" fill="var(--border-color)" rx="3" />
            <rect x="160" y="110" width="80" height="8" fill="var(--text-tertiary)" rx="2" />
            <rect x="160" y="125" width="90" height="8" fill="var(--text-tertiary)" rx="2" />
            
            <rect x="290" y="85" width="80" height="15" fill="var(--border-color)" rx="3" />
            <rect x="290" y="110" width="60" height="8" fill="var(--text-tertiary)" rx="2" />
            <rect x="290" y="125" width="70" height="8" fill="var(--text-tertiary)" rx="2" />
            
            <rect x="30" y="155" width="340" height="1" fill="var(--border-color)" />
            
            <rect x="30" y="165" width="330" height="15" fill="var(--border-color)" rx="3" />
            <rect x="30" y="187" width="330" height="15" fill="var(--border-color)" rx="3" />
            <rect x="30" y="209" width="330" height="15" fill="var(--border-color)" rx="3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
