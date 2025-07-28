'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 600], [0, -80]);
  const y2 = useTransform(scrollY, [0, 600], [0, -120]);
  const y3 = useTransform(scrollY, [0, 600], [0, -40]);
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/chat');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Nav */}
      <header className="z-20 flex justify-between items-center px-4 sm:px-8 py-4 sm:py-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-wide">clydra</h1>
        <ThemeToggle />
      </header>

      {/* Sun */}
      <svg className="absolute inset-0 m-auto -z-10 pointer-events-none" style={{ width: 'min(120vmin, 700px)', height: 'min(120vmin, 700px)' }}>
        <defs>
          <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sun-halo)" stopOpacity="1" />
            <stop offset="60%" stopColor="var(--sun-core)" stopOpacity="1" />
            <stop offset="90%" stopColor="var(--sun-core)" stopOpacity="0.15" />
            <stop offset="95%" stopColor="var(--sun-core)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--sun-core)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50%" cy="50%" r="45%" fill="url(#sunGrad)" className="shadow-sun" />
      </svg>

      {/* Parallax planets */}
      <div className="absolute right-[5%] sm:right-20 top-1/3">
        <Planet size={60} sizeSm={100} tint="var(--accent)" y={y1} autoTilt />
      </div>
      <div className="absolute left-[5%] sm:left-24 top-1/2">
        <Planet size={45} sizeSm={70} tint="var(--accent-soft)" y={y2} />
      </div>
      <div className="absolute left-1/3 bottom-[10%] sm:top-3/4">
        <Planet size={30} sizeSm={40} y={y3} />
      </div>

      {/* Copy */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 flex flex-col items-center justify-center flex-1 text-center px-4"
      >
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 max-w-[18ch] px-4">
          AI chat with infinite memory and multimodal power
        </h2>
        <p className="max-w-xl text-base sm:text-lg md:text-xl text-zinc-700 dark:text-zinc-300 mb-6 sm:mb-8 px-4">
          Multiple AI models, file uploads, web search, and conversation memory that never forgets.
        </p>
        {isLoaded && !isSignedIn ? (
          <SignInButton mode="modal" fallbackRedirectUrl="/chat" signUpFallbackRedirectUrl="/chat">
            <button
              className="rounded-full bg-[var(--accent)] text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base shadow-card hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform"
            >
              Try Clydra for free
            </button>
          </SignInButton>
        ) : (
          <button
            onClick={() => router.push('/chat')}
            className="rounded-full bg-[var(--accent)] text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base shadow-card hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform"
          >
            {isLoaded ? 'Go to Chat' : 'Loading...'}
          </button>
        )}
      </motion.div>

      {/* Scroll cue - hide on mobile */}
      <div className="hidden sm:block absolute bottom-4 left-1/2 -translate-x-1/2 text-zinc-500">
        <svg width="24" height="32" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="1" width="22" height="30" rx="11" />
          <circle cx="12" cy="10" r="3">
            <animate
              attributeName="cy"
              dur="1.5s"
              values="10;18;10"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
    </section>
  );
}

function Planet({ size, sizeSm, tint, y, autoTilt }: { size: number; sizeSm?: number; tint?: string; y?: any; autoTilt?: boolean }) {
  const desktopSize = sizeSm || size;
  const defaultTint = 'rgba(255,186,120,0.25)'; // softer peach
  
  return (
    <motion.div style={{ y }}>
      <div
        className={`rounded-full w-[60px] h-[60px] sm:w-[100px] sm:h-[100px] transition-transform duration-300 ${autoTilt ? 'rotate-1 hover:-rotate-2' : ''}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: tint ?? defaultTint,
          boxShadow: '0 4px 8px rgba(0,0,0,.06)',
        }}
      />
    </motion.div>
  );
}
