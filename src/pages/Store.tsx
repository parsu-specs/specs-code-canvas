import ErrorNotice from "../components/ErrorNotice";
import { HalloweenDecorations } from "../experiments/halloweenTheme";
import { createPortal } from "react-dom";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { lazyPage } from "../utils/lazyPage";
import { StoreContentSkeleton } from "../components/Skeleton";
import {
  Plus,
  Gear,
  MagnifyingGlass,
  Newspaper,
  SignOut,
  Trophy,
  User as UserIcon,
  UsersThree,
  House,
  Info,
} from "@phosphor-icons/react";
import Brand from "../components/Brand";
import AppearanceControl from "../components/AppearanceControl";
import ErrorBoundary from "../components/ErrorBoundary";
import NotificationBell from "../components/NotificationBell";
import Avatar from "../components/Avatar";
import TrophyMark from "../components/TrophyMark";
import Modal from "../components/Modal";
import Popover from "../components/Popover";
import { Button, ButtonLink } from "../components/Button";
import { ROUTES, navigateInternalLink } from "./routes";
import useStoreController from "./store/useStoreController";
import ProjectSubmissionPrompt from "./store/ProjectSubmissionPrompt";
import DiscoverPage from "./store/DiscoverPage";
const DevelopersPage = lazyPage(() => import("./store/DevelopersPage"));
const FeedsPage = lazyPage(() => import("./store/FeedsPage"));
const LeaderboardPage = lazyPage(() => import("./store/LeaderboardPage"));
const ProfilePage = lazyPage(() => import("./store/ProfilePage"));
const ProjectPage = lazyPage(() => import("./store/ProjectPage"));
const SettingsPage = lazyPage(() => import("./store/SettingsPage"));

export default function Store() {
  useEffect(() => {
    const root = document.documentElement;
    const themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    const syncThemeColor = () => {
      themeColor.content = getComputedStyle(root).getPropertyValue("--color-brand-surface").trim();
    };
    syncThemeColor();
    document.head.appendChild(themeColor);
    const observer = new MutationObserver(syncThemeColor);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-palette", "data-mode", "style"],
    });
    return () => {
      observer.disconnect();
      themeColor.remove();
    };
  }, []);

  const store = useStoreController();
  const {
    accountMenuOpen,
    changeNotificationsOpen,
    confirmSignOut,
    copyForView,
    crumbs,
    deleteAllNotifications,
    goPath,
    goTab,
    markAllNotificationsRead,
    markNotificationRead,
    myProfile,
    navClass,
    notificationsOpen,
    openApp,
    openFeeds,
    openMyProfile,
    publishBonus,
    seenAt,
    setAccountMenuOpen,
    setConfirmSignOut,
    setNotificationsOpen,
    setPublishBonus,
    handleSignOut,
    threadsLoading,
    trophies,
    unreadIds,
    user,
    view,
    visibleItems,
    voteNotice,
    setVoteNotice,
  } = store;
  const [dismissedPromptFor, setDismissedPromptFor] = useState<string | null>(null);
  const [confirmPromptDismissal, setConfirmPromptDismissal] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const promptStorageKey = `codecanvas:submission-prompt:${import.meta.env.VITE_SUPABASE_URL ?? "local"}:${user?.id ?? "visitor"}`;
  const savedPromptDismissed = useMemo(() => {
    try {
      return localStorage.getItem(promptStorageKey) === "hidden";
    } catch {
      return false;
    }
  }, [promptStorageKey]);
  const promptDismissed = savedPromptDismissed || Boolean(user && dismissedPromptFor === user.id);
  const dismissPrompt = (permanent: boolean) => {
    if (!user) return;
    if (permanent) {
      try {
        localStorage.setItem(promptStorageKey, "hidden");
      } catch {
        // The prompt still stays dismissed for this session when storage is unavailable.
      }
    }
    setDismissedPromptFor(user.id);
    setConfirmPromptDismissal(false);
    requestAnimationFrame(() => submitButtonRef.current?.focus());
  };
  const pageTitle = copyForView[view]?.title?.trim();
  const pageDescription = copyForView[view]?.description?.trim();
  const myTrophy = myProfile ? trophies.get(myProfile.id) : undefined;
  return (
    <div className="min-h-screen overflow-x-clip">
      <aside className="halloween-sidebar fixed inset-x-0 top-0 z-40 h-header border-b-[3px] border-outline bg-brand-surface px-3 py-5 text-brand-foreground sm:px-5 lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:h-screen lg:w-sidebar lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r-[3px] lg:p-7">
        <div className="hidden min-w-0 shrink-0 items-center justify-between max-w-full lg:flex">
          <Brand light text size="navigation" />
        </div>
        <nav
          className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] grid-cols-4 gap-1 border-t-2 border-outline bg-brand-surface p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:gap-2 lg:static lg:mt-12 lg:flex lg:h-auto lg:shrink-0 lg:flex-col lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0 lg:pr-1 max-w-full"
          aria-label="Main navigation"
        >
          <ButtonLink
            variant="plain"
            href={ROUTES.feeds}
            onClick={(event) => goTab(event, "feeds")}
            className={`${navClass("feeds")} lg:order-3`}
          >
            <Newspaper size={22} weight="duotone" />
            <span>Feeds</span>
          </ButtonLink>
          <ButtonLink
            variant="plain"
            href={ROUTES.discover}
            onClick={(event) => goTab(event, "discover")}
            className={`${navClass("discover")} lg:order-1`}
          >
            <MagnifyingGlass size={21} weight="duotone" />
            Discover
          </ButtonLink>
          <ButtonLink
            variant="plain"
            href={ROUTES.developers}
            onClick={(event) => goTab(event, "developers")}
            className={`${navClass("developers")} lg:order-2`}
          >
            <UsersThree size={22} weight="duotone" />
            Developers
          </ButtonLink>
          <ButtonLink
            variant="plain"
            href={ROUTES.leaderboard}
            onClick={(event) => goTab(event, "leaderboard")}
            className={`${navClass("leaderboard")} lg:order-4`}
          >
            <Trophy size={22} weight="duotone" />
            Leaderboard
          </ButtonLink>
          <ButtonLink
            variant="plain"
            href={ROUTES.settings}
            onClick={(event) => goTab(event, "settings")}
            className={`${navClass("settings")} hidden lg:flex lg:order-6`}
          >
            <Gear size={22} weight="duotone" />
            Settings
          </ButtonLink>
        </nav>
        <div className="hidden shrink-0 pt-6 lg:mt-auto lg:block">
          {view === "discover" && user && store.canSubmitProject && !promptDismissed && (
            <ProjectSubmissionPrompt
              hasSubmittedProject={store.hasSubmittedProject}
              showForm={store.showForm}
              onSubmit={() => store.setShowForm(true)}
              onDismiss={() => setConfirmPromptDismissal(true)}
              className="mb-6"
            />
          )}
          <nav
            aria-label="Website"
            className="border-t-2 border-dashed border-brand-foreground/25 pt-4"
          >
            <ButtonLink
              variant="plain"
              href={ROUTES.about}
              onClick={navigateInternalLink}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-2 text-sm hover:bg-surface/15"
            >
              <span>About</span> <Info size={20} weight="duotone" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              variant="plain"
              href={ROUTES.home}
              onClick={navigateInternalLink}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-2 text-sm hover:bg-surface/15"
            >
              <span>Home</span> <House size={20} weight="duotone" aria-hidden="true" />
            </ButtonLink>
          </nav>
        </div>
        <HalloweenDecorations placement="sidebar" />
      </aside>

      {confirmPromptDismissal && (
        <Modal
          id="dismiss-submission-prompt"
          title="Hide project reminder?"
          description="You can still submit a project using the button beside projects."
          onClose={() => setConfirmPromptDismissal(false)}
        >
          <p className="text-sm font-bold text-body">
            Choose Later to hide it for this visit, or Never show again to remember your choice on
            this device.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button variant="surface" size="small" onClick={() => dismissPrompt(false)}>
              Later
            </Button>
            <Button variant="primary" size="small" onClick={() => dismissPrompt(true)}>
              Never show again
            </Button>
          </div>
        </Modal>
      )}

      {confirmSignOut &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm sign out"
            onClick={() => setConfirmSignOut(false)}
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="toon-card my-auto w-full max-w-sm overflow-hidden bg-panel text-center"
            >
              <div className="border-b-[3px] border-outline bg-primary text-primary-foreground p-6">
                <SignOut size={28} weight="duotone" className="mx-auto" />
                <h2 className="mt-3 text-xl font-black">Sign out?</h2>
              </div>
              <div className="modal-grid bg-panel p-6">
                <p className="mt-1 text-sm font-bold text-muted">
                  Are you sure you want to sign out?
                </p>
                <div className="min-w-0 mt-5 flex flex-wrap justify-center gap-3 max-w-full">
                  <Button
                    variant="surface"
                    size="small"
                    onClick={() => setConfirmSignOut(false)}
                    autoFocus
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setConfirmSignOut(false);
                      void handleSignOut();
                    }}
                  >
                    Yes, sign out
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {publishBonus &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Project published"
            onClick={() => setPublishBonus(null)}
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-inverse/80 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="toon-card my-auto w-full max-w-sm overflow-hidden bg-panel text-center"
            >
              <div className="border-b-[3px] border-outline bg-primary text-primary-foreground p-6">
                <Trophy size={40} weight="duotone" className="mx-auto" />
                <h2 className="mt-3 text-xl font-black">Project published!</h2>
              </div>
              <div className="modal-grid bg-panel p-6">
                <p className="mt-1 text-sm font-bold text-muted">
                  {publishBonus.title} is live — plus 20 pts on the developer leaderboard.
                </p>
                <div className="min-w-0 mt-5 flex justify-center gap-3 max-w-full">
                  <Button
                    variant="surface"
                    size="small"
                    onClick={() => setPublishBonus(null)}
                    autoFocus
                  >
                    Keep exploring
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      openApp(publishBonus.id);
                      setPublishBonus(null);
                    }}
                  >
                    View project
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {voteNotice && <ErrorNotice message={voteNotice} onDismiss={() => setVoteNotice(null)} />}

      <div className="min-w-0">
        <header className="fixed inset-x-0 top-0 z-60 flex h-header items-center justify-between gap-3 border-b-[3px] border-outline bg-brand-surface px-3 sm:px-5 lg:left-sidebar lg:z-40 lg:gap-4 lg:bg-panel lg:px-8 lg:py-4">
          <div className="min-w-0 text-brand-foreground lg:hidden">
            <div className="block sm:hidden">
              <Brand light monogram size="navigation" className="ml-2" />
            </div>
            <div className="hidden sm:block">
              <Brand light text size="navigation" />
            </div>
          </div>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 text-sm lg:block">
            <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-2 max-w-full">
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-3 max-w-full">
                  {i > 0 && (
                    <span aria-hidden="true" className="font-black">
                      \
                    </span>
                  )}
                  {c.current || !c.go ? (
                    <span
                      aria-current={c.current ? "page" : undefined}
                      title={c.label}
                      className={`min-w-0 max-w-full wrap-anywhere px-2 py-0.5 font-black ${c.current ? "rounded-lg border-2 border-outline bg-secondary" : ""}`}
                    >
                      {c.label}
                    </span>
                  ) : (
                    <Button variant="ghost" onClick={c.go} title={`Go to ${c.label}`}>
                      {c.label}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="relative min-w-0 max-w-full shrink-0 lg:max-w-[45%]">
            <div className="relative flex min-w-0 max-w-full items-center gap-2">
              <div className="shrink-0">
                <AppearanceControl compact />
              </div>
              {user && (
                <NotificationBell
                  items={visibleItems}
                  unreadIds={unreadIds}
                  arrivalAt={seenAt}
                  loading={threadsLoading}
                  open={notificationsOpen}
                  onOpenChange={changeNotificationsOpen}
                  onOpenApp={(appId) => openApp(appId)}
                  onOpenFeed={openFeeds}
                  onMarkAllRead={markAllNotificationsRead}
                  onMarkRead={markNotificationRead}
                  onDeleteAll={deleteAllNotifications}
                />
              )}
              <Popover
                open={accountMenuOpen}
                onOpenChange={setAccountMenuOpen}
                id="account-menu"
                label="Profile and site menu"
                className="w-80 gap-2 p-3 text-sm"
                trigger={
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact-icon"
                    aria-label="Open profile and site menu"
                    title={myProfile?.name ?? "Account"}
                    aria-haspopup="dialog"
                    aria-expanded={accountMenuOpen}
                    aria-controls={accountMenuOpen ? "account-menu" : undefined}
                    onClick={() => {
                      setNotificationsOpen(false);
                      setAccountMenuOpen((open) => !open);
                    }}
                    className="shrink-0 [&>span:last-child]:p-0 md:[&>span:last-child]:p-1"
                  >
                    <span className="flex min-w-0 items-center gap-0 md:gap-2">
                      {myProfile ? (
                        <Avatar
                          name={myProfile.name}
                          color={myProfile.color}
                          imageUrl={myProfile.imageUrl}
                          size="sm"
                          className="h-7! w-7! rounded-full border-0! scale-102 text-xs! text-foreground md:h-5! md:w-5! md:rounded-[10px]! md:text-[10px]!"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full md:h-5 md:w-5 md:rounded-[10px]"
                        >
                          <UserIcon size={20} weight="duotone" />
                        </span>
                      )}
                      <span className="hidden max-w-32 truncate pr-1 text-xs font-black md:block">
                        {myProfile?.name ?? "Account"}
                      </span>
                    </span>
                  </Button>
                }
              >
                {myProfile && (
                  <Button
                    variant="menu"
                    type="button"
                    onClick={() => openMyProfile()}
                    aria-label={`View ${myProfile.name}'s profile`}
                    aria-current={view === "profile" ? "page" : undefined}
                    className="gap-3 rounded-xl border-2 border-outline bg-background px-3 py-4 hover:bg-secondary"
                  >
                    <Avatar
                      name={myProfile.name}
                      color={myProfile.color}
                      imageUrl={myProfile.imageUrl}
                      size="sm"
                      className="h-12! w-12! shrink-0 border-outline! text-base!"
                    />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block wrap-anywhere text-base font-black">
                        {myProfile.name}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-muted">
                        Community member
                      </span>
                    </span>
                    {myTrophy !== undefined && <TrophyMark minimal place={myTrophy} size={28} />}
                  </Button>
                )}
                <div className="space-y-1 lg:hidden">
                  <Button
                    variant="menu"
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      goPath(ROUTES.settings, "settings");
                    }}
                    aria-current={view === "settings" ? "page" : undefined}
                    className="min-h-11 justify-between! px-3 aria-[current=page]:bg-background aria-[current=page]:text-primary"
                  >
                    <span>Settings</span>
                    <Gear size={20} weight="duotone" />
                  </Button>
                </div>
                <div className="space-y-1 border-t-2 border-dashed border-outline/15 pt-2 lg:hidden">
                  <ButtonLink
                    variant="plain"
                    href={ROUTES.about}
                    onClick={(event) => {
                      setAccountMenuOpen(false);
                      navigateInternalLink(event);
                    }}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-background"
                  >
                    <span>About</span> <Info size={20} weight="duotone" aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink
                    variant="plain"
                    href={ROUTES.home}
                    onClick={(event) => {
                      setAccountMenuOpen(false);
                      navigateInternalLink(event);
                    }}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-background"
                  >
                    <span>Home</span> <House size={20} weight="duotone" aria-hidden="true" />
                  </ButtonLink>
                </div>
                <div className="border-t-2 border-dashed border-outline/15 pt-2">
                  <Button
                    variant="menu"
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setConfirmSignOut(true);
                    }}
                    className="min-h-11 justify-between! px-3 text-danger hover:bg-danger/10"
                  >
                    <span>Sign out</span>
                    <SignOut size={20} weight="bold" />
                  </Button>
                </div>
              </Popover>
            </div>
          </div>
        </header>
        <div className="min-w-0 max-w-full px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] pt-[calc(var(--spacing-header)+1.5rem)] sm:px-8 sm:pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] sm:pt-[calc(var(--spacing-header)+2rem)] lg:ml-sidebar lg:p-10 lg:pt-[calc(var(--spacing-header)+2.5rem)]">
          {(pageTitle || pageDescription) && (
            <header id="discover" className="mx-auto max-w-6xl scroll-mt-5">
              <div className="min-w-0 flex flex-wrap items-center justify-between gap-3 max-w-full">
                <div className="flex-1">
                  {pageTitle && <h1 className="text-2xl font-black sm:text-3xl">{pageTitle}</h1>}
                  {pageDescription && (
                    <p className="mt-2 hidden max-w-2xl text-muted sm:block">{pageDescription}</p>
                  )}
                </div>
                {view === "discover" && user && store.canSubmitProject && promptDismissed && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => store.setShowForm(true)}
                    aria-haspopup="dialog"
                    aria-expanded={store.showForm}
                    aria-controls="submit-project"
                    ref={submitButtonRef}
                    aria-label="Submit project"
                  >
                    <Plus size={18} weight="bold" aria-hidden="true" />
                    <span className="hidden lg:inline">Submit project</span>
                  </Button>
                )}
              </div>
            </header>
          )}
          <ErrorBoundary name={view} key={view}>
            <div
              className={`@container/content mx-auto min-w-0 max-w-6xl wrap-anywhere ${pageTitle || pageDescription ? "mt-5 sm:mt-6" : ""}`}
            >
              {view === "discover" && (
                <DiscoverPage
                  {...store}
                  promptDismissed={promptDismissed}
                  onDismissPrompt={() => setConfirmPromptDismissal(true)}
                />
              )}

              <Suspense fallback={<StoreContentSkeleton view={view} />}>
                {view === "project" && <ProjectPage {...store} />}

                {view === "profile" && <ProfilePage {...store} />}

                {view === "developers" && <DevelopersPage {...store} />}

                {view === "feeds" && <FeedsPage {...store} />}

                {view === "leaderboard" && <LeaderboardPage {...store} />}

                {view === "settings" && <SettingsPage {...store} />}
              </Suspense>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
