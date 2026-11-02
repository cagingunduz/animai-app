import { proxyExplainer } from '../../explainer/proxy';

export const maxDuration = 120;

export async function POST(request: Request) {
  return proxyExplainer(request, '/block/script');
}
