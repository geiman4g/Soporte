import React from "react";

export function Logo({ height = 40, className = "" }: { height?: number; className?: string }) {
  // Calculated scale based on a reference height of 50px
  const scale = height / 50;
  const width = height * 3.2; // roughly 3.2:1 aspect ratio

  return (
    <div 
      className={`inline-flex items-center bg-[#0d69af] rounded-lg px-3 py-1.5 border border-[#0b5c9a] select-none ${className}`}
      style={{ height: `${height}px` }}
      id="ecs-logo-container"
    >
      {/* Dynamic, pixel-perfect SVG recreation of the spiral/wave ECS logo */}
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-auto mr-2 shrink-0" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        id="ecs-logo-svg"
      >
        {/* Outer subtle shadow / glow ring */}
        <circle cx="50" cy="50" r="48" fill="#0d69af" />
        
        {/* Main circular white frame */}
        <circle cx="50" cy="50" r="42" stroke="white" strokeWidth="6" fill="#0d69af" />
        
        {/* The beautiful blue & white swirling wave */}
        <path 
          d="M 50,15 A 35,35 0 0,0 22,70 C 25,58 35,50 48,50 C 62,50 72,60 70,72 C 68,80 58,85 50,85 A 35,35 0 0,0 85,50 C 85,31 69,15 50,15 Z" 
          fill="white" 
        />
        
        {/* Inside dark blue curve */}
        <path 
          d="M 50,22 A 28,28 0 0,0 28,64 C 33,56 41,52 50,52 C 59,52 66,59 64,68 C 63,73 57,78 50,78 A 28,28 0 0,0 78,50 C 78,35 65,22 50,22 Z" 
          fill="url(#blueGrad)" 
        />
        
        {/* The orange/yellow swirl */}
        <path 
          d="M 68,36 C 74,42 76,51 74,58 C 72,66 65,71 58,72 C 59,62 54,54 46,51 C 38,48 30,51 26,57 C 28,42 38,28 53,26 C 60,25 65,29 68,36 Z" 
          fill="url(#orangeGrad)" 
        />

        {/* Small orange dot on the lower right */}
        <circle cx="72" cy="74" r="5.5" fill="#f2994a" stroke="white" strokeWidth="1.5" />

        <defs>
          <linearGradient id="blueGrad" x1="28" y1="22" x2="78" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a467a" />
            <stop offset="100%" stopColor="#1E70B3" />
          </linearGradient>
          <linearGradient id="orangeGrad" x1="26" y1="26" x2="74" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f2994a" />
            <stop offset="100%" stopColor="#f2c94c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Typography: "Effective Computer Solutions" */}
      <div className="flex flex-col justify-center leading-none text-white font-sans">
        {/* Effective with white/shadow bold styling */}
        <span 
          className="font-extrabold tracking-tight uppercase"
          style={{ 
            fontSize: `${14 * scale}px`,
            textShadow: '0px 1px 2px rgba(0,0,0,0.3)',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Effective
        </span>
        
        {/* Computer Solutions inside a white pill with dark blue text */}
        <div 
          className="bg-white rounded-full px-2 py-0.5 mt-0.5 flex items-center justify-center font-bold tracking-tight text-center"
          style={{ 
            fontSize: `${8 * scale}px`,
            color: "#0a467a"
          }}
        >
          Computer Solutions
        </div>
      </div>
    </div>
  );
}
