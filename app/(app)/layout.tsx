import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[240px] min-h-screen pb-20 md:pb-0">{children}</main>
    </div>
  );
}
