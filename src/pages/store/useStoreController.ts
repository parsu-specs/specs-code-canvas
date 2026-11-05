import {
  debouncedFeedVotes,
  debouncedVotes,
  VOTE_RATE_LIMIT_ENABLED,
} from "../../utils/debouncedVotes";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameController, GraduationCap, Palette, SquaresFour, Wrench } from "@phosphor-icons/react";
import { useAuth } from "../../auth/authContext";
import {
  NOTIF_SCAN_APP_LIMIT,
  arrivalKeyOf,
  buildNotifications,
  bumpCollabTag,
  currentVoteBaseline,
  isTaggedCollaborator,
  loadNotificationState,
  restampRearrived,
  saveNotificationState,
} from "../../utils/notifications";
import { getAppRepo, getAuthRepo, getProfileRepo } from "../../data/factory";
import { indexProfiles } from "../../data/profileLinks";
import { optimisticVote } from "../../utils/optimisticVote";
import { enqueueVote } from "../../utils/voteQueue";
import { cacheHasPassword, loadCachedHasPassword } from "../../utils/viewerCache";
import { formatCountdown } from "../../utils/time";
import { extractMentionIds } from "../../utils/mentions";
import { playNotificationSound, playVoteSound } from "../../utils/sounds";
import { readMarkdownFile } from "../../utils/readMarkdownFile";
import {
  rankDevelopers,
  rankProjects,
  topThreeProjectTrophies,
  topThreeTrophies,
} from "../../utils/rank";
import {
  isGitHubRepositoryUrl,
  listGitHubMarkdownFiles,
  readGitHubMarkdownFiles,
} from "../../utils/readGitHubReadme";
import type {
  AppItem,
  Category,
  CategoryFilter,
  Comment,
  FeedPost,
  NotificationItem,
  Profile,
} from "../../data/types";
import { ROUTES, appDetailsPath, developerProfilePath, normalizePathname } from "../routes";
import { loadCatalog } from "../../utils/loadCatalog";

const categories: { label: CategoryFilter; Icon: typeof SquaresFour }[] = [
  { label: "All", Icon: SquaresFour },
  { label: "Education", Icon: GraduationCap },
  { label: "Productivity", Icon: Wrench },
  { label: "Games", Icon: GameController },
  { label: "Creative", Icon: Palette },
];

type StoreView =
  "discover" | "developers" | "feeds" | "leaderboard" | "profile" | "project" | "settings";

const routeForView: Record<Exclude<StoreView, "profile" | "project">, string> = {
  discover: ROUTES.discover,
  developers: ROUTES.developers,
  feeds: ROUTES.feeds,
  leaderboard: ROUTES.leaderboard,
  settings: ROUTES.settings,
};

const routeTail = (pathname: string, route: string) =>
  pathname.startsWith(`${route}/`) ? pathname.slice(route.length + 1) : null;

function parsePath(path: string): {
  view: StoreView;
  profileId: string | null;
  profileName?: string;
  appId: string | null;
} {
  const clean = normalizePathname(path || ROUTES.discover);
  if (clean === ROUTES.profile) return { view: "profile", profileId: "__me__", appId: null };
  if (clean === ROUTES.developers) return { view: "developers", profileId: null, appId: null };
  const profileName = routeTail(clean, ROUTES.developers);
  if (profileName)
    return {
      view: "profile",
      profileId: null,
      profileName: decodeURIComponent(profileName),
      appId: null,
    };
  const appId = routeTail(clean, ROUTES.apps) ?? routeTail(clean, ROUTES.discover);
  if (appId) return { view: "project", profileId: null, appId: decodeURIComponent(appId) };
  if (clean === ROUTES.feeds) return { view: "feeds", profileId: null, appId: null };
  if (clean === ROUTES.leaderboard) return { view: "leaderboard", profileId: null, appId: null };
  if (clean === ROUTES.settings) return { view: "settings", profileId: null, appId: null };
  return { view: "discover", profileId: null, appId: null };
}

const copyForView: Partial<Record<StoreView, { title?: string; description?: string }>> = {
  discover: {
    title: "Discover",
    description: "Explore software built by the SPECS community.",
  },
  developers: {
    title: "Developers",
    description: "Open a profile to see their projects and feedback.",
  },
  leaderboard: {
    title: "Leaderboard",
    description: "Celebrate the community's top developers and projects.",
  },
  settings: {
    title: "Settings",
    description: "Sounds and demo data live on this device.",
  },
};

// Keep shared state mounted while navigating between store pages.
export default function useStoreController() {
  const { user, signout, profile: myProfile, refreshProfile } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [fullApps, setFullApps] = useState<AppItem[]>([]);
  const hasSubmittedProject = fullApps.some((app) =>
    app.creatorId
      ? app.creatorId === user?.id
      : app.creator.toLowerCase() === user?.name.toLowerCase(),
  );
  const [profiles, setProfiles] = useState<Profile[]>(() => (myProfile ? [myProfile] : []));
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profileTick, setProfileTick] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedPostsLoading, setFeedPostsLoading] = useState(true);
  const [feedPostsError, setFeedPostsError] = useState<string | null>(null);
  const [feedPostBody, setFeedPostBody] = useState("");
  const [feedPostAppId, setFeedPostAppId] = useState("");
  const [feedPostSubmitting, setFeedPostSubmitting] = useState(false);
  const [feedPostError, setFeedPostError] = useState<string | null>(null);
  const [cheerPending, setCheerPending] = useState<Set<string>>(new Set());
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());

  const toggleThread = (id: string) => {
    setOpenThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [query, setQuery] = useState("");
  const [devQuery, setDevQuery] = useState("");
  // Password-setup nudge: Google-only accounts have no password. Shown on
  // Discover until set or snoozed (7 days); never blocks anything.
  const [hasPassword, setHasPassword] = useState<boolean | null>(() =>
    user ? loadCachedHasPassword(user.id) : null,
  );
  const [pwSnoozed, setPwSnoozed] = useState(() => {
    try {
      return !!user && Date.now() < Number(localStorage.getItem(`cc.pw_nudge.v1:${user.id}`) ?? 0);
    } catch {
      return false;
    }
  });
  const [feedQuery, setFeedQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [collabIds, setCollabIds] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [categoryInput, setCategoryInput] = useState<Category>("Productivity");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [docs, setDocs] = useState("");
  const [docsTab, setDocsTab] = useState<"write" | "upload" | "repository" | "preview">("write");
  const [docsPreviewReturnTab, setDocsPreviewReturnTab] = useState<
    "write" | "upload" | "repository"
  >("write");
  const [docsFile, setDocsFile] = useState<string | null>(null);
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [selectedRepositoryFiles, setSelectedRepositoryFiles] = useState<string[]>([]);
  const [repositoryFilesLoading, setRepositoryFilesLoading] = useState(false);
  const [repositoryFilesImporting, setRepositoryFilesImporting] = useState(false);
  const [repositoryFilesError, setRepositoryFilesError] = useState<string | null>(null);
  const repositoryRequest = useRef<AbortController | null>(null);
  const submissionVersion = useRef(0);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const initial = parsePath(window.location.pathname);
  const [view, setView] = useState<StoreView>(initial.view);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initial.profileId);
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(
    initial.profileName ?? null,
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initial.appId);
  const [projectEdit, setProjectEdit] = useState(false);

  useEffect(() => {
    const canonical = normalizePathname(window.location.pathname);
    if (
      canonical !== window.location.pathname.replace(/\/$/, "") ||
      canonical !== window.location.pathname
    ) {
      window.history.replaceState({}, "", canonical);
    }
  }, []);

  const profilesLookup = useMemo(() => indexProfiles(profiles), [profiles]);

  const countFor = useCallback(
    (p: Profile) =>
      fullApps.filter((a) =>
        a.creatorId ? a.creatorId === p.id : a.creator.toLowerCase() === p.name.toLowerCase(),
      ).length,
    [fullApps],
  );

  // Rank points: sum of likes across every project a developer shared.
  const rankedDevelopers = useMemo(() => rankDevelopers(profiles, fullApps), [profiles, fullApps]);

  const devQueryLower = devQuery.trim().toLowerCase();
  const filteredProfiles = devQueryLower
    ? profiles.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(devQueryLower))
    : profiles;
  const feedQueryLower = feedQuery.trim().toLowerCase();
  const filteredFeedPosts = feedQueryLower
    ? feedPosts.filter((m) =>
        `${m.body} ${profilesLookup.get(m.authorId)?.name ?? m.authorName}`
          .toLowerCase()
          .includes(feedQueryLower),
      )
    : feedPosts;

  // userId -> 1|2|3 for the current top three. Recomputed every render from
  // live state, so trophies appear, move, and disappear as ranks change.
  const trophies = useMemo(() => topThreeTrophies(profiles, fullApps), [profiles, fullApps]);
  const projectTrophies = useMemo(() => topThreeProjectTrophies(fullApps), [fullApps]);
  const rankedProjects = useMemo(() => rankProjects(fullApps), [fullApps]);
  const projectRanks = useMemo(() => {
    const ranks = new Map<string, number>();
    rankedProjects.slice(0, 10).forEach((app, index) => {
      if (app.votes > 0) ranks.set(app.id, index + 1);
    });
    return ranks;
  }, [rankedProjects]);
  const [boardTab, setBoardTab] = useState<"developers" | "projects">("developers");

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePath(window.location.pathname);
      setView(parsed.view);
      setSelectedProfileId(parsed.profileId);
      setSelectedProfileName(parsed.profileName ?? null);
      setSelectedAppId(parsed.appId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    setProfilesError(null);
    (async () => {
      try {
        // Ensure a newly signed-in viewer exists before reading the directory.
        await refreshProfile().catch(() => undefined);
        const list = await getProfileRepo().listProfiles();
        if (cancelled) return;
        setProfiles(list);
      } catch (error) {
        if (!cancelled)
          setProfilesError(error instanceof Error ? error.message : "Could not load developers.");
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profileTick, refreshProfile]);

  // Bumped by the background poll below; threads + feedPosts rescan on it.
  const [pollTick, setPollTick] = useState(0);
  const feedPostReq = useRef(0);
  const loadFeedPosts = useCallback(
    async (quiet = false) => {
      const req = ++feedPostReq.current;
      if (!quiet) {
        setFeedPostsLoading(true);
        setFeedPostsError(null);
      }
      try {
        const items = await getAppRepo().listFeedPosts(user?.id);
        if (feedPostReq.current !== req) return;
        setFeedPosts(
          items.map((post) => {
            const vote = debouncedFeedVotes.project(
              { id: post.id, votes: post.cheers ?? 0, viewerHasVoted: post.viewerHasCheered },
              user?.id,
            );
            return { ...post, cheers: vote.votes, viewerHasCheered: vote.viewerHasVoted };
          }),
        );
      } catch (e) {
        if (!quiet && feedPostReq.current === req)
          setFeedPostsError(e instanceof Error ? e.message : "Could not load updates.");
      } finally {
        if (!quiet && feedPostReq.current === req) setFeedPostsLoading(false);
      }
    },
    [user?.id],
  );

  const feedIsVisible = view === "feeds";
  useEffect(() => {
    if (feedIsVisible || pollTick > 0) {
      void loadFeedPosts(pollTick > 0);
      return;
    }
    // Let the catalog and its first image paint before competing background requests.
    const timer = window.setTimeout(() => void loadFeedPosts(), 350);
    return () => window.clearTimeout(timer);
  }, [loadFeedPosts, pollTick, feedIsVisible]);

  const postFeedPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !feedPostBody.trim() || feedPostSubmitting) return;
    setFeedPostSubmitting(true);
    setFeedPostError(null);
    try {
      const created = await getAppRepo().postFeedPost(
        user,
        feedPostBody.trim(),
        feedPostAppId || undefined,
      );
      setFeedPosts((items) => [created, ...items]);
      setFeedPostBody("");
      setFeedPostAppId("");
    } catch (err) {
      setFeedPostError(err instanceof Error ? err.message : "Could not post update.");
    } finally {
      setFeedPostSubmitting(false);
    }
  };

  const deleteFeedPost = async (m: FeedPost) => {
    if (!user || m.authorId !== user.id) return;
    await getAppRepo().deleteFeedPost(m.id, user);
    ++feedPostReq.current;
    setFeedPosts((items) => items.filter((item) => item.id !== m.id));
    setOpenThreads((current) => {
      const next = new Set(current);
      next.delete(m.id);
      return next;
    });
  };

  useEffect(
    () =>
      debouncedFeedVotes.subscribe((update) => {
        if (update.userId !== user?.id) return;
        setFeedPosts((items) =>
          items.map((post) =>
            post.id === update.appId
              ? { ...post, cheers: update.votes, viewerHasCheered: update.viewerHasVoted }
              : post,
          ),
        );
        setCheerPending((prev) => {
          const next = new Set(prev);
          if (update.pending) next.add(update.appId);
          else next.delete(update.appId);
          return next;
        });
        if (update.error) setFeedPostsError(update.error);
      }),
    [user?.id],
  );

  const cheer = async (m: FeedPost) => {
    if (!user) return;
    if (!VOTE_RATE_LIMIT_ENABLED) {
      const userId = user.id;
      setFeedPostsError(null);
      debouncedFeedVotes.toggle(
        { id: m.id, votes: m.cheers ?? 0, viewerHasVoted: m.viewerHasCheered },
        userId,
        async (liked) => {
          const saved = await getAppRepo().setFeedPostCheer(m.id, userId, liked);
          return { id: saved.id, votes: saved.cheers ?? 0, viewerHasVoted: saved.viewerHasCheered };
        },
      );
      return;
    }
    if (cheerPending.has(m.id)) return;
    setCheerPending((prev) => new Set(prev).add(m.id));
    const wasCheered = Boolean(m.viewerHasCheered);
    setFeedPosts((items) =>
      items.map((x) =>
        x.id === m.id
          ? {
              ...x,
              viewerHasCheered: !wasCheered,
              cheers: Math.max(0, (x.cheers ?? 0) + (wasCheered ? -1 : 1)),
            }
          : x,
      ),
    );
    try {
      const updated = await getAppRepo().toggleFeedPostCheer(m.id, user.id);
      setFeedPosts((items) => items.map((x) => (x.id === m.id ? { ...x, ...updated } : x)));
    } catch {
      setFeedPosts((items) => items.map((x) => (x.id === m.id ? m : x)));
    } finally {
      setCheerPending((prev) => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
    }
  };

  const appsRequest = useRef(0);
  const loadApps = useCallback(
    async (quiet = false) => {
      const request = ++appsRequest.current;
      if (!quiet) {
        setAppsLoading(true);
        setAppsError(null);
      }
      try {
        const [filtered, all] = await loadCatalog(getAppRepo(), query, category, user?.id);
        if (request !== appsRequest.current) return;
        setApps(filtered.map((app) => debouncedVotes.project(app, user?.id)));
        setFullApps(all.map((app) => debouncedVotes.project(app, user?.id)));
      } catch (e) {
        if (!quiet && request === appsRequest.current)
          setAppsError(e instanceof Error ? e.message : "Could not load projects.");
      } finally {
        if (request === appsRequest.current) setAppsLoading(false);
      }
    },
    [query, category, user?.id],
  );

  useEffect(() => {
    void loadApps();
    return () => {
      appsRequest.current++;
    };
  }, [loadApps]);

  // Quiet background refresh (signed in, tab visible): picks up other
  // builders' projects, votes, comments, and feed posts so the bell can
  // chime without any taps. Silent flags — no loading spinners.
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void loadApps(true);
      void loadFeedPosts(true);
      setPollTick((t) => t + 1);
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [user?.id, loadApps, loadFeedPosts]);

  // ── Notifications (derived — no repo/backend changes) ───────────────────
  // Comment threads are scanned across my projects + the newest community
  // projects (capped). Vote "events" are count diffs vs the last read
  // snapshot, since per-vote timestamps don't exist in local mode.
  const [threads, setThreads] = useState<Map<string, Comment[]>>(new Map());
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [voteBaseline, setVoteBaseline] = useState<Record<string, number>>({});
  const [collabBaseline, setCollabBaseline] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [seenAt, setSeenAt] = useState<Record<string, string>>({});
  const [votersByApp, setVotersByApp] = useState<Map<string, Profile[]>>(new Map());
  const [voterBaseline, setVoterBaseline] = useState<Record<string, string[]>>({});
  const [voteCycles, setVoteCycles] = useState<Record<string, Record<string, number>>>({});
  const [likersByComment, setLikersByComment] = useState<Map<string, string[]>>(new Map());
  const [likeBaseline, setLikeBaseline] = useState<Record<string, string[]>>({});
  const [likeCycles, setLikeCycles] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (!user) {
      setReadIds([]);
      setVoteBaseline({});
      setVoterBaseline({});
      setVoteCycles({});
      setLikeBaseline({});
      setLikeCycles({});
      setCollabBaseline([]);
      setDismissedIds([]);
      setSeenAt({});
      prevUnreadCount.current = null;
      prevNotifIds.current = null;
      return;
    }
    const stored = loadNotificationState(user.id);
    setReadIds(stored.readIds);
    setVoteBaseline(stored.voteBaseline);
    setVoterBaseline(stored.voterBaseline);
    setVoteCycles(stored.voteCycles);
    setLikeBaseline(stored.likeBaseline);
    setLikeCycles(stored.likeCycles);
    setCollabBaseline(stored.collabBaseline);
    setDismissedIds(stored.dismissedIds);
    setSeenAt(stored.seenAt);
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setHasPassword(null);
      setPwSnoozed(false);
      return;
    }
    let cancelled = false;
    try {
      const until = Number(localStorage.getItem(`cc.pw_nudge.v1:${user.id}`) ?? 0);
      setPwSnoozed(Date.now() < until);
    } catch {
      setPwSnoozed(false);
    }
    void getAuthRepo()
      .hasPassword()
      .then((v) => {
        if (!cancelled) {
          cacheHasPassword(user.id, v);
          setHasPassword(v);
        }
      })
      .catch(() => {
        // Keep the last known display state when revalidation is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const snoozePasswordNudge = () => {
    if (!user) return;
    try {
      localStorage.setItem(`cc.pw_nudge.v1:${user.id}`, String(Date.now() + 7 * 24 * 3_600_000));
    } catch {
      // Private mode — session-only snooze still applies below.
    }
    setPwSnoozed(true);
  };

  const goPasswordSettings = () => {
    window.history.pushState({}, "", ROUTES.settings);
    setView("settings");
    setSelectedProfileId(null);
    setSelectedAppId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scanApps = useMemo(() => {
    if (!user) return [];
    const mine = fullApps.filter((a) =>
      a.creatorId ? a.creatorId === user.id : a.creator.toLowerCase() === user.name.toLowerCase(),
    );
    const mineIds = new Set(mine.map((a) => a.id));
    return [...mine, ...fullApps.filter((a) => !mineIds.has(a.id)).slice(0, NOTIF_SCAN_APP_LIMIT)];
  }, [fullApps, user]);

  const scanKey = useMemo(() => scanApps.map((a) => a.id).join(","), [scanApps]);

  useEffect(() => {
    if (!user || scanApps.length === 0) {
      setThreads(new Map());
      setThreadsLoading(false);
      return;
    }
    let cancelled = false;
    setThreadsLoading(true);
    const me = user;
    const mineIds = new Set(
      fullApps
        .filter((a) =>
          a.creatorId ? a.creatorId === me.id : a.creator.toLowerCase() === me.name.toLowerCase(),
        )
        .map((a) => a.id),
    );
    const notificationTimer = window.setTimeout(() => {
      void (async () => {
        const entries = await Promise.all(
          scanApps.map(async (app): Promise<[string, Comment[]]> => {
            try {
              return [app.id, await getAppRepo().listComments(app.id, user.id)];
            } catch {
              return [app.id, []];
            }
          }),
        );
        if (!cancelled) {
          setThreads(new Map(entries));
          setThreadsLoading(false);
        }
      })();
      void (async () => {
        // Voter presence for owned apps only. Failures keep prior sets (merge,
        // never replace), so a failed fetch never looks like a mass unvote.
        const results = await Promise.all(
          [...mineIds].map(async (id) => {
            try {
              return [id, await getAppRepo().listVoters(id)] as const;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setVotersByApp((prev) => {
          const next = new Map(prev);
          for (const r of results) if (r) next.set(r[0], r[1]);
          for (const id of [...next.keys()]) if (!mineIds.has(id)) next.delete(id);
          return next;
        });
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(notificationTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, scanKey, pollTick]);

  // Liker presence for my own comments only (one batched call per scan).
  // Failures keep prior sets, so a failed fetch never looks like mass unlikes.
  useEffect(() => {
    if (!user) return;
    const mine: string[] = [];
    for (const list of threads.values()) {
      for (const c of list) if (c.authorId === user.id) mine.push(c.id);
    }
    if (mine.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await getAppRepo().listCommentLikers(mine);
        if (!cancelled) setLikersByComment(new Map(Object.entries(result)));
      } catch {
        // Keep prior sets; retry on the next scan.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, threads, pollTick]);

  // Project ids currently tagging me (id or profile-name match). Drives both
  // the builder and the snapshot cleanup below.
  const currentlyTagged = useMemo(() => {
    if (!user) return [];
    return fullApps.filter((app) => isTaggedCollaborator(app, user, profiles)).map((app) => app.id);
  }, [user, fullApps, profiles]);
  const taggedKey = useMemo(() => [...currentlyTagged].sort().join(","), [currentlyTagged]);

  // First snapshot seeds silently: with no stored voter sets, current
  // voters count as seen so old votes don't flood as fake "new".
  const voterBase = useMemo(() => {
    if (Object.keys(voterBaseline).length > 0) return voterBaseline;
    const snap: Record<string, string[]> = {};
    for (const [id, list] of votersByApp) snap[id] = list.map((v) => v.id);
    return snap;
  }, [voterBaseline, votersByApp]);

  // Same first-run rule for comment likes: current likers count as seen.
  const likeBase = useMemo(() => {
    if (Object.keys(likeBaseline).length > 0) return likeBaseline;
    const snap: Record<string, string[]> = {};
    for (const [id, list] of likersByComment) snap[id] = [...list];
    return snap;
  }, [likeBaseline, likersByComment]);

  const notifications: NotificationItem[] = useMemo(() => {
    if (!user) return [];
    return buildNotifications({
      user,
      apps: fullApps,
      threads,
      feedPosts,
      voters: votersByApp,
      voterBaseline: voterBase,
      voteCycles,
      likers: likersByComment,
      likeBaseline: likeBase,
      likeCycles,
      collabBaseline,
      profiles,
      arrivalAt: seenAt,
    });
  }, [
    user,
    fullApps,
    threads,
    feedPosts,
    votersByApp,
    voterBase,
    voteCycles,
    likersByComment,
    likeBase,
    likeCycles,
    collabBaseline,
    profiles,
    seenAt,
  ]);

  // Single snapshot-sync writer (one effect = no lost updates between
  // competing saves). Converges — reruns are no-ops. It:
  // - stamps first-seen arrivals keyed by content version, so fresh news —
  //   including edits to already-listed items — sorts to the very top
  //   (pruned to the newest 400, always keeping currently listed keys);
  // - marks content-changed items unread again (unless explicitly deleted),
  //   so an edit resurfaces even after a mark-read;
  // - forgets cleared conditions so renewed activity notifies as new again:
  //   untagged projects leave the baseline, read receipts, and dismissals;
  //   vote items whose gain drained to zero leave the dismissals.
  // Skipped until apps finish loading: on fresh login fullApps is briefly
  // empty, and pruning against that empty world would wipe read receipts
  // and baselines — resurrecting everything already read on every login.
  useEffect(() => {
    if (!user || appsLoading || appsError) return;
    const missing = notifications.filter((n) => seenAt[arrivalKeyOf(n)] === undefined);
    let nextSeen = seenAt;
    if (missing.length > 0 || Object.keys(seenAt).length > 400) {
      const at = new Date().toISOString();
      nextSeen = { ...seenAt };
      for (const n of missing) nextSeen[arrivalKeyOf(n)] = at;
      if (Object.keys(nextSeen).length > 400) {
        const keep = new Set(notifications.map((n) => arrivalKeyOf(n)));
        const rest = Object.entries(nextSeen)
          .filter(([id]) => !keep.has(id))
          .sort(([, a], [, b]) => (a < b ? 1 : a > b ? -1 : 0));
        for (const [id] of rest.slice(0, Object.keys(nextSeen).length - 400)) {
          delete nextSeen[id];
        }
      }
    }
    // Renewed same-content items (re-tag, revived vote) would otherwise keep
    // their original stamp and sink — refresh to now so the list orders by
    // when news actually arrived.
    nextSeen = restampRearrived(
      notifications,
      prevNotifIds.current,
      nextSeen,
      new Date().toISOString(),
    );
    prevNotifIds.current = new Set(notifications.map((n) => n.id));
    const current = new Set(taggedKey ? taggedKey.split(",") : []);
    const votesById = new Map(fullApps.map((a) => [a.id, a.votes]));
    const voteGained = (appId: string) => {
      const votes = votesById.get(appId);
      if (votes === undefined) return 0;
      const before = typeof voteBaseline[appId] === "number" ? voteBaseline[appId] : votes;
      return votes - before;
    };
    // Presence tracking for per-voter appearances. Baseline follows the
    // latest successful fetch (failures keep prior sets upstream); each
    // disappearance bumps that voter's cycle so a later re-vote arrives
    // under a fresh id even with identical content.
    const ownedIds = new Set(
      fullApps
        .filter((a) =>
          a.creatorId
            ? a.creatorId === user.id
            : a.creator.toLowerCase() === user.name.toLowerCase(),
        )
        .map((a) => a.id),
    );
    const nextVoterBaseline: Record<string, string[]> = {};
    for (const [id, list] of votersByApp) {
      if (ownedIds.has(id)) nextVoterBaseline[id] = list.map((v) => v.id);
    }
    const nextCycles: Record<string, Record<string, number>> = {};
    for (const [id, counts] of Object.entries(voteCycles)) {
      if (ownedIds.has(id) && Object.keys(counts).length > 0) nextCycles[id] = { ...counts };
    }
    for (const [id, ids] of Object.entries(voterBaseline)) {
      if (!ownedIds.has(id)) continue;
      const now = new Set(nextVoterBaseline[id] ?? []);
      const counts = nextCycles[id] ?? {};
      for (const vid of ids) {
        if (!now.has(vid)) counts[vid] = (counts[vid] ?? 0) + 1;
      }
      if (Object.keys(counts).length > 0) nextCycles[id] = counts;
    }
    const votersSame =
      JSON.stringify(nextVoterBaseline) === JSON.stringify(voterBaseline) &&
      JSON.stringify(nextCycles) === JSON.stringify(voteCycles);
    // Same presence tracking for comment likes, scoped to comments still
    // present in scanned threads (deleted comments stop tracking).
    const liveCommentIds = new Set<string>();
    for (const list of threads.values()) {
      for (const c of list) if (c.authorId === user.id) liveCommentIds.add(c.id);
    }
    const nextLikeBaseline: Record<string, string[]> = {};
    for (const [id, list] of likersByComment) {
      if (liveCommentIds.has(id)) nextLikeBaseline[id] = [...list];
    }
    const nextLikeCycles: Record<string, Record<string, number>> = {};
    for (const [id, counts] of Object.entries(likeCycles)) {
      if (liveCommentIds.has(id) && Object.keys(counts).length > 0)
        nextLikeCycles[id] = { ...counts };
    }
    for (const [id, ids] of Object.entries(likeBaseline)) {
      if (!liveCommentIds.has(id)) continue;
      const now = new Set(nextLikeBaseline[id] ?? []);
      const counts = nextLikeCycles[id] ?? {};
      for (const uid of ids) {
        if (!now.has(uid)) counts[uid] = (counts[uid] ?? 0) + 1;
      }
      if (Object.keys(counts).length > 0) nextLikeCycles[id] = counts;
    }
    const likesSame =
      JSON.stringify(nextLikeBaseline) === JSON.stringify(likeBaseline) &&
      JSON.stringify(nextLikeCycles) === JSON.stringify(likeCycles);
    const droppedCollab = (id: string) => id.startsWith("collab:") && !current.has(id.slice(7));
    const drainedVote = (id: string) => id.startsWith("vote:") && voteGained(id.slice(5)) <= 0;
    const nextBaseline = collabBaseline.filter((id) => current.has(id));
    // A new content version is new information: unread it again, unless the
    // user explicitly deleted that item.
    const dismissedSet = new Set(dismissedIds);
    const refreshedIds = new Set(missing.filter((n) => !dismissedSet.has(n.id)).map((n) => n.id));
    const nextReadIds = readIds.filter((id) => !droppedCollab(id) && !refreshedIds.has(id));
    const nextDismissed = dismissedIds.filter((id) => !droppedCollab(id) && !drainedVote(id));
    // Stamps are write-once (never rewritten), so key-set comparison is exact.
    const nextSeenKeys = Object.keys(nextSeen);
    const seenSame =
      nextSeenKeys.length === Object.keys(seenAt).length &&
      nextSeenKeys.every((k) => seenAt[k] === nextSeen[k]);
    if (
      seenSame &&
      votersSame &&
      likesSame &&
      nextBaseline.length === collabBaseline.length &&
      nextReadIds.length === readIds.length &&
      nextDismissed.length === dismissedIds.length
    ) {
      return;
    }
    setSeenAt(nextSeen);
    setVoterBaseline(nextVoterBaseline);
    setVoteCycles(nextCycles);
    setLikeBaseline(nextLikeBaseline);
    setLikeCycles(nextLikeCycles);
    setCollabBaseline(nextBaseline);
    setReadIds(nextReadIds);
    setDismissedIds(nextDismissed);
    saveNotificationState(user.id, {
      readIds: nextReadIds,
      voteBaseline,
      voterBaseline: nextVoterBaseline,
      voteCycles: nextCycles,
      likeBaseline: nextLikeBaseline,
      likeCycles: nextLikeCycles,
      collabBaseline: nextBaseline,
      dismissedIds: nextDismissed,
      seenAt: nextSeen,
    });
  }, [
    user?.id,
    appsLoading,
    appsError,
    notifications,
    taggedKey,
    fullApps,
    voteBaseline,
    votersByApp,
    voterBaseline,
    voteCycles,
    likersByComment,
    likeBaseline,
    likeCycles,
    seenAt,
    readIds,
    collabBaseline,
    dismissedIds,
  ]);

  // Deleted (dismissed) items leave the visible list. Event ids stay gone
  // (new events get new ids); vote/collab ids resurface only when their
  // condition renews, via the snapshot-sync effect above.
  const dismissed = useMemo(() => new Set(dismissedIds), [dismissedIds]);
  const visibleItems = useMemo(
    () => notifications.filter((n) => !dismissed.has(n.id)),
    [notifications, dismissed],
  );

  const unreadIds = useMemo(
    () => new Set(visibleItems.filter((n) => !readIds.includes(n.id)).map((n) => n.id)),
    [visibleItems, readIds],
  );

  // Chime when new notifications arrive. The first snapshot is silent so a
  // full inbox doesn't blast on page load (and pre-interaction playback,
  // which browsers block, is swallowed by the sound helper anyway).
  // Reset on account switch in the user-load effect above so a fresh login
  // with a full inbox doesn't chime against the previous account's count.
  const prevUnreadCount = useRef<number | null>(null);
  // Ids from the previous sync run — detects absent→present transitions so
  // renewed same-content items re-stamp to now instead of their first date.
  const prevNotifIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const count = unreadIds.size;
    if (prevUnreadCount.current === null) {
      prevUnreadCount.current = count;
      return;
    }
    if (count > prevUnreadCount.current) playNotificationSound();
    prevUnreadCount.current = count;
  }, [unreadIds]);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    const next = {
      readIds: [...readIds, ...notifications.map((n) => n.id)],
      voteBaseline: currentVoteBaseline(fullApps, user),
      voterBaseline,
      voteCycles,
      likeBaseline,
      likeCycles,
      collabBaseline: currentlyTagged,
      dismissedIds,
      seenAt,
    };
    setReadIds(next.readIds);
    setVoteBaseline(next.voteBaseline);
    setCollabBaseline(next.collabBaseline);
    saveNotificationState(user.id, next);
  }, [
    user,
    readIds,
    notifications,
    fullApps,
    currentlyTagged,
    dismissedIds,
    seenAt,
    voterBaseline,
    voteCycles,
    likeBaseline,
    likeCycles,
  ]);

  const markNotificationRead = useCallback(
    (id: string) => {
      if (!user || readIds.includes(id)) return;
      // Preserve the snapshots — omitting them would wipe them on save.
      const next = {
        readIds: [...readIds, id],
        voteBaseline,
        voterBaseline,
        voteCycles,
        likeBaseline,
        likeCycles,
        collabBaseline,
        dismissedIds,
        seenAt,
      };
      setReadIds(next.readIds);
      saveNotificationState(user.id, next);
    },
    [
      user,
      readIds,
      voteBaseline,
      voterBaseline,
      voteCycles,
      likeBaseline,
      likeCycles,
      collabBaseline,
      dismissedIds,
      seenAt,
    ],
  );

  // Delete all: hide every visible item and snapshot the state-kind
  // conditions (votes, tags) so the box is truly empty until genuinely new
  // activity arrives. Event items (comments, projects, updates) stay gone —
  // future events arrive under new ids.
  const deleteAllNotifications = useCallback(() => {
    if (!user) return;
    const next = {
      readIds: [...readIds, ...visibleItems.map((n) => n.id)],
      voteBaseline: currentVoteBaseline(fullApps, user),
      voterBaseline,
      voteCycles,
      likeBaseline,
      likeCycles,
      collabBaseline: currentlyTagged,
      dismissedIds: [...dismissedIds, ...visibleItems.map((n) => n.id)],
      seenAt,
    };
    setReadIds(next.readIds);
    setVoteBaseline(next.voteBaseline);
    setCollabBaseline(next.collabBaseline);
    setDismissedIds(next.dismissedIds);
    saveNotificationState(user.id, next);
  }, [
    user,
    readIds,
    visibleItems,
    fullApps,
    currentlyTagged,
    dismissedIds,
    seenAt,
    voterBaseline,
    voteCycles,
    likeBaseline,
    likeCycles,
  ]);

  const openFeeds = useCallback(() => {
    window.history.pushState({}, "", ROUTES.feeds);
    setView("feeds");
    setSelectedProfileId(null);
    setSelectedAppId(null);
    setProjectEdit(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSignOut = async () => {
    window.history.replaceState({}, "", ROUTES.home);
    await signout();
  };
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [publishBonus, setPublishBonus] = useState<{ id: string; title: string } | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const changeNotificationsOpen = useCallback((open: boolean) => {
    setNotificationsOpen(open);
    if (open) setAccountMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!confirmSignOut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmSignOut(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [confirmSignOut]);
  useEffect(() => {
    if (!publishBonus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPublishBonus(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [publishBonus]);
  const goTab = (
    event: React.MouseEvent<HTMLAnchorElement>,
    nextView: Exclude<StoreView, "profile" | "project">,
  ) => {
    event.preventDefault();
    window.history.pushState({}, "", routeForView[nextView]);
    setView(nextView);
    setSelectedProfileId(null);
    setSelectedAppId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openProfile = useCallback(
    (profileId: string) => {
      const profile =
        profilesLookup.get(profileId) ??
        profilesLookup.get(`name:${profileId.trim().toLowerCase()}`);
      const path =
        profileId === "__me__" ? ROUTES.profile : developerProfilePath(profile?.name ?? profileId);
      window.history.pushState({}, "", path);
      setSelectedProfileId(profile?.id ?? profileId);
      setSelectedProfileName(null);
      setSelectedAppId(null);
      setView("profile");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [profilesLookup],
  );
  const openMyProfile = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (!user) return;
      setAccountMenuOpen(false);
      window.history.pushState({}, "", ROUTES.profile);
      setSelectedProfileId(user.id);
      setSelectedProfileName(null);
      setView("profile");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [user],
  );
  const openAppFromProfile = useCallback((appId: string) => {
    window.history.pushState({}, "", appDetailsPath(appId));
    setView("project");
    setSelectedProfileId(null);
    setSelectedAppId(appId);
    setProjectEdit(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const openApp = useCallback((appId: string, edit = false) => {
    window.history.pushState({}, "", appDetailsPath(appId));
    setView("project");
    setSelectedProfileId(null);
    setSelectedAppId(appId);
    setProjectEdit(edit);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const navClass = (item: Exclude<StoreView, "profile" | "project">) =>
    `flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-0 text-center text-xs font-black leading-tight lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left lg:text-base ${view === item ? "border-outline bg-secondary text-foreground shadow-[2px_2px_0_var(--color-outline)]" : "border-transparent shadow-[2px_2px_0_transparent] hover:bg-surface/15"}`;

  const goPath = (path: string, nextView: StoreView) => {
    window.history.pushState({}, "", path);
    setView(nextView);
    setSelectedProfileId(null);
    setSelectedAppId(null);
    setProjectEdit(false);
    window.scrollTo({ top: 0 });
  };

  type Crumb = { label: string; current?: boolean; go?: () => void };
  const profileForCrumb =
    selectedProfileId === "__me__" || (user && selectedProfileId === user.id)
      ? (myProfile ?? profiles.find((p) => user && p.id === user.id))
      : profiles.find(
          (p) =>
            p.id === selectedProfileId ||
            p.name.toLowerCase() === selectedProfileName?.toLowerCase(),
        );
  const appForCrumb =
    fullApps.find((a) => a.id === selectedAppId) ?? apps.find((a) => a.id === selectedAppId);
  const crumbs: Crumb[] = (() => {
    if (view === "discover") return [{ label: "discover", current: true }];
    if (view === "developers")
      return [
        { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
        { label: "developers", current: true },
      ];
    if (view === "feeds")
      return [
        { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
        { label: "feeds", current: true },
      ];
    if (view === "leaderboard")
      return [
        { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
        { label: "leaderboard", current: true },
      ];
    if (view === "settings")
      return [
        { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
        { label: "settings", current: true },
      ];
    if (view === "profile")
      return [
        { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
        { label: "developers", go: () => goPath(ROUTES.developers, "developers") },
        { label: profileForCrumb?.name ?? "profile", current: true },
      ];
    return [
      { label: "discover", go: () => goPath(ROUTES.discover, "discover") },
      { label: "project", go: () => goPath(ROUTES.discover, "discover") },
      { label: appForCrumb?.title ?? "project", current: true },
    ];
  })();

  const [votePending, setVotePending] = useState<Set<string>>(new Set());
  const [voteNotice, setVoteNotice] = useState<string | null>(null);
  const voteNoticeTimer = useRef<number | null>(null);
  // Epoch-ms until which liking is paused (set when the server says so).
  // Clicks inside the window ask the server for the live remainder instead
  // of firing toggles that would only bounce.
  const votePausedUntil = useRef(0);

  const flashVoteNotice = (message: string) => {
    setVoteNotice(message);
    if (voteNoticeTimer.current !== null) window.clearTimeout(voteNoticeTimer.current);
    voteNoticeTimer.current = window.setTimeout(() => {
      setVoteNotice(null);
      voteNoticeTimer.current = null;
    }, 6000);
  };

  useEffect(
    () =>
      debouncedVotes.subscribe((update) => {
        if (update.userId !== user?.id) return;
        const apply = (app: AppItem) =>
          app.id === update.appId
            ? { ...app, votes: update.votes, viewerHasVoted: update.viewerHasVoted }
            : app;
        setApps((items) => items.map(apply));
        setFullApps((items) => items.map(apply));
        setVotePending((prev) => {
          const next = new Set(prev);
          if (update.pending) next.add(update.appId);
          else next.delete(update.appId);
          return next;
        });
        if (update.error) flashVoteNotice(update.error);
      }),
    [user?.id],
  );

  const vote = (id: string) => {
    if (!user) return;
    const me = user;
    if (!VOTE_RATE_LIMIT_ENABLED) {
      const app = fullApps.find((item) => item.id === id) ?? apps.find((item) => item.id === id);
      if (app) {
        debouncedVotes.toggle(app, me.id, (liked) => getAppRepo().setVote(id, me.id, liked));
        playVoteSound();
      }
      return;
    }
    setVotePending((prev) => new Set(prev).add(id));
    // Serialized per app (see voteQueue): every click toggles exactly once,
    // in order. Rapid clicks queue instead of vanishing into the pending
    // guard, so the heart always converges to click parity on both surfaces.
    enqueueVote(id, async () => {
      const optimistic = optimisticVote(id);
      try {
        if (Date.now() < votePausedUntil.current) {
          const secs = await getAppRepo()
            .getVoteTimeoutSeconds()
            .catch(() => 0);
          const left = Math.max(secs, Math.ceil((votePausedUntil.current - Date.now()) / 1000));
          flashVoteNotice(`Liking is paused — ${formatCountdown(left)} left.`);
          return;
        }
        setApps((items) => items.map(optimistic.apply));
        setFullApps((items) => items.map(optimistic.apply));
        const updated = await getAppRepo().toggleVote(id, me.id);
        setApps((items) => items.map((app) => (app.id === id ? updated : app)));
        setFullApps((items) => items.map((app) => (app.id === id ? updated : app)));
        if (updated.pauseStarted) {
          // This click tripped the server's spam guard: the vote was rejected
          // and a server-side pause started. Mirror it locally so queued
          // clicks show the countdown — the server enforces it across
          // refreshes and devices either way.
          const secs = updated.pausedSeconds ?? 0;
          votePausedUntil.current = Date.now() + (secs > 0 ? secs * 1000 : 5 * 60_000);
          flashVoteNotice(
            `Spamming detected — liking is paused for ${formatCountdown(secs > 0 ? secs : 300)}.`,
          );
        } else {
          playVoteSound();
        }
      } catch (e) {
        setApps((items) => items.map(optimistic.revert));
        setFullApps((items) => items.map(optimistic.revert));
        // Rate-limit pauses land here too — say why the vote bounced, and
        // remember the pause so further clicks report time left, not toggles.
        const message = e instanceof Error ? e.message : "Could not like. Try again.";
        if (/paus|slow down/i.test(message)) {
          const secs = await getAppRepo()
            .getVoteTimeoutSeconds()
            .catch(() => 0);
          const windowMs = secs > 0 ? secs * 1000 : 5 * 60_000;
          votePausedUntil.current = Date.now() + windowMs;
          flashVoteNotice(secs > 0 ? `Liking is paused — ${formatCountdown(secs)} left.` : message);
        } else {
          flashVoteNotice(message);
        }
      } finally {
        setVotePending((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  // Restore a server-side vote pause after a page refresh: the pause lives
  // in the database (vote_timeouts), so it must reappear without waiting for
  // the next rejected click.
  useEffect(() => {
    if (!VOTE_RATE_LIMIT_ENABLED) return;
    if (!user) {
      votePausedUntil.current = 0;
      return;
    }
    let cancelled = false;
    void getAppRepo()
      .getVoteTimeoutSeconds()
      .then((secs) => {
        if (!cancelled && secs > 0) votePausedUntil.current = Date.now() + secs * 1000;
      })
      .catch(() => {
        // Enforcement stays server-side even if this prefetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim() || !desc.trim() || submitting || imageBusy) return;
    if (docs.trim().length > 50000) {
      setSubmitError(
        "This documentation exceeds the 50,000-character project limit. Download it or shorten it before publishing.",
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await getAppRepo().createApp(
        {
          title: title.trim(),
          description: desc.trim(),
          url: url.trim() ? url.trim() : undefined,
          repoUrl: repoUrl.trim() ? repoUrl.trim() : undefined,
          collaborators: [...new Set([...collabIds, ...extractMentionIds(desc, profiles)])],
          category: categoryInput,
          screenshots: screenshots.length ? screenshots : undefined,
          docs: docs.trim() ? docs.trim() : undefined,
        },
        user,
      );
      setApps((items) => [created, ...items]);
      setFullApps((items) => [created, ...items]);
      // Arm the tag for every tagged developer (except me): their next load
      // notifies as new, even across remove → re-add edit cycles.
      for (const id of created.collaborators ?? []) {
        if (id !== user.id) bumpCollabTag(id, created.id);
      }
      resetForm();
      setShowForm(false);
      setCategory("All");
      setQuery("");
      // Celebrate the publish: +20 developer-board points (see rankDevelopers).
      setPublishBonus({ id: created.id, title: created.title });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not publish project.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    submissionVersion.current += 1;
    repositoryRequest.current?.abort();
    repositoryRequest.current = null;
    setTitle("");
    setDesc("");
    setCollabIds([]);
    setUrl("");
    setRepoUrl("");
    setCategoryInput("Productivity");
    setScreenshots([]);
    setImgError(null);
    setImageBusy(false);
    setSubmitError(null);
    setDocs("");
    setDocsTab("write");
    setDocsPreviewReturnTab("write");
    setDocsFile(null);
    setRepositoryFiles([]);
    setSelectedRepositoryFiles([]);
    setRepositoryFilesLoading(false);
    setRepositoryFilesImporting(false);
    setRepositoryFilesError(null);
  };
  const closeSubmission = () => {
    if (submitting) return;
    resetForm();
    setShowForm(false);
  };
  const pickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const version = submissionVersion.current;
    setImageBusy(true);
    setImgError(null);
    try {
      const room = 3 - screenshots.length;
      const chosen = Array.from(files).slice(0, Math.max(0, room));
      const { fileToProjectImageDataUrl } = await import("../../utils/images");
      const compressed: string[] = [];
      for (const file of chosen) compressed.push(await fileToProjectImageDataUrl(file));
      if (version !== submissionVersion.current) return;
      setScreenshots((prev) => [...prev, ...compressed].slice(0, 3));
    } catch (e) {
      if (version !== submissionVersion.current) return;
      setImgError(e instanceof Error ? e.message : "Could not read those images.");
    } finally {
      if (version === submissionVersion.current) setImageBusy(false);
    }
  };

  const readMdFile = async (file: File | undefined) => {
    if (!file) return;
    const version = submissionVersion.current;
    try {
      const { name, text } = await readMarkdownFile(file);
      if (version !== submissionVersion.current) return;
      setDocs(text);
      setDocsFile(name);
      setDocsPreviewReturnTab("upload");
      setDocsTab("preview");
      setSubmitError(null);
    } catch (e) {
      if (version !== submissionVersion.current) return;
      setSubmitError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  // Docs import source: the repo link, falling back to the app link for
  // older projects that stored a GitHub URL there.
  const docsRepoUrl = repoUrl.trim() || (isGitHubRepositoryUrl(url) ? url.trim() : "");

  const resetRepositoryFiles = () => {
    repositoryRequest.current?.abort();
    setRepositoryFiles([]);
    setSelectedRepositoryFiles([]);
    setRepositoryFilesLoading(false);
    setRepositoryFilesImporting(false);
    setRepositoryFilesError(null);
  };

  const loadRepositoryFiles = async () => {
    if (!isGitHubRepositoryUrl(docsRepoUrl)) {
      setRepositoryFilesError("Enter a public GitHub repository URL above first.");
      return;
    }

    repositoryRequest.current?.abort();
    const controller = new AbortController();
    repositoryRequest.current = controller;
    setRepositoryFilesLoading(true);
    setRepositoryFilesError(null);
    setRepositoryFiles([]);
    setSelectedRepositoryFiles([]);
    try {
      const paths = await listGitHubMarkdownFiles(docsRepoUrl, controller.signal);
      if (controller.signal.aborted) return;
      setRepositoryFiles(paths);
      const readme = paths.find((path) => /^readme\.md$/i.test(path));
      if (readme) setSelectedRepositoryFiles([readme]);
      if (!paths.length)
        setRepositoryFilesError("No Markdown files were found in this repository.");
    } catch (cause) {
      if (!controller.signal.aborted) {
        setRepositoryFilesError(
          cause instanceof Error ? cause.message : "Could not list repository Markdown files.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setRepositoryFilesLoading(false);
    }
  };

  const importRepositoryFiles = async () => {
    if (!selectedRepositoryFiles.length || repositoryFilesImporting) return;

    repositoryRequest.current?.abort();
    const controller = new AbortController();
    repositoryRequest.current = controller;
    setRepositoryFilesImporting(true);
    setRepositoryFilesError(null);
    try {
      const files = await readGitHubMarkdownFiles(
        docsRepoUrl,
        selectedRepositoryFiles,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const combined = files.map(({ path, text }) => `# ${path}\n\n${text}`).join("\n\n---\n\n");
      setDocs(combined);
      setDocsFile(files.length === 1 ? files[0].path : `${files.length} repository Markdown files`);
      setDocsPreviewReturnTab("repository");
      setDocsTab("preview");
      setSubmitError(null);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setRepositoryFilesError(
          cause instanceof Error ? cause.message : "Could not import repository Markdown files.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setRepositoryFilesImporting(false);
    }
  };

  const downloadDocumentation = () => {
    const objectUrl = URL.createObjectURL(
      new Blob([docs], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "documentation.md";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  return {
    accountMenuOpen,
    apps,
    appsError,
    appsLoading,
    boardTab,
    profilesLoading,
    profilesError,
    categories,
    category,
    categoryInput,
    changeNotificationsOpen,
    cheer,
    cheerPending,
    collabIds,
    closeSubmission,
    confirmSignOut,
    copyForView,
    countFor,
    crumbs,
    deleteAllNotifications,
    desc,
    devQuery,
    docs,
    docsFile,
    docsPreviewReturnTab,
    docsRepoUrl,
    docsTab,
    downloadDocumentation,
    expandedId,
    deleteFeedPost,
    filteredFeedPosts,
    filteredProfiles,
    fullApps,
    goPasswordSettings,
    goPath,
    goTab,
    hasPassword,
    hasSubmittedProject,
    imageBusy,
    imgError,
    importRepositoryFiles,
    loadApps,
    loadFeedPosts,
    loadRepositoryFiles,
    feedPostAppId,
    feedPostBody,
    feedPostError,
    feedPostSubmitting,
    markAllNotificationsRead,
    markNotificationRead,
    feedPosts,
    feedPostsError,
    feedPostsLoading,
    feedQuery,
    myProfile,
    navClass,
    notificationsOpen,
    openApp,
    openAppFromProfile,
    openFeeds,
    openMyProfile,
    openProfile,
    openThreads,
    pickImages,
    postFeedPost,
    profiles,
    profilesLookup,
    projectEdit,
    projectRanks,
    projectTrophies,
    publishBonus,
    pwSnoozed,
    query,
    rankedDevelopers,
    rankedProjects,
    readMdFile,
    repoUrl,
    repositoryFiles,
    repositoryFilesError,
    repositoryFilesImporting,
    repositoryFilesLoading,
    resetRepositoryFiles,
    screenshots,
    seenAt,
    selectedAppId,
    selectedProfileId,
    selectedProfileName,
    selectedRepositoryFiles,
    setAccountMenuOpen,
    setApps,
    setBoardTab,
    setCategory,
    setCategoryInput,
    setCollabIds,
    setConfirmSignOut,
    setDesc,
    setDevQuery,
    setDocs,
    setDocsFile,
    setDocsPreviewReturnTab,
    setDocsTab,
    setExpandedId,
    setFullApps,
    setHasPassword,
    setFeedPostAppId,
    setFeedPostBody,
    setFeedQuery,
    setNotificationsOpen,
    setProfileTick,
    setProjectEdit,
    setPublishBonus,
    setPwSnoozed,
    setQuery,
    setRepoUrl,
    setScreenshots,
    setSelectedAppId,
    setSelectedProfileId,
    setSelectedProfileName,
    setSelectedRepositoryFiles,
    setShowForm,
    setTitle,
    setUrl,
    setView,
    showForm,
    handleSignOut,
    snoozePasswordNudge,
    submit,
    submitError,
    submitting,
    threadsLoading,
    title,
    toggleThread,
    trophies,
    unreadIds,
    url,
    user,
    view,
    visibleItems,
    vote,
    voteNotice,
    setVoteNotice,
  };
}

export type StoreController = ReturnType<typeof useStoreController>;
