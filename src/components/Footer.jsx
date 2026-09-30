// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // © copyright logo

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-left">
        <span className="footer-brand">
          {currentYear} <strong>SkillSwap</strong> • Decentralized Time Banking
        </span>
      </div>

      <nav className="footer-nav" aria-label="Footer Navigation">
        <Link to="/admin" className="footer-link">
          Admin Portal
        </Link>
      </nav>
    </footer>
  );
}
