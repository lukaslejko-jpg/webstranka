
'use client';

import { useState } from 'react';
import AppIcon from './AppIcon';

interface AppLogoProps {
  src?: string;
  size?: number;
  className?: string;
  iconName?: string;
}

export default function AppLogo({ src, size = 40, className = '', iconName = 'BuildingOffice2Icon' }: AppLogoProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div 
        className={`flex items-center justify-center bg-navy rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <AppIcon name={iconName} size={size * 0.6} className="text-gold" />
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!loaded && (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse rounded-lg ${className}`}
        />
      )}
      <img
        src={src}
        alt="Logo"
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 w-full h-full object-contain`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

