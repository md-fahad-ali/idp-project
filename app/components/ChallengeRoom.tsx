import React from 'react';
import Avatar from "boring-avatars";

interface ChallengeRoomProps {
  challenger: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  challenged: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  scores?: {
    [userId: string]: number;
  };
}

export default function ChallengeRoom({ challenger, challenged, scores = {} }: ChallengeRoomProps) {
  // Get scores from props, default to 0 if not provided
  const challengerScore = scores[challenger.id] || 0;
  const challengedScore = scores[challenged.id] || 0;
  
  return (
    <div className="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[#E6F1FF] mb-6 font-mono text-center">
        Challenge Room
      </h2>
      
      <div className="flex justify-between items-center gap-4">
        {/* Challenger */}
        <div className="flex-1">
          <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black mb-3">
                {challenger.avatarUrl ? (
                  <img
                    src={challenger.avatarUrl}
                    alt={`${challenger.name}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar
                    size={80}
                    name={challenger.id}
                    variant="beam"
                    colors={["#6016a7", "#9D4EDD", "#FFD700", "#5CDB95", "#E6F1FF"]}
                  />
                )}
              </div>
              <h3 className="font-bold text-[#E6F1FF] text-center mb-2">
                {challenger.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] font-bold text-xl">{challengerScore}</span>
                <p className="text-xs text-[#8892B0]">points</p>
              </div>
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#ff4f4f] border-2 border-black flex items-center justify-center">
            <span className="text-white font-bold">VS</span>
          </div>
          <div className="h-full w-1 bg-[#ff4f4f] my-2"></div>
        </div>

        {/* Challenged */}
        <div className="flex-1">
          <div className="bg-[#2f235a] p-4 rounded-lg border-2 border-black">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-[#9D4EDD] rounded-full overflow-hidden border-2 border-black mb-3">
                {challenged.avatarUrl ? (
                  <img
                    src={challenged.avatarUrl}
                    alt={`${challenged.name}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar
                    size={80}
                    name={challenged.id}
                    variant="beam"
                    colors={["#6016a7", "#9D4EDD", "#FFD700", "#5CDB95", "#E6F1FF"]}
                  />
                )}
              </div>
              <h3 className="font-bold text-[#E6F1FF] text-center mb-2">
                {challenged.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] font-bold text-xl">{challengedScore}</span>
                <p className="text-xs text-[#8892B0]">points</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 