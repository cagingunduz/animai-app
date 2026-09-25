// Creation formats + their line icons. Used by the sidebar, Home, Create and the mobile page.

export type FormatKey = 'story' | 'cartoon' | 'animated' | 'whiteboard' | 'fruit_drama';

export const FORMATS: { key: FormatKey; title: string; tagline: string; desc: string; badge?: string }[] = [
  { key: 'story', title: 'Storytelling', tagline: 'YouTube story videos', desc: 'Cinematic AI scenes with camera motion, narration and sound design.', badge: 'Popular' },
  { key: 'cartoon', title: '2D Animation', tagline: 'Cartoon series & films', desc: 'Your own characters, scenes and dialogue, built shot by shot.' },
  { key: 'animated', title: 'Animated Story', tagline: 'Character-driven shorts', desc: 'Design one character, then generate a narrated, captioned story.', badge: 'New' },
  { key: 'whiteboard', title: 'Whiteboard', tagline: 'Doodle explainers', desc: 'Any topic, sketched on a whiteboard with narration and captions.', badge: 'New' },
  { key: 'fruit_drama', title: 'Fruit Drama', tagline: 'Viral character shorts', desc: 'Fruit characters, cinematic scenes and Veo 3.1 clips with dialogue.', badge: 'New' },
];

const PATHS: Record<FormatKey, JSX.Element> = {
  story: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M3 15h18" /></>,
  cartoon: <><rect x="3" y="5" width="5" height="14" rx="1" /><rect x="10" y="5" width="4" height="14" rx="1" /><rect x="16" y="5" width="5" height="14" rx="1" /></>,
  animated: <><circle cx="12" cy="9" r="3.5" /><path d="M5.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /></>,
  whiteboard: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M7 13c2-4 4-4 5-2s3 2 5-2M12 17v3M8 21h8" /></>,
  fruit_drama: <><path d="M12 7c4 0 7 2.8 7 7s-3 7-7 7-7-2.8-7-7 3-7 7-7Z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
};

export function FormatIcon({ k, size = 16, className = '' }: { k: FormatKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[k]}
    </svg>
  );
}
