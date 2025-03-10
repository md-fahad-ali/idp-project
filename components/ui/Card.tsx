// components/ui/Card.tsx
import React from 'react';

interface CardProps {
  title: string;
  description: string;
}

const Card = ({ title, description }: CardProps) => {
  return (
    <div className="bg-[#8f36d6] flex flex-col justify-between border-4 border-black p-6 rounded-md shadow-[8px_8px_0px_0px_black] max-w-xs w-full h-[350px] transform hover:shadow-[12px_12px_0px_0px_black] transition-shadow duration-200 ease-in-out">
      <div className="flex flex-col flex-grow">
        <h3 className="text-3xl font-mono font-bold mb-4 text-black">
          {title}
        </h3>
        <p className="text-black mb-6 flex-grow">
          {description}
        </p>
      </div>
      <button className="px-4 py-2 bg-black text-yellow-200 border-2 border-black font-bold shadow-[4px_4px_0px_0px_black] hover:shadow-[8px_8px_0px_0px_black] transform hover:-translate-y-1 transition-all">
        Learn More
      </button>
    </div>
  );
};

export default Card;