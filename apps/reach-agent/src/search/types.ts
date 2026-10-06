export const CHANNELS = ["web", "linkedin", "github", "youtube", "twitter", "reddit"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface SearchQuery {
  channel: Channel;
  query: string;
  freshnessDays?: number;
}

export interface SearchHit {
  channel: Channel;
  title: string;
  url: string;
  snippet: string;
  /** ISO 8601 lu dans la source, jamais inventé. */
  publishedAt: string | null;
  /** Hôte de l'URL (ex. `linkedin.com`). */
  source: string;
}

export interface SearchFailure {
  channel: Channel;
  query: string;
  reason: string;
}

export interface SearchBatchResult {
  hits: SearchHit[];
  failures: SearchFailure[];
  elapsedMs: number;
  fromCache: number;
}

export interface ChannelSearchOptions {
  signal: AbortSignal;
  timeoutMs: number;
}

export type ChannelSearch = (query: SearchQuery, options: ChannelSearchOptions) => Promise<SearchHit[]>;
