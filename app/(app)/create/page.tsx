'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VoicePickerModal from '@/components/VoicePickerModal';
import { createClient } from '@/lib/supabase/client';
import {
  type Character, type Scene, type SceneCharacter, type AnimationStyle,
  type Resolution, type Framing, type Voice, STYLE_LABELS, RESOLUTION_CREDITS,
} from '@/lib/types';

const STYLES: AnimationStyle[] = ['western-cartoon', 'anime', 'pixar', 'comic', 'chibi', 'retro', 'custom'];
const FRAMINGS: { value: Framing; label: string }[] = [
  { value: 'full-body', label: 'Full Body' }, { value: 'half-body', label: 'Half Body' }, { value: 'close-up', label: 'Close Up' },
];

let _id = 0;
function uid() { return `id-${++_id}-${Date.now()}`; }

export default function CreatePage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [lipSync, setLipSync] = useState(false);
  const [voiceModal, setVoiceModal] = useState<{ sceneId: string; charId: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const addCharacter = () => {
    if (characters.length >= 14) return;
    const c: Character = { id: uid(), name: `Character ${characters.length + 1}`, description: '', style: 'anime' };
    setCharacters([...characters, c]);
    setScenes(scenes.map(s => ({ ...s, characters: [...s.characters, { character_id: c.id, role: 'silent' as const, framing: 'full-body' as const }] })));
  };

  const updateChar = (id: string, u: Partial<Character>) => setCharacters(characters.map(c => c.id === id ? { ...c, ...u } : c));
  const removeChar = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
    setScenes(scenes.map(s => ({ ...s, characters: s.characters.filter(sc => sc.character_id !== id) })));
  };

  const addScene = () => {
    setScenes([...scenes, {
      id: uid(), number: scenes.length + 1, description: '',
      characters: characters.map(c => ({ character_id: c.id, role: 'silent' as const, framing: 'full-body' as const })),
    }]);
  };

  const updateScene = (id: string, u: Partial<Scene>) => setScenes(scenes.map(s => s.id === id ? { ...s, ...u } : s));
  const updateSC = (sid: string, cid: string, u: Partial<SceneCharacter>) => {
    setScenes(scenes.map(s => s.id !== sid ? s : { ...s, characters: s.characters.map(sc => sc.character_id === cid ? { ...sc, ...u } : sc) }));
  };
  const removeScene = (id: string) => setScenes(scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, number: i + 1 })));

  const speakingCount = scenes.reduce((a, s) => a + s.characters.filter(c => c.role === 'speaking').length, 0);
  const totalCredits = scenes.length * RESOLUTION_CREDITS[resolution] + (lipSync ? speakingCount * 25 : 0);
  const canGenerate = characters.length > 0 && scenes.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('animations').insert({
      user_id: user.id,
      title: scenes[0]?.description?.slice(0, 50) || 'Untitled Animation',
      status: 'processing',
      scenes_count: scenes.length,
      resolution,
      lipsync: lipSync,
    }).select('id').single();

    if (data) {
      // TODO: call NEXT_PUBLIC_API_URL to start generation job
      router.push(`/status/${data.id}`);
    }
    setGenerating(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="h-14 border-b border-[rgba(255,255,255,0.07)] flex items-center px-5 md:px-7 flex-shrink-0">
        <h1 className="text-[15px] font-semibold tracking-[-0.3px]">Create Animation</h1>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Characters */}
        <div className="md:w-[38%] border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.07)] overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[1px]">Characters</h2>
            <button onClick={addCharacter} disabled={characters.length >= 14}
              className="text-[12px] px-2.5 py-1 border border-[rgba(255,255,255,0.08)] rounded-lg text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
              + Add
            </button>
          </div>

          {characters.length >= 14 && <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-[rgba(250,204,21,0.05)] text-[rgba(250,204,21,0.6)] text-[11px]">Max 14 characters.</div>}

          {characters.length === 0 ? (
            <div className="border border-dashed border-[rgba(255,255,255,0.07)] rounded-xl py-10 flex flex-col items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
              <p className="text-[12px] text-[rgba(255,255,255,0.2)] mt-2">Add a character to start</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {characters.map((c) => (
                <div key={c.id} className="border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 bg-[#0a0a0a]">
                  <input value={c.name} onChange={(e) => updateChar(c.id, { name: e.target.value })}
                    className="w-full bg-transparent text-[14px] font-medium outline-none border-b border-transparent focus:border-[rgba(255,255,255,0.08)] pb-1 mb-2" placeholder="Name" />
                  <input value={c.description} onChange={(e) => updateChar(c.id, { description: e.target.value })}
                    className="w-full bg-transparent text-[12px] text-[rgba(255,255,255,0.4)] outline-none mb-3" placeholder="Description (optional)" />
                  <div className="flex flex-wrap gap-1 mb-3">
                    {STYLES.map((s) => (
                      <button key={s} onClick={() => updateChar(c.id, { style: s })}
                        className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${c.style === s ? 'border-[rgba(255,255,255,0.25)] text-white bg-[rgba(255,255,255,0.05)]' : 'border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.1)]'}`}>
                        {STYLE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <div className="border border-dashed border-[rgba(255,255,255,0.06)] rounded-lg p-3 flex flex-col items-center cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <span className="text-[10px] text-[rgba(255,255,255,0.15)] mt-1.5">Drop photo or click</span>
                  </div>
                  <button onClick={() => removeChar(c.id)} className="text-[11px] text-[rgba(248,113,113,0.4)] hover:text-[rgba(248,113,113,0.7)] transition-colors">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenes */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[1px]">Scenes</h2>
            <button onClick={addScene}
              className="text-[12px] px-2.5 py-1 border border-[rgba(255,255,255,0.08)] rounded-lg text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all">
              + Add Scene
            </button>
          </div>

          {scenes.length === 0 ? (
            <div className="border border-dashed border-[rgba(255,255,255,0.07)] rounded-xl py-10 flex flex-col items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 20h20"/></svg>
              <p className="text-[12px] text-[rgba(255,255,255,0.2)] mt-2">{characters.length === 0 ? 'Add characters first' : 'Add a scene'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {scenes.map((scene) => (
                <div key={scene.id} className="border border-[rgba(255,255,255,0.06)] rounded-xl p-4 bg-[#0a0a0a]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-[10px] font-medium text-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded uppercase tracking-wider">Scene {scene.number}</span>
                    <div className="flex-1" />
                    <button onClick={() => removeScene(scene.id)} className="text-[11px] text-[rgba(248,113,113,0.35)] hover:text-[rgba(248,113,113,0.6)] transition-colors">Remove</button>
                  </div>

                  <textarea value={scene.description} onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                    className="w-full bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-lg p-2.5 text-[13px] outline-none resize-none h-16 placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(255,255,255,0.1)] transition-colors mb-3"
                    placeholder="Describe what happens in this scene..." />

                  <input value={scene.pre_dialogue_action || ''} onChange={(e) => updateScene(scene.id, { pre_dialogue_action: e.target.value })}
                    className="w-full bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-lg px-2.5 py-2 text-[12px] outline-none placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(255,255,255,0.1)] transition-colors mb-3"
                    placeholder="Pre-dialogue action (optional)" />

                  {scene.characters.length > 0 && (
                    <div className="border-t border-[rgba(255,255,255,0.04)] pt-3">
                      <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Characters</div>
                      <div className="flex flex-col gap-2.5">
                        {scene.characters.map((sc) => {
                          const char = characters.find(c => c.id === sc.character_id);
                          if (!char) return null;
                          return (
                            <div key={sc.character_id} className="border border-[rgba(255,255,255,0.04)] rounded-lg p-3 bg-[rgba(255,255,255,0.008)]">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-[12px] font-medium">{char.name}</span>
                                <div className="flex-1" />
                                <div className="flex border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden">
                                  {(['silent', 'speaking'] as const).map((r) => (
                                    <button key={r} onClick={() => updateSC(scene.id, sc.character_id, { role: r })}
                                      className={`px-2.5 py-1 text-[10px] capitalize transition-all ${sc.role === r ? 'bg-[rgba(255,255,255,0.07)] text-white' : 'text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)]'}`}>
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                <select value={sc.framing} onChange={(e) => updateSC(scene.id, sc.character_id, { framing: e.target.value as Framing })}
                                  className="bg-[#111] border border-[rgba(255,255,255,0.06)] rounded-md px-2 py-1 text-[10px] text-[rgba(255,255,255,0.4)] outline-none cursor-pointer">
                                  {FRAMINGS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                              </div>
                              {sc.role === 'speaking' && (
                                <div className="mt-2.5 flex flex-col gap-2">
                                  <textarea value={sc.dialogue || ''} onChange={(e) => updateSC(scene.id, sc.character_id, { dialogue: e.target.value })}
                                    className="w-full bg-[#111] border border-[rgba(255,255,255,0.05)] rounded-lg p-2.5 text-[12px] outline-none resize-none h-14 placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(255,255,255,0.1)] transition-colors"
                                    placeholder="Dialogue..." />
                                  <button onClick={() => setVoiceModal({ sceneId: scene.id, charId: sc.character_id })}
                                    className="self-start px-2.5 py-1 border border-[rgba(255,255,255,0.06)] rounded-md text-[11px] text-[rgba(255,255,255,0.35)] hover:text-white hover:border-[rgba(255,255,255,0.12)] transition-all flex items-center gap-1.5">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                                    {sc.voice_name || 'Select voice'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.07)] bg-[#0a0a0a] px-5 md:px-7 py-3.5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] text-[rgba(255,255,255,0.2)] mb-1.5 uppercase tracking-wider">Resolution</div>
            <div className="flex border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
              {(['480p', '720p', '1080p'] as Resolution[]).map((r) => (
                <button key={r} onClick={() => setResolution(r)}
                  className={`px-3 py-1.5 text-[11px] transition-all ${resolution === r ? 'bg-[rgba(255,255,255,0.07)] text-white' : 'text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)]'}`}>
                  <div>{r}</div>
                  <div className="text-[9px] text-[rgba(255,255,255,0.15)] mt-0.5">{RESOLUTION_CREDITS[r]}cr</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-[10px] text-[rgba(255,255,255,0.2)] mb-1.5 uppercase tracking-wider">Lip Sync</div>
            <button onClick={() => setLipSync(!lipSync)}
              className={`relative w-10 h-5 rounded-full transition-all ${lipSync ? 'bg-white' : 'bg-[rgba(255,255,255,0.08)]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${lipSync ? 'left-[22px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.25)]'}`} />
            </button>
            {lipSync && <span className="text-[9px] text-[rgba(255,255,255,0.2)] mt-1">+25cr/role</span>}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider">Est.</div>
              <div className="text-[18px] font-semibold tracking-[-0.5px]">{totalCredits} <span className="text-[12px] text-[rgba(255,255,255,0.25)] font-normal">cr</span></div>
            </div>
            <button onClick={handleGenerate} disabled={!canGenerate || generating}
              className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">
              {generating ? 'Starting...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {voiceModal && (
        <VoicePickerModal isOpen onClose={() => setVoiceModal(null)}
          currentVoiceId={scenes.find(s => s.id === voiceModal.sceneId)?.characters.find(c => c.character_id === voiceModal.charId)?.voice_id}
          onSelect={(v: Voice) => updateSC(voiceModal.sceneId, voiceModal.charId, { voice_id: v.id, voice_name: v.name })} />
      )}
    </div>
  );
}
