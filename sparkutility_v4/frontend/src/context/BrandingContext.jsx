import React, { createContext, useContext, useEffect } from 'react';

const BRANDING = Object.freeze({
  siteName: 'SparkUtilities',
  tagline:  'All-In-One Utility Hub',
  logo:     '',
});

const BrandingContext = createContext({ branding: BRANDING });

export function BrandingProvider({ children }) {
  useEffect(() => {
    const base = `${BRANDING.siteName} — ${BRANDING.tagline}`;
    if (document.title !== base) document.title = base;
  }, []);

  return (
    <BrandingContext.Provider value={{ branding: BRANDING }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
