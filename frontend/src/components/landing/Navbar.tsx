import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Activity, Menu, X } from 'lucide-react';
import clsx from 'clsx';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Impact', href: '#impact' },
    { label: 'Live Data', href: '#live' },
    { label: 'Technology', href: '#technology' },
  ];

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'border-b border-white/10 bg-[#081827]/90 backdrop-blur-md shadow-lg shadow-black/40'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="container-page flex h-16 sm:h-20 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-primary">
          <div className="h-9 w-9 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary/25 transition-colors">
            <Activity className="h-5 w-5 text-[#EF4444]" />
          </div>
          <span className="font-mono font-bold text-lg tracking-wider text-ink">IERBMS</span>
        </Link>

        {/* Desktop Anchor Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-ink-muted hover:text-ink transition-colors font-medium focus-visible:outline-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="btn-ghost px-4 py-2 text-sm focus-visible:outline-primary"
          >
            Log in
          </Link>
          <a
            href="mailto:contact@ierbms.gov.gh?subject=IERBMS%20Platform%20Inquiry"
            className="btn-primary px-4 py-2 text-sm focus-visible:outline-primary"
          >
            Request Demo
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 transition-colors focus-visible:outline-primary"
          aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6 text-ink" /> : <Menu className="h-6 w-6 text-ink" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#081827]/98 backdrop-blur-xl px-5 py-6 space-y-4">
          <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base text-ink-muted hover:text-ink transition-colors py-1 font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="btn-ghost w-full py-2.5 text-sm text-center"
            >
              Log in
            </Link>
            <Link
              to="/ambulance"
              onClick={() => setIsMobileMenuOpen(false)}
              className="btn-primary w-full py-2.5 text-sm text-center"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
