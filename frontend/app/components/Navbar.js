import React from 'react';

const navbarStyles = {
  width: '100%',
  background: '#2a5fa1',
  padding: '0.5rem 0 0.5rem 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const leftStyles = {
  display: 'flex',
  alignItems: 'center',
  marginLeft: '32px',
};

const logoStyles = {
  height: '56px',
  marginRight: '24px',
};

const centerStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '40px',
  flex: 1,
  justifyContent: 'center',
};

const linkStyles = {
  color: '#fff',
  fontSize: '1.08rem',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'none',
  border: 'none',
  padding: '0',
};

const rightStyles = {
  marginRight: '40px',
};

const registerBtnStyles = {
  background: '#fff',
  color: '#2a5fa1',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 24px',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
};

const Navbar = ({ onNavigate }) => (
  <nav style={navbarStyles}>
    <div style={leftStyles}>
      <img src="/logo.png" alt="Logo" style={logoStyles} />
    </div>
    <div style={centerStyles}>
      <button style={linkStyles} onClick={() => onNavigate('about')}>About</button>
      <button style={linkStyles} onClick={() => onNavigate('contacts')}>Contact Us</button>
      <button style={linkStyles} onClick={() => onNavigate('map')}>Map</button>
    </div>
  </nav>
);

export default Navbar;