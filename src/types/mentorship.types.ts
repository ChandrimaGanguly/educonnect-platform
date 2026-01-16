// Mentorship system types

export interface MentorProfile {
  id: string;
  user_id: string;
  mentor_status: 'available' | 'busy' | 'inactive' | 'on_break';
  max_mentees: number;
  current_mentees: number;
  mentoring_since?: Date | null;
  total_mentees_helped: number;
  subjects?: string[] | null;
  bio?: string | null;
  preferred_session_duration?: number | null;
  response_time_hours: number;
  community_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface MentorshipRequest {
  id: string;
  learner_id: string;
  mentor_id: string;
  subject_id?: string | null;
  message?: string | null;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  compatibility_score?: number | null;
  match_factors?: Record<string, unknown> | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'withdrawn';
  response_message?: string | null;
  responded_at?: Date | null;
  expires_at?: Date | null;
  community_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MentorshipRelationship {
  id: string;
  learner_id: string;
  mentor_id: string;
  request_id?: string | null;
  subject_id?: string | null;
  goals?: string | null;
  status: 'active' | 'paused' | 'completed' | 'terminated';
  scheduled_sessions_count: number;
  completed_sessions_count: number;
  last_session_at?: Date | null;
  next_session_at?: Date | null;
  learner_satisfaction_rating?: number | null;
  mentor_satisfaction_rating?: number | null;
  community_id?: string | null;
  started_at: Date;
  ended_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MentorshipFeedback {
  id: string;
  relationship_id: string;
  reviewer_id: string;
  reviewer_role: 'learner' | 'mentor';
  overall_rating: number;
  communication_rating?: number | null;
  expertise_rating?: number | null;
  availability_rating?: number | null;
  feedback_text?: string | null;
  would_recommend?: boolean | null;
  created_at: Date;
  updated_at: Date;
}

// Extended types with joined data

export interface UserBasicInfo {
  full_name: string;
  avatar_url?: string | null;
  trust_score: number;
}

export interface UserSkill {
  skill_name: string;
  proficiency_level: string;
}

export interface UserAvailability {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface MentorProfileWithDetails extends MentorProfile {
  user: UserBasicInfo;
  skills: UserSkill[];
  availability: UserAvailability[];
}

export interface MentorshipRequestWithDetails extends MentorshipRequest {
  learner: UserBasicInfo;
  mentor: UserBasicInfo;
}

export interface MentorshipRelationshipWithDetails extends MentorshipRelationship {
  learner: UserBasicInfo;
  mentor: UserBasicInfo;
}

// Matching types

export interface MatchRecommendation {
  mentor_id: string;
  mentor_profile: MentorProfileWithDetails;
  compatibility_score: number;
  subject_overlap_score: number;
  availability_overlap_score: number;
  match_reasons: string[];
}

export interface MatchScoreBreakdown {
  overall_score: number;
  subject_overlap_score: number;
  availability_overlap_score: number;
  match_reasons: string[];
}

// Input DTOs (Data Transfer Objects)

export interface CreateMentorProfileInput {
  max_mentees?: number;
  subjects?: string[];
  bio?: string;
  preferred_session_duration?: number;
  response_time_hours?: number;
  community_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMentorProfileInput {
  max_mentees?: number;
  subjects?: string[];
  bio?: string;
  preferred_session_duration?: number;
  response_time_hours?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateMentorStatusInput {
  mentor_status: 'available' | 'busy' | 'inactive' | 'on_break';
}

export interface CreateMentorshipRequestInput {
  mentor_id: string;
  subject_id?: string;
  message?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  community_id?: string;
}

export interface RespondToRequestInput {
  status: 'accepted' | 'declined';
  response_message?: string;
}

export interface UpdateRelationshipInput {
  goals?: string;
  next_session_at?: Date;
}

export interface TerminateRelationshipInput {
  reason: string;
}

export interface SubmitFeedbackInput {
  overall_rating: number;
  communication_rating?: number;
  expertise_rating?: number;
  availability_rating?: number;
  feedback_text?: string;
  would_recommend?: boolean;
}

export interface RecordSessionInput {
  scheduled?: boolean;
  session_date?: Date;
}

// Query options

export interface MentorSearchOptions {
  subject_id?: string;
  mentor_status?: 'available' | 'busy' | 'inactive' | 'on_break';
  community_id?: string;
  limit?: number;
  offset?: number;
}

export interface RequestQueryOptions {
  status?: MentorshipRequest['status'];
  limit?: number;
  offset?: number;
}

export interface RelationshipQueryOptions {
  status?: MentorshipRelationship['status'];
  as_role?: 'learner' | 'mentor';
  limit?: number;
  offset?: number;
}

export interface MatchRequestOptions {
  subject_id?: string;
  community_id?: string;
  limit?: number;
}

// Paginated response

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Capacity check

export interface CapacityCheck {
  can_accept_mentees: boolean;
  current_mentees: number;
  max_mentees: number;
  available_slots: number;
}
