import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Mobile block */}
      <div className="md:hidden fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center px-8 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" className="mb-6">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" stroke="rgba(255,255,255,0.3)"/>
        </svg>
        <h2 className="text-[18px] font-semibold tracking-[-0.5px] mb-2">Desktop only</h2>
        <p className="text-[13px] text-[rgba(255,255,255,0.4)] leading-relaxed max-w-[260px]">
          AnimAI is designed for desktop use. Please open it on your computer for the best experience.
        </p>
        <div className="mt-8 px-4 py-2 border border-[rgba(255,255,255,0.08)] rounded-lg text-[11px] text-[rgba(255,255,255,0.25)]">
          animave.com
        </div>
      </div>

      {/* Desktop app */}
      <div className="hidden md:block">
        <Sidebar />
        <main className="ml-[220px] min-h-screen">{children}</main>
      </div>
    </div>
  );
}
