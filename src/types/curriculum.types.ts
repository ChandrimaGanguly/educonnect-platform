// Base curriculum entity interfaces

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string | null;
  color: string;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  community_id?: string | null;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

export interface Subject {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string | null;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

export interface Course {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string;
  overview?: string | null;
  thumbnail_url?: string | null;
  banner_url?: string | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimated_hours?: number | null;
  estimated_weeks?: number | null;
  learning_outcomes: string[];
  track_type: 'practical' | 'academic' | 'certification' | 'self_paced';
  is_certification_eligible: boolean;
  requires_approval: boolean;
  enrollment_count: number;
  max_enrollments?: number | null;
  is_enrollable: boolean;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  version: number;
  previous_version_id?: string | null;
  standards_mapping?: Record<string, unknown> | null;
  board_approved: boolean;
  accreditation_body?: string | null;
  accreditation_date?: Date | null;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  published_at?: Date | null;
  created_by: string;
  updated_by?: string | null;
}

export interface Module {
  id: string;
  course_id: string;
  name: string;
  slug: string;
  description: string;
  overview?: string | null;
  estimated_hours?: number | null;
  learning_objectives: string[];
  prerequisite_module_ids: string[];
  has_prerequisites: boolean;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  unlock_type: 'sequential' | 'conditional' | 'always';
  unlock_conditions?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

export interface Lesson {
  id: string;
  module_id: string;
  name: string;
  slug: string;
  description?: string | null;
  content?: string | null;
  lesson_type: 'text' | 'video' | 'audio' | 'interactive' | 'mixed';
  estimated_minutes?: number | null;
  learning_objectives: string[];
  content_format: 'markdown' | 'html' | 'richtext';
  has_video: boolean;
  has_audio: boolean;
  has_interactive: boolean;
  prerequisite_lesson_ids: string[];
  has_prerequisites: boolean;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  has_transcript: boolean;
  has_captions: boolean;
  has_alt_text: boolean;
  transcript?: string | null;
  estimated_bandwidth_kb?: number | null;
  text_only_available: boolean;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

export interface Resource {
  id: string;
  lesson_id?: string | null;
  community_id?: string | null;
  name: string;
  description?: string | null;
  resource_type: 'video' | 'audio' | 'document' | 'image' | 'interactive' | 'link' | 'code' | 'quiz' | 'exercise';
  file_url?: string | null;
  external_url?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  duration_seconds?: number | null;
  alt_text?: string | null;
  caption_url?: string | null;
  transcript_url?: string | null;
  license_type: string;
  attribution?: string | null;
  is_oer: boolean;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  view_count: number;
  download_count: number;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

export interface LearningPath {
  id: string;
  course_id: string;
  name: string;
  description: string;
  path_type: 'default' | 'fast_track' | 'comprehensive' | 'custom';
  estimated_hours?: number | null;
  module_sequence: string[];
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced';
  is_recommended: boolean;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface Standard {
  id: string;
  standard_code: string;
  standard_body: string;
  grade_level?: string | null;
  subject_area?: string | null;
  description: string;
  parent_standard_code?: string | null;
  display_order: number;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

// DTOs for responses with related data
export interface CourseWithDetails extends Course {
  subject?: Subject;
  modules?: Module[];
  learning_paths?: LearningPath[];
  standards?: Standard[];
}

export interface ModuleWithLessons extends Module {
  lessons?: Lesson[];
  is_unlocked?: boolean;
}

export interface LessonWithResources extends Lesson {
  resources?: Resource[];
  is_completed?: boolean;
}

// Query options interfaces
export interface CurriculumQueryOptions {
  limit?: number;
  offset?: number;
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  tags?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DomainQueryOptions extends CurriculumQueryOptions {
  community_id?: string;
}

export interface SubjectQueryOptions extends CurriculumQueryOptions {
  domain_id?: string;
}

export interface CourseQueryOptions extends CurriculumQueryOptions {
  subject_id?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  track_type?: 'practical' | 'academic' | 'certification' | 'self_paced';
  is_enrollable?: boolean;
}

export interface ModuleQueryOptions extends CurriculumQueryOptions {
  course_id?: string;
}

export interface LessonQueryOptions extends CurriculumQueryOptions {
  module_id?: string;
  lesson_type?: 'text' | 'video' | 'audio' | 'interactive' | 'mixed';
}

// Progress tracking interfaces
export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: Date;
  time_spent_seconds?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ModuleProgress {
  module_id: string;
  total_lessons: number;
  completed_lessons: number;
  is_unlocked: boolean;
  progress_percentage: number;
}

export interface CourseProgress {
  course_id: string;
  total_modules: number;
  completed_modules: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  estimated_completion_date?: Date | null;
}

// Prerequisite checking result
export interface PrerequisiteCheck {
  unlocked: boolean;
  missing_prerequisites: string[];
  reason?: string;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
