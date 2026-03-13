'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type AnimationStatus, type SceneRenderStatus } from '@/lib/types';

export default function StatusPage({ params }: { params: { job_id: string } }) {
  const supabase = createClient();
  const [overall, setOverall] = useState<AnimationStatus>('processing');
  const [progress, setProgress] = useState(25);
  const [message, setMessage] = useState('Initializing...');
  const [scenes, setScenes] = useState<SceneRenderStatus[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    // Fetch animation info
    (async () => {
      const { data } = await supabase
        .from('animations')
        .select('title, status, scenes_count')
        .eq('id', params.job_id)
        .single();

      if (data) {
        setTitle(data.title);
        setOverall(data.status as AnimationStatus);
        // Build mock scene statuses based on count
        const mockScenes: SceneRenderStatus[] = [];
        for (let i = 1; i <= data.scenes_count; i++) {
          mockScenes.push({
            scene_number: i,
            status: i === 1 ? 'completed' : i === 2 ? 'processing' : 'queued',
            current_step: i === 2 ? 'Generating frames...' : undefined,
          });
        }
        setScenes(mockScenes);
      }
    })();
  }, [params.job_id]);

  // Simulated polling
  useEffect(() => {
    if (overall === 'completed') return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 3, 100);
        if (next >= 100) {
          setOverall('completed');
          setMessage('All scenes complete');
          setScenes((prev) => prev.map(s => ({ ...s, status: 'completed', video_url: '#' })));
        } else {
          setMessage(`Scene ${Math.ceil((next / 100) * scenes.length) || 1}: Generating frames...`);
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [overall, scenes.length]);

  return (
    <div className="px-5 md:px-8 py-6 max-w-[860px]">
      <Link href="/dashboard" className="text-[12px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)] transition-colors mb-5 inline-block">← Dashboard</Link>

      <div className="flex items-center gap-3.5 mb-7">
        {overall === 'completed' ? (
          <div className="w-9 h-9 rounded-full bg-[rgba(74,222,128,0.08)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" />
        )}
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.4px]">{overall === 'completed' ? 'Complete' : 'Rendering...'}</h1>
          <p className="text-[13px] text-[rgba(255,255,255,0.35)] mt-0.5">{title || message}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[rgba(255,255,255,0.25)]">Progress</span>
          <span className="text-[11px] text-[rgba(255,255,255,0.4)] tabular-nums">{progress}%</span>
        </div>
        <div className="h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Scene cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {scenes.map((s) => (
          <div key={s.scene_number} className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden bg-[#0a0a0a]">
            <div className="aspect-video bg-[#0e0e0e] flex items-center justify-center relative">
              {s.status === 'queued' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
              {s.status === 'processing' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-7 h-7 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.4)] animate-spin" />
                  <span className="text-[11px] text-[rgba(255,255,255,0.25)]">{s.current_step}</span>
                </div>
              )}
              {s.status === 'completed' && (
                <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="white"><polygon points="5,2 14,8 5,14"/></svg>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded">Scene {s.scene_number}</span>
                <span className={`text-[10px] capitalize ${s.status === 'completed' ? 'text-[rgba(74,222,128,0.55)]' : s.status === 'processing' ? 'text-[rgba(250,204,21,0.55)]' : 'text-[rgba(255,255,255,0.2)]'}`}>{s.status}</span>
              </div>
              {s.status === 'completed' && <button className="text-[11px] text-[rgba(255,255,255,0.35)] hover:text-white transition-colors">Download</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Final video */}
      {overall === 'completed' && (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0a0a0a]">
          <div className="aspect-video bg-[#0e0e0e] flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="white"><polygon points="5,2 14,8 5,14"/></svg>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-medium">Final Video Ready</h3>
              <p className="text-[12px] text-[rgba(255,255,255,0.3)] mt-0.5">{scenes.length} scenes · {title}</p>
            </div>
            <button className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">Download MP4</button>
          </div>
        </div>
      )}
    </div>
  );
}
