export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string;
  created_at?: string;
}

export interface Partner {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string;
}

export interface Couple {
  id: string;
  created_at: string;
}

export interface PartnerRequest {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_color?: string;
  sender_name?: string;
  sender_email?: string;
  sender_avatar_color?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_avatar_color?: string;
}

export interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  client_msg_id?: string;
  read_by_recipient: number;
  created_at: string;
}

export interface DetectedCue {
  id: string;
  type: string;
  label: string;
  evidence: string;
  description: string;
}

export interface EmotionInsight {
  topEmotion: string;
  predicted_emotion?: string;
  confidence: number;
  isPotentiallyHostileOrDismissive: boolean;
  is_experimental?: boolean;
  advisoryNote?: string;
  probabilities?: Record<string, number>;
  modelStatus: string;
}

export interface CommunicationFeedback {
  perspective: 'sender_review' | 'recipient_insight';
  wordCount: number;
  hasAbruptEnding: boolean;
  hasApology: boolean;
  hasExplanation: boolean;
  hasAcknowledgment: boolean;
  hasInquiry: boolean;
  detectedCues: DetectedCue[];
  neutralSummary: string;
  constructiveSuggestion?: string;
  educationalNote: string;
  nlpEmotion?: EmotionInsight;
}

export interface AssessmentRatings {
  communication: number;
  trust: number;
  support: number;
  conflict: number;
  private_notes?: string;
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
  pgs: number;
  normalizedPercentage: number;
  gaps: DimensionGap[];
  divergenceLevel: 'minimal' | 'mild' | 'moderate' | 'significant';
  summary: string;
  reflectionPrompt: string;
}

export interface ReflectionSession {
  id: string;
  title: string;
  created_at: string;
  created_by: string;
  creator_name: string;
  hasMyAssessment: boolean;
  hasPartnerAssessment: boolean;
  bothCompleted: boolean;
  myRatings: AssessmentRatings | null;
  partnerRatings: AssessmentRatings | null;
  pgs: PgsResult | null;
}

export interface SavedMessageAnalysis {
  id: string;
  couple_id: string;
  user_id: string;
  message_id?: string;
  message_text: string;
  top_emotion: string;
  confidence: number;
  probabilities?: Record<string, number>;
  observation?: string;
  created_at: string;
}

export interface AnalyticsData {
  totalSessions: number;
  pendingSessions?: number;
  currentPgs?: number | null;
  averagePgs: number | null;
  snapshots: Array<{
    id: string;
    interaction_id: string;
    interaction_title: string;
    pgs_score: number;
    gap_communication: number;
    gap_trust: number;
    gap_support: number;
    gap_conflict: number;
    created_at: string;
  }>;
  dimensionAverages: {
    communication_gap: number;
    trust_gap: number;
    support_gap: number;
    conflict_gap: number;
  } | null;
  emotionInsights?: {
    totalAnalyzed: number;
    emotionCounts: Record<string, number>;
    recentObservations: Array<{
      id: string;
      message_id?: string;
      message_text: string;
      top_emotion: string;
      confidence: number;
      observation?: string;
      created_at: string;
    }>;
  } | null;
  baselineBenchmark?: {
    mean_pgs: number;
    paired_interactions: number;
    dataset_source: string;
    mapreduce_mode: string;
    interaction_types?: Array<{
      type: string;
      count: number;
      mean_pgs: number;
    }>;
  } | null;
  message?: string;
}

export interface BaselineRelationshipSummary {
  input_rows: number;
  paired_interactions: number;
  incomplete_groups: number;
  malformed_or_duplicate_rows: number;
  mean_pgs: number;
  pgs_formula: string;
  mapreduce_mode: string;
  dataset_source: string;
  interaction_types: Array<{
    type: string;
    count: number;
    mean_pgs: number;
  }>;
}

export interface BaselineNlpMetrics {
  raw_annotation_rows: number;
  unique_comment_ids: number;
  filtered_labeled_comments: number;
  train: number;
  test: number;
  evaluated_labels: string[];
  model: string;
  accuracy: number;
  macro_f1: number;
  status: string;
  public_source_credit: string;
  limitations: string;
  classification_report?: string;
}

export interface BaselineStressProbe {
  text: string;
  predicted_goemotions_label: string;
  model_probability: number;
  note: string;
}

export interface StructuredMlStatus {
  status: string;
  is_trained: boolean;
  leakage_warning: string;
  explanation: string;
}

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

