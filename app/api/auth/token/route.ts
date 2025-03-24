import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';


export async function GET(request: Request) {
    // No need for CSRF check on GET requests
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'No token found' }), {
            status: 401,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });
    }

    return new NextResponse(JSON.stringify({ token }), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
