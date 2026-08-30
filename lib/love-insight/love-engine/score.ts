import type { LoveReadingResult } from '@/lib/love-insight/shared';

export interface ScoreParams {
  personA: string;
  personB: string;
  personADob?: string;
  personBDob?: string;
}

export async function computeLoveScore(_params: ScoreParams): Promise<LoveReadingResult> {
  // TODO: implement deterministic engine
  throw new Error('love engine chưa được implement ở prompt này');
}
