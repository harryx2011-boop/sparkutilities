import React from 'react';

/**
 * Shared FluxKit backdrop.
 *
 * Five branch pages (Data & Structure, Web Dev Assets, Security & Logic,
 * Productivity, LaTeX Builder) all used to render their own near-identical
 * shell — a per-page <style>@import Cormorant + Montserrat</style> tag
 * (now redundant; fonts ship globally), a `#050505` page background, and
 * two overlapping radial-gradient ambient glows. The doubled glows
 * leaked into the next section's tool panels and made the heroes feel
 * busy. This component is the single source of truth for that shell.
 *
 * The visual language matches FluxKitHome.jsx: a single, low-opacity
 * amber radial in the top-right that fades out at 75%. Strict CSS only,
 * no JS, no canvas. `position: fixed` so it stays parked behind the page
 * content as the user scrolls.
 */
export default function FluxBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      <div
        className="absolute -top-60 -right-72 w-[820px] h-[820px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(250,204,21,0.10), rgba(250,204,21,0.04) 55%, transparent 75%)',
        }}
      />
    </div>
  );
}
