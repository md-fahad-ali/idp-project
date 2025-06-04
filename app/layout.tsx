import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"; // This will apply to all pages by default
import { cookies } from "next/headers";
import { DashboardProvider } from "./provider";
import { ActivityProvider } from './activity-provider';
import GlobalNotifications from './components/GlobalNotifications';
import RoomControls from './components/RoomControls';
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { DM_Mono } from "next/font/google";
import ThemeWrapper from "./provider/theme-wrapper";

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
  title: "SkillStreet",
  description: "Learn and level up your technical skills",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
    other: [
      {
        rel: 'manifest',
        url: '/site.webmanifest',
      },
    ],
  },
};

const getCookies = async () => {
  const cookieStore = await cookies();
  const token = await cookieStore.get("access_token")?.value;
  return { cookieStore, token };
};

const NavbarComponent = dynamic(() => import("@/components/Navbar"));
const SidebarComponent = dynamic(() => import("@/components/Sidebar"));
const ContentWrapper = dynamic(() => import("@/components/ContentWrapper"));
const FooterComponent = dynamic(() => import("@/components/Footer"));

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { token } = await getCookies();
  
  return (
    <html lang="en">
      <head>
        {/* Script to prevent flash of light theme on landing page */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              // Check if we're on the landing page (root path)
              if (window.location.pathname === '/' || window.location.pathname === '') {
                // Immediately apply dark theme classes
                document.documentElement.classList.add('dark-theme');
                // Set localStorage to remember this setting
                localStorage.setItem('darkMode', 'true');
              }
            } catch(e) {
              console.error("Theme initialization error:", e);
            }
          })();
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} ${dmMono.variable} antialiased`}>
        <ThemeWrapper>
          <DashboardProvider initialToken={token}>
            <ActivityProvider>
              <NavbarComponent access_token={token} />
              <SidebarComponent token={token} />
              <ContentWrapper>
                {children}
              </ContentWrapper>
              {/* <FooterComponent /> */}
              <GlobalNotifications />
              <RoomControls />
            </ActivityProvider>
          </DashboardProvider>
        </ThemeWrapper>
        <Toaster position="top-center" reverseOrder={false} />
      </body>
    </html>
  );
}