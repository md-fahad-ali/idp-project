'use client';

import { useEffect,useState } from 'react';
import { useDashboard } from './providers';

export default function DashboardPage() {
  const { token } = useDashboard();
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    console.log('Access Token:', token);
    const getNav = document.querySelector('nav');
    setNavHeight(getNav?.offsetHeight || 0);

    const fetchApi = async () => {
      try {
        if (!token) {
          console.error('No token available');
          return;
        }
        const response = await fetch('http://localhost:3000/api/protected', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Profile data:', data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchApi(); 

    return () => {
      setNavHeight(0);
    };
  }, [token]);

  return (
    <div className={`pt-[${navHeight}px]`}>
      <h1>Dashboard</h1>
      <p>Token status: {token ? 'Present' : 'Not found'}</p>
    </div>
  );
}
