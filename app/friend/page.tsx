"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../provider";
import { useActivity } from "../activity-provider";
import Loading from "../../components/ui/Loading";
import Avatar from "boring-avatars";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  points: number;
  testsCompleted: number;
  averageScore: number;
}

export default function FriendPage() {
  const { token, user } = useDashboard();
  const { isUserActive } = useActivity();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        const response = await fetch('/api/find_friends', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to fetch friends');
        }

        const data = await response.json();
        setUsers(data.friends || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] flex items-center justify-center text-[#E6F1FF]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
        <div className="container mx-auto px-4">
          <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black text-[#FF6B6B]">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[100px] bg-[#6016a7] text-[#E6F1FF]">
      <div className="container mx-auto px-4">
        <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000]">
          <h1 className="text-3xl font-bold text-[#9D4EDD] mb-6 font-mono">Friends</h1>
          
          {users.length === 0 ? (
            <p className="text-center text-[#8892B0]">No users found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="bg-[#2f235a] p-4 rounded-lg border-2 border-black transition-transform hover:transform hover:translate-x-1 hover:-translate-y-1"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={`${user.firstName}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          size={48}
                          name={user._id}
                          variant="beam"
                          colors={["#6016a7", "#9D4EDD", "#FFD700", "#5CDB95", "#E6F1FF"]}
                        />
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-bold text-[#E6F1FF]">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-[#8892B0]">
                        Tests: {user.testsCompleted} | Avg Score: {Math.round(user.averageScore)}%
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[#FFD700] font-bold text-xl">
                        {user.points || 0} {isUserActive(user._id) ? '🟢' : '🔴'}
                      </span>
                      <p className="text-xs text-[#8892B0]">points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 