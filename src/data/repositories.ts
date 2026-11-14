import type {
  AppInput,
  AppItem,
  AppUpdate,
  Builder,
  Comment,
  ListAppsParams,
  FeedPost,
  Profile,
  User,
} from "./types";

export type GoogleSignInResult = {
  user: User;
  picture?: string;
};

export type GoogleAccount = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
  /** Raw Google access token. Local mode ignores it; http mode sends it for server verification. */
  accessToken?: string;
};

export type AuthRepo = {
  getSession(): Promise<User | null>;
  /** Observe backend session changes; returns a cleanup function. */
  subscribeSession?(onChange: (user: User | null) => void): () => void;
  signin(email: string, password: string, captchaToken?: string): Promise<User>;
  signup(
    name: string,
    email: string,
    password: string,
    captchaToken?: string,
    fullName?: string,
  ): Promise<User>;
  signinWithGoogleAccount(account: GoogleAccount): Promise<GoogleSignInResult>;
  signout(): Promise<void>;
  updateName(name: string): Promise<User>;
  /** Sends a password-reset email (link lands on /signin?mode=recovery). */
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>;
  /** Sets a new password for the current session (used after recovery). */
  updatePassword(newPassword: string): Promise<void>;
  /** Whether the current session can sign in with email + password. */
  hasPassword(): Promise<boolean>;
};

/** toggleVote result: the refreshed app, plus spam-guard signalling. */
export type VoteResult = AppItem & {
  /**
   * True when this click tripped the spam guard: the vote was rejected and a
   * server-side pause started (it survives refreshes and other devices).
   */
  pauseStarted?: boolean;
  /** Pause length in whole seconds; present when pauseStarted is true. */
  pausedSeconds?: number;
};

export type AppRepo = {
  listApps(params?: ListAppsParams): Promise<AppItem[]>;
  getApp(id: string, userId?: string): Promise<AppItem>;
  createApp(input: AppInput, author: User): Promise<AppItem>;
  updateApp(appId: string, author: User, patch: AppUpdate): Promise<AppItem>;
  deleteApp(appId: string, author: User): Promise<void>;
  toggleVote(appId: string, userId: string): Promise<VoteResult>;
  /** Idempotently persist the final desired vote after the UI debounce. */
  setVote(appId: string, userId: string, liked: boolean): Promise<AppItem>;
  /** Remaining vote pause for the caller, in whole seconds (0 = not paused). */
  getVoteTimeoutSeconds(): Promise<number>;
  /**
   * Profiles that upvoted a project or feed feedPost, alphabetical by name. Only voters with
   * a resolvable profile are returned, so legacy seed counts may exceed the
   * list length — callers should treat the list as identities, not a count.
   */
  listVoters(appId: string, target?: "app" | "feedPost"): Promise<Profile[]>;
  listBuilders(): Promise<Builder[]>;
  listComments(appId: string, userId?: string): Promise<Comment[]>;
  addComment(appId: string, author: User, body: string, parentId?: string): Promise<Comment>;
  /**
   * Delete an author's comment. Preserve its identity as a placeholder when
   * replies exist; otherwise remove it. Replies are never deleted with it.
   * Throws when the requester is not the author.
   */
  deleteComment(appId: string, commentId: string, requester: User): Promise<void>;
  toggleCommentLike(appId: string, commentId: string, userId: string): Promise<Comment>;
  /**
   * Liker user ids per comment id, batched in one call. Powers like
   * notifications for comment authors. Empty input returns {}.
   */
  listCommentLikers(commentIds: string[]): Promise<Record<string, string[]>>;
  listFeedPosts(userId?: string): Promise<FeedPost[]>;
  postFeedPost(author: User, body: string, appId?: string): Promise<FeedPost>;
  deleteFeedPost(feedPostId: string, requester: User): Promise<void>;
  toggleFeedPostCheer(feedPostId: string, userId: string): Promise<FeedPost>;
  setFeedPostCheer(feedPostId: string, userId: string, liked: boolean): Promise<FeedPost>;
};

export type ProfilePatch = {
  fullName?: string;
  bio?: string;
  color?: string;
  imageUrl?: string;
  name?: string;
  /** Profile-page theme; empty string clears it back to default. */
  theme?: string;
  /** Website palette for the account; empty string clears it back to device choice. */
  palette?: string;
};

export type ProfileRepo = {
  listProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile>;
  getProfileByName(name: string): Promise<Profile | null>;
  ensureUserProfile(user: User): Promise<Profile>;
  updateProfile(id: string, patch: ProfilePatch, requesterId: string): Promise<Profile>;
};

export class AuthError extends Error {
  constructor(message = "That email and password don't match.") {
    super(message);
    this.name = "AuthError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}
