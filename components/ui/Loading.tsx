import React from "react";

export default function Loading() {
  return (
    <div 
      className="flex space-x-2"
      suppressHydrationWarning={true}
    >
      <div
        className="w-8 h-8 bg-[#fcd34d] border-4 border-black animate-bounce shadow-[4px_4px_0px_0px_#000000]"
        style={{ animationDelay: "0.2s" }}
        suppressHydrationWarning={true}
      />
      <div
        className="w-8 h-8 bg-[#f472b6] border-4 border-black animate-bounce shadow-[4px_4px_0px_0px_#000000]"
        style={{ animationDelay: "0.4s" }}
        suppressHydrationWarning={true}
      />
      <div
        className="w-8 h-8 bg-[#60a5fa] border-4 border-black animate-bounce shadow-[4px_4px_0px_0px_#000000]"
        style={{ animationDelay: "0.6s" }}
        suppressHydrationWarning={true}
      />
    </div>
  );
}
  
  