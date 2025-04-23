import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { DashboardProvider } from "../provider";
import { ActivityProvider } from '../activity-provider';
import GlobalNotifications from '../components/GlobalNotifications';
import RoomControls from '../components/RoomControls';
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { DM_Mono } from "next/font/google";
// Note: we don't import globals.css here
import "./page-styles.css"; // Import page-specific styles instead

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"] });
const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "SkillStreet - Specific Page",
  description: "A specific page with custom styling",
};

const getCookies = async () => {
  const cookieStore = await cookies();
  const token = await cookieStore.get("access_token")?.value;
  return { cookieStore, token };
};

const NavbarComponent = dynamic(() => import("@/components/Navbar"));
const SidebarComponent = dynamic(() => import("@/components/Sidebar"));

export default async function SpecificPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { token } = await getCookies();
  
  return (
    <html lang="en">
      <head>
        <style>{`
          /* Add specific styles needed for this page */
          body {
            background-color: #ffffff;
            color: #000000;
          }
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} ${dmMono.variable} antialiased`}>
        <DashboardProvider initialToken={token}>
          <ActivityProvider>
            <NavbarComponent access_token={token} />
            <SidebarComponent token={token} />
            
            <div className="min-h-screen pt-16">
            {children}
            </div>
            
            <GlobalNotifications />
          </ActivityProvider>
        </DashboardProvider>
      </body>
    </html>
  );
} 