import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[220px] min-h-screen pb-16 md:pb-0">{children}</main>
    </div>
  );
}
