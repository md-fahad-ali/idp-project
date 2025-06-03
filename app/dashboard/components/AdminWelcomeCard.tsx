import Link from "next/link";
import { PlusCircle, Users, BookOpen, Wrench, SettingsIcon } from 'lucide-react';

interface IUser {
  firstName: string;
  lastName: string;
  role: string;
}

interface AdminWelcomeCardProps {
  user: IUser | null;
}

export default function AdminWelcomeCard({ user }: AdminWelcomeCardProps) {
  // Get a greeting based on the time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get the current date in a readable format
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) return null;

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-6 shadow-[var(--card-shadow)] relative overflow-hidden mb-8">
      {/* Decorative elements */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10"></div>
      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-600 rounded-full opacity-10 transform translate-x-10 -translate-y-10"></div>
      
      <div className="relative z-10">
        {/* Header with date and greeting */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div>
            <p className="text-[var(--text-color)] opacity-80">{getCurrentDate()}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-color)] font-mono">
              {getGreeting()}, {user.firstName}!
            </h1>
            <p className="text-sm text-[var(--text-color)] opacity-70 mt-1">
              Welcome to your admin dashboard
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Link href="/dashboard/create">
              <button className="bg-[var(--purple-primary)] text-white border-2 border-[var(--card-border)] rounded-md py-2.5 px-4 shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm inline-flex items-center">
                <PlusCircle size={16} className="mr-2" />
                Create New Course
              </button>
            </Link>
          </div>
        </div>
        
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/users" className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] hover:-translate-y-1 transition-all flex items-start">
            <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-full mr-3">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-color)] mb-1">User Management</h3>
              <p className="text-xs text-[var(--text-color)] opacity-70">View and manage platform users</p>
            </div>
          </Link>
          
          <Link href="/dashboard/analytics" className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] hover:-translate-y-1 transition-all flex items-start">
            <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded-full mr-3">
              <BookOpen size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-color)] mb-1">Course Analytics</h3>
              <p className="text-xs text-[var(--text-color)] opacity-70">View detailed enrollment statistics</p>
            </div>
          </Link>
          
          <Link href="/dashboard/settings" className="bg-[var(--card-bg-light)] border-2 border-[var(--card-border)] rounded-lg p-4 shadow-[4px_4px_0px_0px_var(--card-border)] hover:shadow-[6px_6px_0px_0px_var(--card-border)] hover:-translate-y-1 transition-all flex items-start">
            <div className="w-10 h-10 bg-purple-100 flex items-center justify-center rounded-full mr-3">
              <Wrench size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-color)] mb-1">Platform Settings</h3>
              <p className="text-xs text-[var(--text-color)] opacity-70">Configure platform settings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 