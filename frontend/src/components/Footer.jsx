import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>GitHub Insight</h3>
          <p>
            Analyze any GitHub profile and get deep insights into repositories, statistics, and activity.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#api">API</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Technology</h4>
          <ul>
            <li>React + Vite</li>
            <li>Node.js + Express</li>
            <li>MySQL</li>
            <li>GitHub API</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li>
              <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer">
                GitHub API Docs
              </a>
            </li>
            <li>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} GitHub Insight. All rights reserved.</p>
        <p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
