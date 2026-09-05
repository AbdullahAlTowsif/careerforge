/**
 * Skill Normalizer — dynamic skill resolution without hardcoded limits.
 *
 * Strategy:
 *  1. Alias map covers known synonyms (react.js → React, nodejs → Node.js, etc.)
 *  2. Suffix stripping removes noise (.js, .ts, .py, etc.) and re-maps
 *  3. Fuzzy match (Levenshtein ≤ 2) catches typos and near-misses against known canonical names
 *  4. If nothing matches, the original cleaned token is kept — the system never discards
 *     an unknown skill, it just normalizes casing/spacing so future matches still work.
 */

/* ------------------------------------------------------------------ */
/*  Alias / synonym map  (lowercase key → canonical display name)      */
/* ------------------------------------------------------------------ */
const SKILL_ALIASES: Record<string, string> = {
  // ---- JavaScript ecosystem ----
  "javascript":       "JavaScript",
  "js":               "JavaScript",
  "typescript":       "TypeScript",
  "ts":               "TypeScript",

  "react":             "React",
  "react.js":          "React",
  "reactjs":           "React",
  "react js":          "React",

  "next":              "Next.js",
  "next.js":           "Next.js",
  "nextjs":            "Next.js",
  "next js":           "Next.js",

  "vue":               "Vue.js",
  "vue.js":            "Vue.js",
  "vuejs":             "Vue.js",
  "vue js":            "Vue.js",

  "angular":           "Angular",
  "angularjs":         "AngularJS",
  "angular js":        "AngularJS",

  "svelte":            "Svelte",
  "sveltekit":         "SvelteKit",
  "svelte kit":        "SvelteKit",

  "jquery":            "jQuery",
  "j query":           "jQuery",

  "node":              "Node.js",
  "node.js":           "Node.js",
  "nodejs":            "Node.js",
  "node js":           "Node.js",

  "express":           "Express.js",
  "express.js":        "Express.js",
  "expressjs":         "Express.js",
  "express js":        "Express.js",

  "fastify":           "Fastify",
  "nest":              "NestJS",
  "nestjs":            "NestJS",
  "nest js":           "NestJS",

  // ---- Python ecosystem ----
  "python":            "Python",
  "django":            "Django",
  "django rest framework": "Django REST Framework",
  "django rest":       "Django REST Framework",
  "drf":               "Django REST Framework",
  "flask":             "Flask",
  "fastapi":           "FastAPI",
  "fast api":          "FastAPI",
  "rails":             "Ruby on Rails",
  "ruby on rails":     "Ruby on Rails",
  "ror":               "Ruby on Rails",
  "laravel":           "Laravel",
  "express node":      "Express.js",

  // ---- JVM ecosystem ----
  "java":              "Java",
  "kotlin":            "Kotlin",
  "kotlin jvm":        "Kotlin",
  "spring":            "Spring Boot",
  "spring boot":       "Spring Boot",
  "springboot":        "Spring Boot",
  "spring boot app":   "Spring Boot",

  // ---- Systems / compiled ----
  "c++":               "C++",
  "c plus plus":       "C++",
  "c#":                "C#",
  "c sharp":           "C#",
  "dotnet":            ".NET",
  ".net":              ".NET",
  "dot net":           ".NET",
  ".net core":         ".NET Core",
  "dotnet core":       ".NET Core",

  // ---- Languages ----
  "go":                "Go",
  "golang":            "Go",
  "golang programming": "Go",
  "ruby":              "Ruby",
  "php":               "PHP",
  "rust":              "Rust",
  "swift":             "Swift",
  "scala":             "Scala",
  "elixir":            "Elixir",
  "haskell":           "Haskell",
  "perl":              "Perl",

  // ---- Web fundamentals ----
  "html":              "HTML",
  "html5":             "HTML5",
  "css":               "CSS",
  "css3":              "CSS3",
  "sass":              "Sass",
  "scss":              "Sass",
  "less":              "Less",
  "tailwind":          "Tailwind CSS",
  "tailwindcss":       "Tailwind CSS",
  "tailwind css":      "Tailwind CSS",
  "bootstrap":         "Bootstrap",
  "material ui":       "Material UI",
  "mui":               "Material UI",
  "chakra ui":         "Chakra UI",
  "shadcn":            "shadcn/ui",
  "shadcn ui":         "shadcn/ui",

  // ---- State management ----
  "redux":             "Redux",
  "zustand":           "Zustand",
  "recoil":            "Recoil",
  "mobx":              "MobX",
  "jotai":             "Jotai",

  // ---- Mobile ----
  "react native":      "React Native",
  "reactnative":       "React Native",
  "flutter":           "Flutter",
  "dart":              "Dart",
  "swiftui":           "SwiftUI",
  "swift ui":          "SwiftUI",
  "kotlin android":    "Kotlin",
  "android":           "Android Development",
  "android sdk":       "Android Development",
  "ios":               "iOS Development",
  "jetpack compose":   "Jetpack Compose",
  "xamarin":           "Xamarin",

  // ---- Databases ----
  "mongo":             "MongoDB",
  "mongodb":           "MongoDB",
  "mongo db":          "MongoDB",
  "postgres":          "PostgreSQL",
  "postgresql":        "PostgreSQL",
  "postgre":           "PostgreSQL",
  "mysql":             "MySQL",
  "mariadb":           "MariaDB",
  "sqlite":            "SQLite",
  "sql lite":          "SQLite",
  "redis":             "Redis",
  "elastic":           "Elasticsearch",
  "elasticsearch":     "Elasticsearch",
  "firebase":          "Firebase",
  "supabase":          "Supabase",
  "prisma":            "Prisma",
  "mongoose":          "Mongoose",
  "typeorm":           "TypeORM",
  "sequelize":         "Sequelize",
  "knex":              "Knex.js",

  // ---- DevOps / Cloud ----
  "git":               "Git",
  "github":            "GitHub",
  "gitlab":            "GitLab",
  "bitbucket":         "Bitbucket",
  "docker":            "Docker",
  "kubernetes":        "Kubernetes",
  "k8s":               "Kubernetes",
  "aws":               "AWS",
  "amazon web services": "AWS",
  "aws basics":        "AWS",
  "azure":             "Microsoft Azure",
  "microsoft azure":   "Microsoft Azure",
  "gcp":               "Google Cloud",
  "google cloud":      "Google Cloud",
  "google cloud platform": "Google Cloud",
  "heroku":            "Heroku",
  "vercel":            "Vercel",
  "netlify":           "Netlify",
  "digitalocean":      "DigitalOcean",
  "digital ocean":     "DigitalOcean",
  "linode":            "Linode",

  // ---- CI/CD / Infra ----
  "cicd":              "CI/CD",
  "ci/cd":             "CI/CD",
  "ci cd":             "CI/CD",
  "jenkins":           "Jenkins",
  "github actions":    "GitHub Actions",
  "gitlab ci":         "GitLab CI",
  "terraform":         "Terraform",
  "ansible":           "Ansible",
  "nginx":             "Nginx",

  // ---- APIs / Protocols ----
  "rest":              "REST APIs",
  "rest api":          "REST APIs",
  "rest apis":         "REST APIs",
  "restful":           "REST APIs",
  "graphql":           "GraphQL",
  "graph ql":          "GraphQL",
  "grpc":              "gRPC",
  "websocket":         "WebSockets",
  "websockets":        "WebSockets",
  "soap":              "SOAP",

  // ---- Testing ----
  "jest":              "Jest",
  "mocha":             "Mocha",
  "chai":              "Chai",
  "cypress":           "Cypress",
  "playwright":        "Playwright",
  "selenium":          "Selenium",
  "pytest":            "pytest",
  "junit":             "JUnit",
  "vitest":            "Vitest",

  // ---- Build tools ----
  "webpack":           "Webpack",
  "vite":              "Vite",
  "esbuild":           "esbuild",
  "rollup":            "Rollup",
  "parcel":            "Parcel",
  "gulp":              "Gulp",
  "grunt":             "Grunt",
  "turbopack":         "Turbopack",

  // ---- Data / ML ----
  "machine learning":  "Machine Learning",
  "ml":                "Machine Learning",
  "deep learning":     "Deep Learning",
  "dl":                "Deep Learning",
  "nlp":               "Natural Language Processing",
  "natural language processing": "Natural Language Processing",
  "computer vision":   "Computer Vision",
  "cv":                "Computer Vision",
  "tensorflow":        "TensorFlow",
  "tf":                "TensorFlow",
  "pytorch":           "PyTorch",
  "torch":             "PyTorch",
  "keras":             "Keras",
  "scikit":            "scikit-learn",
  "scikit-learn":      "scikit-learn",
  "scikit learn":      "scikit-learn",
  "sklearn":           "scikit-learn",
  "pandas":            "Pandas",
  "numpy":             "NumPy",
  "scipy":             "SciPy",
  "matplotlib":        "Matplotlib",
  "seaborn":           "Seaborn",
  "huggingface":       "Hugging Face",
  "hugging face":      "Hugging Face",
  "openai":            "OpenAI API",
  "langchain":         "LangChain",
  "llm":               "LLMs",
  "llms":              "LLMs",

  // ---- Data Engineering ----
  "spark":             "Apache Spark",
  "apache spark":      "Apache Spark",
  "hadoop":            "Apache Hadoop",
  "apache hadoop":     "Apache Hadoop",
  "kafka":             "Apache Kafka",
  "apache kafka":      "Apache Kafka",
  "airflow":           "Apache Airflow",
  "apache airflow":    "Apache Airflow",
  "etl":               "ETL",
  "dbt":               "dbt",
  "snowflake":         "Snowflake",
  "bigquery":          "BigQuery",
  "redshift":          "Amazon Redshift",

  // ---- Analytics / BI ----
  "data analysis":     "Data Analysis",
  "data analytics":    "Data Analytics",
  "data visualization": "Data Visualization",
  "tableau":           "Tableau",
  "power bi":          "Power BI",
  "powerbi":           "Power BI",
  "looker":            "Looker",
  "excel":             "Excel",
  "google analytics":  "Google Analytics",
  "statistics":        "Statistics",

  // ---- Design ----
  "figma":             "Figma",
  "sketch":            "Sketch",
  "adobe xd":         "Adobe XD",
  "photoshop":         "Photoshop",
  "illustrator":       "Illustrator",
  "indesign":          "InDesign",
  "canva":             "Canva",
  "ui/ux":             "UI/UX Design",
  "ui ux":             "UI/UX Design",
  "ui/ux design":      "UI/UX Design",
  "ui design":         "UI Design",
  "ux design":         "UX Design",
  "ux research":       "UX Research",
  "user research":     "User Research",
  "user testing":      "User Testing",
  "usability testing": "Usability Testing",
  "wireframing":       "Wireframing",
  "wireframe":         "Wireframing",
  "prototyping":       "Prototyping",
  "prototype":         "Prototyping",
  "design systems":    "Design Systems",
  "design system":     "Design Systems",
  "graphic design":    "Graphic Design",
  "interaction design": "Interaction Design",
  "motion design":     "Motion Design",
  "motion graphics":   "Motion Graphics",
  "3d modeling":       "3D Modeling",
  "3d modeling basics": "3D Modeling",
  "3d design":         "3D Modeling",
  "blender":           "Blender",
  "after effects":     "After Effects",

  // ---- Marketing ----
  "seo":               "SEO",
  "search engine optimization": "SEO",
  "sem":               "SEM",
  "search engine marketing": "SEM",
  "content marketing": "Content Marketing",
  "content strategy":  "Content Strategy",
  "content writing":   "Content Writing",
  "copywriting":       "Copywriting",
  "social media marketing": "Social Media Marketing",
  "social media":      "Social Media Marketing",
  "social media management": "Social Media Management",
  "social media manager": "Social Media Marketing",
  "email marketing":   "Email Marketing",
  "digital marketing": "Digital Marketing",
  "affiliate marketing": "Affiliate Marketing",
  "facebook ads":      "Facebook Ads",
  "facebook marketing": "Facebook Ads",
  "meta ads":          "Meta Ads",
  "google ads":        "Google Ads",
  "ppc":               "PPC",
  "marketing automation": "Marketing Automation",
  "hubspot":           "HubSpot",
  "mailchimp":         "Mailchimp",
  "branding":          "Branding",
  "market research":   "Market Research",
  "analytics":         "Analytics",
  "research":          "Research",
  "research skills":   "Research",

  // ---- PM / Soft ----
  "jira":              "Jira",
  "confluence":        "Confluence",
  "trello":            "Trello",
  "asana":             "Asana",
  "notion":            "Notion",
  "slack":             "Slack",
  "postman":           "Postman",
  "vs code":           "VS Code",
  "vscode":            "VS Code",
  "vim":               "Vim",
  "neovim":            "Neovim",

  "communication":     "Communication",
  "teamwork":          "Teamwork",
  "leadership":        "Leadership",
  "problem solving":   "Problem Solving",
  "problem-solving":   "Problem Solving",
  "time management":   "Time Management",
  "critical thinking": "Critical Thinking",
  "critical-thinking": "Critical Thinking",
  "adaptability":      "Adaptability",
  "agile":             "Agile",
  "scrum":             "Scrum",
  "kanban":            "Kanban",
  "project management": "Project Management",
  "product management": "Product Management",

  // ---- Game Dev ----
  "unity":             "Unity",
  "unreal":            "Unreal Engine",
  "unreal engine":     "Unreal Engine",
  "godot":             "Godot",
  "game design":       "Game Design",
  "level design":      "Level Design",
  "blender 3d":        "Blender",

  // ---- Misc / other ----
  "linux":             "Linux",
  "unix":              "Unix",
  "bash":              "Bash",
  "shell":             "Shell Scripting",
  "shell scripting":   "Shell Scripting",
  "powershell":        "PowerShell",
  "sql":               "SQL",
  "nosql":             "NoSQL",
  "regex":             "Regular Expressions",
  "api design":        "API Design",
  "microservices":     "Microservices",
  "microservices architecture": "Microservices",
  "system design":     "System Design",
  "oauth":             "OAuth",
  "jwt":               "JWT",
  "web security":      "Web Security",
  "cybersecurity":     "Cybersecurity",
  "penetration testing": "Penetration Testing",
  "wordpress":         "WordPress",
  "shopify":           "Shopify",
  "webflow":           "Webflow",
  "wix":               "Wix",
  "squarespace":       "Squarespace",
  "responsive design": "Responsive Design",
  "progressive web apps": "Progressive Web Apps",
  "pwa":               "Progressive Web Apps",
  "electron":          "Electron",
  "tauri":             "Tauri",
};

/* ------------------------------------------------------------------ */
/*  Skill → Track domain mapping (used to infer tracks from skills)   */
/* ------------------------------------------------------------------ */
export const SKILL_TRACK_DOMAINS: Record<string, string[]> = {
  // Web Development
  "React":               ["Web Development"],
  "Next.js":             ["Web Development"],
  "Vue.js":              ["Web Development"],
  "Angular":             ["Web Development"],
  "Svelte":              ["Web Development"],
  "SvelteKit":           ["Web Development"],
  "Node.js":             ["Web Development"],
  "Express.js":          ["Web Development"],
  "Fastify":             ["Web Development"],
  "NestJS":              ["Web Development"],
  "HTML":                ["Web Development"],
  "HTML5":               ["Web Development"],
  "CSS":                 ["Web Development"],
  "CSS3":                ["Web Development"],
  "Sass":                ["Web Development"],
  "Tailwind CSS":        ["Web Development"],
  "Bootstrap":           ["Web Development"],
  "Material UI":         ["Web Development"],
  "Webpack":             ["Web Development"],
  "Vite":                ["Web Development"],
  "REST APIs":           ["Web Development"],
  "GraphQL":             ["Web Development"],
  "WebSockets":          ["Web Development"],
  "Docker":              ["Web Development"],
  "WordPress":           ["Web Development"],
  "Shopify":             ["Web Development"],
  "Webflow":             ["Web Development"],
  "PHP":                 ["Web Development"],
  "Laravel":             ["Web Development"],
  "Ruby on Rails":       ["Web Development"],
  "Ruby":                ["Web Development"],
  "Django":              ["Web Development"],
  "Flask":               ["Web Development"],
  "FastAPI":             ["Web Development"],
  "Spring Boot":         ["Web Development"],
  ".NET":                ["Web Development"],
  ".NET Core":           ["Web Development"],

  // App Development
  "React Native":        ["App Development"],
  "Flutter":             ["App Development"],
  "Dart":                ["App Development"],
  "Swift":               ["App Development", "Software Engineering"],
  "SwiftUI":             ["App Development"],
  "Kotlin":              ["App Development", "Software Engineering"],
  "Android Development": ["App Development"],
  "iOS Development":     ["App Development"],
  "Jetpack Compose":     ["App Development"],
  "Xamarin":             ["App Development"],
  "Electron":            ["App Development", "Web Development"],
  "Tauri":               ["App Development", "Web Development"],

  // Software Engineering
  "Java":                ["Software Engineering", "Web Development"],
  "C++":                 ["Software Engineering"],
  "C#":                  ["Software Engineering"],
  "Go":                  ["Software Engineering"],
  "Rust":                ["Software Engineering"],
  "Python":              ["Software Engineering", "Data Science", "Machine Learning"],
  "Git":                 ["Software Engineering", "Web Development"],
  "Linux":               ["Software Engineering"],
  "Microservices":       ["Software Engineering", "Web Development"],
  "System Design":       ["Software Engineering"],
  "Terraform":           ["Software Engineering"],
  "Kubernetes":          ["Software Engineering"],

  // Data Science
  "Pandas":              ["Data Science"],
  "NumPy":               ["Data Science", "Machine Learning"],
  "SciPy":               ["Data Science"],
  "Matplotlib":          ["Data Science"],
  "Seaborn":             ["Data Science"],
  "Data Analysis":       ["Data Science"],
  "Data Analytics":      ["Data Science"],
  "Data Visualization":  ["Data Science", "UI UX Design"],
  "Statistics":          ["Data Science"],
  "Tableau":             ["Data Science"],
  "Power BI":            ["Data Science"],
  "BigQuery":            ["Data Science"],
  "Snowflake":           ["Data Science"],
  "Excel":               ["Data Science"],
  "Apache Spark":        ["Data Science"],
  "Apache Hadoop":       ["Data Science"],
  "ETL":                 ["Data Science"],
  "dbt":                 ["Data Science"],
  "Looker":              ["Data Science"],

  // Machine Learning
  "Machine Learning":    ["Machine Learning", "Data Science"],
  "Deep Learning":       ["Machine Learning", "Data Science"],
  "TensorFlow":          ["Machine Learning"],
  "PyTorch":             ["Machine Learning"],
  "Keras":               ["Machine Learning"],
  "scikit-learn":        ["Machine Learning", "Data Science"],
  "Natural Language Processing": ["Machine Learning"],
  "Computer Vision":     ["Machine Learning"],
  "Hugging Face":        ["Machine Learning"],
  "OpenAI API":          ["Machine Learning"],
  "LangChain":           ["Machine Learning"],
  "LLMs":                ["Machine Learning"],

  // UI UX Design
  "Figma":               ["UI UX Design"],
  "Sketch":              ["UI UX Design"],
  "Adobe XD":            ["UI UX Design"],
  "Canva":               ["UI UX Design"],
  "UI/UX Design":        ["UI UX Design"],
  "UI Design":           ["UI UX Design"],
  "UX Design":           ["UI UX Design"],
  "UX Research":         ["UI UX Design"],
  "User Research":       ["UI UX Design"],
  "Wireframing":         ["UI UX Design"],
  "Prototyping":         ["UI UX Design"],
  "Design Systems":      ["UI UX Design"],
  "Graphic Design":      ["UI UX Design"],
  "Photoshop":           ["UI UX Design"],
  "Illustrator":         ["UI UX Design"],
  "Responsive Design":   ["UI UX Design", "Web Development"],

  // Marketing
  "SEO":                 ["Marketing"],
  "SEM":                 ["Marketing"],
  "Content Marketing":   ["Marketing"],
  "Content Strategy":    ["Marketing"],
  "Social Media Marketing": ["Marketing"],
  "Email Marketing":     ["Marketing"],
  "Digital Marketing":   ["Marketing"],
  "Google Analytics":    ["Marketing"],
  "Google Ads":          ["Marketing"],
  "Facebook Ads":        ["Marketing"],
  "Meta Ads":            ["Marketing"],
  "Marketing Automation": ["Marketing"],
  "HubSpot":             ["Marketing"],
  "Mailchimp":           ["Marketing"],
  "Branding":            ["Marketing"],
  "Market Research":     ["Marketing"],
  "Copywriting":         ["Marketing"],
  "Content Writing":     ["Marketing"],

  // Game Development
  "Unity":               ["Game Development"],
  "Unreal Engine":       ["Game Development"],
  "Godot":               ["Game Development"],
  "Game Design":         ["Game Development"],
  "Level Design":        ["Game Development"],
  "3D Modeling":         ["Game Development", "UI UX Design"],
  "Blender":             ["Game Development", "UI UX Design"],
};

/* ------------------------------------------------------------------ */
/*  Suffix patterns to strip and re-map                                */
/* ------------------------------------------------------------------ */
const VERSION_SUFFIXES = [
  /\s*(?:\.?js|\.?ts|\.?py|\.?rb|\.?cs)$/i,
];

const STRIP_SUFFIX_MAP: Record<string, string> = {
  "react":     "React",
  "vue":       "Vue.js",
  "express":   "Express.js",
  "node":      "Node.js",
  "next":      "Next.js",
  "angular":   "Angular",
  "svelte":    "Svelte",
};

/* ------------------------------------------------------------------ */
/*  Core helpers                                                       */
/* ------------------------------------------------------------------ */

/** Lowercase, trim, collapse whitespace. */
const basicNormalize = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Strip version-like suffixes (.js, .ts, .py) and look up the STRIP_SUFFIX_MAP.
 * Returns the canonical name if found, otherwise null.
 */
const stripSuffix = (lower: string): string | null => {
  for (const pattern of VERSION_SUFFIXES) {
    const stripped = lower.replace(pattern, "").trim();
    if (stripped !== lower && STRIP_SUFFIX_MAP[stripped]) {
      return STRIP_SUFFIX_MAP[stripped];
    }
  }
  return null;
};

/** Levenshtein distance — used for fuzzy near-miss detection. */
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost
      );
    }
    prev = curr;
  }

  return prev[b.length]!;
};

/* ------------------------------------------------------------------ */
/*  Build a reverse lookup set for fast canonical matching              */
/* ------------------------------------------------------------------ */
const canonicalSet = new Set(
  Object.values(SKILL_ALIASES).map((v) => v.toLowerCase())
);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Normalize a single skill string to its canonical display name.
 *
 * Resolution order:
 *  1. Exact alias match  (e.g. "react.js" → "React")
 *  2. Suffix strip       (e.g. "reactjs"  → "React")
 *  3. Already canonical  (e.g. "React"     → "React")
 *  4. Fuzzy match        (e.g. "Recat"     → "React" if distance ≤ 2)
 *  5. Title-case fallback (e.g. "my custom skill" → "My Custom Skill")
 */
export const normalizeSkill = (raw: string): string => {
  const lower = basicNormalize(raw);

  // 1. Exact alias
  if (SKILL_ALIASES[lower]) return SKILL_ALIASES[lower];

  // 2. Suffix strip
  const stripped = stripSuffix(lower);
  if (stripped) return stripped;

  // 3. Already canonical?
  if (canonicalSet.has(lower)) {
    // Return the proper casing from the alias map
    for (const [k, v] of Object.entries(SKILL_ALIASES)) {
      if (k === lower) return v;
    }
    // Fallback: title-case
    return titleCase(raw.trim());
  }

  // 4. Fuzzy match (only against canonical set, max distance 2).
  //    Restricted to length ≥ 4 inputs so short abbreviations like "ui"/"ux"
  //    never get mis-mapped to unrelated canonical names.
  if (lower.length >= 4) {
    let bestMatch: string | null = null;
    let bestDist = Infinity;
    for (const canonical of canonicalSet) {
      if (canonical.length < 4) continue;
      const d = levenshtein(lower, canonical);
      if (d < bestDist && d <= 2) {
        bestDist = d;
        bestMatch = canonical;
      }
    }
    if (bestMatch) {
      for (const [k, v] of Object.entries(SKILL_ALIASES)) {
        if (k === bestMatch) return v;
      }
      return titleCase(bestMatch);
    }
  }

  // 5. Title-case fallback — never discard, just clean up
  return titleCase(raw.trim());
};

/** Normalize an array of skills, deduped and filtered. */
export const normalizeSkills = (skills: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of skills) {
    const canonical = normalizeSkill(s);
    const key = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(canonical);
    }
  }
  return result;
};

/**
 * Check if two skill strings refer to the same thing.
 * Uses normalization + optional fuzzy matching.
 * Fuzzy matching is limited to length ≥ 3 tokens to avoid false
 * positives on short names (e.g. "UI" vs "UX").
 */
export const skillsMatch = (a: string, b: string): boolean => {
  const na = normalizeSkill(a).toLowerCase();
  const nb = normalizeSkill(b).toLowerCase();
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3) {
    return levenshtein(na, nb) <= 1;
  }
  return false;
};

/**
 * Given a set of skills, infer which career tracks they belong to.
 * Returns deduplicated track names sorted by relevance (most skills first).
 */
export const inferTracksFromSkills = (skills: string[]): string[] => {
  const trackCounts = new Map<string, number>();

  for (const raw of skills) {
    const canonical = normalizeSkill(raw);
    const domains = SKILL_TRACK_DOMAINS[canonical] ?? [];
    for (const track of domains) {
      trackCounts.set(track, (trackCounts.get(track) ?? 0) + 1);
    }
  }

  return Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([track]) => track);
};

/** Simple title-case utility. */
function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
