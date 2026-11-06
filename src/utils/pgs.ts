export interface AssessmentRatings {
  communication: number; // 1 to 5
  trust: number;         // 1 to 5
  support: number;       // 1 to 5
  conflict: number;      // 1 to 5
}

export interface DimensionGap {
  dimension: 'communication' | 'trust' | 'support' | 'conflict';
  label: string;
  partnerAScore: number;
  partnerBScore: number;
  delta: number;
  squaredDelta: number;
}

export interface PgsResult {
  pgs: number; // 0 to 16
  normalizedPercentage: number; // 0% to 100% of max divergence
  gaps: DimensionGap[];
  divergenceLevel: 'minimal' | 'mild' | 'moderate' | 'significant';
  summary: string;
  reflectionPrompt: string;
}

/**
 * Perspective Gap Score (PGS) Algorithm:
 * PGS = [(A1 - B1)^2 + (A2 - B2)^2 + (A3 - B3)^2 + (A4 - B4)^2] / 4
 * Range: 0 to 16.
 *
 * Requirements:
 * - PGS = 0 means identical submitted ratings.
 * - Larger PGS indicates greater differences in reported perspectives.
 * - Does not claim low PGS means healthy or high PGS means unhealthy.
 */
export function calculatePGS(
  partnerA: AssessmentRatings,
  partnerB: AssessmentRatings
): PgsResult {
  const clamp = (val: number) => Math.max(1, Math.min(5, Number(val) || 1));

  const aComm = clamp(partnerA.communication);
  const aTrust = clamp(partnerA.trust);
  const aSupp = clamp(partnerA.support);
  const aConf = clamp(partnerA.conflict);

  const bComm = clamp(partnerB.communication);
  const bTrust = clamp(partnerB.trust);
  const bSupp = clamp(partnerB.support);
  const bConf = clamp(partnerB.conflict);

  const gaps: DimensionGap[] = [
    {
      dimension: 'communication',
      label: 'Communication Clarity',
      partnerAScore: aComm,
      partnerBScore: bComm,
      delta: Math.abs(aComm - bComm),
      squaredDelta: Math.pow(aComm - bComm, 2),
    },
    {
      dimension: 'trust',
      label: 'Mutual Trust & Security',
      partnerAScore: aTrust,
      partnerBScore: bTrust,
      delta: Math.abs(aTrust - bTrust),
      squaredDelta: Math.pow(aTrust - bTrust, 2),
    },
    {
      dimension: 'support',
      label: 'Emotional Support',
      partnerAScore: aSupp,
      partnerBScore: bSupp,
      delta: Math.abs(aSupp - bSupp),
      squaredDelta: Math.pow(aSupp - bSupp, 2),
    },
    {
      dimension: 'conflict',
      label: 'Conflict Resolution',
      partnerAScore: aConf,
      partnerBScore: bConf,
      delta: Math.abs(aConf - bConf),
      squaredDelta: Math.pow(aConf - bConf, 2),
    },
  ];

  const sumSquaredDeltas = gaps.reduce((acc, curr) => acc + curr.squaredDelta, 0);
  const pgs = Math.round((sumSquaredDeltas / 4) * 100) / 100;
  const normalizedPercentage = Math.round((pgs / 16) * 100);

  let divergenceLevel: 'minimal' | 'mild' | 'moderate' | 'significant' = 'minimal';
  if (pgs === 0) {
    divergenceLevel = 'minimal';
  } else if (pgs <= 2.25) {
    divergenceLevel = 'mild';
  } else if (pgs <= 6.25) {
    divergenceLevel = 'moderate';
  } else {
    divergenceLevel = 'significant';
  }

  // Identify highest gap dimension
  const sortedGaps = [...gaps].sort((a, b) => b.delta - a.delta);
  const highestGap = sortedGaps[0];

  let summary = '';
  if (pgs === 0) {
    summary = 'Both partners evaluated this conversation with aligned ratings across all dimensions.';
  } else if (highestGap.delta > 0) {
    summary = `Ratings differed most on ${highestGap.label} (difference of ${highestGap.delta} point${highestGap.delta === 1 ? '' : 's'}).`;
  } else {
    summary = 'Ratings showed minor differences across the four dimensions.';
  }

  let reflectionPrompt = '';
  if (highestGap.dimension === 'communication') {
    reflectionPrompt = 'Consider discussing how clear each person felt the conversation was, and whether any unspoken thoughts remained.';
  } else if (highestGap.dimension === 'trust') {
    reflectionPrompt = 'Consider reflecting on what creates a sense of openness and security during difficult discussions.';
  } else if (highestGap.dimension === 'support') {
    reflectionPrompt = 'Consider sharing what practical or emotional support would have felt most reassuring in this interaction.';
  } else {
    reflectionPrompt = 'Consider discussing whether the conclusion of the conversation felt mutually resolved or left open questions.';
  }

  return {
    pgs,
    normalizedPercentage,
    gaps,
    divergenceLevel,
    summary,
    reflectionPrompt,
  };
}
