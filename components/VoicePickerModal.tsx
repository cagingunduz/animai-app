'use client';

import { useState, useMemo } from 'react';
import { type Voice, MOCK_VOICES } from '@/lib/types';

type Filter = 'all' | 'male' | 'female' | 'american' | 'british' | 'other';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (voice: Voice) => void;
  currentVoiceId?: string;
}

export default function VoicePickerModal({ isOpen, onClose, onSelect, currentVoiceId }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | undefined>(currentVoiceId);
  const [playing, setPlaying] = useState<string | null>(null);

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' }, { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' },
    { label: 'American', value: 'american' }, { label: 'British', value: 'british' }, { label: 'Other', value: 'other' },
  ];

  const filtered = useMemo(() => MOCK_VOICES.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'male' && v.gender !== 'male') return false;
    if (filter === 'female' && v.gender !== 'female') return false;
    if (filter === 'american' && v.accent !== 'American') return false;
    if (filter === 'british' && v.accent !== 'British') return false;
    if (filter === 'other' && (v.accent === 'American' || v.accent === 'British')) return false;
    return true;
  }), [search, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[460px] max-h-[75vh] bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold">Select Voice</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)] hover:text-white transition-all">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          <input type="text" placeholder="Search voices..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg text-[13px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors" />
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {filters.map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${filter === f.value ? 'border-[rgba(255,255,255,0.25)] text-white bg-[rgba(255,255,255,0.05)]' : 'border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)] hover:border-[rgba(255,255,255,0.12)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map((v) => (
            <button key={v.id} onClick={() => setSelected(v.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${selected === v.id ? 'bg-[rgba(255,255,255,0.05)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center ${selected === v.id ? 'border-white bg-white' : 'border-[rgba(255,255,255,0.18)]'}`}>
                {selected === v.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{v.name}</div>
                <div className="flex gap-1.5 mt-0.5">
                  {[v.gender, v.accent, v.age].map((t) => (
                    <span key={t} className="text-[10px] text-[rgba(255,255,255,0.25)] px-1.5 py-0.5 border border-[rgba(255,255,255,0.05)] rounded">{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setPlaying(playing === v.id ? null : v.id); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${playing === v.id ? 'bg-white text-black' : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)] hover:text-white'}`}>
                {playing === v.id
                  ? <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="0.5"/><rect x="6" y="1" width="3" height="8" rx="0.5"/></svg>
                  : <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,0 10,5 2,10"/></svg>}
              </button>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-5 py-8 text-center text-[13px] text-[rgba(255,255,255,0.25)]">No voices found.</div>}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[rgba(255,255,255,0.07)] flex justify-end gap-3">
          <button onClick={onClose} className="px-3.5 py-1.5 text-[12px] text-[rgba(255,255,255,0.4)] hover:text-white rounded-lg transition-colors">Cancel</button>
          <button onClick={() => { const voice = MOCK_VOICES.find((v) => v.id === selected); if (voice) onSelect(voice); onClose(); }} disabled={!selected}
            className="px-4 py-1.5 text-[12px] font-medium bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Select Voice
          </button>
        </div>
      </div>
    </div>
  );
}
