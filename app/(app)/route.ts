import { NextResponse } from 'next/server';

// Mock voices for development — replace with Railway backend proxy
const MOCK_VOICES = [
  { id: 'v01', name: 'James Carter', description: 'Deep, authoritative American male. Great for narration.', gender: 'male', accent: 'American', age: 'Adult', language: 'English', category: 'Narrator', color: '#4a90d9', preview_url: '' },
  { id: 'v02', name: 'Sofia Reyes', description: 'Warm, expressive Spanish-accented female. Versatile.', gender: 'female', accent: 'Spanish', age: 'Young Adult', language: 'Spanish', category: 'Character', color: '#e8607a', preview_url: '' },
  { id: 'v03', name: 'Oliver Bennett', description: 'Crisp British male. Perfect for documentaries.', gender: 'male', accent: 'British', age: 'Adult', language: 'English', category: 'Narrator', color: '#50b87a', preview_url: '' },
  { id: 'v04', name: 'Yuki Tanaka', description: 'Gentle Japanese female. Soft and calming tone.', gender: 'female', accent: 'Japanese', age: 'Young Adult', language: 'Japanese', category: 'Character', color: '#c084fc', preview_url: '' },
  { id: 'v05', name: 'Marcus Johnson', description: 'Energetic American male. Ideal for action scenes.', gender: 'male', accent: 'American', age: 'Young Adult', language: 'English', category: 'Character', color: '#f59e0b', preview_url: '' },
  { id: 'v06', name: 'Elena Volkov', description: 'Cool Eastern European female. Mysterious quality.', gender: 'female', accent: 'Eastern European', age: 'Adult', language: 'English', category: 'Character', color: '#6ee7b7', preview_url: '' },
  { id: 'v07', name: 'David Kim', description: 'Smooth Korean-American male. Modern and relatable.', gender: 'male', accent: 'American', age: 'Young Adult', language: 'English', category: 'Character', color: '#38bdf8', preview_url: '' },
  { id: 'v08', name: 'Priya Sharma', description: 'Rich Indian female. Warm and articulate delivery.', gender: 'female', accent: 'Indian', age: 'Adult', language: 'English', category: 'Narrator', color: '#fb7185', preview_url: '' },
  { id: 'v09', name: 'Lucas Martin', description: 'Friendly French male. Charming and lighthearted.', gender: 'male', accent: 'French', age: 'Adult', language: 'French', category: 'Character', color: '#a78bfa', preview_url: '' },
  { id: 'v10', name: 'Mia Thompson', description: 'Bright Australian female. Cheerful and upbeat.', gender: 'female', accent: 'Australian', age: 'Young Adult', language: 'English', category: 'Character', color: '#fbbf24', preview_url: '' },
  { id: 'v11', name: 'Noah Williams', description: 'Calm American male. Trustworthy, newscaster quality.', gender: 'male', accent: 'American', age: 'Senior', language: 'English', category: 'Narrator', color: '#64748b', preview_url: '' },
  { id: 'v12', name: 'Isabella Rossi', description: 'Passionate Italian female. Dramatic and expressive.', gender: 'female', accent: 'Italian', age: 'Adult', language: 'Italian', category: 'Character', color: '#ef4444', preview_url: '' },
  { id: 'v13', name: 'Ethan Brooks', description: 'Gruff American male. Rugged, action-hero type.', gender: 'male', accent: 'American', age: 'Adult', language: 'English', category: 'Character', color: '#78716c', preview_url: '' },
  { id: 'v14', name: 'Aisha Obi', description: 'Confident Nigerian-British female. Authoritative.', gender: 'female', accent: 'British', age: 'Adult', language: 'English', category: 'Narrator', color: '#c026d3', preview_url: '' },
  { id: 'v15', name: 'Kai Nakamura', description: 'Youthful Japanese male. Anime protagonist energy.', gender: 'male', accent: 'Japanese', age: 'Young Adult', language: 'Japanese', category: 'Character', color: '#22d3ee', preview_url: '' },
  { id: 'v16', name: 'Sarah Mitchell', description: 'Neutral American female. Clean, corporate tone.', gender: 'female', accent: 'American', age: 'Adult', language: 'English', category: 'Narrator', color: '#94a3b8', preview_url: '' },
  { id: 'v17', name: 'Leo Schmidt', description: 'Strong German male. Precise and commanding.', gender: 'male', accent: 'German', age: 'Adult', language: 'German', category: 'Character', color: '#059669', preview_url: '' },
  { id: 'v18', name: 'Chloe Dubois', description: 'Soft French female. Elegant and soothing.', gender: 'female', accent: 'French', age: 'Young Adult', language: 'French', category: 'Character', color: '#e879f9', preview_url: '' },
  { id: 'v19', name: 'Ryan O\'Connor', description: 'Friendly Irish male. Warm storyteller quality.', gender: 'male', accent: 'Irish', age: 'Adult', language: 'English', category: 'Narrator', color: '#34d399', preview_url: '' },
  { id: 'v20', name: 'Amara Chen', description: 'Dynamic Chinese-American female. Energetic.', gender: 'female', accent: 'American', age: 'Young Adult', language: 'English', category: 'Character', color: '#f472b6', preview_url: '' },
  { id: 'v21', name: 'Hassan Al-Rashid', description: 'Rich Arabic male. Deep and resonant voice.', gender: 'male', accent: 'Arabic', age: 'Adult', language: 'Arabic', category: 'Narrator', color: '#d97706', preview_url: '' },
  { id: 'v22', name: 'Lena Johansson', description: 'Clear Scandinavian female. Calm and collected.', gender: 'female', accent: 'Scandinavian', age: 'Adult', language: 'English', category: 'Character', color: '#7dd3fc', preview_url: '' },
];

export async function GET() {
  // In production, proxy to Railway backend:
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voices`);
  // const data = await res.json();
  // return NextResponse.json(data);

  return NextResponse.json(MOCK_VOICES);
}
