import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  
  // Clear the cookies properly
  const response = NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
  
  // Set cookies with past expiration to ensure they're deleted
  response.cookies.set('access_token', '', { 
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  
  response.cookies.set('refresh_token', '', { 
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  
  return response;
} 