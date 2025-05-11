export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      textAlign: 'center', 
      padding: '0 1rem' 
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h1>
      <p style={{ marginBottom: '2rem' }}>The page you're looking for doesn't exist or has been moved.</p>
      <div>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#9D4EDD', 
            color: 'white', 
            borderRadius: '0.375rem', 
            textDecoration: 'none', 
            marginRight: '1rem' 
          }}
        >
          Home
        </a>
        <a 
          href="/courses" 
          style={{ 
            display: 'inline-block', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#FFD700', 
            color: 'black', 
            borderRadius: '0.375rem', 
            textDecoration: 'none' 
          }}
        >
          Courses
        </a>
      </div>
    </div>
  );
} 