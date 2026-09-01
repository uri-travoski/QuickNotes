import React from 'react';

/**
 * QuickNotes Symbol (inner app icon vector).
 */
export const QuickNotesSymbol: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-5 h-5',
  size = 20,
}) => (
  <svg
    viewBox="0 0 512 512"
    className={className}
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M28.012 235.714c0 147.591 82.251 235.699 220.02 235.699 31.992 0 61.86-5.475 88.931-16.294 33.285 23.26 56.025 42.585 90.645 53.182L439.691 512l44.297-89.017c-9.722-4.003-35.28-10.899-66.812-31.219 31.362-42.795 44.912-90.468 44.912-156.051C462.089 90.322 379.193 0 245.761 0 111.449 0 28.012 90.322 28.012 235.714m176.367 124.599c14.998 5.496 17.545 6.294 23.13 8.591-52.837-7.441-82.764-55.055-82.764-133.19 0-85.255 35.669-132.2 100.444-132.2 64.6 0 100.166 46.945 100.166 132.2 0 37.218-6.973 67.316-20.757 89.71-43.205-30.138-76.003-38.02-83.73-41.237z" />
  </svg>
);

export const BookmarkStackSymbol = QuickNotesSymbol;
export const BookmarkStarSymbol = QuickNotesSymbol;

/**
 * QuickNotes App Icon badge with gradient amber background.
 */
export const QuickNotesIcon: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <div className={`${className} rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md text-white flex-shrink-0`}>
    <QuickNotesSymbol className="w-5 h-5 text-white" />
  </div>
);

export const BookmarkStarIcon = QuickNotesIcon;

/**
 * Square Text Lucide Icon.
 */
export const SquareTextIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </svg>
);

/**
 * Note Stack Material Symbol / Icon.
 */
export const NoteStackIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24px"
    viewBox="0 -960 960 960"
    width="24px"
    fill="currentColor"
    className={className}
  >
    <path d="M300-172.31v-416q0-29.92 21.5-50.8Q343-660 372.92-660h414.77q29.92 0 51.12 21.19Q860-617.61 860-587.69v299.23L671.54-100H372.31q-29.92 0-51.12-21.19Q300-142.39 300-172.31ZM101-703.08Q95.39-733 112.66-757q17.26-24 47.19-29.61L569.23-859q29.92-5.61 53.92 11.66 24 17.26 29.62 47.19l9.23 52.46h-61.23L593-791.54q-.77-4.23-4.62-6.73-3.84-2.5-8.46-1.73l-409.53 72.77q-5.39.77-8.08 5-2.69 4.23-1.93 9.62l51.93 293.31v178.22q-14.85-7.84-25.39-21.5-10.53-13.65-13.53-31.11L101-703.08Zm259 115.39v415.38q0 5.39 3.46 8.85t8.85 3.46H640v-160h160v-267.69q0-5.39-3.46-8.85t-8.85-3.46H372.31q-5.39 0-8.85 3.46t-3.46 8.85ZM580-380Z"></path>
  </svg>
);

/**
 * Sticky Note 2 Material Symbol as a clean SVG icon matching Lucide 24x24 stroke metrics.
 * Perfectly vertically centered with other sidebar icons.
 */
export const StickyNote2Icon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10l6-6V5a2 2 0 0 0-2-2z" />
    <path d="M15 15h6" />
    <path d="M15 21v-6" />
    <path d="M7 8h8" />
    <path d="M7 12h5" />
  </svg>
);
