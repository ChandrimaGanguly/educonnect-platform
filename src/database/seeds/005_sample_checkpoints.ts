import { Knex } from 'knex';

/**
 * Seed: Sample Checkpoints (H3)
 *
 * Creates demo checkpoints with questions for MVP demonstration:
 * - 5+ checkpoints aligned with curriculum
 * - Multiple question types (multiple choice, true/false, short answer)
 * - Realistic questions with correct answers
 */
export async function seed(knex: Knex): Promise<void> {
  // Get communities
  const mathCommunity = await knex('communities').where({ slug: 'mathematics-learning' }).first();
  const scienceCommunity = await knex('communities').where({ slug: 'science-tech-hub' }).first();
  const programmingCommunity = await knex('communities').where({ slug: 'programming-webdev' }).first();

  if (!mathCommunity || !scienceCommunity || !programmingCommunity) {
    console.log('⚠ Communities not found - run seeds in order');
    return;
  }

  // Get modules
  const variablesModule = await knex('curriculum_modules').where({ slug: 'variables-expressions' }).first();
  const equationsModule = await knex('curriculum_modules').where({ slug: 'solving-linear-equations' }).first();
  const htmlModule = await knex('curriculum_modules').where({ slug: 'html-basics' }).first();
  const cssModule = await knex('curriculum_modules').where({ slug: 'css-styling-basics' }).first();
  const motionModule = await knex('curriculum_modules').where({ slug: 'motion-and-forces' }).first();

  // Get creator users
  const mathAdmin = await knex('users').where({ email: 'math.admin@educonnect.demo' }).first();
  const scienceAdmin = await knex('users').where({ email: 'science.admin@educonnect.demo' }).first();
  const mentorAlice = await knex('users').where({ email: 'mentor.alice@educonnect.demo' }).first();

  if (!mathAdmin || !scienceAdmin || !mentorAlice || !variablesModule) {
    console.log('⚠ Prerequisites not found - run previous seeds first');
    return;
  }

  // ==========================================================================
  // CHECKPOINT 1: Algebra Variables Quiz
  // ==========================================================================

  const [checkpoint1] = await knex('checkpoints')
    .insert({
      community_id: mathCommunity.id,
      module_id: variablesModule.id,
      title: 'Variables and Expressions Quiz',
      description: 'Test your understanding of variables and how to write algebraic expressions.',
      checkpoint_type: 'formative',
      status: 'active',
      time_limit_minutes: 15,
      passing_score_percentage: 70,
      max_attempts: 3,
      is_timed: true,
      allow_pause: true,
      monitor_integrity: true,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['community_id', 'title'])
    .ignore()
    .returning('*');

  if (checkpoint1) {
    // Question 1: Multiple Choice
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint1.id,
      question_text: 'What is a variable in algebra?',
      question_type: 'multiple_choice',
      options: [
        'A number that never changes',
        'A symbol that represents an unknown or changing value',
        'A mathematical operation',
        'The answer to an equation',
      ],
      correct_answer: 'A symbol that represents an unknown or changing value',
      points: 10,
      display_order: 1,
      explanation: 'A variable is a symbol (usually a letter) that represents an unknown or changing value. It acts as a placeholder in algebraic expressions.',
    }).onConflict().ignore();

    // Question 2: Multiple Choice
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint1.id,
      question_text: 'Which expression represents "5 more than a number n"?',
      question_type: 'multiple_choice',
      options: [
        'n - 5',
        'n + 5',
        '5n',
        '5 - n',
      ],
      correct_answer: 'n + 5',
      points: 10,
      display_order: 2,
      explanation: '"More than" means addition. So "5 more than n" translates to n + 5.',
    }).onConflict().ignore();

    // Question 3: True/False
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint1.id,
      question_text: 'The expression "2x" means "2 plus x".',
      question_type: 'true_false',
      correct_answer: 'false',
      points: 10,
      display_order: 3,
      explanation: 'False. "2x" means "2 times x" (multiplication). When a number is written next to a variable with no operation symbol, it means multiplication.',
    }).onConflict().ignore();

    // Question 4: Multiple Choice
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint1.id,
      question_text: 'If x = 4, what is the value of 3x + 2?',
      question_type: 'multiple_choice',
      options: [
        '9',
        '14',
        '11',
        '12',
      ],
      correct_answer: '14',
      points: 10,
      display_order: 4,
      explanation: 'Substitute x = 4: 3(4) + 2 = 12 + 2 = 14',
    }).onConflict().ignore();
  }

  // ==========================================================================
  // CHECKPOINT 2: Equation Solving Practice
  // ==========================================================================

  const [checkpoint2] = await knex('checkpoints')
    .insert({
      community_id: mathCommunity.id,
      module_id: equationsModule?.id,
      title: 'Solving Linear Equations Practice',
      description: 'Practice solving one-step and two-step linear equations.',
      checkpoint_type: 'formative',
      status: 'active',
      time_limit_minutes: 20,
      passing_score_percentage: 75,
      max_attempts: 3,
      is_timed: true,
      allow_pause: true,
      monitor_integrity: true,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['community_id', 'title'])
    .ignore()
    .returning('*');

  if (checkpoint2 && equationsModule) {
    // Question 1
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint2.id,
      question_text: 'Solve for x: x + 7 = 15',
      question_type: 'short_answer',
      correct_answer: '8',
      points: 15,
      display_order: 1,
      explanation: 'Subtract 7 from both sides: x + 7 - 7 = 15 - 7, therefore x = 8',
    }).onConflict().ignore();

    // Question 2
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint2.id,
      question_text: 'What operation should you use first to solve: x - 5 = 12?',
      question_type: 'multiple_choice',
      options: [
        'Subtract 5 from both sides',
        'Add 5 to both sides',
        'Multiply both sides by 5',
        'Divide both sides by 5',
      ],
      correct_answer: 'Add 5 to both sides',
      points: 10,
      display_order: 2,
      explanation: 'To isolate x, we need to undo the subtraction by adding 5 to both sides. This gives us x = 17.',
    }).onConflict().ignore();

    // Question 3
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint2.id,
      question_text: 'Solve for y: y / 4 = 3',
      question_type: 'short_answer',
      correct_answer: '12',
      points: 15,
      display_order: 3,
      explanation: 'Multiply both sides by 4: (y / 4) × 4 = 3 × 4, therefore y = 12',
    }).onConflict().ignore();
  }

  // ==========================================================================
  // CHECKPOINT 3: HTML Fundamentals Test
  // ==========================================================================

  const [checkpoint3] = await knex('checkpoints')
    .insert({
      community_id: programmingCommunity.id,
      module_id: htmlModule?.id,
      title: 'HTML Fundamentals Test',
      description: 'Assess your knowledge of HTML structure, elements, and syntax.',
      checkpoint_type: 'summative',
      status: 'active',
      time_limit_minutes: 25,
      passing_score_percentage: 80,
      max_attempts: 2,
      is_timed: true,
      allow_pause: false,
      monitor_integrity: true,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['community_id', 'title'])
    .ignore()
    .returning('*');

  if (checkpoint3 && htmlModule) {
    // Question 1
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint3.id,
      question_text: 'What does HTML stand for?',
      question_type: 'multiple_choice',
      options: [
        'Hyperlinks and Text Markup Language',
        'HyperText Markup Language',
        'Home Tool Markup Language',
        'Hyperlinks Text Making Language',
      ],
      correct_answer: 'HyperText Markup Language',
      points: 10,
      display_order: 1,
      explanation: 'HTML stands for HyperText Markup Language. It is the standard language for creating web pages.',
    }).onConflict().ignore();

    // Question 2
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint3.id,
      question_text: 'Which HTML element is used for the largest heading?',
      question_type: 'multiple_choice',
      options: [
        '<heading>',
        '<h6>',
        '<h1>',
        '<head>',
      ],
      correct_answer: '<h1>',
      points: 10,
      display_order: 2,
      explanation: '<h1> is used for the largest (most important) heading. Heading sizes go from <h1> (largest) to <h6> (smallest).',
    }).onConflict().ignore();

    // Question 3
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint3.id,
      question_text: 'HTML is a programming language that can perform calculations.',
      question_type: 'true_false',
      correct_answer: 'false',
      points: 10,
      display_order: 3,
      explanation: 'False. HTML is a markup language, not a programming language. It structures content but cannot perform logic or calculations.',
    }).onConflict().ignore();

    // Question 4
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint3.id,
      question_text: 'Which tag is used to create a hyperlink?',
      question_type: 'multiple_choice',
      options: [
        '<link>',
        '<a>',
        '<href>',
        '<hyperlink>',
      ],
      correct_answer: '<a>',
      points: 10,
      display_order: 4,
      explanation: 'The <a> (anchor) tag is used to create hyperlinks. The href attribute specifies the destination URL.',
    }).onConflict().ignore();

    // Question 5
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint3.id,
      question_text: 'What is the correct HTML for creating an unordered (bulleted) list?',
      question_type: 'multiple_choice',
      options: [
        '<ol>',
        '<ul>',
        '<list>',
        '<bullet>',
      ],
      correct_answer: '<ul>',
      points: 10,
      display_order: 5,
      explanation: '<ul> creates an unordered list (bulleted). <ol> creates an ordered list (numbered).',
    }).onConflict().ignore();
  }

  // ==========================================================================
  // CHECKPOINT 4: CSS Styling Quiz
  // ==========================================================================

  const [checkpoint4] = await knex('checkpoints')
    .insert({
      community_id: programmingCommunity.id,
      module_id: cssModule?.id,
      title: 'CSS Styling Quiz',
      description: 'Test your understanding of CSS selectors, properties, and styling techniques.',
      checkpoint_type: 'formative',
      status: 'active',
      time_limit_minutes: 20,
      passing_score_percentage: 70,
      max_attempts: 3,
      is_timed: true,
      allow_pause: true,
      monitor_integrity: false,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['community_id', 'title'])
    .ignore()
    .returning('*');

  if (checkpoint4 && cssModule) {
    // Question 1
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint4.id,
      question_text: 'What does CSS stand for?',
      question_type: 'multiple_choice',
      options: [
        'Computer Style Sheets',
        'Cascading Style Sheets',
        'Creative Style Sheets',
        'Colorful Style Sheets',
      ],
      correct_answer: 'Cascading Style Sheets',
      points: 10,
      display_order: 1,
      explanation: 'CSS stands for Cascading Style Sheets. The "cascading" refers to the way styles can override each other.',
    }).onConflict().ignore();

    // Question 2
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint4.id,
      question_text: 'Which CSS selector is used to select elements with a specific class?',
      question_type: 'multiple_choice',
      options: [
        '#classname',
        '.classname',
        '*classname',
        'classname',
      ],
      correct_answer: '.classname',
      points: 15,
      display_order: 2,
      explanation: 'The dot (.) prefix selects elements by class. For example, .highlight selects all elements with class="highlight".',
    }).onConflict().ignore();

    // Question 3
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint4.id,
      question_text: 'CSS can only change colors, not layout or spacing.',
      question_type: 'true_false',
      correct_answer: 'false',
      points: 10,
      display_order: 3,
      explanation: 'False. CSS controls all visual aspects including colors, fonts, layout, spacing, positioning, and animations.',
    }).onConflict().ignore();

    // Question 4
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint4.id,
      question_text: 'Which property is used to change the text color in CSS?',
      question_type: 'multiple_choice',
      options: [
        'text-color',
        'font-color',
        'color',
        'text-style',
      ],
      correct_answer: 'color',
      points: 10,
      display_order: 4,
      explanation: 'The "color" property sets the text color. For example: color: blue;',
    }).onConflict().ignore();
  }

  // ==========================================================================
  // CHECKPOINT 5: Physics Motion Assessment
  // ==========================================================================

  const [checkpoint5] = await knex('checkpoints')
    .insert({
      community_id: scienceCommunity.id,
      module_id: motionModule?.id,
      title: "Newton's Laws of Motion Assessment",
      description: "Test your understanding of Newton's First Law and the concept of inertia.",
      checkpoint_type: 'formative',
      status: 'active',
      time_limit_minutes: 20,
      passing_score_percentage: 75,
      max_attempts: 3,
      is_timed: true,
      allow_pause: true,
      monitor_integrity: true,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(['community_id', 'title'])
    .ignore()
    .returning('*');

  if (checkpoint5 && motionModule) {
    // Question 1
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint5.id,
      question_text: "What does Newton's First Law state?",
      question_type: 'multiple_choice',
      options: [
        'For every action, there is an equal and opposite reaction',
        'Force equals mass times acceleration',
        'An object at rest stays at rest unless acted upon by a force',
        'Energy cannot be created or destroyed',
      ],
      correct_answer: 'An object at rest stays at rest unless acted upon by a force',
      points: 15,
      display_order: 1,
      explanation: "Newton's First Law (Law of Inertia) states that objects resist changes in motion unless acted upon by an unbalanced force.",
    }).onConflict().ignore();

    // Question 2
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint5.id,
      question_text: 'What is inertia?',
      question_type: 'multiple_choice',
      options: [
        'The speed of a moving object',
        'The tendency of an object to resist changes in motion',
        'The force of gravity on an object',
        'The energy of a moving object',
      ],
      correct_answer: 'The tendency of an object to resist changes in motion',
      points: 10,
      display_order: 2,
      explanation: 'Inertia is the property of matter that causes it to resist changes in velocity (speed or direction).',
    }).onConflict().ignore();

    // Question 3
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint5.id,
      question_text: 'A bowling ball has more inertia than a tennis ball.',
      question_type: 'true_false',
      correct_answer: 'true',
      points: 10,
      display_order: 3,
      explanation: 'True. Objects with more mass have more inertia. A bowling ball has much more mass than a tennis ball.',
    }).onConflict().ignore();

    // Question 4
    await knex('checkpoint_questions').insert({
      checkpoint_id: checkpoint5.id,
      question_text: 'Why do passengers lurch forward when a car brakes suddenly?',
      question_type: 'multiple_choice',
      options: [
        'The car pushes them forward',
        'Gravity pulls them forward',
        'Their bodies want to keep moving forward due to inertia',
        'The brakes push them forward',
      ],
      correct_answer: 'Their bodies want to keep moving forward due to inertia',
      points: 15,
      display_order: 4,
      explanation: 'Passengers have inertia - their bodies want to continue moving at the same speed. When the car stops, their bodies try to keep moving forward.',
    }).onConflict().ignore();
  }

  console.log('✓ Seeded sample checkpoints:');
  console.log('  - Variables and Expressions Quiz (4 questions)');
  console.log('  - Solving Linear Equations Practice (3 questions)');
  console.log('  - HTML Fundamentals Test (5 questions)');
  console.log('  - CSS Styling Quiz (4 questions)');
  console.log("  - Newton's Laws of Motion Assessment (4 questions)");
  console.log('  - Total: 5 checkpoints with 20 questions');
}
