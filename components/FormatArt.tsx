// Monochrome mini-illustrations for each creation format.
// Drawn on a 240×135 (16:9) canvas; animate subtly when a parent `.group` is hovered.

export type FormatKey = 'story' | 'cartoon' | 'animated' | 'whiteboard' | 'fruit_drama';

export const FORMATS: { key: FormatKey; title: string; tagline: string; desc: string; badge?: string }[] = [
  { key: 'story', title: 'Storytelling', tagline: 'YouTube story videos', desc: 'Cinematic AI scenes with camera motion, narrator voice and sound design.', badge: 'Popular' },
  { key: 'cartoon', title: '2D Animation', tagline: 'Cartoon series & films', desc: 'Your own characters, scenes and dialogue — built shot by shot.' },
  { key: 'animated', title: 'Animated Story', tagline: 'Character-driven shorts', desc: 'Design one character, then auto-generate a narrated, captioned story.', badge: 'New' },
  { key: 'whiteboard', title: 'Whiteboard', tagline: 'Doodle explainers', desc: 'Any topic, drawn by hand on a whiteboard with narration and captions.', badge: 'New' },
  { key: 'fruit_drama', title: 'Fruit Drama', tagline: 'Viral character shorts', desc: 'Fruit characters, cinematic scenes and Veo 3.1 videos with dialogue.', badge: 'New' },
];

const S = 'rgba(255,255,255,0.9)';
const S2 = 'rgba(255,255,255,0.35)';
const S3 = 'rgba(255,255,255,0.14)';

function Story() {
  return (
    <>
      <rect x="0" y="0" width="240" height="18" fill="#000" />
      <rect x="0" y="117" width="240" height="18" fill="#000" />
      <circle cx="160" cy="62" r="17" stroke={S} strokeWidth="1.3" className="transition-transform duration-700 ease-out group-hover:-translate-y-1.5" />
      <path d="M0 92 L48 64 L82 84 L122 52 L172 90 L204 72 L240 90" stroke={S2} strokeWidth="1.2" />
      <path d="M0 104 L60 82 L108 100 L160 78 L240 104" stroke={S} strokeWidth="1.3" />
      <g className="transition-opacity duration-500 opacity-60 group-hover:opacity-100">
        {Array.from({ length: 30 }).map((_, i) => {
          const h = 2 + Math.abs(Math.sin(i * 1.7) * 7) + (i % 4);
          return <rect key={i} x={14 + i * 3.4} y={126 - h / 2} width="1.4" height={h} rx=".7" fill={S2} />;
        })}
      </g>
      <text x="14" y="12.5" fill={S2} fontSize="7" fontFamily="var(--font-mono)" letterSpacing="1">SC 01</text>
      <text x="202" y="12.5" fill={S2} fontSize="7" fontFamily="var(--font-mono)" letterSpacing="1">REC ●</text>
    </>
  );
}

function Cartoon() {
  const frames = [0, 1, 2];
  return (
    <>
      {frames.map(i => (
        <g key={i} transform={`translate(${28 + i * 64} 26)`}>
          <rect width="56" height="82" rx="6" stroke={i === 2 ? S : S3} strokeWidth="1.2" fill={i === 2 ? 'rgba(255,255,255,0.03)' : 'none'} />
          <g className={i === 2 ? 'transition-transform duration-500 ease-out group-hover:-translate-y-1' : ''}>
            <circle cx={28} cy={26 - i * 3} r="9" stroke={i === 2 ? S : S2} strokeWidth="1.2" />
            <path d={`M12 ${66 - i * 2} C12 ${46 - i * 3} 44 ${46 - i * 3} 44 ${66 - i * 2}`} stroke={i === 2 ? S : S2} strokeWidth="1.2" />
            <path d={`M44 ${52 - i * 3} l${4 + i * 2} ${-6 - i * 3}`} stroke={i === 2 ? S : S2} strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <text x="5" y="77" fill={S2} fontSize="6.5" fontFamily="var(--font-mono)">{String(i + 1).padStart(2, '0')}</text>
        </g>
      ))}
    </>
  );
}

function Animated() {
  return (
    <>
      <circle cx="120" cy="52" r="42" stroke={S3} strokeWidth="1" strokeDasharray="2 4" />
      <g className="transition-transform duration-700 ease-out group-hover:scale-[1.04]" style={{ transformOrigin: '120px 60px' }}>
        <circle cx="120" cy="44" r="14" stroke={S} strokeWidth="1.3" />
        <path d="M94 92 C96 72 106 64 120 64 C134 64 144 72 146 92" stroke={S} strokeWidth="1.3" />
      </g>
      <rect x="70" y="104" width="100" height="7" rx="3.5" fill="rgba(255,255,255,0.85)" />
      <rect x="86" y="115" width="68" height="5" rx="2.5" fill={S3} />
      <path d="M178 30 l5 -5 m-5 5 l-5 -5 m5 5 v8" stroke={S2} strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </>
  );
}

function Whiteboard() {
  return (
    <>
      <rect x="24" y="18" width="192" height="100" rx="6" stroke={S3} strokeWidth="1" />
      <path
        d="M44 88 C58 58 76 50 92 66 S120 92 134 64 S164 36 178 58 S196 84 204 70"
        stroke={S} strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray="260" strokeDashoffset="0"
        className="[stroke-dashoffset:90] group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-[1200ms] ease-out"
      />
      <path d="M48 40 h40 M48 48 h26" stroke={S2} strokeWidth="1.2" strokeLinecap="round" />
      <rect x="160" y="88" width="34" height="18" rx="3" stroke={S2} strokeWidth="1" />
      <g className="transition-transform duration-[1200ms] ease-out translate-x-[-40px] translate-y-[8px] group-hover:translate-x-0 group-hover:translate-y-0">
        <path d="M204 70 l14 -18 l6 5 l-14 18 z" stroke={S} strokeWidth="1.2" fill="#000" />
      </g>
    </>
  );
}

function Fruit() {
  return (
    <>
      <g className="transition-transform duration-500 ease-out group-hover:-translate-y-1">
        <circle cx="92" cy="80" r="24" stroke={S} strokeWidth="1.3" />
        <path d="M92 56 c0 -6 3 -10 8 -12" stroke={S} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M100 48 c6 -4 12 -2 14 2 c-6 3 -10 2 -14 -2z" stroke={S} strokeWidth="1.1" />
        <circle cx="85" cy="78" r="1.6" fill={S} /><circle cx="99" cy="78" r="1.6" fill={S} />
        <path d="M86 88 q6 5 12 0" stroke={S} strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <g>
        <path d="M150 104 c-16 0 -22 -14 -18 -28 c3 -12 12 -20 18 -30 c6 10 15 18 18 30 c4 14 -2 28 -18 28z" stroke={S2} strokeWidth="1.2" />
        <circle cx="145" cy="80" r="1.4" fill={S2} /><circle cx="155" cy="80" r="1.4" fill={S2} />
      </g>
      <g className="opacity-70 group-hover:opacity-100 transition-opacity duration-500">
        <rect x="116" y="18" width="62" height="22" rx="11" stroke={S} strokeWidth="1.1" />
        <path d="M128 40 l-4 7 l10 -7" stroke={S} strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="136" cy="29" r="1.4" fill={S} className="animate-[ui-blink_1.2s_ease-in-out_infinite]" />
        <circle cx="147" cy="29" r="1.4" fill={S} className="animate-[ui-blink_1.2s_ease-in-out_.2s_infinite]" />
        <circle cx="158" cy="29" r="1.4" fill={S} className="animate-[ui-blink_1.2s_ease-in-out_.4s_infinite]" />
      </g>
    </>
  );
}

export default function FormatArt({ k, className = '' }: { k: FormatKey; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#050505] ${className}`}>
      <div className="absolute inset-0 ui-dots-bg opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_65%)]" />
      <svg viewBox="0 0 240 135" fill="none" className="relative w-full h-full" preserveAspectRatio="xMidYMid meet">
        {k === 'story' && <Story />}
        {k === 'cartoon' && <Cartoon />}
        {k === 'animated' && <Animated />}
        {k === 'whiteboard' && <Whiteboard />}
        {k === 'fruit_drama' && <Fruit />}
      </svg>
    </div>
  );
}
