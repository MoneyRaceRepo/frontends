'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { text1: 'text-xl', text2: 'text-lg', imgW: 80, imgH: 'h-4' },
    md: { text1: 'text-xl sm:text-2xl lg:text-3xl', text2: 'text-lg sm:text-xl lg:text-2xl', imgW: 120, imgH: 'h-4 lg:h-6' },
    lg: { text1: 'text-2xl sm:text-3xl lg:text-4xl', text2: 'text-xl sm:text-2xl lg:text-3xl', imgW: 140, imgH: 'h-5 lg:h-7' },
  };

  const s = sizes[size];

  return (
    <div className="relative">
      <h1
        className={`text-white ${s.text1} font-bold tracking-wider leading-tight`}
        style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
      >
        MONEY
      </h1>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Image
          src="/akesoris.png"
          alt="Checkered"
          width={s.imgW}
          height={24}
          className={`${s.imgH} w-auto`}
        />
        <span
          className={`text-white ${s.text2} font-bold tracking-wider`}
          style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        >
          RACE
        </span>
      </div>
    </div>
  );
}
