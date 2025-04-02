import React from 'react';

export function Test() {
  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>React Application Test</h1>
      <p>If you can see this message, React is working correctly!</p>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '0.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Browser Information:</h2>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li><strong>User Agent:</strong> {navigator.userAgent}</li>
          <li><strong>Window Size:</strong> {window.innerWidth}x{window.innerHeight}</li>
          <li><strong>Current Time:</strong> {new Date().toLocaleString()}</li>
        </ul>
      </div>
      <button 
        onClick={() => alert('Button click works!')}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer'
        }}
      >
        Click Me
      </button>
    </div>
  );
} 