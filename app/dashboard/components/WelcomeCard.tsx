import Loading from "../../../components/ui/Loading";
import Link from "next/link";
import { Sparkles, BookOpen, BarChart } from 'lucide-react';

interface IUser {
  firstName: string;
  lastName: string;
  points?: number;
}

interface WelcomeCardProps {
  user: IUser | null;
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
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

  return (
    <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 h-full shadow-[var(--card-shadow)] relative overflow-hidden card">
      {/* Decorative elements */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--yellow-light)] rounded-full opacity-30"></div>
      <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--purple-primary)] rounded-full opacity-10 transform translate-x-10 -translate-y-10"></div>
      
      {user ? (
        <div className="flex flex-col h-full relative z-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
            <div>
              <p className="text-[var(--text-color)] mb-1 opacity-80">{getCurrentDate()}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-color)] font-mono mb-1">
                {getGreeting()}, {user.firstName}!
              </h1>
            </div>
            <div className="bg-[#FFD700] border-2 border-[var(--card-border)] rounded-md py-1.5 px-3 shadow-[4px_4px_0px_0px_var(--card-border)] inline-flex items-center mt-2 md:mt-0">
              <Sparkles size={16} className="mr-1 text-black" />
              <span className="text-sm font-bold text-black">{user.points || 0} points</span>
            </div>
          </div>
          
          <p className="text-[var(--text-color)] my-4">Ready to continue your learning journey? You've made excellent progress this week!</p>
          
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-[var(--background-color)] border-2 border-[var(--card-border)] rounded-md p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex items-center mb-1">
                <BookOpen size={16} className="mr-1 text-[var(--purple-primary)]" />
                <span className="text-xs font-medium">Courses</span>
              </div>
              <p className="text-xl font-bold">3</p>
              <p className="text-xs mt-1 opacity-70">In progress</p>
            </div>
            
            <div className="bg-[var(--background-color)] border-2 border-[var(--card-border)] rounded-md p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex items-center mb-1">
                <BarChart size={16} className="mr-1 text-[var(--purple-primary)]" />
                <span className="text-xs font-medium">Lessons</span>
              </div>
              <p className="text-xl font-bold">12</p>
              <p className="text-xs mt-1 opacity-70">Completed</p>
            </div>
            
            <div className="bg-[var(--background-color)] border-2 border-[var(--card-border)] rounded-md p-3 shadow-[2px_2px_0px_0px_var(--card-border)] col-span-2 md:col-span-1">
              <div className="flex items-center mb-1">
                <span className="mr-1 text-[var(--purple-primary)]">🔥</span>
                <span className="text-xs font-medium">Current Streak</span>
              </div>
              <p className="text-xl font-bold">5 days</p>
              <p className="text-xs mt-1 opacity-70">Keep it up!</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-auto">
            <Link href="/courses">
              <button className="bg-[var(--purple-primary)] text-white border-2 border-[var(--card-border)] rounded-md py-2 px-4 shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm">
                Browse Courses
              </button>
            </Link>
            <Link href="">
              <button className="bg-[var(--card-bg)] text-[var(--text-color)] border-2 border-[var(--card-border)] rounded-md py-2 px-4 shadow-[2px_2px_0px_0px_var(--card-border)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_var(--card-border)] transition-all font-medium text-sm">
                View Progress
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
} 