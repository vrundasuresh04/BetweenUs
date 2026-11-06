import path from 'path';
import fs from 'fs';

export interface HadoopDimensionGaps {
  communication: number;
  trust: number;
  support: number;
  conflict_resolution: number;
}

export interface HadoopInteractionSample {
  interaction_id: string;
  pgs: number;
  type: string;
  timestamp: string;
}

export interface HadoopCoupleRecord {
  couple_id: string;
  valid_pairs_count: number;
  incomplete_count: number;
  mean_pgs: number;
  dimension_gaps: HadoopDimensionGaps;
  sample_recent?: HadoopInteractionSample[];
}

export interface HadoopInteractionTypeBreakdown {
  type: string;
  count: number;
  mean_pgs: number;
}

export interface HadoopAggregateSummary {
  total_couples_processed: number;
  total_paired_interactions: number;
  total_incomplete_interactions: number;
  overall_mean_pgs: number;
  pgs_formula: string;
  interaction_type_breakdown: HadoopInteractionTypeBreakdown[];
  dimension_gap_averages?: HadoopDimensionGaps;
}

export interface HadoopQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  couple_id?: string;
  sort?: 'id_asc' | 'id_desc' | 'pgs_asc' | 'pgs_desc';
}

export interface HadoopResultsResponse {
  source_file: string;
  is_offline_synthetic_hadoop: boolean;
  disclosure: string;
  summary: HadoopAggregateSummary;
  couples: HadoopCoupleRecord[];
  pagination: {
    total_couples: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

interface CacheState {
  mtimeMs: number;
  filePath: string;
  summary: HadoopAggregateSummary;
  couplesList: HadoopCoupleRecord[];
  couplesMap: Map<string, HadoopCoupleRecord>;
}

let cache: CacheState | null = null;

const DEFAULT_HADOOP_FILE = path.resolve(process.cwd(), 'results/hadoop_pgs_results.tsv');

/**
 * Loads and parses the verified Apache Hadoop MapReduce output TSV.
 * Throws a descriptive error if the file is missing or unreadable.
 */
export function loadHadoopResults(customPath?: string): CacheState {
  const filePath = customPath || DEFAULT_HADOOP_FILE;

  if (!fs.existsSync(filePath)) {
    const err = new Error(`Verified Apache Hadoop MapReduce output not found at ${filePath}. Please ensure the offline batch output file is present in the results directory.`);
    (err as any).code = 'ENOENT';
    (err as any).filePath = filePath;
    throw err;
  }

  const stats = fs.statSync(filePath);

  if (cache && cache.filePath === filePath && cache.mtimeMs === stats.mtimeMs) {
    return cache;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let summary: HadoopAggregateSummary | null = null;
  const couplesList: HadoopCoupleRecord[] = [];
  const couplesMap = new Map<string, HadoopCoupleRecord>();

  let sumComm = 0;
  let sumTrust = 0;
  let sumSupp = 0;
  let sumConf = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const tabIndex = line.indexOf('\t');
    if (tabIndex === -1) continue;

    const key = line.slice(0, tabIndex).trim();
    const jsonStr = line.slice(tabIndex + 1).trim();

    if (key === '__AGGREGATE_SUMMARY__') {
      try {
        summary = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse Hadoop aggregate summary JSON at line', i + 1, e);
      }
    } else {
      try {
        const record: HadoopCoupleRecord = JSON.parse(jsonStr);
        couplesList.push(record);
        couplesMap.set(record.couple_id, record);

        if (record.dimension_gaps) {
          sumComm += record.dimension_gaps.communication || 0;
          sumTrust += record.dimension_gaps.trust || 0;
          sumSupp += record.dimension_gaps.support || 0;
          sumConf += record.dimension_gaps.conflict_resolution || 0;
        }
      } catch (e) {
        console.error(`Failed to parse Hadoop couple record at line ${i + 1}`, e);
      }
    }
  }

  const n = couplesList.length;
  const dimension_gap_averages: HadoopDimensionGaps = {
    communication: n > 0 ? Math.round((sumComm / n) * 10000) / 10000 : 0,
    trust: n > 0 ? Math.round((sumTrust / n) * 10000) / 10000 : 0,
    support: n > 0 ? Math.round((sumSupp / n) * 10000) / 10000 : 0,
    conflict_resolution: n > 0 ? Math.round((sumConf / n) * 10000) / 10000 : 0,
  };

  if (summary) {
    summary.dimension_gap_averages = dimension_gap_averages;
  } else {
    let sumPgs = 0;
    let totalPairs = 0;
    for (const c of couplesList) {
      sumPgs += c.mean_pgs;
      totalPairs += c.valid_pairs_count;
    }
    summary = {
      total_couples_processed: n,
      total_paired_interactions: totalPairs,
      total_incomplete_interactions: 0,
      overall_mean_pgs: n > 0 ? Math.round((sumPgs / n) * 10000) / 10000 : 0,
      pgs_formula: 'mean of four squared assessment differences: [(c1-c2)^2 + (t1-t2)^2 + (s1-s2)^2 + (cf1-cf2)^2] / 4.0',
      interaction_type_breakdown: [],
      dimension_gap_averages,
    };
  }

  cache = {
    mtimeMs: stats.mtimeMs,
    filePath,
    summary,
    couplesList,
    couplesMap,
  };

  return cache;
}

/**
 * Queries Hadoop results with support for search, filtering, sorting, and pagination.
 */
export function queryHadoopResults(options: HadoopQueryOptions = {}): HadoopResultsResponse {
  const data = loadHadoopResults();

  let filtered = data.couplesList;

  // Exact couple_id filter
  if (options.couple_id) {
    const single = data.couplesMap.get(options.couple_id.trim());
    filtered = single ? [single] : [];
  } else if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    filtered = filtered.filter(c => c.couple_id.toLowerCase().includes(q));
  }

  // Sorting
  if (options.sort) {
    filtered = [...filtered];
    switch (options.sort) {
      case 'id_asc':
        filtered.sort((a, b) => a.couple_id.localeCompare(b.couple_id));
        break;
      case 'id_desc':
        filtered.sort((a, b) => b.couple_id.localeCompare(a.couple_id));
        break;
      case 'pgs_asc':
        filtered.sort((a, b) => a.mean_pgs - b.mean_pgs);
        break;
      case 'pgs_desc':
        filtered.sort((a, b) => b.mean_pgs - a.mean_pgs);
        break;
    }
  }

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const total_couples = filtered.length;
  const total_pages = Math.ceil(total_couples / limit) || 1;
  const offset = (page - 1) * limit;
  const pageCouples = filtered.slice(offset, offset + limit);

  return {
    source_file: 'results/hadoop_pgs_results.tsv',
    is_offline_synthetic_hadoop: true,
    disclosure: 'Synthetic offline Apache Hadoop MapReduce analytics. Disconnected from live user reflections and runtime messages.',
    summary: data.summary,
    couples: pageCouples,
    pagination: {
      total_couples,
      page,
      limit,
      total_pages,
    },
  };
}

/**
 * Gets a single couple record by ID.
 */
export function getHadoopCouple(coupleId: string): HadoopCoupleRecord | null {
  const data = loadHadoopResults();
  return data.couplesMap.get(coupleId.trim()) || null;
}

/**
 * Gets aggregate summary statistics directly from Hadoop output.
 */
export function getHadoopSummary(): {
  source_file: string;
  is_offline_synthetic_hadoop: boolean;
  disclosure: string;
  summary: HadoopAggregateSummary;
} {
  const data = loadHadoopResults();
  return {
    source_file: 'results/hadoop_pgs_results.tsv',
    is_offline_synthetic_hadoop: true,
    disclosure: 'Synthetic offline Apache Hadoop MapReduce analytics. Disconnected from live user reflections and runtime messages.',
    summary: data.summary,
  };
}

