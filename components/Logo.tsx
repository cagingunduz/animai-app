export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#ededed" />
      <path d="M8.2 17.2 12 6.8l3.8 10.4" stroke="#000" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 13.1c1.4-.9 2.8-.9 4.2 0" stroke="#000" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-semibold tracking-[-0.03em]" style={{ fontSize: Math.round(size * 0.78) }}>Animave</span>
    </span>
  );
}
