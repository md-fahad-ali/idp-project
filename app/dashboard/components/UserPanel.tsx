interface UserPanelProps {
  user: {
    firstName: string;
    lastName: string;
    role?: string;
    points?: number;
  } | null;
}

export default function UserPanel({ user }: UserPanelProps) {
  return (
    <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
      <h2 className="text-2xl font-bold text-[#E6F1FF] mb-4 font-mono">User Dashboard</h2>
      <div className="mb-4">
        <p className="text-[#E6F1FF] mb-2">
          Welcome to your learning dashboard. Browse through available courses and track your progress.
        </p>
        <div className="bg-[#2A3A4A] border-2 border-black rounded-md p-3 mt-4">
          <h3 className="text-lg font-bold text-[#9D4EDD] mb-1">Your Stats</h3>
          <div className="flex justify-between items-center">
            <div className="text-sm text-[#E6F1FF]">
              <p>Role: <span className="font-semibold">{user?.role || 'Learner'}</span></p>
              <p>Status: <span className="font-semibold text-[#5CDB95]">Active</span></p>
              <p>Points: <span className="font-semibold text-[#FFD700]">{user?.points || 0}</span></p>
            </div>
            <div className="bg-[#2f235a] border-2 border-black rounded-md p-2 shadow-[2px_2px_0px_0px_#000000]">
              <p className="text-xs text-[#E6F1FF]">Learning streak: <span className="font-bold text-[#FFD700]">3 days</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 