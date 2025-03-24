import { cookies } from 'next/headers';
import { DashboardProvider } from './providers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies();
  const token = await cookieStore.get('access_token')?.value;

  return (
    <DashboardProvider initialToken={token}>
      <section className="min-h-screen">
        {children}
      </section>
    </DashboardProvider>
  );
}
