import { Knex } from 'knex';
import bcrypt from 'bcrypt';

/**
 * Seed: Sample Users (H4)
 *
 * Creates demo user accounts for MVP demonstration:
 * - Platform Admin
 * - Community Admins
 * - Mentors (with varying expertise)
 * - Learners (with varying experience levels)
 *
 * All demo passwords are: Demo123!@# (hashed with bcrypt)
 */
export async function seed(knex: Knex): Promise<void> {
  // Hash password once for all demo accounts
  const demoPasswordHash = await bcrypt.hash('Demo123!@#', 10);

  // Clear existing demo users (keep in order to respect foreign keys)
  // Note: This doesn't delete the seed users if they have dependencies
  // In production, you'd want more sophisticated cleanup

  // ========== Platform Admin ==========
  const [platformAdmin] = await knex('users')
    .insert({
      email: 'admin@educonnect.demo',
      username: 'admin',
      password_hash: demoPasswordHash,
      full_name: 'Platform Administrator',
      bio: 'EduConnect platform administrator responsible for system oversight and community support.',
      status: 'active',
      email_verified: true,
      trust_score: 100,
      timezone: 'UTC',
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('email')
    .merge()
    .returning('*');

  // ========== Community Admins ==========
  const [mathAdmin] = await knex('users')
    .insert({
      email: 'math.admin@educonnect.demo',
      username: 'math_admin',
      password_hash: demoPasswordHash,
      full_name: 'Sarah Mathematics',
      bio: 'Mathematics educator with 10+ years experience. Passionate about making math accessible to all learners.',
      status: 'active',
      email_verified: true,
      trust_score: 95,
      timezone: 'America/New_York',
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('email')
    .merge()
    .returning('*');

  const [scienceAdmin] = await knex('users')
    .insert({
      email: 'science.admin@educonnect.demo',
      username: 'science_admin',
      password_hash: demoPasswordHash,
      full_name: 'Dr. James Newton',
      bio: 'Physics and chemistry teacher. Loves hands-on experiments and making science fun!',
      status: 'active',
      email_verified: true,
      trust_score: 92,
      timezone: 'Europe/London',
      locale: 'en',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('email')
    .merge()
    .returning('*');

  // ========== Mentors ==========
  const mentors = await knex('users')
    .insert([
      {
        email: 'mentor.alice@educonnect.demo',
        username: 'mentor_alice',
        password_hash: demoPasswordHash,
        full_name: 'Alice Chen',
        bio: 'Computer science student mentoring in programming and web development. Let\'s code together!',
        status: 'active',
        email_verified: true,
        trust_score: 88,
        timezone: 'Asia/Singapore',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'mentor.bob@educonnect.demo',
        username: 'mentor_bob',
        password_hash: demoPasswordHash,
        full_name: 'Bob Williams',
        bio: 'Algebra and calculus mentor. Breaking down complex concepts into simple steps.',
        status: 'active',
        email_verified: true,
        trust_score: 85,
        timezone: 'America/Chicago',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'mentor.carlos@educonnect.demo',
        username: 'mentor_carlos',
        password_hash: demoPasswordHash,
        full_name: 'Carlos Rodriguez',
        bio: 'Bilingual mentor (English/Spanish) specializing in physics and mathematics.',
        status: 'active',
        email_verified: true,
        trust_score: 90,
        timezone: 'America/Mexico_City',
        locale: 'es',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'mentor.diana@educonnect.demo',
        username: 'mentor_diana',
        password_hash: demoPasswordHash,
        full_name: 'Diana Patel',
        bio: 'Biology and chemistry mentor with focus on hands-on learning. Science is everywhere!',
        status: 'active',
        email_verified: true,
        trust_score: 87,
        timezone: 'Asia/Kolkata',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
    ])
    .onConflict('email')
    .merge()
    .returning('*');

  // ========== Learners ==========
  const learners = await knex('users')
    .insert([
      {
        email: 'learner.emma@educonnect.demo',
        username: 'learner_emma',
        password_hash: demoPasswordHash,
        full_name: 'Emma Johnson',
        bio: 'High school student excited to learn coding and build my first website!',
        status: 'active',
        email_verified: true,
        trust_score: 75,
        timezone: 'America/Los_Angeles',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'learner.frank@educonnect.demo',
        username: 'learner_frank',
        password_hash: demoPasswordHash,
        full_name: 'Frank Okafor',
        bio: 'Aspiring engineer from Nigeria. Learning mathematics and physics to pursue my dreams.',
        status: 'active',
        email_verified: true,
        trust_score: 72,
        timezone: 'Africa/Lagos',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'learner.grace@educonnect.demo',
        username: 'learner_grace',
        password_hash: demoPasswordHash,
        full_name: 'Grace Kim',
        bio: 'College prep student working on algebra and chemistry. Goal: medical school!',
        status: 'active',
        email_verified: true,
        trust_score: 78,
        timezone: 'America/New_York',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'learner.hassan@educonnect.demo',
        username: 'learner_hassan',
        password_hash: demoPasswordHash,
        full_name: 'Hassan Al-Rashid',
        bio: 'Self-taught programmer from Jordan. Love building apps and solving problems with code.',
        status: 'active',
        email_verified: true,
        trust_score: 80,
        timezone: 'Asia/Amman',
        locale: 'ar',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'learner.isabel@educonnect.demo',
        username: 'learner_isabel',
        password_hash: demoPasswordHash,
        full_name: 'Isabel Silva',
        bio: 'Brazilian student learning English and computer science. Technology will change the world!',
        status: 'active',
        email_verified: true,
        trust_score: 76,
        timezone: 'America/Sao_Paulo',
        locale: 'pt',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        email: 'learner.jack@educonnect.demo',
        username: 'learner_jack',
        password_hash: demoPasswordHash,
        full_name: 'Jack Thompson',
        bio: 'Adult learner getting back into education. Never too late to learn!',
        status: 'active',
        email_verified: true,
        trust_score: 70,
        timezone: 'Australia/Sydney',
        locale: 'en',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
    ])
    .onConflict('email')
    .merge()
    .returning('*');

  // ========== Assign Platform Roles ==========
  const userRole = await knex('roles').where({ slug: 'user', scope: 'platform' }).first();
  const adminRole = await knex('roles').where({ slug: 'platform_admin', scope: 'platform' }).first();

  if (userRole && adminRole) {
    // Assign user role to all users
    const allUsers = [platformAdmin, mathAdmin, scienceAdmin, ...mentors, ...learners];
    await knex('user_roles')
      .insert(
        allUsers.map(user => ({
          user_id: user.id,
          role_id: userRole.id,
        }))
      )
      .onConflict(['user_id', 'role_id'])
      .ignore();

    // Assign platform_admin role to admin
    await knex('user_roles')
      .insert({
        user_id: platformAdmin.id,
        role_id: adminRole.id,
      })
      .onConflict(['user_id', 'role_id'])
      .ignore();
  }

  console.log('✓ Seeded sample users:');
  console.log(`  - 1 Platform Admin: ${platformAdmin.email}`);
  console.log(`  - 2 Community Admins: ${mathAdmin.email}, ${scienceAdmin.email}`);
  console.log(`  - ${mentors.length} Mentors`);
  console.log(`  - ${learners.length} Learners`);
  console.log('  - All demo accounts password: Demo123!@#');
}
