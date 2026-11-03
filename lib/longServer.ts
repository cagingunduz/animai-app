// Server-only: calls to the video server's /long/* endpoints with the shared key.
export async function longApi(path: string, init: RequestInit = {}): Promise<{ status: number; data: any }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...init, cache: 'no-store', signal: AbortSignal.timeout(55000),
      headers: { 'Content-Type': 'application/json', 'X-Studio-Key': process.env.STUDIO_UPLOAD_SECRET || '', ...(init.headers || {}) },
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { error: `The video server answered ${res.status}.` }; }
    if (!res.ok && !data.error) data.error = typeof data.detail === 'string' ? data.detail : `The video server answered ${res.status}.`;
    return { status: res.status, data };
  } catch (e: any) {
    return { status: 503, data: { error: e?.name === 'TimeoutError' ? 'The video server did not answer in time. Try again in a minute.' : 'The video server could not be reached. Try again in a minute.' } };
  }
}
