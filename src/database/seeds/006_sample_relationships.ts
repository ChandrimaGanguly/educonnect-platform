import { Knex } from 'knex';

/**
 * Seed: Sample Mentor-Learner Relationships (H5)
 *
 * Creates demo mentorship data for MVP demonstration:
 * - Mentor profiles with specializations
 * - Mentorship requests (pending and accepted)
 * - Active mentorship relationships
 * - Sample mentorship sessions and feedback
 */
export async function seed(knex: Knex): Promise<void> {
  // Get communities
  const mathCommunity = await knex('communities').where({ slug: 'mathematics-learning' }).first();
  const scienceCommunity = await knex('communities').where({ slug: 'science-tech-hub' }).first();
  const programmingCommunity = await knex('communities').where({ slug: 'programming-webdev' }).first();

  if (!mathCommunity || !scienceCommunity || !programmingCommunity) {
    console.log('⚠ Communities not found - run previous seeds first');
    return;
  }

  // Get users
  const mentorAlice = await knex('users').where({ email: 'mentor.alice@educonnect.demo' }).first();
  const mentorBob = await knex('users').where({ email: 'mentor.bob@educonnect.demo' }).first();
  const mentorCarlos = await knex('users').where({ email: 'mentor.carlos@educonnect.demo' }).first();
  const mentorDiana = await knex('users').where({ email: 'mentor.diana@educonnect.demo' }).first();

  const learnerEmma = await knex('users').where({ email: 'learner.emma@educonnect.demo' }).first();
  const learnerFrank = await knex('users').where({ email: 'learner.frank@educonnect.demo' }).first();
  const learnerGrace = await knex('users').where({ email: 'learner.grace@educonnect.demo' }).first();
  const learnerHassan = await knex('users').where({ email: 'learner.hassan@educonnect.demo' }).first();
  const learnerIsabel = await knex('users').where({ email: 'learner.isabel@educonnect.demo' }).first();
  const learnerJack = await knex('users').where({ email: 'learner.jack@educonnect.demo' }).first();

  if (!mentorAlice || !mentorBob || !learnerEmma || !learnerFrank) {
    console.log('⚠ Users not found - run 002_sample_users seed first');
    return;
  }

  // ==========================================================================
  // MENTOR PROFILES
  // ==========================================================================

  // Mentor Alice - Programming
  const [aliceProfile] = await knex('mentor_profiles')
    .insert({
      user_id: mentorAlice.id,
      community_id: programmingCommunity.id,
      bio: 'Computer science student with 3 years of coding experience. I love teaching beginners how to build their first websites and apps. Patient, friendly, and always available to answer questions!',
      specializations: ['Web Development', 'JavaScript', 'HTML/CSS', 'Python', 'Git'],
      subjects_offered: ['Introduction to Programming', 'Web Development Basics', 'JavaScript Fundamentals'],
      languages_spoken: ['en', 'zh'],
      max_mentees: 5,
      current_mentee_count: 2,
      availability_hours_per_week: 10,
      preferred_mentee_level: 'beginner',
      mentoring_style: 'I believe in hands-on learning! We\'ll build real projects together and learn by doing. I encourage questions and create a supportive, judgment-free space.',
      status: 'active',
      profile_visibility: 'public',
      availability: {
        monday: ['18:00-20:00'],
        wednesday: ['18:00-20:00'],
        saturday: ['10:00-14:00'],
      },
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['user_id', 'community_id'])
    .merge()
    .returning('*');

  // Mentor Bob - Mathematics
  const [bobProfile] = await knex('mentor_profiles')
    .insert({
      user_id: mentorBob.id,
      community_id: mathCommunity.id,
      bio: 'Mathematics tutor specializing in algebra and calculus. Former struggling math student who learned effective study strategies. I understand the challenges and can help you overcome them!',
      specializations: ['Algebra', 'Pre-Calculus', 'Calculus', 'Problem Solving'],
      subjects_offered: ['Algebra I & II', 'Pre-Calculus', 'Calculus', 'SAT Math Prep'],
      languages_spoken: ['en'],
      max_mentees: 6,
      current_mentee_count: 3,
      availability_hours_per_week: 12,
      preferred_mentee_level: 'intermediate',
      mentoring_style: 'I focus on understanding WHY, not just memorizing formulas. We\'ll work through problems step-by-step, and I\'ll show you the patterns and strategies that make math easier.',
      status: 'active',
      profile_visibility: 'public',
      availability: {
        tuesday: ['17:00-20:00'],
        thursday: ['17:00-20:00'],
        sunday: ['14:00-17:00'],
      },
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['user_id', 'community_id'])
    .merge()
    .returning('*');

  // Mentor Carlos - Math & Physics (Bilingual)
  const [carlosProfile] = await knex('mentor_profiles')
    .insert({
      user_id: mentorCarlos.id,
      community_id: mathCommunity.id,
      bio: 'Bilingual mentor (English/Spanish) passionate about STEM education. Engineering student who loves explaining complex concepts in simple terms. Available for mentoring in both languages!',
      specializations: ['Algebra', 'Geometry', 'Physics', 'Engineering'],
      subjects_offered: ['Mathematics', 'Physics', 'Engineering Fundamentals'],
      languages_spoken: ['en', 'es'],
      max_mentees: 4,
      current_mentee_count: 2,
      availability_hours_per_week: 8,
      preferred_mentee_level: 'beginner',
      mentoring_style: 'I use real-world examples and visual explanations. Whether we\'re working in English or Spanish, I make sure you truly understand before moving forward.',
      status: 'active',
      profile_visibility: 'public',
      availability: {
        monday: ['19:00-21:00'],
        friday: ['17:00-19:00'],
        saturday: ['15:00-18:00'],
      },
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['user_id', 'community_id'])
    .merge()
    .returning('*');

  // Mentor Diana - Science
  const [dianaProfile] = await knex('mentor_profiles')
    .insert({
      user_id: mentorDiana.id,
      community_id: scienceCommunity.id,
      bio: 'Biology and chemistry enthusiast! Medical student with a passion for teaching. I make science come alive with real-world connections and memorable explanations.',
      specializations: ['Biology', 'Chemistry', 'Biochemistry', 'Lab Techniques'],
      subjects_offered: ['General Biology', 'Chemistry', 'Human Anatomy', 'Lab Safety'],
      languages_spoken: ['en', 'hi'],
      max_mentees: 5,
      current_mentee_count: 1,
      availability_hours_per_week: 10,
      preferred_mentee_level: 'beginner',
      mentoring_style: 'Science is fascinating when you see how it connects to everyday life! I use stories, analogies, and visual aids to make concepts stick. Let\'s explore together!',
      status: 'active',
      profile_visibility: 'public',
      availability: {
        wednesday: ['18:00-20:00'],
        friday: ['18:00-20:00'],
        sunday: ['10:00-13:00'],
      },
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['user_id', 'community_id'])
    .merge()
    .returning('*');

  // ==========================================================================
  // MENTORSHIP REQUESTS
  // ==========================================================================

  // Request 1: Emma → Alice (Accepted - now active relationship)
  const [request1] = await knex('mentorship_requests')
    .insert({
      learner_id: learnerEmma.id,
      mentor_id: mentorAlice.id,
      community_id: programmingCommunity.id,
      subject_area: 'Web Development',
      message: 'Hi Alice! I\'m excited to learn web development and build my first website. I love your hands-on approach and would be honored to learn from you!',
      learning_goals: 'I want to build a personal portfolio website and learn JavaScript basics so I can create interactive web pages.',
      preferred_schedule: 'I\'m available on weekday evenings and Saturday mornings. Happy to work around your schedule!',
      status: 'accepted',
      responded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })
    .onConflict(['learner_id', 'mentor_id', 'community_id'])
    .ignore()
    .returning('*');

  // Request 2: Hassan → Alice (Accepted - active relationship)
  const [request2] = await knex('mentorship_requests')
    .insert({
      learner_id: learnerHassan.id,
      mentor_id: mentorAlice.id,
      community_id: programmingCommunity.id,
      subject_area: 'Python Programming',
      message: 'Hello! I\'m self-taught but want to improve my coding fundamentals. Would love your guidance on best practices and project ideas.',
      learning_goals: 'Strengthen my Python skills and learn how to build more complex applications.',
      preferred_schedule: 'Flexible schedule, can adjust to your availability.',
      status: 'accepted',
      responded_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    })
    .onConflict(['learner_id', 'mentor_id', 'community_id'])
    .ignore()
    .returning('*');

  // Request 3: Frank → Bob (Accepted - active relationship)
  const [request3] = await knex('mentorship_requests')
    .insert({
      learner_id: learnerFrank.id,
      mentor_id: mentorBob.id,
      community_id: mathCommunity.id,
      subject_area: 'Algebra',
      message: 'I struggle with algebra but I\'m determined to improve. Your teaching style sounds perfect for me. Can you help?',
      learning_goals: 'Master algebra fundamentals to prepare for engineering studies.',
      preferred_schedule: 'Available Tuesday and Thursday evenings, and Sunday afternoons.',
      status: 'accepted',
      responded_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    })
    .onConflict(['learner_id', 'mentor_id', 'community_id'])
    .ignore()
    .returning('*');

  // Request 4: Grace → Bob (Pending)
  await knex('mentorship_requests')
    .insert({
      learner_id: learnerGrace.id,
      mentor_id: mentorBob.id,
      community_id: mathCommunity.id,
      subject_area: 'Pre-Calculus',
      message: 'I need help preparing for AP Calculus. Your algebra expertise would be perfect for filling in my knowledge gaps.',
      learning_goals: 'Strengthen pre-calculus skills to excel in AP Calculus next semester.',
      preferred_schedule: 'After school on weekdays, flexible on weekends.',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    .onConflict(['learner_id', 'mentor_id', 'community_id'])
    .ignore();

  // Request 5: Isabel → Carlos (Accepted)
  const [request5] = await knex('mentorship_requests')
    .insert({
      learner_id: learnerIsabel.id,
      mentor_id: mentorCarlos.id,
      community_id: mathCommunity.id,
      subject_area: 'Mathematics (Spanish)',
      message: '¡Hola! Prefiero aprender en español. ¿Puedes ayudarme con álgebra?',
      learning_goals: 'Improve algebra skills for university entrance exams.',
      preferred_schedule: 'Flexible, preferably Spanish-language sessions.',
      status: 'accepted',
      responded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    })
    .onConflict(['learner_id', 'mentor_id', 'community_id'])
    .ignore()
    .returning('*');

  // ==========================================================================
  // ACTIVE MENTORSHIP RELATIONSHIPS
  // ==========================================================================

  if (request1) {
    const [relationship1] = await knex('mentorship_relationships')
      .insert({
        mentor_id: mentorAlice.id,
        learner_id: learnerEmma.id,
        community_id: programmingCommunity.id,
        request_id: request1.id,
        status: 'active',
        goals: 'Build portfolio website and learn JavaScript fundamentals',
        started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updated_at: knex.fn.now(),
      })
      .onConflict(['mentor_id', 'learner_id', 'community_id'])
      .ignore()
      .returning('*');

    // Add mentorship session for relationship 1
    if (relationship1) {
      await knex('mentorship_sessions')
        .insert({
          relationship_id: relationship1.id,
          session_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          duration_minutes: 60,
          topics_covered: ['HTML basics review', 'Started building portfolio structure', 'Discussed CSS styling plan'],
          notes: 'Emma is making great progress! She understands HTML structure well. Next session we\'ll add styling with CSS.',
          session_type: 'video_call',
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        })
        .onConflict().ignore();
    }
  }

  if (request2) {
    await knex('mentorship_relationships')
      .insert({
        mentor_id: mentorAlice.id,
        learner_id: learnerHassan.id,
        community_id: programmingCommunity.id,
        request_id: request2.id,
        status: 'active',
        goals: 'Improve Python fundamentals and build projects',
        started_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        updated_at: knex.fn.now(),
      })
      .onConflict(['mentor_id', 'learner_id', 'community_id'])
      .ignore();
  }

  if (request3) {
    const [relationship3] = await knex('mentorship_relationships')
      .insert({
        mentor_id: mentorBob.id,
        learner_id: learnerFrank.id,
        community_id: mathCommunity.id,
        request_id: request3.id,
        status: 'active',
        goals: 'Master algebra for engineering preparation',
        started_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updated_at: knex.fn.now(),
      })
      .onConflict(['mentor_id', 'learner_id', 'community_id'])
      .ignore()
      .returning('*');

    // Add mentorship session and feedback for relationship 3
    if (relationship3) {
      const [session3] = await knex('mentorship_sessions')
        .insert({
          relationship_id: relationship3.id,
          session_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          duration_minutes: 90,
          topics_covered: ['Linear equations', 'Word problems strategy', 'Practice problems'],
          notes: 'Frank is showing improvement! He now understands the concept of balancing equations. Homework: 10 practice problems.',
          session_type: 'video_call',
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        })
        .onConflict().ignore()
        .returning('*');

      // Add feedback from learner
      if (session3) {
        await knex('mentorship_feedback')
          .insert({
            relationship_id: relationship3.id,
            feedback_from: 'learner',
            rating: 5,
            comment: 'Bob is an amazing mentor! He breaks down complex problems into simple steps and is very patient. I finally understand equations!',
            created_at: knex.fn.now(),
          })
          .onConflict().ignore();
      }
    }
  }

  if (request5) {
    await knex('mentorship_relationships')
      .insert({
        mentor_id: mentorCarlos.id,
        learner_id: learnerIsabel.id,
        community_id: mathCommunity.id,
        request_id: request5.id,
        status: 'active',
        goals: 'Algebra preparation for university entrance exams',
        started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updated_at: knex.fn.now(),
      })
      .onConflict(['mentor_id', 'learner_id', 'community_id'])
      .ignore();
  }

  console.log('✓ Seeded sample mentorship data:');
  console.log('  - 4 Mentor profiles (Alice, Bob, Carlos, Diana)');
  console.log('  - 5 Mentorship requests (4 accepted, 1 pending)');
  console.log('  - 4 Active mentorship relationships');
  console.log('  - 2 Mentorship sessions with notes');
  console.log('  - 1 Learner feedback (5-star rating)');
}
