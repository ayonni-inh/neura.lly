
import React, { useState, useEffect } from 'react';
import { localDb } from '../services/localDb';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: React.ReactNode;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, fallback, className, ...props }) => {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const resolveSrc = async () => {
      if (!src) return;

      if (src.startsWith('local://')) {
        setIsLoading(true);
        setError(false);
        try {
          const key = src.replace('local://', '');
          const data = await localDb.get(key);
          if (data) {
            setDisplaySrc(data);
          } else {
            setError(true);
          }
        } catch (e) {
          console.error("Failed to resolve local image", e);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setDisplaySrc(src);
      }
    };

    resolveSrc();
  }, [src]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-white/5 animate-pulse ${className}`}>
        <RefreshCw className="w-5 h-5 animate-spin text-mirror-accent/50" />
      </div>
    );
  }

  if (error || !displaySrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-500/5 text-red-400 p-4 gap-2 text-center ${className}`}>
        <AlertCircle className="w-5 h-5" />
        <span className="text-[10px] font-medium uppercase tracking-widest">Image Lost</span>
      </div>
    );
  }

  return (
    <img 
      src={displaySrc} 
      className={className} 
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      {...props} 
    />
  );
};
