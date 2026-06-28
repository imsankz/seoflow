/**
 * Shared types for the SEO audit pipeline.
 */
export interface Frontmatter {
  title?: string;
  description?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  schema?: string;
  focusKeyword?: string;
  lastModified?: string;
  [key: string]: any;
}

export interface GSCPageData {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCQueryData {
  clicks: number;
  impressions: number;
}

export interface AuditLogEntry {
  status: 'pending' | 'completed' | 'skipped';
  changes_made: string[];
  before: {
    word_count: number;
    internal_links: number;
    images: number;
    meta_description_length: number;
    neuronwriter_score: number | null;
  };
  after: {
    word_count: number;
    internal_links: number;
    images: number;
    meta_description_length: number;
  };
  gsc_data: {
    impressions: number;
    clicks: number;
    position: number | null;
    ctr: string | null;
  };
  neuronwriter_query_id: string | null;
  neuronwriter_notes: string | null;
  neuronwriter_missing_terms: string[];
  neuronwriter_suggested_h2s: string[];
  next_review: string | null;
  notes: string;
  flagged_for_manual: boolean;
  audit_date: string;
  auditor: string;
}

export interface AuditLog {
  version: string;
  last_run: string | null;
  posts: {
    [slug: string]: AuditLogEntry;
  };
}

export interface ToolTrigger {
  keywords: string[];
  path: string;
  anchor: string;
}

export interface BookingTrigger {
  keywords: string[];
  path: string;
  anchor: string;
}

export interface ImageData {
  url: string;
  alt: string;
  photographer: string;
  credit: string;
  source: 'pexels' | 'unsplash';
}

export interface NeuronData {
  queryId: string | null;
  targetWordCount: number | null;
  missingTerms: string[];
  h2Terms: string[];
  peopleAlsoAsk: string[];
  contentQuestions: string[];
  notes: string | null;
}

export interface KeywordSuggestion {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: string;
  intent: string;
}

export interface KeywordResearchResult {
  focusKeyword: string;
  suggestions: KeywordSuggestion[];
  relatedKeywords: string[];
  searchVolume: number;
  difficulty: number;
  clusterScore: number;
  source: 'ubersuggest' | 'fallback' | 'unavailable';
}

export interface AIResponse {
  faq_section?: string;
  expanded_sections?: { [heading: string]: string };
  nlp_insertions?: string[];
}

export interface Section {
  heading: string;
  lines: string[];
}

export interface StepInput {
  slug: string;
  filePath: string;
  content: string;
  frontmatter: Frontmatter;
  gsc: Partial<GSCPageData>;
}

export interface StepOutput {
  content: string;
  frontmatter: Frontmatter;
  changes: string[];
  data?: Record<string, any>;
}
