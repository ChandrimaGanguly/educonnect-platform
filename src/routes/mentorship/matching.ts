import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MentorProfileService } from '../../services/mentorship/mentor-profile.service';
import { UserProfileService } from '../../services/user-profile.service';
import { authenticate } from '../../middleware/auth';
import { matchRequestSchema } from '../../utils/validation';
import { env } from '../../config';

const mentorProfileService = new MentorProfileService();
const userProfileService = new UserProfileService();

/**
 * Validate matching service URL to prevent SSRF attacks
 * SECURITY: Only allow connections to whitelisted hosts and ports
 */
function validateMatchingServiceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Whitelist allowed hosts (adjust based on deployment)
    const allowedHosts = [
      'matching-service',
      'localhost',
      '127.0.0.1',
      'matching', // Docker service name
    ];

    // Whitelist allowed ports
    const allowedPorts = ['8001', '80', '443'];

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Check hostname whitelist
    if (!allowedHosts.includes(parsed.hostname)) {
      return false;
    }

    // Check port whitelist (if port is specified)
    if (parsed.port && !allowedPorts.includes(parsed.port)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate matching service response structure
 */
function isValidScoreResponse(data: any): boolean {
  return (
    typeof data === 'object' &&
    typeof data.overall_score === 'number' &&
    typeof data.subject_overlap_score === 'number' &&
    typeof data.availability_overlap_score === 'number' &&
    Array.isArray(data.match_reasons)
  );
}

export async function matchingRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /api/v1/mentorship/match
   * Find compatible mentors for the authenticated user
   * Calls Python matching service to calculate compatibility scores
   */
  server.post('/match', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.user!;
      const { subject_id, community_id, limit = 10 } = matchRequestSchema.parse(request.body);

      // 1. Get learner's profile data
      const learnerSkills = await userProfileService.getUserSkills(userId);
      const learnerInterests = await userProfileService.getUserInterests(userId);
      const learnerAvailability = await userProfileService.getUserAvailability(userId);

      const learnerProfile = {
        user_id: userId,
        skills: learnerSkills.map(s => s.skill_name),
        learning_goals: learnerInterests
          .filter(i => i.interest_type === 'learning' || i.interest_type === 'both')
          .map(i => i.interest_name),
        availability: learnerAvailability.map(a => ({
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        })),
      };

      // 2. Get available mentors (filtered by subject and community if provided)
      const mentorsResult = await mentorProfileService.searchMentors({
        subject_id,
        mentor_status: 'available',
        community_id,
        limit: 50, // Get more than requested to allow for scoring and ranking
        offset: 0,
      });

      // 3. For each mentor, call Python matching service to calculate score
      const matchedMentors = [];

      for (const mentor of mentorsResult.data) {
        try {
          // Prepare mentor profile for matching
          const mentorProfile = {
            user_id: mentor.user_id,
            subjects: mentor.subjects || [],
            skills: mentor.skills.map(s => s.skill_name),
            availability: mentor.availability.map(a => ({
              day_of_week: a.day_of_week,
              start_time: a.start_time,
              end_time: a.end_time,
            })),
          };

          // Call Python matching service with security controls
          const matchingServiceUrl = env.MATCHING_SERVICE_URL;

          // SECURITY: Validate service URL to prevent SSRF
          if (!validateMatchingServiceUrl(matchingServiceUrl)) {
            server.log.error('Invalid matching service URL configuration');
            continue; // Skip this mentor and continue with others
          }

          // Create abort controller for timeout
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          try {
            const response = await fetch(`${matchingServiceUrl}/match/score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                learner_profile: learnerProfile,
                mentor_profile: mentorProfile,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.ok) {
              const scoreData = await response.json();

              // SECURITY: Validate response structure
              if (!isValidScoreResponse(scoreData)) {
                server.log.warn('Invalid response structure from matching service');
                continue;
              }

              matchedMentors.push({
                mentor_id: mentor.user_id,
                mentor_profile: mentor,
                compatibility_score: scoreData.overall_score,
                subject_overlap_score: scoreData.subject_overlap_score,
                availability_overlap_score: scoreData.availability_overlap_score,
                match_reasons: scoreData.match_reasons || [],
              });
            } else {
              // If matching service fails, skip this mentor
              server.log.warn({
                event: 'matching_service_error',
                mentor_id: mentor.user_id.substring(0, 8) + '...', // Redact full ID
                status: response.status,
              }, 'Matching service request failed');
            }
          } catch (fetchError: any) {
            clearTimeout(timeout);

            if (fetchError.name === 'AbortError') {
              server.log.warn({
                event: 'matching_service_timeout',
                mentor_id: mentor.user_id.substring(0, 8) + '...',
              }, 'Matching service request timed out');
            } else {
              server.log.error({
                event: 'matching_service_error',
                mentor_id: mentor.user_id.substring(0, 8) + '...',
                error_type: fetchError.name,
              }, 'Error calling matching service');
            }
            // Continue with other mentors
          }
        } catch (error: any) {
          // Log error but continue with other mentors
          server.log.error({
            event: 'mentor_scoring_error',
            mentor_id: mentor.user_id.substring(0, 8) + '...',
          }, 'Error in mentor scoring loop');
        }
      }

      // 4. Sort by compatibility score (descending) and return top N
      matchedMentors.sort((a, b) => b.compatibility_score - a.compatibility_score);
      const topMatches = matchedMentors.slice(0, limit);

      return {
        learner_id: userId,
        matches: topMatches,
        total: topMatches.length,
      };
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      // Check if matching service is unavailable
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        const { userId } = request.user!;
        server.log.error('Matching service unavailable');

        // Fallback: return mentors without scoring
        const mentorsResult = await mentorProfileService.searchMentors({
          subject_id: (request.body as any).subject_id,
          mentor_status: 'available',
          community_id: (request.body as any).community_id,
          limit: (request.body as any).limit || 10,
          offset: 0,
        });

        return {
          learner_id: userId,
          matches: mentorsResult.data.map(mentor => ({
            mentor_id: mentor.user_id,
            mentor_profile: mentor,
            compatibility_score: 0,
            subject_overlap_score: 0,
            availability_overlap_score: 0,
            match_reasons: ['Matching service unavailable - showing all available mentors'],
          })),
          total: mentorsResult.data.length,
          warning: 'Matching service unavailable - results not scored',
        };
      }

      throw error;
    }
  });

  /**
   * GET /api/v1/mentorship/mentors/:id/average-feedback
   * Get average feedback ratings for a mentor (public endpoint)
   */
  server.get('/mentors/:id/average-feedback', {}, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    // Import FeedbackService dynamically to avoid circular dependency
    const { MentorshipFeedbackService } = await import('../../services/mentorship/mentorship-feedback.service');
    const feedbackService = new MentorshipFeedbackService();

    const averageFeedback = await feedbackService.getAverageFeedbackForMentor(id);

    return { average_feedback: averageFeedback };
  });
}
