// ─── Original Types ───
export type DisasterType = "Earthquake" | "Flood" | "Fire" | "Cyclone";
export type Severity = "Low" | "Medium" | "High";

export interface Disaster {
  id: string;
  disasterType: DisasterType;
  latitude: number;
  longitude: number;
  severity: Severity;
  beforeImage: string;
  afterImage: string;
  timestamp: string;
  description: string;
}

export const severityColor: Record<Severity, string> = {
  High: "#e53e3e",
  Medium: "#ecc94b",
  Low: "#38a169",
};

// ─── API Response Types ───

/** Social media / IVR report from GET /api/map/reports */
export interface MapReport {
  id: string;
  text: string;
  latitude: number;
  longitude: number;
  disaster_type: string;
  severity: Severity;
  confidence: number;
  source: string; // "twitter" | "ivr" | "reddit" etc.
  source_count?: number;
  timestamp: string;
  urgency?: string;
  transcription?: string;
  reporter_type?: string;
}

/** Satellite event from GET /api/events */
export interface SatelliteEvent {
  cems_id: string;
  title: string;
  description: string;
  country: string;
  latitude: number;
  longitude: number;
  event_type: string;
  activation_time: string;
  status: string;
}

/** GeoJSON feature from GET /api/events/{id}/geojson */
export interface FloodGeoJsonFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    class: string; // "existing_water" | "new_flood"
    area_km2?: number;
    percent_increase?: number;
    [key: string]: unknown;
  };
}

export interface FloodGeoJsonCollection {
  type: "FeatureCollection";
  features: FloodGeoJsonFeature[];
}

/** Dashboard stats from GET /api/stats */
export interface DashboardStats {
  total_reports: number;
  critical_alerts: number;
  active_satellite_events: number;
  social_media_posts_24h: number;
}

/** Summary from GET /api/summary */
export interface DashboardSummary {
  total_posts: number;
  disaster_posts: number;
  non_disaster_posts: number;
  by_type: Record<string, number>;
}

/** WebSocket post from ws://localhost:8000/ws/feed */
export interface WebSocketPost {
  id: string;
  text: string;
  is_disaster: boolean;
  disaster_type?: string;
  severity?: Severity;
  confidence?: number;
  latitude?: number;
  longitude?: number;
  source?: string;
  timestamp: string;
}

// ─── Feed Post Types (full backend shape) ───

export interface FeedAuthor {
  name: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
  followers: number;
  account_type: string;
}

export interface FeedEngagement {
  likes: number;
  shares: number;
  comments: number;
  views: number;
}

export interface FeedAnalysis {
  is_disaster: boolean;
  disaster_type: string | null;
  confidence: number;
  urgency: string;
  sentiment: string;
  credibility_score: number;
}

export interface FeedPostContent {
  text?: string;
  headline?: string;
  title?: string;
  hashtags: string[];
  media_urls: string[];
}

export interface FeedPostLocation {
  name: string;
  lat: number;
  lng: number;
  state: string | null;
}

export interface FeedPost {
  id: string;
  platform: string;
  content: FeedPostContent;
  author: FeedAuthor;
  engagement: FeedEngagement;
  analysis: FeedAnalysis;
  location: FeedPostLocation | null;
  timestamp: string;
  language: string;
}

export interface TrendingHashtag {
  hashtag: string;
  count: number;
}

// ─── Firebase IVR Report ───

export interface IVRReport {
  id: string;
  summary?: string;
  transcript?: string;
  disaster_type?: string;
  severity?: string;
  status?: string;
  location?: any; // null or { lat, lng, name }
  lat?: string;
  long?: string;
  people_affected?: number | null;
  file_name?: string;
  bucket?: string;
  created_at?: any;
  // legacy / fallback fields
  description?: string;
  trust_score?: number;
  trust_level?: string;
  media_url?: string;
  reporter_type?: string;
  [key: string]: any;
}

// ─── Firebase App Report ───

export interface AppReportMedia {
  exifData?: {
    orientation?: string;
    resolution?: string;
  };
  filename?: string;
  type: "image" | "video";
  uploadedAt?: string;
  url: string;
}

export interface AppReport {
  id: string;
  reportId?: string;
  reportTitle?: string;
  reportType?: string;
  description?: string;
  status?: string;
  priorityLevel?: string;
  trustLevel?: string;
  trustScore?: number;
  requiresManualReview?: boolean;
  mediaCount?: number;
  media?: AppReportMedia[];
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  reportMetadata?: {
    affected_area_size?: string | null;
    authority_contact?: boolean;
    casualty_mentions?: boolean;
    estimated_severity?: string;
    time_indicators?: string[];
  };
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
  submissionTimestamp?: string;
}

// ─── Firebase Alert ───

export interface FirebaseAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  district: string;
  expires_at: string;
  status: string;
  created_at?: any;
}

