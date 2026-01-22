import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "./assets/logo.png";
import "./form.css";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";


export default function Navbar() {
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  // Define navLinks array for navigation
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/form', label: 'Field Officer Daily Form' },
    { to: '/demo', label: 'Demo Sales List' },
    { to: '/history', label: 'History' },
    { to: '/member-page', label: 'Member' },
    { to: '/route-planner', label: 'Route Planner' },
    { to: '/view-route', label: 'View Route' },
  ];

useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Define logout function properly
  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    try {
      const auth = getAuth();
      await signOut(auth);
      navigate("/login"); // redirect after logout
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setMobile(window.innerWidth <= 700);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="navbar navbar-unified" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', boxShadow: '0 2px 8px #2563eb11' }}>
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={logo} alt="Logo" className="navbar-logo" style={{ height: 38, width: 38 }} />
        <span className="navbar-title" style={{ fontWeight: 700, fontSize: '1.2em', color: '#174ea6' }}>Field Officer Portal</span>
      </div>
      {mobile ? (
        <>
          <button
            className="navbar-hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen((m) => !m)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2em',
              color: '#174ea6',
              marginLeft: 'auto',
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
          {menuOpen && (
            <div className="navbar-links-mobile" style={{
              position: 'absolute',
              top: 60,
              left: 0,
              width: '100%',
              background: '#fff',
              boxShadow: '0 2px 12px #2563eb22',
              borderRadius: '0 0 16px 16px',
              padding: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 200,
            }}>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`navbar-link${location.pathname === link.to ? " active" : ""}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px 0',
                    textAlign: 'center',
                    fontSize: '1.15em',
                    color: location.pathname === link.to ? '#2563eb' : '#174ea6',
                    fontWeight: location.pathname === link.to ? 700 : 500,
                    background: location.pathname === link.to ? '#e3eefd' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                style={{
                  background: '#fff',
                  color: '#b91c1c',
                  border: '1.5px solid #e3eefd',
                  borderRadius: '8px',
                  padding: '12px 0',
                  width: '90%',
                  margin: '10px auto 0 auto',
                  fontWeight: 700,
                  fontSize: '1.08em',
                  cursor: 'pointer',
                  boxShadow: '0 1px 6px #2563eb11',
                }}
              >
                Logout
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="navbar-links" style={{ display: 'flex', gap: 18, alignItems: 'center', marginLeft: 'auto' }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link${location.pathname === link.to ? " active" : ""}`}
              style={{
                padding: '8px 18px',
                fontSize: '1.08em',
                color: location.pathname === link.to ? '#2563eb' : '#174ea6',
                fontWeight: location.pathname === link.to ? 700 : 500,
                background: location.pathname === link.to ? '#e3eefd' : 'transparent',
                border: 'none',
                borderRadius: 8,
                textDecoration: 'none',
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            style={{
              background: '#fff',
              color: '#b91c1c',
              border: '1.5px solid #e3eefd',
              borderRadius: '8px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '1.08em',
              cursor: 'pointer',
              boxShadow: '0 1px 6px #2563eb11',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
