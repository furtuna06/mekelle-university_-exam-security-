import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export default function Logo({ className = "w-full h-full object-contain", alt = "Logo" }: LogoProps) {
  const [imgSrc, setImgSrc] = useState("/logo.png");
  const [hasError, setHasError] = useState(false);
  const [hasSecondError, setHasSecondError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc("https://www.mu.edu.et/images/mu_logo.png");
    } else if (!hasSecondError) {
      setHasSecondError(true);
      setImgSrc("https://api.dicebear.com/7.x/initials/svg?seed=MU&backgroundColor=003366");
    }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
