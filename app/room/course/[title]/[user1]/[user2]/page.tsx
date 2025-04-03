"use client"
import { useDashboard } from '../../../../../provider';
import ChallengeQuiz from '../../../../../components/ChallengeQuiz';

export default function ChallengePage() {
  return (
    <div className="min-h-screen pt-[100px] bg-[#6016a7]">
      <ChallengeQuiz />
    </div>
  );
}