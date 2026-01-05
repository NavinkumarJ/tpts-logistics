import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <img
                src="/logo.png"
                alt="TPTS Logo"
                className="h-16 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
              />
            </Link>
            <p className="text-sm text-gray-400 mt-4">
              Trail Parcel Tracking System - India's first group shipment platform with real-time tracking and transparent pricing.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition">
                <FaLinkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition">
                <FaInstagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-primary-400 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm hover:text-primary-400 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-sm hover:text-primary-400 transition">
                  Track Shipment
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-sm hover:text-primary-400 transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm hover:text-primary-400 transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Users */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Users</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/register?type=customer" className="text-sm hover:text-primary-400 transition">
                  Customer Registration
                </Link>
              </li>
              <li>
                <Link to="/register?type=company" className="text-sm hover:text-primary-400 transition">
                  Company Registration
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm hover:text-primary-400 transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-sm hover:text-primary-400 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-conditions" className="text-sm hover:text-primary-400 transition">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-primary-400 mt-1 flex-shrink-0" />
                <span className="text-sm">
                  Tech Park, Chennai<br />
                  Tamil Nadu, India
                </span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="text-primary-400 flex-shrink-0" />
                <a href="tel:+919876543210" className="text-sm hover:text-primary-400 transition">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="text-primary-400 flex-shrink-0" />
                <a href="mailto:alamalujai@gmail.com" className="text-sm hover:text-primary-400 transition">
                  alamalujai@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} TPTS - Trail Parcel Tracking System. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="text-sm text-gray-400 hover:text-primary-400 transition">
              Privacy Policy
            </Link>
            <Link to="/terms-conditions" className="text-sm text-gray-400 hover:text-primary-400 transition">
              Terms of Service
            </Link>
            <Link to="/contact" className="text-sm text-gray-400 hover:text-primary-400 transition">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
