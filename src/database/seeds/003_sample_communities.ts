import { Knex } from 'knex';

/**
 * Seed: Sample Communities (H1)
 *
 * Creates demo communities for MVP demonstration:
 * - Mathematics Learning Community (public)
 * - Science & Technology Hub (public)
 * - Programming & Web Development (public)
 * - Global Learners Network (invite_only)
 *
 * Assigns community admins, moderators, and members
 */
export async function seed(knex: Knex): Promise<void> {
  // Get users
  const mathAdmin = await knex('users').where({ email: 'math.admin@educonnect.demo' }).first();
  const scienceAdmin = await knex('users').where({ email: 'science.admin@educonnect.demo' }).first();
  const mentorAlice = await knex('users').where({ email: 'mentor.alice@educonnect.demo' }).first();
  const mentorBob = await knex('users').where({ email: 'mentor.bob@educonnect.demo' }).first();
  const mentorCarlos = await knex('users').where({ email: 'mentor.carlos@educonnect.demo' }).first();
  const mentorDiana = await knex('users').where({ email: 'mentor.diana@educonnect.demo' }).first();

  const learners = await knex('users').whereIn('email', [
    'learner.emma@educonnect.demo',
    'learner.frank@educonnect.demo',
    'learner.grace@educonnect.demo',
    'learner.hassan@educonnect.demo',
    'learner.isabel@educonnect.demo',
    'learner.jack@educonnect.demo',
  ]);

  if (!mathAdmin || !scienceAdmin || !mentorAlice) {
    console.log('⚠ Users not found - run 002_sample_users seed first');
    return;
  }

  // Get community roles
  const ownerRole = await knex('roles').where({ slug: 'owner', scope: 'community' }).first();
  const adminRole = await knex('roles').where({ slug: 'admin', scope: 'community' }).first();
  const mentorRole = await knex('roles').where({ slug: 'mentor', scope: 'community' }).first();
  const memberRole = await knex('roles').where({ slug: 'member', scope: 'community' }).first();

  if (!ownerRole || !adminRole || !mentorRole || !memberRole) {
    console.log('⚠ Community roles not found - run 001_default_roles_permissions seed first');
    return;
  }

  // ========== Mathematics Learning Community ==========
  const [mathCommunity] = await knex('communities')
    .insert({
      name: 'Mathematics Learning Community',
      slug: 'mathematics-learning',
      description: 'A supportive community for learners at all levels of mathematics, from basic arithmetic to advanced calculus. Get help with homework, explore mathematical concepts, and connect with mentors.',
      type: 'public',
      status: 'active',
      primary_language: 'en',
      region: 'global',
      welcome_message: 'Welcome to the Mathematics Learning Community! 🧮\n\nWhether you\'re struggling with fractions or mastering differential equations, you\'ve found the right place. Our community believes that everyone can learn math with the right support.\n\n**What we offer:**\n- Patient mentors who explain concepts clearly\n- Structured courses from beginner to advanced\n- Practice problems and interactive checkpoints\n- Study groups and peer support\n\n**Community Guidelines:**\n- Be respectful and supportive\n- Show your work when asking for help\n- Celebrate progress, not just perfection\n- Help others when you can\n\nLet\'s learn together!',
      settings: {
        allow_member_invites: true,
        require_approval: false,
        is_discoverable: true,
        content_moderation: 'community',
      },
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ========== Science & Technology Hub ==========
  const [scienceCommunity] = await knex('communities')
    .insert({
      name: 'Science & Technology Hub',
      slug: 'science-tech-hub',
      description: 'Explore the wonders of science! Physics, chemistry, biology, and earth sciences. Hands-on experiments, real-world applications, and curious minds welcome.',
      type: 'public',
      status: 'active',
      primary_language: 'en',
      region: 'global',
      welcome_message: 'Welcome to the Science & Technology Hub! 🔬🧪\n\nScience is all around us - let\'s explore it together! From the smallest atoms to the vast universe, from chemical reactions to biological systems.\n\n**What makes us special:**\n- Focus on hands-on, practical learning\n- Real-world applications of scientific concepts\n- Lab safety and experimental design\n- Current events in science and technology\n\n**Join us if you:**\n- Love asking "why?" and "how?"\n- Want to understand the world scientifically\n- Enjoy experiments and discovery\n- Dream of a STEM career\n\nScience is for everyone - let\'s discover together!',
      settings: {
        allow_member_invites: true,
        require_approval: false,
        is_discoverable: true,
        content_moderation: 'community',
      },
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ========== Programming & Web Development ==========
  const [programmingCommunity] = await knex('communities')
    .insert({
      name: 'Programming & Web Development',
      slug: 'programming-webdev',
      description: 'Learn to code! HTML, CSS, JavaScript, Python, and more. Build websites, create apps, and develop your programming skills with supportive mentors and hands-on projects.',
      type: 'public',
      status: 'active',
      primary_language: 'en',
      region: 'global',
      welcome_message: 'Welcome to Programming & Web Development! 💻\n\nEveryone can learn to code - and we\'re here to help! Whether you\'re building your first website or working on complex applications, our community supports learners at every stage.\n\n**Learning Paths:**\n- Web Development (HTML, CSS, JavaScript)\n- Python Programming\n- Data Structures & Algorithms\n- Project-Based Learning\n\n**Community Resources:**\n- Code reviews from experienced developers\n- Pair programming sessions\n- Project showcases\n- Career guidance for tech roles\n\n**Getting Started:**\n1. Introduce yourself in the welcome thread\n2. Browse our beginner courses\n3. Join a study group or find a mentor\n4. Start building!\n\nHappy coding! 🚀',
      settings: {
        allow_member_invites: true,
        require_approval: false,
        is_discoverable: true,
        content_moderation: 'community',
      },
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ========== Global Learners Network (Invite-Only) ==========
  const [globalCommunity] = await knex('communities')
    .insert({
      name: 'Global Learners Network',
      slug: 'global-learners',
      description: 'An invite-only community for dedicated learners around the world. Multilingual support, cross-cultural exchange, and advanced learning opportunities.',
      type: 'invite_only',
      status: 'active',
      primary_language: 'en',
      region: 'global',
      welcome_message: 'Welcome to the Global Learners Network! 🌍\n\nYou\'ve been invited to join an exclusive community of passionate learners from around the world.\n\n**What makes us unique:**\n- Multilingual support (EN, ES, PT, AR, and more)\n- Cultural exchange and global perspectives\n- Advanced topics and specialized mentors\n- Small group sizes for personalized attention\n\n**Membership Benefits:**\n- Priority access to expert mentors\n- Exclusive workshops and events\n- Cross-community collaboration\n- Leadership development opportunities\n\nWe\'re excited to learn with you!',
      settings: {
        allow_member_invites: false,
        require_approval: true,
        is_discoverable: false,
        content_moderation: 'community',
      },
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ========== Assign Community Memberships ==========

  // Math Community
  await knex('community_members').insert([
    // Owner
    { community_id: mathCommunity.id, user_id: mathAdmin.id, status: 'active', joined_at: knex.fn.now() },
    // Mentors
    { community_id: mathCommunity.id, user_id: mentorBob.id, status: 'active', joined_at: knex.fn.now() },
    { community_id: mathCommunity.id, user_id: mentorCarlos.id, status: 'active', joined_at: knex.fn.now() },
    // Learners
    ...learners.slice(0, 4).map(learner => ({
      community_id: mathCommunity.id,
      user_id: learner.id,
      status: 'active',
      joined_at: knex.fn.now(),
    })),
  ]).onConflict(['community_id', 'user_id']).ignore();

  // Science Community
  await knex('community_members').insert([
    // Owner
    { community_id: scienceCommunity.id, user_id: scienceAdmin.id, status: 'active', joined_at: knex.fn.now() },
    // Mentors
    { community_id: scienceCommunity.id, user_id: mentorDiana.id, status: 'active', joined_at: knex.fn.now() },
    { community_id: scienceCommunity.id, user_id: mentorCarlos.id, status: 'active', joined_at: knex.fn.now() },
    // Learners
    ...learners.slice(1, 5).map(learner => ({
      community_id: scienceCommunity.id,
      user_id: learner.id,
      status: 'active',
      joined_at: knex.fn.now(),
    })),
  ]).onConflict(['community_id', 'user_id']).ignore();

  // Programming Community
  await knex('community_members').insert([
    // Owner
    { community_id: programmingCommunity.id, user_id: mentorAlice.id, status: 'active', joined_at: knex.fn.now() },
    // Admin
    { community_id: programmingCommunity.id, user_id: mathAdmin.id, status: 'active', joined_at: knex.fn.now() },
    // Learners
    ...learners.slice(0, 5).map(learner => ({
      community_id: programmingCommunity.id,
      user_id: learner.id,
      status: 'active',
      joined_at: knex.fn.now(),
    })),
  ]).onConflict(['community_id', 'user_id']).ignore();

  // Global Learners (Invite-only - fewer members)
  await knex('community_members').insert([
    // Owner
    { community_id: globalCommunity.id, user_id: mathAdmin.id, status: 'active', joined_at: knex.fn.now() },
    // Admin
    { community_id: globalCommunity.id, user_id: scienceAdmin.id, status: 'active', joined_at: knex.fn.now() },
    // Select mentors
    { community_id: globalCommunity.id, user_id: mentorCarlos.id, status: 'active', joined_at: knex.fn.now() },
    // Select high-performing learners
    ...learners.slice(2, 4).map(learner => ({
      community_id: globalCommunity.id,
      user_id: learner.id,
      status: 'active',
      joined_at: knex.fn.now(),
    })),
  ]).onConflict(['community_id', 'user_id']).ignore();

  // ========== Assign Community Roles ==========

  // Math Community Roles
  await knex('community_user_roles').insert([
    { community_id: mathCommunity.id, user_id: mathAdmin.id, role_id: ownerRole.id },
    { community_id: mathCommunity.id, user_id: mentorBob.id, role_id: mentorRole.id },
    { community_id: mathCommunity.id, user_id: mentorCarlos.id, role_id: mentorRole.id },
  ]).onConflict(['community_id', 'user_id', 'role_id']).ignore();

  // Science Community Roles
  await knex('community_user_roles').insert([
    { community_id: scienceCommunity.id, user_id: scienceAdmin.id, role_id: ownerRole.id },
    { community_id: scienceCommunity.id, user_id: mentorDiana.id, role_id: mentorRole.id },
    { community_id: scienceCommunity.id, user_id: mentorCarlos.id, role_id: mentorRole.id },
  ]).onConflict(['community_id', 'user_id', 'role_id']).ignore();

  // Programming Community Roles
  await knex('community_user_roles').insert([
    { community_id: programmingCommunity.id, user_id: mentorAlice.id, role_id: ownerRole.id },
    { community_id: programmingCommunity.id, user_id: mathAdmin.id, role_id: adminRole.id },
  ]).onConflict(['community_id', 'user_id', 'role_id']).ignore();

  // Global Learners Roles
  await knex('community_user_roles').insert([
    { community_id: globalCommunity.id, user_id: mathAdmin.id, role_id: ownerRole.id },
    { community_id: globalCommunity.id, user_id: scienceAdmin.id, role_id: adminRole.id },
    { community_id: globalCommunity.id, user_id: mentorCarlos.id, role_id: mentorRole.id },
  ]).onConflict(['community_id', 'user_id', 'role_id']).ignore();

  console.log('✓ Seeded sample communities:');
  console.log(`  - Mathematics Learning Community (${mathCommunity.slug})`);
  console.log(`  - Science & Technology Hub (${scienceCommunity.slug})`);
  console.log(`  - Programming & Web Development (${programmingCommunity.slug})`);
  console.log(`  - Global Learners Network (${globalCommunity.slug}) - invite-only`);
  console.log(`  - Assigned ${learners.length} learners and 4 mentors across communities`);
}
