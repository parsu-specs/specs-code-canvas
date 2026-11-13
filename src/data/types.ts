export type Category = "Education" | "Productivity" | "Games" | "Creative";

export type CategoryFilter = Category | "All";

/** Original mention label bound permanently to a profile ID. */
export type Mention = { name: string; userId: string };

export type User = {
  id: string;
  email: string;
  name: string;
};

export const PROJECT_STAGES = [
  "Concept",
  "Visual prototype",
  "Working prototype",
  "Beta",
  "Released",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  Concept: "Concept",
  "Visual prototype": "Visual",
  "Working prototype": "Working",
  Beta: "Beta",
  Released: "Released",
};
export type ProjectVersion = {
  id: string;
  stage?: ProjectStage;
  version?: string;
  notes: string;
  publishedAt: string;
  snapshot: Pick<AppItem, "title" | "description" | "screenshots" | "docs" | "url" | "repoUrl">;
};

export type AppItem = {
  stage?: ProjectStage;
  version?: string;
  versions?: ProjectVersion[];
  lastPublishedAt?: string;
  mentions?: Mention[];
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorId?: string;
  category: Category;
  votes: number;
  comments: number;
  color: string;
  url?: string;
  repoUrl?: string;
  screenshots?: string[];
  docs?: string;
  collaborators?: string[];
  createdAt: string;
  viewerHasVoted?: boolean;
};

export type AppInput = {
  stage?: ProjectStage;
  version?: string;
  title: string;
  description: string;
  url?: string;
  repoUrl?: string;
  category: Category;
  screenshots?: string[];
  docs?: string;
  collaborators?: string[];
};

export type AppUpdate = {
  stage?: ProjectStage;
  version?: string;
  publication?: { notes: string; expectedPublication?: string };
  title?: string;
  description?: string;
  url?: string;
  repoUrl?: string;
  category?: Category;
  screenshots?: string[];
  docs?: string;
  collaborators?: string[];
};

export type ListAppsParams = {
  query?: string;
  category?: CategoryFilter;
  limit?: number;
  offset?: number;
  userId?: string;
};

export type Builder = {
  name: string;
  role: string;
  apps: number;
  color: string;
};

/** Allowlisted profile-page theme palettes (CSS vars must exist for each). */
export const PROFILE_THEMES = [
  "pink",
  "yellow",
  "mint",
  "sky",
  "lavender",
  "purple",
  "black",
] as const;

/**
 * Allowlisted website palettes (data-palette values in styles/tailwind.css).
 * Single source of truth — utils/palette.ts builds its UI list from this,
 * and repos validate against it.
 */
export const SITE_PALETTE_IDS = [
  "candy",
  "ocean",
  "sunset",
  "forest",
  "mono",
  "bubblegum",
  "citrus",
  "grape",
  "midnight",
] as const;

/**
 * Allowlisted avatar colors. Single source of truth — localProfiles and
 * supabaseRepos validate against it, and profiles_color_valid mirrors it.
 */
export const AVATAR_COLORS = [
  "yellow",
  "mint",
  "pink",
  "sky",
  "lavender",
  "purple",
  "paper",
  "surface",
] as const;

export type Profile = {
  id: string;
  name: string;
  role: string;
  bio: string;
  color: string;
  imageUrl?: string;
  /** Profile-page palette. Absent = default look (backward compatible). */
  theme?: string;
  /**
   * Website palette for this account (Not to confuse with the profile
   * page theme above: palette recolors the whole site for the viewer,
   * theme recolors one profile page for its visitors). Absent = device
   * choice (backward compatible).
   */
  palette?: string;
  createdAt: string;
};

export type Comment = {
  mentions?: Mention[];
  isDeleted?: boolean;
  id: string;
  appId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  likes?: number;
  likedBy?: string[];
  viewerHasLiked?: boolean;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  appId?: string;
  createdAt: string;
  cheers?: number;
  cheeredBy?: string[];
  viewerHasCheered?: boolean;
};

export type NotificationKind =
  "comment" | "reply" | "vote" | "project" | "update" | "collab" | "like";

export type NotificationItem = {
  /** Stable id: `c:<commentId>`, `vote:<appId>`, `app:<appId>`, `m:<feedPostId>`. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  /** Project to open when the notification is clicked. */
  appId?: string;
  actorName?: string;
};
