import React, { useState, useEffect } from 'react';
import Navbar from './app/components/Navbar';
import About from './app/about';
import Contacts from './app/contacts';
import Map from './app/map';

function App() {
  const [page, setPage] = useState('map');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let Content;
  if (page === 'about') Content = <About />;
  else if (page === 'contacts') Content = <Contacts />;
  else Content = <Map isMobile={isMobile} />;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', boxSizing: 'border-box', background: '#fff' }}>
      <Navbar onNavigate={setPage} isMobile={isMobile} />
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        height: 'calc(100vh - 64px)',
        boxSizing: 'border-box',
        padding: 0,
      }}>
        <div style={{ flex: 1, height: '100%' }}>
          {Content}
        </div>
      </div>
    </div>
  );
}

export default App;