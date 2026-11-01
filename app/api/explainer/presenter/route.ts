import { proxyExplainer } from '../proxy';

export const maxDuration = 120;

export async function POST(request: Request) {
  return proxyExplainer(request, '/explainer/presenter');
}
