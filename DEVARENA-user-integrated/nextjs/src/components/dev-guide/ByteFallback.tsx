import { guideCopy } from './tutorialSteps';

// Original local vector artwork. No network assets or WebGL required.
export function ByteFallback() {
  return <svg viewBox="0 0 180 192" role="img" aria-label={guideCopy.fallback} width="180" height="192">
    <ellipse cx="90" cy="177" rx="38" ry="5" fill="#19243a" />
    <path d="M90 24V11m0 0 7-5" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
    <rect x="38" y="26" width="104" height="73" rx="25" fill="#323d50" stroke="#66738a" strokeWidth="2" />
    <rect x="46" y="40" width="88" height="44" rx="16" fill="#090f1b" />
    <rect x="59" y="51" width="18" height="20" rx="8" fill="#67e8f9" /><rect x="103" y="51" width="18" height="20" rx="8" fill="#67e8f9" />
    <path d="m85 77 5 2 5-2" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="58" y="105" width="64" height="44" rx="15" fill="#263247" stroke="#516078" strokeWidth="2" />
    <path d="m81 118-8 7 8 7m18-14 8 7-8 7m-5-16-7 26" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M51 113 36 129m0 0-6-4m6 4-3 7m95-23 16-20m0 0 3-10m-3 10 9-3" stroke="#748299" strokeWidth="9" strokeLinecap="round" />
    <rect x="72" y="153" width="36" height="10" rx="5" fill="#8b5cf6" /><path d="m80 167 10 8 10-8" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
    <path d="m33 49-8 9v16l8 5m114-30 8 9v16l-8 5" fill="#8b5cf6" />
  </svg>;
}
