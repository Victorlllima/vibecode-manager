'use client'

import React from 'react'

/* ------------------------------------------------------------------ */
/*  HeartbeatECG                                                      */
/*  Animated ECG / electrocardiogram line that scrolls left            */
/*  continuously, just like a real hospital bedside monitor.           */
/* ------------------------------------------------------------------ */

/**
 * The ECG waveform path covers exactly ONE full heartbeat cycle
 * inside a 200-wide viewBox so we can duplicate it side-by-side and
 * translate the pair leftward. When the first copy has scrolled
 * completely out of view the animation resets seamlessly.
 *
 * Waveform anatomy (standard Lead-II ECG):
 *   flat  ->  P-wave (small bump)  ->  flat
 *         ->  QRS complex (sharp spike + dip)  ->  flat
 *         ->  T-wave (gentle bump)  ->  flat
 */

const ECG_CYCLE_WIDTH = 200

// A single heartbeat path drawn in a 200x60 coordinate space.
// Y-axis: 0 = top, 60 = bottom.  Baseline sits at y=40.
const BEAT_PATH = [
  // start flat
  'M 0,40',
  'L 30,40',
  // P-wave (small rounded bump)
  'Q 37,30 44,40',
  // flat before QRS
  'L 60,40',
  // Q dip
  'L 66,44',
  // R spike (tall)
  'L 74,8',
  // S dip
  'L 82,50',
  // back to baseline
  'L 90,40',
  // flat before T-wave
  'L 110,40',
  // T-wave (gentle bump)
  'Q 125,24 140,40',
  // trailing flat
  'L 200,40',
].join(' ')

export function HeartbeatECG({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 200,
        height: 60,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Inline keyframes — no external CSS file needed */}
      <style>{`
        @keyframes ecg-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${ECG_CYCLE_WIDTH}px); }
        }
        .ecg-track {
          animation: ecg-scroll 1.8s linear infinite;
        }
        .ecg-line {
          fill: none;
          stroke: #22c55e;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 3px rgba(34,197,94,0.7));
        }
      `}</style>

      <svg
        width={ECG_CYCLE_WIDTH * 2}
        height={60}
        viewBox={`0 0 ${ECG_CYCLE_WIDTH * 2} 60`}
        style={{ position: 'absolute', top: 0, left: 0 }}
        className="ecg-track"
        preserveAspectRatio="none"
      >
        {/* First copy of the heartbeat */}
        <path d={BEAT_PATH} className="ecg-line" />
        {/* Second copy, offset by one cycle width, for seamless looping */}
        <path
          d={BEAT_PATH}
          className="ecg-line"
          transform={`translate(${ECG_CYCLE_WIDTH}, 0)`}
        />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  HeartbeatPulse                                                    */
/*  Simple pulsing / glowing green dot.                               */
/* ------------------------------------------------------------------ */

export function HeartbeatPulse({ className = '' }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes hb-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes hb-pulse-dot {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.25); }
          60%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .hb-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #22c55e;
          animation: hb-pulse-ring 1.8s ease-out infinite;
        }
        .hb-dot {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px 2px rgba(34,197,94,0.55);
          animation: hb-pulse-dot 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Expanding ring that fades out */}
      <span className="hb-ring" />
      {/* Solid dot that gently scales */}
      <span className="hb-dot" />
    </span>
  )
}
