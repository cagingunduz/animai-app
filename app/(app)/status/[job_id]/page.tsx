'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SceneStatus {
  scene_index: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url: string | null;
}

interface JobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  step: number;
  total_steps: number;
  message: string;
  scenes: SceneStatus[];
  final_video_url: string | null;
  error: string | null;
}

export default function StatusPage({ params }: { params: { job_id: string } }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/status/${params.job_id}`);
      const data = await res.json();
      setJob(data);
      if (data.status === 'completed' || data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {}
  };

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [params.job_id]);

  const progress = job ? (job.total_steps > 0 ? Math.round((job.step / job.total_steps) * 100) : 0) : 0;
  const isComplete = job?.status === 'completed';
  const isFailed = job?.status === 'failed';

  return (
    <div className="px-5 md:px-8 py-6 max-w-[860px]">
      <Link href="/dashboard" className="text-[12px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)] transition-colors mb-5 inline-block">← Dashboard</Link>

      <div className="flex items-center gap-3.5 mb-7">
        {isComplete ? (
          <div className="w-9 h-9 rounded-full bg-[rgba(74,222,128,0.08)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ) : isFailed ? (
          <div className="w-9 h-9 rounded-full bg-[rgba(248,113,113,0.08)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" />
        )}
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.4px]">
            {isComplete ? 'Complete' : isFailed ? 'Failed' : 'Rendering...'}
          </h1>
          <p className="text-[13px] text-[rgba(255,255,255,0.35)] mt-0.5">
            {job?.message || 'Starting...'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!isFailed && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[rgba(255,255,255,0.25)]">Step {job?.step || 0} of {job?.total_steps || 0}</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.4)] tabular-nums">{progress}%</span>
          </div>
          <div className="h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {isFailed && job?.error && (
        <div className="mb-6 p-4 border border-[rgba(248,113,113,0.15)] rounded-xl bg-[rgba(248,113,113,0.04)]">
          <p className="text-[12px] text-[rgba(248,113,113,0.7)]">{job.error}</p>
        </div>
      )}

      {/* Scene cards */}
      {job?.scenes && job.scenes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {job.scenes.map((s) => (
            <div key={s.scene_index} className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden bg-[#0a0a0a]">
              <div className="aspect-video bg-[#0e0e0e] flex items-center justify-center relative overflow-hidden">
                {s.status === 'completed' && s.video_url ? (
                  <video
                    src={s.video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : s.status === 'processing' ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-7 h-7 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.4)] animate-spin" />
                    <span className="text-[11px] text-[rgba(255,255,255,0.25)]">Rendering...</span>
                  </div>
                ) : s.status === 'queued' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                )}
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded">Scene {s.scene_index}</span>
                  <span className={`text-[10px] capitalize ${s.status === 'completed' ? 'text-[rgba(74,222,128,0.55)]' : s.status === 'processing' ? 'text-[rgba(250,204,21,0.55)]' : s.status === 'failed' ? 'text-[rgba(248,113,113,0.55)]' : 'text-[rgba(255,255,255,0.2)]'}`}>{s.status}</span>
                </div>
                {s.status === 'completed' && s.video_url && (
                  <a href={s.video_url} download className="text-[11px] text-[rgba(255,255,255,0.35)] hover:text-white transition-colors">Download</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final video */}
      {isComplete && job?.final_video_url && (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0a0a0a]">
          <video
            src={job.final_video_url}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video bg-[#0e0e0e]"
          />
          <div className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-medium">Final Video Ready</h3>
              <p className="text-[12px] text-[rgba(255,255,255,0.3)] mt-0.5">{job.scenes.length} scene{job.scenes.length > 1 ? 's' : ''}</p>
            </div>
            <a href={job.final_video_url} download className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">Download MP4</a>
          </div>
        </div>
      )}
    </div>
  );
}
