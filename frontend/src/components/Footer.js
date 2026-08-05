import React from 'react';
import './Footer.css'; // Import the CSS file
import { ShieldCheck, Mail, Phone, MapPin, Globe, ExternalLink, FileText } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ca-footer">
      <div className="footer-container">
        
        {/* Main Footer Content */}
        <div className="footer-grid">
          
          {/* Brand & Trust Section */}
          <div className="footer-brand">
            <div className="brand-logo">
              <FileText className="brand-icon" size={32} />
              <span>SmartCA Docs</span>
            </div>
            <p className="brand-description">
              Secure, AI-powered document management and compliance tracking built specifically for modern accounting firms.
            </p>
            <div className="compliance-badge">
              <ShieldCheck size={20} />
              <span>SOC 2 Type II & GDPR Compliant</span>
            </div>
          </div>

          {/* Product & Features */}
          <div className="footer-column">
            <h3 className="footer-title">Product</h3>
            <ul className="footer-list">
              <li><a href="#client-portals" className="footer-link">Client Portals</a></li>
              <li><a href="#e-signatures" className="footer-link">E-Signatures</a></li>
              <li><a href="#tax-workflow" className="footer-link">Tax Workflow Automation</a></li>
              <li><a href="#audit-trails" className="footer-link">Audit Trails</a></li>
              <li><a href="#pricing" className="footer-link">Pricing</a></li>
            </ul>
          </div>

          {/* Resources & Support */}
          <div className="footer-column">
            <h3 className="footer-title">Resources</h3>
            <ul className="footer-list">
              <li><a href="#help" className="footer-link">Help Center</a></li>
              <li><a href="#api" className="footer-link">API Documentation</a></li>
              <li><a href="#guide" className="footer-link">CA Compliance Guide</a></li>
              <li><a href="#webinars" className="footer-link">Webinars</a></li>
              <li><a href="#status" className="footer-link">System Status</a></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="footer-column">
            <h3 className="footer-title">Contact Us</h3>
            <ul className="footer-list">
              <li className="contact-item">
                <Mail className="contact-icon" size={20} />
                <a href="mailto:support@smartcadocs.com" className="footer-link">
                  main@zintech.in
                </a>
              </li>
              <li className="contact-item">
                <Phone className="contact-icon" size={20} />
                <span>8010449610</span>
              </li>
              <li className="contact-item">
                <MapPin className="contact-icon" size={20} />
                <span>manish nagar,Nagpur, Maharashtra 400051</span>
              </li>
            </ul>
            
            {/* Social Icons */}
            <div className="social-links">
              <a href="https://zintech.in" target="_blank" rel="noreferrer" className="social-link" aria-label="Z INTECH website">
                <Globe size={20} /> 
              </a>
              Z INTECH PVT LTD
              <a href="https://zintech.in" target="_blank" rel="noreferrer" className="social-link" aria-label="Visit Z INTECH">
                <ExternalLink size={20} />
              </a>
            </div>
          </div>
          
        </div>

        {/* Bottom Bar: Legal & Copyright */}
        <div className="footer-bottom">
          <p className="copyright">
            &copy; {currentYear} SmartCA Docs Inc. All rights reserved.
          </p>
          <div className="legal-links">
            <a href="#privacy" className="legal-link">Privacy Policy</a>
            <a href="#terms" className="legal-link">Terms of Service</a>
            <a href="#security" className="legal-link">Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;