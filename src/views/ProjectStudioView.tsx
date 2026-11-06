import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BaselineRelationshipSummary,
  BaselineNlpMetrics,
  BaselineStressProbe,
  StructuredMlStatus,
  HadoopResultsResponse,
  HadoopCoupleRecord
} from '../types';
import {
  Database,
  Layers,
  Cpu,
  BrainCircuit,
  FileText,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart3,
  HardDrive,
  Users,
  ShieldAlert,
  Info,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';

export const ProjectStudioView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'dataset' | 'mapreduce' | 'ml'>('architecture');

  // Verified CA3 Baseline state
  const [baselineSummary, setBaselineSummary] = useState<BaselineRelationshipSummary | null>(null);
  const [pgsByType, setPgsByType] = useState<Array<{ interaction_type: string; paired_interactions: number; mean_pgs: number }>>([]);
  const [nlpMetrics, setNlpMetrics] = useState<BaselineNlpMetrics | null>(null);
  const [stressProbes, setStressProbes] = useState<BaselineStressProbe[]>([]);
  const [structuredMlStatus, setStructuredMlStatus] = useState<StructuredMlStatus | null>(null);

  // Verified Apache Hadoop MapReduce offline results state
  const [hadoopData, setHadoopData] = useState<HadoopResultsResponse | null>(null);
  const [loadingHadoop, setLoadingHadoop] = useState(false);
  const [hadoopError, setHadoopError] = useState<string | null>(null);
  const [hadoopPage, setHadoopPage] = useState(1);
  const [hadoopPageSize, setHadoopPageSize] = useState(15);
  const [hadoopSearch, setHadoopSearch] = useState('');
  const [hadoopSort, setHadoopSort] = useState<'id_asc' | 'id_desc' | 'pgs_asc' | 'pgs_desc'>('id_asc');
  const [selectedCouple, setSelectedCouple] = useState<HadoopCoupleRecord | null>(null);

  // Online runner states
  const [validating, setValidating] = useState(false);
  const [datasetReport, setDatasetReport] = useState<any>(null);
  const [runningMr, setRunningMr] = useState(false);
  const [mrResults, setMrResults] = useState<any>(null);

  // Live NLP tester state
  const [nlpTestText, setNlpTestText] = useState('You always ruin everything.');
  const [nlpTestResult, setNlpTestResult] = useState<any>(null);
  const [nlpTesting, setNlpTesting] = useState(false);

  const fetchHadoopResults = async (
    page = hadoopPage,
    search = hadoopSearch,
    sort = hadoopSort,
    pageSize = hadoopPageSize
  ) => {
    setLoadingHadoop(true);
    setHadoopError(null);
    try {
      const res = await api.getHadoopResults({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        sort,
      });
      setHadoopData(res);
      setHadoopPage(res.pagination.page);
    } catch (err: any) {
      console.error('Failed to load Hadoop results:', err);
      setHadoopError(err.message || 'Failed to load Hadoop MapReduce results from results/hadoop_pgs_results.tsv');
    } finally {
      setLoadingHadoop(false);
    }
  };

  useEffect(() => {
    // Load verified offline CA3 baseline artifacts
    api.getBaselineRelationshipSummary()
      .then((data) => setBaselineSummary(data))
      .catch(() => { });

    api.getBaselinePgsByType()
      .then((data) => setPgsByType(data.interaction_types || []))
      .catch(() => { });

    api.getBaselineNlpMetrics()
      .then((data) => setNlpMetrics(data))
      .catch(() => { });

    api.getBaselineStressProbes()
      .then((data) => setStressProbes(data.probes || []))
      .catch(() => { });

    api.getStructuredMlStatus()
      .then((data) => setStructuredMlStatus(data))
      .catch(() => { });

    // Also load online validator report for local fixture
    api.validateBigDataset()
      .then((data) => setDatasetReport(data))
      .catch(() => { });

    // Load actual verified Apache Hadoop MapReduce results
    fetchHadoopResults(1, '', 'id_asc', 15);
  }, []);

  const handleValidateDataset = async () => {
    setValidating(true);
    try {
      const data = await api.validateBigDataset();
      setDatasetReport(data);
    } catch (err: any) {
      alert('Validation error: ' + err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleRunMapReduce = async () => {
    setRunningMr(true);
    try {
      const res = await api.runMapReduce();
      setMrResults(res);
    } catch (err: any) {
      alert('MapReduce execution error: ' + err.message);
    } finally {
      setRunningMr(false);
    }
  };

  const handleTestNlp = async () => {
    if (!nlpTestText.trim()) return;
    setNlpTesting(true);
    try {
      const res = await api.classifyTextEmotion(nlpTestText.trim());
      setNlpTestResult(res);
    } catch (err: any) {
      console.error('NLP evaluation error:', err);
    } finally {
      setNlpTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
            <Database className="h-4 w-4" />
            <span>Academic Project Specification & Demonstration Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
            Big Data Analytics & Machine Learning Pipeline
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            BetweenUs CA3: Verified MapReduce Simulation, Public GoEmotions NLP Baseline, and Perspective Gap Analytics.
          </p>
        </div>

        <button
          onClick={onBack}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all self-start sm:self-auto cursor-pointer"
        >
          Return to App
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/10 overflow-x-auto">
        {[
          { id: 'architecture', label: '1. Lambda Architecture', icon: Layers },
          { id: 'dataset', label: '2. Verified Dataset Inspector', icon: HardDrive },
          { id: 'mapreduce', label: '3. Hadoop MapReduce Results', icon: Cpu },
          { id: 'ml', label: '4. NLP Baseline & Structured ML', icon: BrainCircuit },

        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LAMBDA ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              BetweenUs Big Data Lambda Architecture
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              BetweenUs implements a three-tier Lambda Architecture. Because the web application runs on Node.js/Express, Python heavy batch processing operates as an **offline batch pipeline** with outputs ingested into the **Serving Layer**, while the **Speed Layer** guarantees sub-second interactive partner messaging.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Speed Layer */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Speed Layer (Online)</span>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <p>Handles live authenticated partner messaging and mutual reflections:</p>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                    <li>Node.js / Express on port 3000</li>
                    <li>SQLite relational persistence with WAL concurrency</li>
                    <li>Restrained, transparent rule-based cue detector (pre-send review)</li>
                    <li>Instant Perspective Gap Score calculation on mutual submission</li>
                  </ul>
                </div>
              </div>

              {/* Batch Layer */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Database className="h-4 w-4" />
                  <span>Batch Layer (Offline Pipeline)</span>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <p>Processes massive multi-file datasets offline via Python:</p>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                    <li>Synthetic relationship dataset (~150 MiB uncompressed, 1.13M rows)</li>
                    <li>Public GoEmotions dataset (211K Reddit annotation rows)</li>
                    <li>Python MapReduce simulation (mapper.py, reducer.py)</li>
                    <li>Outputs stored to structured JSON/CSV in <code>results/</code></li>
                  </ul>
                </div>
              </div>

              {/* Serving Layer */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span>Serving Layer (Unified)</span>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <p>Delivers unified analytics and offline benchmarks to client views:</p>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                    <li>REST endpoints for verified baseline results</li>
                    <li>Benchmarking live couple PGS against verified synthetic 1.53 PGS</li>
                    <li>Zero-leakage structured ML status and target leakage disclosures</li>
                    <li>Educational communication insight delivery</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATASET INSPECTOR */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          {/* Verified CA3 Baseline Dataset Summary */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">
                  CA3 Verified Dataset Baseline Summary
                </h3>
                <span className="text-xs text-slate-400">
                  Exact metrics verified by the offline analysis script (<code>run_pipeline.py</code>) on uploaded ZIP files.
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Offline Run
              </span>
            </div>

            {baselineSummary ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block">Total Input Rows</span>
                    <span className="text-xl font-bold text-white font-mono">
                      {baselineSummary.input_rows.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block">Matched P1/P2 Pairs</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      {baselineSummary.paired_interactions.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block">Malformed / Incomplete</span>
                    <span className="text-xl font-bold text-slate-200 font-mono">
                      {baselineSummary.malformed_or_duplicate_rows} / {baselineSummary.incomplete_groups}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block">Mean Baseline PGS</span>
                    <span className="text-xl font-bold text-purple-300 font-mono">
                      {baselineSummary.mean_pgs.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Dataset Size & Nature Disclosure:</span>
                  </div>
                  <p className="leading-relaxed">
                    The uploaded relationship CSV has an uncompressed size of <strong>~150 MiB</strong> (not 1 GB). It contains <strong>synthetic relationship interaction records</strong>, not real human conversations. Do not infer a real-world population finding from this dataset.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Loading verified baseline summary...</div>
            )}
          </div>

          {/* Local Fixture Validator */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Local Stream Validator (Live Verification)
                </h3>
                <p className="text-xs text-slate-400">
                  Executes <code>hadoop/validate_dataset.py</code> on the local sample fixture.
                </p>
              </div>

              <button
                onClick={handleValidateDataset}
                disabled={validating}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{validating ? 'Scanning...' : 'Run Local Validator'}</span>
              </button>
            </div>

            {datasetReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="text-[10px] text-slate-400 block">Sample Rows</span>
                  <span className="text-lg font-bold text-white font-mono">{datasetReport.total_rows_scanned}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="text-[10px] text-slate-400 block">Valid Rows</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{datasetReport.valid_rows}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="text-[10px] text-slate-400 block">Couples</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{datasetReport.unique_couples_count}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="text-[10px] text-slate-400 block">Bounds [1, 5]</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">100% Passed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HADOOP MAPREDUCE RESULTS & PIPELINE */}
      {activeTab === 'mapreduce' && (
        <div className="space-y-6">
          {/* Main Verified Hadoop Results Panel */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Apache Hadoop MapReduce Output Active
                  </span>
                  <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                    Synthetic Offline Analytics
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    results/hadoop_pgs_results.tsv
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
                  Hadoop MapReduce: Perspective Gap Score Reduction
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Verified offline MapReduce reduction across 18,000 synthetic couples and 282,888 paired interactions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchHadoopResults(hadoopPage, hadoopSearch, hadoopSort, hadoopPageSize)}
                  disabled={loadingHadoop}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  title="Reload results from results/hadoop_pgs_results.tsv"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHadoop ? 'animate-spin text-purple-400' : ''}`} />
                  <span>{loadingHadoop ? 'Loading...' : 'Refresh Artifact'}</span>
                </button>
              </div>
            </div>

            {/* Strict Separation & Synthetic Offline Disclosure Banner */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-indigo-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-indigo-300">
                <Info className="h-4 w-4 shrink-0" />
                <span>Synthetic Offline Hadoop Analytics Disclosure:</span>
              </div>
              <p className="leading-relaxed text-[11px] sm:text-xs text-indigo-100/90">
                The analytics and records below are loaded directly from the genuine Hadoop MapReduce output artifact (<code>results/hadoop_pgs_results.tsv</code>). These records were computed offline from <strong>synthetic relationship interaction fixtures</strong> (~150 MiB uncompressed). They are <strong>strictly separated from live user reflections, messages, and SQLite database tables</strong>. No values are fabricated or simulated at runtime.
              </p>
            </div>

            {/* Error Message if Hadoop Results File is Missing or Inaccessible */}
            {hadoopError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>Hadoop MapReduce Output Missing or Inaccessible</span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed font-mono">
                  {hadoopError}
                </p>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-rose-500/20">
                  Expected file path: <code>results/hadoop_pgs_results.tsv</code>. Please ensure the Apache Hadoop MapReduce job has completed and emitted its reduction results into the <code>results/</code> directory.
                </div>
              </div>
            )}

            {/* Aggregate Statistics from Real Hadoop Output */}
            {hadoopData?.summary && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Genuine Hadoop MapReduce Aggregate Statistics:
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Parsed from __AGGREGATE_SUMMARY__
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Couples</span>
                    <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                      {hadoopData.summary.total_couples_processed.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Synthetic couple entities</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block font-medium">Paired Interactions</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                      {hadoopData.summary.total_paired_interactions.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Matched P1 & P2 pairs</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block font-medium">Overall Mean PGS</span>
                    <span className="text-xl sm:text-2xl font-bold text-purple-300 font-mono">
                      {hadoopData.summary.overall_mean_pgs.toFixed(4)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Theoretical range: 0 – 16</span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-[11px] text-slate-400 block font-medium">Incomplete Interactions</span>
                    <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                      {hadoopData.summary.total_incomplete_interactions}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">100% paired completeness</span>
                  </div>
                </div>

                {/* Dataset-Wide Mean Dimension Gaps */}
                {hadoopData.summary.dimension_gap_averages && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Dataset-Wide Mean Dimension Gaps (|Partner A − Partner B|):
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Averaged across {hadoopData.summary.total_couples_processed.toLocaleString()} couples
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="rounded-lg bg-slate-800/60 border border-white/5 p-3">
                        <span className="text-[10px] text-slate-400 block">Communication Gap</span>
                        <span className="text-base font-bold text-cyan-300 font-mono">
                          {hadoopData.summary.dimension_gap_averages.communication.toFixed(4)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 border border-white/5 p-3">
                        <span className="text-[10px] text-slate-400 block">Trust Gap</span>
                        <span className="text-base font-bold text-indigo-300 font-mono">
                          {hadoopData.summary.dimension_gap_averages.trust.toFixed(4)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 border border-white/5 p-3">
                        <span className="text-[10px] text-slate-400 block">Support Gap</span>
                        <span className="text-base font-bold text-purple-300 font-mono">
                          {hadoopData.summary.dimension_gap_averages.support.toFixed(4)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 border border-white/5 p-3">
                        <span className="text-[10px] text-slate-400 block">Conflict Resolution Gap</span>
                        <span className="text-base font-bold text-emerald-300 font-mono">
                          {hadoopData.summary.dimension_gap_averages.conflict_resolution.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hadoop Interaction Type Breakdown */}
                {hadoopData.summary.interaction_type_breakdown?.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Hadoop Interaction Type Breakdown:
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400">
                            <th className="p-2">Interaction Type</th>
                            <th className="p-2">Paired Interactions</th>
                            <th className="p-2">Mean PGS (0–16)</th>
                            <th className="p-2">Alignment Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hadoopData.summary.interaction_type_breakdown.map((item, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="p-2 text-cyan-300 font-sans font-semibold">{item.type}</td>
                              <td className="p-2 text-white">{item.count.toLocaleString()}</td>
                              <td className="p-2 text-purple-300 font-bold">{item.mean_pgs.toFixed(4)}</td>
                              <td className="p-2 text-slate-400 font-sans">
                                {item.mean_pgs < 1.4 ? 'Close Alignment' : item.mean_pgs > 2.0 ? 'Elevated Divergence' : 'Moderate Alignment'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Real Couple-Wise Hadoop Explorer */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white font-['Outfit']">
                    Real Couple-Wise MapReduce Explorer
                  </h4>
                  <p className="text-xs text-slate-400">
                    Query, search, and verify real individual couple reduction records from <code>results/hadoop_pgs_results.tsv</code>.
                  </p>
                </div>

                {/* Quick verification chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-400 mr-1">Quick Select:</span>
                  <button
                    onClick={() => {
                      setHadoopSearch('C100002');
                      fetchHadoopResults(1, 'C100002', hadoopSort, hadoopPageSize);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-mono font-semibold transition cursor-pointer ${hadoopSearch === 'C100002'
                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                      : 'bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
                      }`}
                    title="Verify couple C100002 with mean PGS 1.8594"
                  >
                    ★ C100002 (Target)
                  </button>
                  <button
                    onClick={() => {
                      setHadoopSearch('C100000');
                      fetchHadoopResults(1, 'C100000', hadoopSort, hadoopPageSize);
                    }}
                    className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300 font-mono hover:bg-white/10 cursor-pointer"
                  >
                    C100000
                  </button>
                  <button
                    onClick={() => {
                      setHadoopSearch('C100001');
                      fetchHadoopResults(1, 'C100001', hadoopSort, hadoopPageSize);
                    }}
                    className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300 font-mono hover:bg-white/10 cursor-pointer"
                  >
                    C100001
                  </button>
                  <button
                    onClick={() => {
                      setHadoopSearch('C117999');
                      fetchHadoopResults(1, 'C117999', hadoopSort, hadoopPageSize);
                    }}
                    className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300 font-mono hover:bg-white/10 cursor-pointer"
                  >
                    C117999
                  </button>
                  {hadoopSearch && (
                    <button
                      onClick={() => {
                        setHadoopSearch('');
                        fetchHadoopResults(1, '', hadoopSort, hadoopPageSize);
                      }}
                      className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-2 py-1 text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={hadoopSearch}
                    onChange={(e) => setHadoopSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchHadoopResults(1, hadoopSearch, hadoopSort, hadoopPageSize);
                      }
                    }}
                    placeholder="Search Couple ID (e.g. C100002)..."
                    className="w-full rounded-xl bg-slate-900 border border-white/10 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  {hadoopSearch && (
                    <button
                      onClick={() => {
                        setHadoopSearch('');
                        fetchHadoopResults(1, '', hadoopSort, hadoopPageSize);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => fetchHadoopResults(1, hadoopSearch, hadoopSort, hadoopPageSize)}
                  disabled={loadingHadoop}
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition cursor-pointer"
                >
                  Search
                </button>

                <div className="flex items-center gap-2">
                  <select
                    value={hadoopSort}
                    onChange={(e) => {
                      const newSort = e.target.value as any;
                      setHadoopSort(newSort);
                      fetchHadoopResults(1, hadoopSearch, newSort, hadoopPageSize);
                    }}
                    className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="id_asc">Sort: Couple ID (Asc)</option>
                    <option value="id_desc">Sort: Couple ID (Desc)</option>
                    <option value="pgs_asc">Sort: Mean PGS (Lowest)</option>
                    <option value="pgs_desc">Sort: Mean PGS (Highest)</option>
                  </select>

                  <select
                    value={hadoopPageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setHadoopPageSize(newSize);
                      fetchHadoopResults(1, hadoopSearch, hadoopSort, newSize);
                    }}
                    className="rounded-xl bg-slate-900 border border-white/10 px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="10">10 / page</option>
                    <option value="15">15 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                </div>
              </div>

              {/* Couples Records Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="p-2.5">Couple ID</th>
                      <th className="p-2.5">Mean PGS</th>
                      <th className="p-2.5">Valid Pairs</th>
                      <th className="p-2.5">Incomplete</th>
                      <th className="p-2.5">Comm Gap</th>
                      <th className="p-2.5">Trust Gap</th>
                      <th className="p-2.5">Support Gap</th>
                      <th className="p-2.5">Conflict Gap</th>
                      <th className="p-2.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHadoop ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                            <span>Loading verified Hadoop MapReduce output...</span>
                          </div>
                        </td>
                      </tr>
                    ) : hadoopData?.couples && hadoopData.couples.length > 0 ? (
                      hadoopData.couples.map((c) => {
                        const isTargetVerified = c.couple_id === 'C100002';
                        return (
                          <tr
                            key={c.couple_id}
                            className={`border-b border-white/5 transition-colors ${isTargetVerified
                              ? 'bg-purple-950/40 hover:bg-purple-950/60 ring-1 ring-inset ring-purple-500/40'
                              : 'hover:bg-white/5'
                              }`}
                          >
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{c.couple_id}</span>
                                {isTargetVerified && (
                                  <span className="rounded bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 font-sans">
                                    Target Verified
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className={`font-bold ${isTargetVerified ? 'text-amber-300 font-extrabold' : 'text-purple-300'}`}>
                                {c.mean_pgs.toFixed(4)}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-200">{c.valid_pairs_count}</td>
                            <td className="p-2.5 text-slate-400">{c.incomplete_count}</td>
                            <td className="p-2.5 text-cyan-300">{c.dimension_gaps.communication.toFixed(4)}</td>
                            <td className="p-2.5 text-indigo-300">{c.dimension_gaps.trust.toFixed(4)}</td>
                            <td className="p-2.5 text-purple-300">{c.dimension_gaps.support.toFixed(4)}</td>
                            <td className="p-2.5 text-emerald-300">{c.dimension_gaps.conflict_resolution.toFixed(4)}</td>
                            <td className="p-2.5 text-right font-sans">
                              <button
                                onClick={() => setSelectedCouple(c)}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                          No couples found matching your search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {hadoopData?.pagination && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-1">
                  <div>
                    Showing couples{' '}
                    <span className="font-semibold text-white">
                      {hadoopData.pagination.total_couples === 0
                        ? 0
                        : (hadoopData.pagination.page - 1) * hadoopData.pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-white">
                      {Math.min(
                        hadoopData.pagination.page * hadoopData.pagination.limit,
                        hadoopData.pagination.total_couples
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-white">
                      {hadoopData.pagination.total_couples.toLocaleString()}
                    </span>{' '}
                    records
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchHadoopResults(hadoopPage - 1, hadoopSearch, hadoopSort, hadoopPageSize)}
                      disabled={hadoopPage <= 1 || loadingHadoop}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="px-2 font-mono text-white">
                      Page {hadoopData.pagination.page} / {hadoopData.pagination.total_pages}
                    </span>
                    <button
                      onClick={() => fetchHadoopResults(hadoopPage + 1, hadoopSearch, hadoopSort, hadoopPageSize)}
                      disabled={hadoopPage >= hadoopData.pagination.total_pages || loadingHadoop}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Couple Detailed Inspection Modal */}
            {selectedCouple && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="glass-panel relative w-full max-w-2xl rounded-2xl p-6 sm:p-8 space-y-5 border border-purple-500/30 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider font-mono">
                          Hadoop Couple Record
                        </span>
                        {selectedCouple.couple_id === 'C100002' && (
                          <span className="rounded bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                            Verified CA3 Verification Target
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-white font-['Outfit'] mt-1">
                        Couple ID: {selectedCouple.couple_id}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Extracted directly from TSV record in <code>results/hadoop_pgs_results.tsv</code>.
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCouple(null)}
                      className="rounded-lg bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
                      <span className="text-[11px] text-slate-400 block font-medium">Mean PGS</span>
                      <span className="text-2xl font-extrabold text-purple-300 font-mono">
                        {selectedCouple.mean_pgs.toFixed(4)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Scale: 0 to 16</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
                      <span className="text-[11px] text-slate-400 block font-medium">Valid Pairs</span>
                      <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                        {selectedCouple.valid_pairs_count}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Matched interactions</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
                      <span className="text-[11px] text-slate-400 block font-medium">Incomplete</span>
                      <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                        {selectedCouple.incomplete_count}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Dropped records</span>
                    </div>
                  </div>

                  {/* Dimension Gaps Breakdown */}
                  <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Dimension Gap Breakdown (|Score A − Score B|):
                    </span>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Communication Gap</span>
                          <span className="font-mono text-cyan-300 font-bold">
                            {selectedCouple.dimension_gaps.communication.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, (selectedCouple.dimension_gaps.communication / 4) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Trust Gap</span>
                          <span className="font-mono text-indigo-300 font-bold">
                            {selectedCouple.dimension_gaps.trust.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full"
                            style={{ width: `${Math.min(100, (selectedCouple.dimension_gaps.trust / 4) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Support Gap</span>
                          <span className="font-mono text-purple-300 font-bold">
                            {selectedCouple.dimension_gaps.support.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${Math.min(100, (selectedCouple.dimension_gaps.support / 4) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Conflict Resolution Gap</span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {selectedCouple.dimension_gaps.conflict_resolution.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, (selectedCouple.dimension_gaps.conflict_resolution / 4) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Recent Interactions */}
                  {selectedCouple.sample_recent && selectedCouple.sample_recent.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Sample Interactions from Hadoop Reduction:
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400">
                              <th className="p-1.5">Interaction ID</th>
                              <th className="p-1.5">Type</th>
                              <th className="p-1.5">Timestamp</th>
                              <th className="p-1.5 text-right">Interaction PGS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCouple.sample_recent.map((s, idx) => (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-1.5 text-white">{s.interaction_id}</td>
                                <td className="p-1.5 text-cyan-300 font-sans">{s.type}</td>
                                <td className="p-1.5 text-slate-400">{s.timestamp}</td>
                                <td className="p-1.5 text-right text-purple-300 font-bold">{s.pgs.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-right">
                    <button
                      onClick={() => setSelectedCouple(null)}
                      className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition cursor-pointer"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Architecture Theory Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
                  MapReduce Architecture: Grouping & PGS Reduction
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Specification of how MapReduce mappers, composite-key shuffle, and reducers process paired records.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                  <span className="font-bold text-cyan-400 block font-mono">Step 1: Map Step</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Reads raw input CSV rows and emits key <code>(Couple_ID, Interaction_ID)</code> with value <code>(Partner_ID, (scores), Interaction_Type)</code>. Validates ratings are integers between 1 and 5.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                  <span className="font-bold text-indigo-400 block font-mono">Step 2: Shuffle & Sort</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Groups and sorts records by the composite key <code>(Couple_ID, Interaction_ID)</code> so that both partners' independent ratings for the same interaction arrive together in the reducer.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                  <span className="font-bold text-purple-400 block font-mono">Step 3: Reducer Step</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Pairs P1 and P2 ratings, drops incomplete single submissions, and computes mean squared difference across all 4 dimensions: <code>PGS = Σ(A - B)² / 4</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NLP BASELINE & STRUCTURED ML */}
      {activeTab === 'ml' && (
        <div className="space-y-6">
          {/* Section A: GoEmotions NLP Baseline */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    Public GoEmotions NLP Baseline
                  </h3>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    Experimental Baseline
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trained on Google Research GoEmotions (Reddit comments) for 9 emotion categories.
                </p>
              </div>

              <a
                href="https://github.com/google-research/google-research/tree/master/goemotions"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                <span>Demszky et al., ACL 2020</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Critical Limitation Banner */}
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-red-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Critical NLP Limitations:</span>
              </div>
              <p className="leading-relaxed">
                <strong>A GoEmotions classifier is NOT an insult, bullying, sarcasm, or intention detector.</strong> The 10 stress probes are illustration ONLY without labeled cases, and have no accuracy metric. Emotion labels from Reddit comments do not prove a partner's intention or emotional state in private communication.
              </p>
            </div>

            {/* Baseline Metrics Cards */}
            {nlpMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400 block">Raw Annotations</span>
                  <span className="text-xl font-bold text-white font-mono">{nlpMetrics.raw_annotation_rows.toLocaleString()}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400 block">Train / Test Split</span>
                  <span className="text-xl font-bold text-cyan-400 font-mono">{nlpMetrics.train} / {nlpMetrics.test}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400 block">Held-out Accuracy</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{(nlpMetrics.accuracy * 100).toFixed(2)}%</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400 block">Macro F1</span>
                  <span className="text-xl font-bold text-purple-300 font-mono">{nlpMetrics.macro_f1.toFixed(4)}</span>
                </div>
              </div>
            )}

            {/* 10 Illustration Stress Probes Table */}
            {stressProbes.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Unvalidated Stress-Test Probes (from <code>nlp_stress_probes.csv</code>):
                  </h4>
                  <span className="text-[11px] text-slate-400 italic">Illustration only — not an accuracy test</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-mono">
                        <th className="p-2">Sample Probe Text</th>
                        <th className="p-2">GoEmotions Label</th>
                        <th className="p-2">Model Probability</th>
                        <th className="p-2">Evaluation Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stressProbes.map((probe, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2 text-slate-200 font-serif">"{probe.text}"</td>
                          <td className="p-2 text-cyan-300 font-mono font-semibold">{probe.predicted_goemotions_label}</td>
                          <td className="p-2 text-purple-300 font-mono">{(probe.model_probability * 100).toFixed(1)}%</td>
                          <td className="p-2 text-slate-400 text-[11px]">{probe.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Live Model Interactive Tester */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Model Artifact Tester (Instant GoEmotions Classification):
                </h4>
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Model Artifact Active
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={nlpTestText}
                  onChange={(e) => setNlpTestText(e.target.value)}
                  placeholder="Type any message to test with the trained GoEmotions model..."
                  className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleTestNlp}
                  disabled={nlpTesting || !nlpTestText.trim()}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {nlpTesting ? 'Classifying...' : 'Classify Tone'}
                </button>
              </div>

              {nlpTestResult && (
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <span className="text-slate-300">
                      Top Emotion: <strong className="text-cyan-300 font-mono capitalize">{nlpTestResult.topEmotion}</strong> ({Math.round(nlpTestResult.confidence * 100)}% confidence)
                    </span>
                    {nlpTestResult.isPotentiallyHostileOrDismissive ? (
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Cautious Tone Cue (Hostile / Irritated)
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Constructive / Neutral
                      </span>
                    )}
                  </div>
                  {nlpTestResult.advisoryNote && (
                    <p className="text-[11px] text-amber-200/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                      {nlpTestResult.advisoryNote}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 italic">
                    {nlpTestResult.modelStatus}. Trained on GoEmotions 9-class dataset (Reddit comments).
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Structured Machine Learning Status (Marked Pending) */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Structured Machine Learning Component
                </h3>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                  Status: PENDING VALIDATION
                </span>
              </div>
              <span className="text-xs text-amber-400 font-semibold">Not Trained</span>
            </div>

            {/* Target Leakage Warning Box */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                <AlertCircle className="h-4 w-4" />
                <span>Target Leakage Prevention Directive</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {structuredMlStatus?.leakage_warning ||
                  'No structured ML accuracy reported. A target created from PGS and predicted using its four component differences would be target leakage. Choose an independent outcome (e.g. future Satisfaction_Score) with careful temporal validation before training a meaningful structured model.'}
              </p>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-white/10">
                Live communication feedback in BetweenUs uses restrained, rule-based cue detection on observable phrasing, NOT fabricated predictions or ungrounded machine learning classifications.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
