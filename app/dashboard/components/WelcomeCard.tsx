import Loading from "../../../components/ui/Loading";

interface IUser {
  firstName: string;
  lastName: string;
}

interface WelcomeCardProps {
  user: IUser | null;
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
  return (
    <div className="bg-[#294268] border-4 border-black rounded-lg p-6 mb-8 shadow-[8px_8px_0px_0px_#000000]">
      <h1 className="text-3xl font-bold text-[#9D4EDD] mb-2 font-mono">
        Welcome to Your Dashboard
      </h1>
      {user ? (
        <p className="text-[#E6F1FF] font-mono">Hello, {user.firstName} {user.lastName}!</p>
      ) : (
        <Loading />
      )}
    </div>
  );
} 