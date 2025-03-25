import axios from 'axios';
import { setCookie } from 'nookies';

export async function fetchApi(url: string, cookieName: string) {
  try {
    const response = await axios.get(url);
    const data = response.data;

    // Set a secure cookie
    setCookie(null, cookieName, JSON.stringify(data), {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      secure: true,
      sameSite: 'strict',
    });

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
