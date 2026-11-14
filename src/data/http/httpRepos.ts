import { validateUsername } from "../../utils/username";
import { captureMentions } from "../../utils/mentions";
import { rejectRolePatch } from "../accountRoles";
import { validateProjectIcon } from "../../utils/projectIcon";
// HTTP implementations of the repo contracts. Inactive until
// VITE_DATA_SOURCE=http AND VITE_API_URL are set — see docs/backends.md
// for the endpoint contract the server must honor. Local behavior is untouched.

import {
  AuthError,
  NotFoundError,
  type AppRepo,
  type AuthRepo,
  type GoogleAccount,
  type GoogleSignInResult,
  type ProfilePatch,
  type ProfileRepo,
} from "../repositories";
import type { AppInput, AppUpdate, ListAppsParams, User } from "../types";
import { api, setApiToken } from "./api";
import {
  toApp,
  toComment,
  toFeedPost,
  toProfile,
  toUser,
  type AppRow,
  type CommentRow,
  type FeedPostRow,
  type ProfileRow,
} from "./rows";

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function createHttpAuthRepo(): AuthRepo {
  return {
    async getSession(): Promise<User | null> {
      try {
        const { user } = await api<{ user: { id: string; email: string; name: string } }>(
          "/auth/session",
        );
        return toUser(user);
      } catch {
        return null;
      }
    },

    async signin(email: string, password: string): Promise<User> {
      try {
        const { user, token } = await api<{
          user: { id: string; email: string; name: string };
          token: string;
        }>("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
        setApiToken(token);
        return toUser(user);
      } catch {
        throw new AuthError();
      }
    },

    async signup(
      name: string,
      email: string,
      password: string,
      _captchaToken?: string,
      fullName?: string,
    ): Promise<User> {
      validateUsername(name);
      // Pre-check with the same lookup the profile repo uses, so a taken
      // username is flagged before the server creates the account. The
      // server still owns final validation.
      let nameTaken = false;
      try {
        await api(`/profiles/by-name/${encodeURIComponent(name.trim())}`);
        nameTaken = true; // The endpoint only resolves when the name exists.
      } catch (e) {
        if (!(e instanceof Error && e.message.includes("404"))) throw e;
      }
      if (nameTaken) throw new Error("That username is already taken. Try another.");
      const { user, token } = await api<{
        user: { id: string; email: string; name: string };
        token: string;
      }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, fullName, email, password }),
      });
      setApiToken(token);
      return toUser(user);
    },

    // Unimplemented backend surface (see docs/backends.md) — the future
    // server owns email delivery and password writes.
    async requestPasswordReset(): Promise<void> {
      throw new Error("Password reset isn't available yet.");
    },

    async updatePassword(): Promise<void> {
      throw new Error("Password change isn't available yet.");
    },

    // Unbuilt backend surface — fail closed (prompt setup) rather than lie.
    async hasPassword(): Promise<boolean> {
      return false;
    },

    // The server MUST verify the Google access token with Google (userinfo)
    // and match verified email -> account itself. Never trust bare claims.
    async signinWithGoogleAccount(account: GoogleAccount): Promise<GoogleSignInResult> {
      try {
        const { user, token, picture } = await api<{
          user: { id: string; email: string; name: string };
          token: string;
          picture?: string;
        }>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ accessToken: account.accessToken ?? null }),
        });
        setApiToken(token);
        return { user: toUser(user), picture };
      } catch (e) {
        throw new AuthError(e instanceof Error ? e.message : "Google sign-in failed.");
      }
    },

    async signout(): Promise<void> {
      try {
        await api("/auth/signout", { method: "POST" });
      } finally {
        setApiToken(null);
      }
    },

    async updateName(name: string): Promise<User> {
      validateUsername(name);
      const { user } = await api<{ user: { id: string; email: string; name: string } }>(
        "/auth/name",
        { method: "PATCH", body: JSON.stringify({ name }) },
      );
      return toUser(user);
    },
  };
}

export function createHttpAppRepo(): AppRepo {
  return {
    async listApps(params: ListAppsParams = {}) {
      const { apps } = await api<{ apps: AppRow[] }>(
        `/apps${toQuery({
          query: params.query,
          category: params.category,
          limit: params.limit,
          offset: params.offset,
        })}`,
      );
      return apps.map((row) => toApp(row));
    },

    async getApp(id: string) {
      try {
        const { app } = await api<{ app: AppRow }>(`/apps/${encodeURIComponent(id)}`);
        return toApp(app);
      } catch (e) {
        if (e instanceof Error && e.message.includes("404"))
          throw new NotFoundError("Project not found.");
        throw e;
      }
    },

    async createApp(input: AppInput, _author: User) {
      validateProjectIcon(input.icon);
      const { app } = await api<{ app: AppRow }>("/apps", {
        method: "POST",
        body: JSON.stringify({
          stage: input.stage,
          version: input.version,
          title: input.title,
          description: input.description,
          mentions: captureMentions(
            input.description,
            await createHttpProfileRepo().listProfiles(),
          ),
          url: input.url,
          repo_url: input.repoUrl,
          category: input.category,
          screenshots: input.screenshots,
          icon: input.icon,
          docs: input.docs,
          collaborators: input.collaborators,
        }),
      });
      return toApp(app);
    },

    async updateApp(appId: string, _author: User, patch: AppUpdate) {
      const { app } = await api<{ app: AppRow }>(`/apps/${encodeURIComponent(appId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          stage: patch.stage,
          version: patch.version,
          publication: patch.publication,
          title: patch.title,
          description: patch.description,
          mentions:
            patch.description === undefined
              ? undefined
              : captureMentions(
                  patch.description,
                  await createHttpProfileRepo().listProfiles(),
                  (await this.getApp(appId)).mentions,
                ),
          url: patch.url,
          repo_url: patch.repoUrl,
          category: patch.category,
          screenshots: patch.screenshots,
          docs: patch.docs,
          collaborators: patch.collaborators,
        }),
      });
      return toApp(app);
    },

    async deleteApp(appId: string, _author: User): Promise<void> {
      await api(`/apps/${encodeURIComponent(appId)}`, { method: "DELETE" });
    },

    async setVote(appId, _userId, liked) {
      const { app } = await api<{ app: AppRow }>(`/apps/${encodeURIComponent(appId)}/vote`, {
        method: "PUT",
        body: JSON.stringify({ liked }),
      });
      return toApp(app);
    },

    async toggleVote(appId: string, _userId: string) {
      const { app } = await api<{ app: AppRow }>(`/apps/${encodeURIComponent(appId)}/vote`, {
        method: "POST",
      });
      return toApp(app);
    },

    // No throttle endpoint yet (see docs/backends.md) — never paused.
    async getVoteTimeoutSeconds(): Promise<number> {
      return 0;
    },

    async listVoters(appId: string, target = "app") {
      const { voters } = await api<{ voters: ProfileRow[] }>(
        `/${target === "feedPost" ? "milestones" : "apps"}/${encodeURIComponent(appId)}/voters`,
      );
      return voters.map(toProfile).sort((a, b) => a.name.localeCompare(b.name));
    },

    async listBuilders() {
      // Served from /profiles on the server; builders are derived client-side.
      const { profiles } = await api<{ profiles: ProfileRow[] }>("/profiles");
      const seen = new Map(profiles.map((p) => [p.name, p]));
      return [...seen.values()].map((p) => ({
        name: p.name,
        role: p.role,
        apps: 0,
        color: p.color,
      }));
    },

    async listComments(appId: string) {
      const { comments } = await api<{ comments: CommentRow[] }>(
        `/apps/${encodeURIComponent(appId)}/comments`,
      );
      return comments.map(toComment);
    },

    async addComment(appId: string, _author: User, body: string, parentId?: string) {
      const { comment } = await api<{ comment: CommentRow }>(
        `/apps/${encodeURIComponent(appId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            body,
            parentId,
            mentions: captureMentions(body.trim(), await createHttpProfileRepo().listProfiles()),
          }),
        },
      );
      return toComment(comment);
    },

    async deleteComment(appId: string, commentId: string, _author: User): Promise<void> {
      await api(`/apps/${encodeURIComponent(appId)}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
    },

    async toggleCommentLike(appId: string, commentId: string, _userId: string) {
      const { comment } = await api<{ comment: CommentRow }>(
        `/apps/${encodeURIComponent(appId)}/comments/${encodeURIComponent(commentId)}/like`,
        { method: "POST" },
      );
      return toComment(comment);
    },

    async listCommentLikers(_commentIds: string[]): Promise<Record<string, string[]>> {
      // No contract endpoint yet (see docs/backends.md) — like
      // notifications stay silent in http mode until the backend adds one.
      return {};
    },

    // The deployed API retains its legacy milestone URLs and response fields.
    async listFeedPosts() {
      const { milestones: feedPosts } = await api<{ milestones: FeedPostRow[] }>("/milestones");
      return feedPosts.map(toFeedPost);
    },

    async postFeedPost(_author: User, body: string, appId?: string) {
      const { milestone: feedPost } = await api<{ milestone: FeedPostRow }>("/milestones", {
        method: "POST",
        body: JSON.stringify({ body, appId }),
      });
      return toFeedPost(feedPost);
    },

    async deleteFeedPost(feedPostId: string, _requester: User): Promise<void> {
      await api(`/milestones/${encodeURIComponent(feedPostId)}`, { method: "DELETE" });
    },

    async setFeedPostCheer(feedPostId: string, _userId: string, liked: boolean) {
      const { milestone: feedPost } = await api<{ milestone: FeedPostRow }>(
        `/milestones/${encodeURIComponent(feedPostId)}/cheer`,
        { method: "PUT", body: JSON.stringify({ liked }) },
      );
      return toFeedPost(feedPost);
    },

    async toggleFeedPostCheer(feedPostId: string, _userId: string) {
      const { milestone: feedPost } = await api<{ milestone: FeedPostRow }>(
        `/milestones/${encodeURIComponent(feedPostId)}/cheer`,
        { method: "POST" },
      );
      return toFeedPost(feedPost);
    },
  };
}

export function createHttpProfileRepo(): ProfileRepo {
  return {
    async listProfiles() {
      const { profiles } = await api<{ profiles: ProfileRow[] }>("/profiles");
      return profiles.map(toProfile);
    },

    async getProfile(id: string) {
      try {
        const { profile } = await api<{ profile: ProfileRow }>(
          `/profiles/${encodeURIComponent(id)}`,
        );
        return toProfile(profile);
      } catch (e) {
        if (e instanceof Error && e.message.includes("404"))
          throw new NotFoundError("Developer not found.");
        throw e;
      }
    },

    async getProfileByName(name: string) {
      try {
        const { profile } = await api<{ profile: ProfileRow }>(
          `/profiles/by-name/${encodeURIComponent(name)}`,
        );
        return toProfile(profile);
      } catch (e) {
        if (e instanceof Error && e.message.includes("404")) return null;
        throw e;
      }
    },

    async ensureUserProfile(user: User) {
      const { profile } = await api<{ profile: ProfileRow }>("/profiles/ensure", {
        method: "POST",
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          fullName: user.fullName,
        }),
      });
      return toProfile(profile);
    },

    async updateProfile(id: string, patch: ProfilePatch, _requesterId: string) {
      rejectRolePatch(patch);
      if (patch.name !== undefined) validateUsername(patch.name);
      const { profile } = await api<{ profile: ProfileRow }>(
        `/profiles/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            bio: patch.bio,
            color: patch.color,
            image_url: patch.imageUrl,
            name: patch.name,
            full_name: patch.fullName,
            theme: patch.theme !== undefined ? patch.theme.trim() || null : undefined,
            palette: patch.palette !== undefined ? patch.palette.trim() || null : undefined,
          }),
        },
      );
      return toProfile(profile);
    },
  };
}
