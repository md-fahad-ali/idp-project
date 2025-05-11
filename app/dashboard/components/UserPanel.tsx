interface UserPanelProps {
  user: {
    firstName: string;
    lastName: string;
    role?: string;
    points?: number;
    badges?: {
      brained?: number;
      warrior?: number;
      unbeatable?: number;
    };
  } | null;
}

export default function UserPanel({ user }: UserPanelProps) {
  // Mock data for progress charts
  const progressData = [
    { course: 'UI Design', progress: 55 },
    { course: 'Web Development', progress: 70 },
    { course: 'Marketing', progress: 45 }
  ];

  // Check if user has any badges
  const hasBadges = user?.badges && Object.values(user.badges).some(count => count && count > 0);

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 w-full">
      <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 shadow-[var(--card-shadow)] card w-full">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-[var(--text-color)] mb-4 font-mono">Your Progress</h2>
          
          <div className="space-y-4">
            {progressData.map((item, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-color)]">{item.course}</span>
                  <span className="text-sm font-medium text-[var(--text-color)]">{item.progress}%</span>
                </div>
                <div className="w-full bg-[#333333] h-3 rounded-full border border-[var(--card-border)]">
                  <div 
                    className="h-full rounded-full bg-[var(--purple-primary)]" 
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-color)]">Learning time</p>
                <p className="text-lg font-bold text-[var(--text-color)]">12h 45m</p>
              </div>
              <div className="bg-[var(--card-bg)] p-3 rounded-md border-2 border-[var(--card-border)] shadow-[2px_2px_0px_0px_var(--card-border)]">
                <p className="text-2xl">⏱️</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border-4 border-[var(--card-border)] rounded-lg p-4 md:p-6 shadow-[var(--card-shadow)] card w-full">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-[var(--text-color)] mb-4 font-mono">Your Stats</h2>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-[color-mix(in_srgb,var(--purple-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-2 md:p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[var(--text-color)] font-semibold">Role</p>
                  <p className="text-lg font-bold text-[var(--navbar-text)]">user</p>
                </div>
                <span className="text-2xl">👤</span>
              </div>
            </div>
            
            <div className="bg-[color-mix(in_srgb,var(--green-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-2 md:p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[var(--text-color)] font-semibold">Status</p>
                  <p className="text-lg font-bold text-[var(--green-light)]">Active</p>
                </div>
                <span className="text-2xl">✅</span>
              </div>
            </div>
            
            <div className="bg-[color-mix(in_srgb,var(--yellow-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-2 md:p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[var(--text-color)] font-semibold">Points</p>
                  <p className="text-lg font-bold text-[var(--yellow-light)]">{user?.points || 0}</p>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            </div>
            
            <div className="bg-[color-mix(in_srgb,var(--orange-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-2 md:p-3 shadow-[2px_2px_0px_0px_var(--card-border)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[var(--text-color)] font-semibold">Streak</p>
                  <p className="text-lg font-bold text-[var(--orange-light)]">3 days</p>
                </div>
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </div>
          
          {/* Badges Section */}
          {hasBadges && (
            <div className="mt-6 badge-container">
              <h3 className="text-lg font-bold text-[var(--text-color)] mb-4 font-mono">Your Badges</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0 m-0">
                {user?.badges?.brained && user.badges.brained >= 0 ? (
                  <li className="bg-[color-mix(in_srgb,var(--purple-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-4 shadow-[2px_2px_0px_0px_var(--card-border)]" title="Challenge Winner Badge">
                    <div className="flex items-center">
                      <img src="/badge/brained.jpeg" alt="Brained Badge" className="w-10 h-10 rounded-full" />
                      <div className="ml-3">
                        <p className="text-sm text-[var(--text-color)] font-semibold">Challenge Winner</p>
                        {user.badges.brained > 1 && (
                          <span className="text-lg font-bold text-[var(--purple-light)]">
                            ×{user.badges.brained}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ):(
                  ""
                )}
                
                {user?.badges?.warrior && user.badges.warrior >= 0 ? (
                  <li className="bg-[color-mix(in_srgb,var(--orange-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-4 shadow-[2px_2px_0px_0px_var(--card-border)]" title="Fastest Challenger Badge">
                    <div className="flex items-center">
                      <img src="/badge/warrior.jpeg" alt="Warrior Badge" className="w-10 h-10 rounded-full" />
                      <div className="ml-3">
                        <p className="text-sm text-[var(--text-color)] font-semibold">Speed Warrior</p>
                        {user.badges.warrior > 1 && (
                          <span className="text-lg font-bold text-[var(--orange-light)]">
                            ×{user.badges.warrior}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ):(
                  ""
                )}                
                {user?.badges?.unbeatable && user.badges.unbeatable > 0 ? (
                  <li className="bg-[color-mix(in_srgb,var(--yellow-light)_15%,var(--card-bg)_85%)] border-2 border-[var(--card-border)] rounded-md p-4 shadow-[2px_2px_0px_0px_var(--card-border)]" title="Top Course Score Badge">
                    <div className="flex items-center">
                      <img src="/badge/unbitable.jpeg" alt="Unbeatable Badge" className="w-10 h-10 rounded-full" />
                      <div className="ml-3">
                        
                        <p className="text-sm text-[var(--text-color)] font-semibold">Unbeatable</p>
                        {user.badges.unbeatable > 1 && (
                          <span className="text-lg font-bold text-[var(--yellow-light)]">
                            ×{user.badges.unbeatable}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ):(
                  ""
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 