import React from 'react';

/**
 * The City Pulse signature motif: a heartbeat/waveform line.
 * Draws itself in once on mount (see .pulse-line in index.css) and
 * respects prefers-reduced-motion.
 */
export default function PulseDivider({ className = '' }) {
  return (
    <svg
      className={`pulse-line ${className}`}
      viewBox="0 0 340 22"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,11 L100,11 L112,2 L124,20 L136,11 L340,11" />
    </svg>
  );
}
