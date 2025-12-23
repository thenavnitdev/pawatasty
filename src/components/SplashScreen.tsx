import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#F5D4C8] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-white/20 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-white/40" />
      </div>

      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-[#FF8C61] leading-none">
              pawa
            </div>
            <div className="text-5xl font-bold text-[#FF8C61] leading-none">
              tasty
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[30px] left-0 right-0 z-20 flex justify-center">
        <h2 className="text-xl font-semibold text-[#FF8C61] tracking-wide">
          Adventures Made Delicious
        </h2>
      </div>
    </div>
  );
}
