// ─────────────────────────────────────────────────────────────
// EDIT THIS FILE to update the About page. Everything here is placeholder
// content: swap in real names, roles, bios, and photo URLs anytime.
// Photos accept any https:// image link (or leave imageUrl empty for
// an initials avatar).
// ─────────────────────────────────────────────────────────────

export const CONTACT_EMAIL = "parsu.specs@gmail.com";

export const ORGANIZATION = {
  name: "Society of Programmers and Enthusiasts in Computer Science",
  shortName: "SPECS",
  logo: "/specs-logo.png",
};

export const APP_INFO = {
  name: "CodeCanvas",
  tagline: "A home for what you build.",
  description:
    "A community platform for discovering and sharing digital creations. Publish your work, share documentation, demonstrate what it does, and connect with fellow developers and potential users.",
  creationTypes: [
    "Software applications",
    "Websites",
    "Games",
    "Utility scripts",
    "Automation tools",
    "AI agent skills",
    "Reusable components",
    "Other digital resources",
  ],
  features: [
    {
      title: "Discover something new",
      body: "Explore apps, websites, games, tools, and reusable resources. Read their documentation and meet the people behind them.",
    },
    {
      title: "Show what you build",
      body: "Publish your creation with screenshots, documentation, and a project link so others can understand it, try it, and share feedback.",
    },
    {
      title: "Learn with your community",
      body: "Share project updates, ask technical questions, and join discussions. Connect with fellow developers and potential users to learn and improve together.",
    },
  ],
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  badges: ("Leadership" | "UI/UX" | "Development" | "Full-Stack" | "Security" | "DevOps")[];
  imageUrl?: string;
  color: string;
};

export const TEAM: TeamMember[] = [
  {
    name: "Jay Romero",
    badges: ["Leadership", "UI/UX", "Development"],
    role: "Lead Developer",
    // bio: "Owns the overall direction of the app store and keeps releases moving.",
    bio: "Leads product direction, development, and UI/UX design. Shapes the platform's visual identity and refines the experience for a consistent, intuitive feel.",
    imageUrl:
      "https://raw.githubusercontent.com/jj-rmr/Images/4903d6cf5c130e44adde1d0ce323e16e3150eb07/CodeCanvas/romero_id-pic.png",
    color: "yellow",
  },
  {
    name: "Kirby Paladan",
    badges: ["Full-Stack", "Security", "DevOps"],
    // role: "Frontend Developer | Backend Developer | Database Handler | Security Handler | Penetration Tester | QA Engineer | DevOps | UI/UX",
    role: "Full-Stack Developer · Security & DevOps",
    // bio: "mapping both codebases, then shipping features (vote notifications, publish bonus, theme and signup fixes) alongside hardening program (RLS policies, vote/claim guards, fail-closed admin API, CSP/headers, timeouts, telemetry, runbook) that took the app from local prototype to secured production on Vercel with Supabase.",
    bio: "Develops across the frontend and backend, with a focus on security, reliability, and performance. Manages infrastructure and deployment to keep the platform running smoothly.",
    imageUrl:
      "https://raw.githubusercontent.com/kirbypaladan24-lgtm/Images-/9bb4a4a68a66d65c73329d3df1847962205ddb68/IMG_20251222_194153_156.jpg",
    color: "mint",
  },
];
