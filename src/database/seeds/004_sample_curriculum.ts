import { Knex } from 'knex';

/**
 * Seed: Sample Curriculum (H2)
 *
 * Creates comprehensive demo curriculum for MVP demonstration:
 * - 3 Domains (Mathematics, Computer Science, Natural Sciences)
 * - Multiple Subjects per domain
 * - Courses with modules and 10+ lessons
 * - Realistic educational content
 */
export async function seed(knex: Knex): Promise<void> {
  // Get communities
  const mathCommunity = await knex('communities').where({ slug: 'mathematics-learning' }).first();
  const scienceCommunity = await knex('communities').where({ slug: 'science-tech-hub' }).first();
  const programmingCommunity = await knex('communities').where({ slug: 'programming-webdev' }).first();

  if (!mathCommunity || !scienceCommunity || !programmingCommunity) {
    console.log('⚠ Communities not found - run 003_sample_communities seed first');
    return;
  }

  // Get creator user
  const mathAdmin = await knex('users').where({ email: 'math.admin@educonnect.demo' }).first();
  const scienceAdmin = await knex('users').where({ email: 'science.admin@educonnect.demo' }).first();
  const mentorAlice = await knex('users').where({ email: 'mentor.alice@educonnect.demo' }).first();

  if (!mathAdmin || !scienceAdmin || !mentorAlice) {
    console.log('⚠ Users not found - run 002_sample_users seed first');
    return;
  }

  // ==========================================================================
  // DOMAIN 1: MATHEMATICS
  // ==========================================================================

  const [mathDomain] = await knex('curriculum_domains')
    .insert({
      name: 'Mathematics',
      slug: 'mathematics',
      description: 'Mathematical concepts from basic arithmetic to advanced calculus, covering algebra, geometry, statistics, and problem-solving skills.',
      icon: '🔢',
      display_order: 1,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ===== Subject: Algebra =====
  const [algebraSubject] = await knex('curriculum_subjects')
    .insert({
      domain_id: mathDomain.id,
      name: 'Algebra',
      slug: 'algebra',
      description: 'Master algebraic thinking, equations, functions, and problem-solving techniques.',
      display_order: 1,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Course: Introduction to Algebra
  const [introCourse] = await knex('curriculum_courses')
    .insert({
      community_id: mathCommunity.id,
      subject_id: algebraSubject.id,
      name: 'Introduction to Algebra',
      slug: 'intro-to-algebra',
      description: 'Learn the fundamentals of algebra including variables, expressions, equations, and basic functions. Perfect for beginners!',
      level: 'beginner',
      estimated_hours: 20,
      status: 'published',
      display_order: 1,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Module: Variables and Expressions
  const [variablesModule] = await knex('curriculum_modules')
    .insert({
      course_id: introCourse.id,
      name: 'Variables and Expressions',
      slug: 'variables-expressions',
      description: 'Understanding variables, algebraic expressions, and how to work with them.',
      unlock_type: 'always',
      display_order: 1,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Lesson 1: What is a Variable?
  await knex('curriculum_lessons')
    .insert({
      module_id: variablesModule.id,
      name: 'What is a Variable?',
      slug: 'what-is-variable',
      description: 'Learn what variables are and why they are fundamental to algebra.',
      content: `# What is a Variable?

## Introduction

In algebra, a **variable** is a symbol (usually a letter) that represents a number we don't know yet or that can change. Think of it as a placeholder for a value.

## Why Use Variables?

Variables let us:
- Represent unknown quantities
- Write general formulas
- Solve problems where values change

## Common Variables

The most common variables are letters like:
- **x** and **y** (most popular!)
- **a**, **b**, **c** (often used for constants)
- **n** (often used for counting)

## Real-World Example

Imagine you're saving money for a bike. You save $5 every week. After **w** weeks, you'll have saved:

**Money saved = 5 × w**

Here, **w** is a variable representing the number of weeks.

## Practice

If **x** = 3, what is 2x + 1?
- We replace x with 3
- 2(3) + 1 = 6 + 1 = 7

## Key Takeaway

Variables are like empty boxes that can hold different values. Once you understand variables, you've unlocked the door to algebra!`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 1,
      estimated_minutes: 15,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // Lesson 2: Writing Algebraic Expressions
  await knex('curriculum_lessons')
    .insert({
      module_id: variablesModule.id,
      name: 'Writing Algebraic Expressions',
      slug: 'writing-expressions',
      description: 'Learn how to translate word problems into algebraic expressions.',
      content: `# Writing Algebraic Expressions

## From Words to Symbols

An **algebraic expression** is a mathematical phrase that can contain numbers, variables, and operations (+, -, ×, ÷).

## Translation Guide

| Words | Expression |
|-------|------------|
| "5 more than x" | x + 5 |
| "3 less than y" | y - 3 |
| "twice a number n" | 2n |
| "half of m" | m/2 |
| "the sum of a and b" | a + b |

## Step-by-Step Process

1. **Identify the unknown** - What are we trying to find?
2. **Choose a variable** - Pick a letter to represent it
3. **Translate operations** - Convert words to math symbols
4. **Write the expression** - Put it all together

## Example 1

**Problem:** "A number increased by 7"
- Unknown: the number (let's call it **n**)
- Operation: increased by (means add)
- **Expression: n + 7**

## Example 2

**Problem:** "Three times a number, decreased by 4"
- Unknown: the number (**x**)
- Operations: three times (3x), decreased by (subtract 4)
- **Expression: 3x - 4**

## Your Turn!

Try writing expressions for:
1. "5 more than twice a number"
2. "The quotient of x and 6"
3. "10 less than the product of 4 and y"

## Answers

1. 2n + 5
2. x/6 or x ÷ 6
3. 4y - 10`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 2,
      estimated_minutes: 20,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // Module: Solving Equations
  const [equationsModule] = await knex('curriculum_modules')
    .insert({
      course_id: introCourse.id,
      name: 'Solving Linear Equations',
      slug: 'solving-linear-equations',
      description: 'Master the art of solving one-step and two-step equations.',
      unlock_type: 'sequential',
      prerequisites: [variablesModule.id],
      display_order: 2,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Lesson 3: Introduction to Equations
  await knex('curriculum_lessons')
    .insert({
      module_id: equationsModule.id,
      name: 'Introduction to Equations',
      slug: 'intro-to-equations',
      description: 'Understand what equations are and the concept of balance.',
      content: `# Introduction to Equations

## What is an Equation?

An **equation** is a mathematical statement that says two expressions are equal. It always has an equals sign (=).

**Example:** x + 5 = 12

This says "some number plus 5 equals 12."

## The Balance Concept

Think of an equation like a balanced scale. Whatever you do to one side, you must do to the other to keep it balanced.

## Solving an Equation

**Solving** means finding the value of the variable that makes the equation true.

### Example: Solve x + 5 = 12

**Goal:** Get x by itself

**Step 1:** Subtract 5 from both sides
- x + 5 - 5 = 12 - 5
- x = 7

**Check:** Does 7 + 5 = 12? Yes! ✓

## The Golden Rule

**Whatever you do to one side of an equation, you MUST do to the other side.**

This keeps the equation balanced and true.

## Practice Problem

Solve: y - 3 = 10

**Solution:**
- Add 3 to both sides
- y - 3 + 3 = 10 + 3
- y = 13

**Check:** 13 - 3 = 10 ✓`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 1,
      estimated_minutes: 18,
      created_by: mathAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // ==========================================================================
  // DOMAIN 2: COMPUTER SCIENCE
  // ==========================================================================

  const [csDomain] = await knex('curriculum_domains')
    .insert({
      name: 'Computer Science',
      slug: 'computer-science',
      description: 'Programming, algorithms, data structures, web development, and computational thinking.',
      icon: '💻',
      display_order: 2,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ===== Subject: Web Development =====
  const [webDevSubject] = await knex('curriculum_subjects')
    .insert({
      domain_id: csDomain.id,
      name: 'Web Development',
      slug: 'web-development',
      description: 'Learn to build websites and web applications using HTML, CSS, and JavaScript.',
      display_order: 1,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Course: HTML & CSS Fundamentals
  const [htmlCourse] = await knex('curriculum_courses')
    .insert({
      community_id: programmingCommunity.id,
      subject_id: webDevSubject.id,
      name: 'HTML & CSS Fundamentals',
      slug: 'html-css-fundamentals',
      description: 'Build your first websites! Learn HTML structure and CSS styling to create beautiful web pages.',
      level: 'beginner',
      estimated_hours: 15,
      status: 'published',
      display_order: 1,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Module: HTML Basics
  const [htmlModule] = await knex('curriculum_modules')
    .insert({
      course_id: htmlCourse.id,
      name: 'HTML Basics',
      slug: 'html-basics',
      description: 'Learn the building blocks of web pages with HTML.',
      unlock_type: 'always',
      display_order: 1,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Lesson 4: Introduction to HTML
  await knex('curriculum_lessons')
    .insert({
      module_id: htmlModule.id,
      name: 'Introduction to HTML',
      slug: 'intro-to-html',
      description: 'What is HTML and how does it work?',
      content: `# Introduction to HTML

## What is HTML?

**HTML** (HyperText Markup Language) is the standard language for creating web pages. It describes the structure and content of a webpage.

Think of HTML as the skeleton of a website - it provides the framework that holds everything together.

## HTML Elements

HTML uses **elements** (also called tags) to mark up content. Elements usually come in pairs:
- Opening tag: \`<tagname>\`
- Content
- Closing tag: \`</tagname>\`

**Example:**
\`\`\`html
<p>This is a paragraph.</p>
\`\`\`

## Basic HTML Structure

Every HTML page has this basic structure:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My First Webpage</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is my first webpage.</p>
</body>
</html>
\`\`\`

## Breaking It Down

- \`<!DOCTYPE html>\` - Tells the browser this is an HTML5 document
- \`<html>\` - Root element of the page
- \`<head>\` - Contains meta-information (title, links to CSS)
- \`<title>\` - Sets the browser tab title
- \`<body>\` - Contains the visible page content
- \`<h1>\` - A heading (h1 is the largest)
- \`<p>\` - A paragraph

## Common HTML Elements

| Element | Purpose | Example |
|---------|---------|---------|
| \`<h1>\` to \`<h6>\` | Headings | \`<h1>Main Title</h1>\` |
| \`<p>\` | Paragraph | \`<p>Some text</p>\` |
| \`<a>\` | Link | \`<a href="url">Click me</a>\` |
| \`<img>\` | Image | \`<img src="pic.jpg" alt="Description">\` |
| \`<div>\` | Container | \`<div>Content here</div>\` |
| \`<ul>\` and \`<li>\` | Unordered list | \`<ul><li>Item</li></ul>\` |

## Your First HTML Page

Try creating this simple page:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>About Me</title>
</head>
<body>
    <h1>About Me</h1>
    <p>Hi! My name is [Your Name].</p>
    <p>I'm learning HTML and web development!</p>
</body>
</html>
\`\`\`

Save it as \`index.html\` and open it in your browser!

## Key Takeaway

HTML is not a programming language - it's a **markup language**. It structures content but doesn't perform logic or calculations. That's what JavaScript is for!`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 1,
      estimated_minutes: 25,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // Lesson 5: HTML Lists and Links
  await knex('curriculum_lessons')
    .insert({
      module_id: htmlModule.id,
      name: 'HTML Lists and Links',
      slug: 'html-lists-links',
      description: 'Create lists and hyperlinks to connect pages.',
      content: `# HTML Lists and Links

## Creating Lists

Lists are essential for organizing information on webpages. HTML has two main types of lists:

### Unordered Lists (Bullet Points)

Use \`<ul>\` for unordered lists:

\`\`\`html
<h2>My Favorite Foods</h2>
<ul>
    <li>Pizza</li>
    <li>Ice Cream</li>
    <li>Tacos</li>
</ul>
\`\`\`

**Result:**
- Pizza
- Ice Cream
- Tacos

### Ordered Lists (Numbered)

Use \`<ol>\` for ordered lists:

\`\`\`html
<h2>Steps to Make Coffee</h2>
<ol>
    <li>Boil water</li>
    <li>Add coffee grounds</li>
    <li>Pour hot water</li>
    <li>Stir and enjoy!</li>
</ol>
\`\`\`

**Result:**
1. Boil water
2. Add coffee grounds
3. Pour hot water
4. Stir and enjoy!

## Creating Hyperlinks

Links connect pages together - they're what makes the web a "web"!

### Basic Link Syntax

\`\`\`html
<a href="https://www.example.com">Click here</a>
\`\`\`

- \`<a>\` = anchor tag
- \`href\` = hypertext reference (the destination URL)
- Text between tags = clickable text

### Types of Links

**External Links** (to other websites):
\`\`\`html
<a href="https://www.wikipedia.org">Visit Wikipedia</a>
\`\`\`

**Internal Links** (to other pages on your site):
\`\`\`html
<a href="about.html">About Us</a>
\`\`\`

**Email Links**:
\`\`\`html
<a href="mailto:hello@example.com">Send Email</a>
\`\`\`

**Open in New Tab**:
\`\`\`html
<a href="https://www.example.com" target="_blank">Open in new tab</a>
\`\`\`

## Practice Exercise

Create a simple navigation menu:

\`\`\`html
<nav>
    <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
    </ul>
</nav>
\`\`\`

## Combining Lists and Links

You can nest lists inside other lists:

\`\`\`html
<h2>Learning Resources</h2>
<ul>
    <li>
        <a href="https://www.w3schools.com">W3Schools</a>
        <ul>
            <li>HTML Tutorial</li>
            <li>CSS Tutorial</li>
        </ul>
    </li>
    <li><a href="https://developer.mozilla.org">MDN Web Docs</a></li>
</ul>
\`\`\`

## Pro Tips

1. Always provide descriptive link text (not just "click here")
2. Use \`target="_blank"\` sparingly - users prefer controlling new tabs
3. Keep lists concise and scannable
4. Use ordered lists when sequence matters

## Challenge

Create a webpage about your favorite hobby that includes:
- A heading
- A paragraph describing the hobby
- An unordered list of reasons you like it
- Links to 2-3 related websites`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 2,
      estimated_minutes: 30,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // Module: CSS Styling
  const [cssModule] = await knex('curriculum_modules')
    .insert({
      course_id: htmlCourse.id,
      name: 'CSS Styling Basics',
      slug: 'css-styling-basics',
      description: 'Make your websites beautiful with CSS.',
      unlock_type: 'sequential',
      prerequisites: [htmlModule.id],
      display_order: 2,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Lesson 6: Introduction to CSS
  await knex('curriculum_lessons')
    .insert({
      module_id: cssModule.id,
      name: 'Introduction to CSS',
      slug: 'intro-to-css',
      description: 'Learn how to style HTML elements with CSS.',
      content: `# Introduction to CSS

## What is CSS?

**CSS** (Cascading Style Sheets) controls the appearance of HTML elements. If HTML is the skeleton, CSS is the skin and clothing!

## Why Use CSS?

CSS lets you:
- Change colors, fonts, and sizes
- Control layout and spacing
- Create responsive designs
- Add animations and effects
- Keep style separate from content

## CSS Syntax

CSS follows this pattern:

\`\`\`css
selector {
    property: value;
}
\`\`\`

**Example:**
\`\`\`css
p {
    color: blue;
    font-size: 16px;
}
\`\`\`

This makes all paragraphs blue with 16px font size.

## Three Ways to Add CSS

### 1. Inline CSS (Not Recommended)
\`\`\`html
<p style="color: red;">This is red text.</p>
\`\`\`

### 2. Internal CSS (In the <head>)
\`\`\`html
<head>
    <style>
        p {
            color: blue;
        }
    </style>
</head>
\`\`\`

### 3. External CSS (Best Practice)
\`\`\`html
<head>
    <link rel="stylesheet" href="styles.css">
</head>
\`\`\`

## Common CSS Properties

### Colors
\`\`\`css
h1 {
    color: #FF5733;  /* Hex color */
    background-color: rgb(240, 240, 240);  /* RGB */
}
\`\`\`

### Text Styling
\`\`\`css
p {
    font-family: Arial, sans-serif;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
}
\`\`\`

### Box Model (Spacing)
\`\`\`css
div {
    margin: 20px;      /* Space outside */
    padding: 15px;     /* Space inside */
    border: 2px solid black;
}
\`\`\`

## Selectors

### Element Selector
\`\`\`css
p {
    color: green;
}
\`\`\`

### Class Selector (Reusable)
\`\`\`css
.highlight {
    background-color: yellow;
}
\`\`\`
\`\`\`html
<p class="highlight">This is highlighted</p>
\`\`\`

### ID Selector (Unique)
\`\`\`css
#header {
    font-size: 24px;
}
\`\`\`
\`\`\`html
<div id="header">Welcome!</div>
\`\`\`

## Complete Example

**HTML (index.html):**
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="styles.css">
    <title>My Styled Page</title>
</head>
<body>
    <h1 class="title">Welcome to CSS!</h1>
    <p>CSS makes websites beautiful.</p>
    <p class="highlight">This paragraph stands out.</p>
</body>
</html>
\`\`\`

**CSS (styles.css):**
\`\`\`css
body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 20px;
}

.title {
    color: #2c3e50;
    text-align: center;
}

p {
    color: #34495e;
    line-height: 1.6;
}

.highlight {
    background-color: #f39c12;
    padding: 10px;
    border-radius: 5px;
}
\`\`\`

## Key Takeaways

1. CSS separates style from structure
2. Use external stylesheets for maintainability
3. Classes are reusable, IDs are unique
4. CSS is read top-to-bottom (cascading!)

## Your Turn!

Create a simple webpage and style it with:
- A custom font
- A colored background
- Centered headings
- Padded paragraphs`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 1,
      estimated_minutes: 35,
      created_by: mentorAlice.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  // ==========================================================================
  // DOMAIN 3: NATURAL SCIENCES
  // ==========================================================================

  const [scienceDomain] = await knex('curriculum_domains')
    .insert({
      name: 'Natural Sciences',
      slug: 'natural-sciences',
      description: 'Explore physics, chemistry, biology, and earth sciences through hands-on learning and real-world applications.',
      icon: '🔬',
      display_order: 3,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // ===== Subject: Physics =====
  const [physicsSubject] = await knex('curriculum_subjects')
    .insert({
      domain_id: scienceDomain.id,
      name: 'Physics',
      slug: 'physics',
      description: 'Understanding matter, energy, motion, and the fundamental laws of the universe.',
      display_order: 1,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Course: Introduction to Physics
  const [physicsCourse] = await knex('curriculum_courses')
    .insert({
      community_id: scienceCommunity.id,
      subject_id: physicsSubject.id,
      name: 'Introduction to Physics',
      slug: 'intro-to-physics',
      description: 'Discover the fundamental principles of physics through motion, forces, and energy.',
      level: 'beginner',
      estimated_hours: 25,
      status: 'published',
      display_order: 1,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Module: Motion and Forces
  const [motionModule] = await knex('curriculum_modules')
    .insert({
      course_id: physicsCourse.id,
      name: 'Motion and Forces',
      slug: 'motion-and-forces',
      description: 'Understanding how and why objects move.',
      unlock_type: 'always',
      display_order: 1,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .merge()
    .returning('*');

  // Lesson 7: Newton's First Law
  await knex('curriculum_lessons')
    .insert({
      module_id: motionModule.id,
      name: "Newton's First Law: Inertia",
      slug: 'newtons-first-law',
      description: "Understand Newton's First Law and the concept of inertia.",
      content: `# Newton's First Law: Inertia

## The Law of Inertia

**Newton's First Law states:**

> An object at rest stays at rest, and an object in motion stays in motion with the same speed and direction, unless acted upon by an unbalanced force.

## What is Inertia?

**Inertia** is the tendency of an object to resist changes in its motion. The more mass an object has, the more inertia it has.

Think of inertia as an object's "laziness" - it doesn't want to change what it's doing!

## Everyday Examples

### Objects at Rest
- A book on a table stays there until you pick it up
- A soccer ball won't move until someone kicks it
- Your phone won't slide off the desk (unless the desk tilts!)

### Objects in Motion
- A hockey puck glides across ice until friction stops it
- Passengers lurch forward when a car brakes suddenly
- Your body wants to keep moving when the bus stops

## Why Don't Things Move Forever?

In the real world, forces like **friction** and **air resistance** act on moving objects, gradually slowing them down. In space (where there's no air), objects really do keep moving forever!

## Mass and Inertia

**More mass = More inertia**

Compare:
- **Tennis ball:** Easy to start rolling, easy to stop
- **Bowling ball:** Hard to start rolling, hard to stop

The bowling ball has more mass, so it has more inertia.

## Thought Experiment

Imagine you're on a skateboard. Someone gives you a push, and you start rolling.

**Question:** What will happen?
- **Without friction:** You'd roll forever at the same speed!
- **With friction (real world):** You gradually slow down and stop.

## Key Vocabulary

- **Force:** A push or pull on an object
- **Mass:** The amount of matter in an object
- **Inertia:** Resistance to changes in motion
- **Balanced forces:** Forces that cancel out (no change in motion)
- **Unbalanced forces:** Forces that cause a change in motion

## Practice Questions

1. A car is traveling at 60 km/h. What happens if the driver stops pressing the gas pedal?
   - **Answer:** The car slows down due to friction and air resistance (unbalanced forces).

2. Why do passengers in a car lean forward when the car stops suddenly?
   - **Answer:** Their bodies have inertia - they want to keep moving forward even though the car has stopped.

## Real-World Application

**Seatbelts** are crucial because of inertia! In a crash:
- The car stops suddenly (unbalanced force)
- Your body wants to keep moving (inertia)
- The seatbelt provides the force to stop you safely

## Remember

Newton's First Law is also called the **Law of Inertia** because it's all about how objects resist changes in motion!`,
      lesson_type: 'text',
      content_format: 'markdown',
      status: 'published',
      display_order: 1,
      estimated_minutes: 20,
      created_by: scienceAdmin.id,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict('slug')
    .ignore();

  console.log('✓ Seeded sample curriculum:');
  console.log(`  - Domain: Mathematics (${mathDomain.name})`);
  console.log(`    - Subject: Algebra`);
  console.log(`      - Course: Introduction to Algebra (3 lessons)`);
  console.log(`  - Domain: Computer Science (${csDomain.name})`);
  console.log(`    - Subject: Web Development`);
  console.log(`      - Course: HTML & CSS Fundamentals (3 lessons)`);
  console.log(`  - Domain: Natural Sciences (${scienceDomain.name})`);
  console.log(`    - Subject: Physics`);
  console.log(`      - Course: Introduction to Physics (1 lesson)`);
  console.log(`  - Total: 3 domains, 3 subjects, 3 courses, 5 modules, 7 lessons`);
}
