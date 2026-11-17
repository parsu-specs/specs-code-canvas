import { userFacingError } from "../../utils/userFacingError";
import { useViewLayout } from "../../utils/useViewLayout";
import { useSheetPresence } from "../../components/useSheetPresence";
import { LockKey, MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react";
import ProjectSubmissionPrompt from "./ProjectSubmissionPrompt";
import AppCard from "../../components/AppCard";
import ViewLayoutControl from "../../components/ViewLayoutControl";
import { AppCardsSkeleton } from "../../components/Skeleton";
import { PostTimeProvider } from "../../components/PostTimestamp";
import NoticeBanner from "../../components/NoticeBanner";
import { Button } from "../../components/Button";
import SearchField from "../../components/SearchField";
import Dropdown from "../../components/Dropdown";
import SubmitProjectModal, { type SubmitProjectModalProps } from "./SubmitProjectModal";
import type { StoreController } from "./useStoreController";

type Props = { promptDismissed: boolean; onDismissPrompt: () => void } & SubmitProjectModalProps &
  Pick<
    StoreController,
    | "apps"
    | "canSubmitProject"
    | "appsError"
    | "appsLoading"
    | "categories"
    | "category"
    | "expandedId"
    | "goPasswordSettings"
    | "hasPassword"
    | "hasSubmittedProject"
    | "loadApps"
    | "openApp"
    | "openProfile"
    | "profilesLookup"
    | "projectRanks"
    | "pwSnoozed"
    | "query"
    | "setApps"
    | "setCategory"
    | "setExpandedId"
    | "setFullApps"
    | "setQuery"
    | "setShowForm"
    | "showForm"
    | "snoozePasswordNudge"
    | "trophies"
    | "user"
    | "vote"
  >;

export default function DiscoverPage(props: Props) {
  const {
    apps,
    appsError,
    appsLoading,
    categories,
    category,
    expandedId,
    goPasswordSettings,
    hasPassword,
    hasSubmittedProject,
    loadApps,
    openApp,
    openProfile,
    profilesLookup,
    projectRanks,
    pwSnoozed,
    query,
    setApps,
    setCategory,
    setExpandedId,
    setFullApps,
    setQuery,
    setShowForm,
    showForm,
    snoozePasswordNudge,
    trophies,
    user,
    vote,
  } = props;
  const submissionSheet = useSheetPresence(showForm && props.canSubmitProject);
  const [layout, setLayout] = useViewLayout("discover");
  return (
    <PostTimeProvider>
      {user && props.canSubmitProject && !props.promptDismissed && (
        <ProjectSubmissionPrompt
          hasSubmittedProject={hasSubmittedProject}
          showForm={showForm}
          onSubmit={() => setShowForm(true)}
          onDismiss={props.onDismissPrompt}
          className="mb-5 lg:hidden"
        />
      )}
      {submissionSheet.present && (
        <SubmitProjectModal {...props} exiting={submissionSheet.closing} />
      )}
      {user && !props.canSubmitProject && (
        <p className="mb-5 rounded-xl border-2 border-outline bg-surface p-4 text-sm font-bold">
          Your account is a Guest. You can browse and post in the feed. An admin must approve your
          account as a Member before you can submit projects.
        </p>
      )}
      <section id="apps" className="mt-2 scroll-mt-6">
        {user && hasPassword === false && !pwSnoozed && (
          <NoticeBanner
            icon={LockKey}
            title="Unlock email sign-in"
            description="You joined with Google, so no password is set. Add one to sign in with email too."
            tone="secondary"
            className="mb-6"
          >
            <Button variant="surface" size="small" type="button" onClick={snoozePasswordNudge}>
              Later
            </Button>
            <Button variant="secondary" size="small" type="button" onClick={goPasswordSettings}>
              Add password
            </Button>
          </NoticeBanner>
        )}
        <div className="mb-4 md:mb-6">
          <SearchField
            aria-label="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects or developers..."
          >
            <div className="shrink-0 md:hidden">
              <Dropdown
                triggerVariant="minimal"
                mobileIcon={<SlidersHorizontal size={20} weight="duotone" aria-hidden="true" />}
                label="Project categories"
                value={category}
                onChange={(value) => {
                  const selected = categories.find(({ label }) => label === value);
                  if (selected) setCategory(selected.label);
                }}
                options={categories.map(({ label, Icon }) => ({
                  value: label,
                  label,
                  icon: <Icon size={19} weight="duotone" />,
                }))}
                variant="icons"
              />
            </div>
          </SearchField>
        </div>
        <div
          className="min-w-0 mb-6 hidden flex-wrap gap-2 max-w-full md:flex"
          role="group"
          aria-label="Project categories"
        >
          {categories.map(({ label, Icon }) => (
            <Button
              variant="outline-flat"
              size="small"
              key={label}
              onClick={() => setCategory(label)}
              aria-pressed={category === label}
            >
              <Icon size={19} weight="duotone" />
              {label}
            </Button>
          ))}
        </div>
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <p role="status" className="min-w-0 text-sm text-muted">
            {appsLoading
              ? "Loading projects..."
              : appsError
                ? "Projects unavailable"
                : `${apps.length} project${apps.length === 1 ? "" : "s"}`}
          </p>
          <ViewLayoutControl label="Project view" value={layout} onChange={setLayout} />
        </div>
        {appsLoading && apps.length === 0 ? (
          <AppCardsSkeleton layout={layout} />
        ) : appsError ? (
          <div className="toon-card toon-paper bg-panel p-10 text-center">
            <h3 className="mt-3 text-xl font-black">Could not load projects</h3>
            <p className="font-bold text-muted">{userFacingError(appsError)}</p>
            <Button variant="secondary" onClick={() => void loadApps()} className="mt-5">
              Retry
            </Button>
          </div>
        ) : apps.length ? (
          <div
            aria-busy={appsLoading}
            className={`min-w-0 motion-safe:[&>*:nth-child(-n+6)]:animate-content-in ${layout === "list" ? "mx-auto grid w-full max-w-3xl grid-cols-1 gap-3" : "discovery-grid max-w-full"}`}
          >
            {apps.map((app, index) => (
              <AppCard
                key={app.id}
                app={app}
                layout={layout}
                priority={index === 0}
                eager={index < 3}
                voted={Boolean(app.viewerHasVoted)}
                onVote={(id) => void vote(id)}
                user={user ?? null}
                expanded={expandedId === app.id}
                onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                onCommentAdded={(appId, count) => {
                  setApps((items) =>
                    items.map((a) => (a.id === appId ? { ...a, comments: count } : a)),
                  );
                  setFullApps((items) =>
                    items.map((a) => (a.id === appId ? { ...a, comments: count } : a)),
                  );
                }}
                profiles={profilesLookup}
                trophies={trophies}
                projectRanks={projectRanks}
                onOpenProfile={openProfile}
                onOpenApp={(id) => openApp(id)}
              />
            ))}
          </div>
        ) : (
          <div className="toon-card toon-paper bg-panel p-10 text-center">
            <MagnifyingGlass size={36} className="mx-auto" />
            <h3 className="mt-3 text-xl font-black">No projects found</h3>
            <p className="font-bold text-muted">Adjust your search or category filter.</p>
          </div>
        )}
      </section>
    </PostTimeProvider>
  );
}
