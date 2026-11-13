import { userFacingError } from "../../utils/userFacingError";
import { LockKey, MagnifyingGlass } from "@phosphor-icons/react";
import ProjectSubmissionPrompt from "./ProjectSubmissionPrompt";
import AppCard from "../../components/AppCard";
import { AppCardsSkeleton } from "../../components/Skeleton";
import { PostTimeProvider } from "../../components/PostTimestamp";
import NoticeBanner from "../../components/NoticeBanner";
import { Button } from "../../components/Button";
import Input from "../../components/Input";
import Dropdown from "../../components/Dropdown";
import SubmitProjectModal, { type SubmitProjectModalProps } from "./SubmitProjectModal";
import type { StoreController } from "./useStoreController";

type Props = { promptDismissed: boolean; onDismissPrompt: () => void } & SubmitProjectModalProps &
  Pick<
    StoreController,
    | "apps"
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
  return (
    <PostTimeProvider>
      {user && !appsError && !props.promptDismissed && (
        <ProjectSubmissionPrompt
          hasSubmittedProject={hasSubmittedProject}
          showForm={showForm}
          onSubmit={() => setShowForm(true)}
          onDismiss={props.onDismissPrompt}
          className="mb-5 lg:hidden"
          loading={appsLoading && apps.length === 0}
        />
      )}
      {showForm && <SubmitProjectModal {...props} />}
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
        <label className="relative mb-6 block">
          <span className="sr-only">Search projects</span>
          <MagnifyingGlass
            size={20}
            weight="bold"
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="py-3 pl-11"
            placeholder="Search projects or developers"
          />
        </label>
        <div className="mb-6 md:hidden">
          <Dropdown
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
        <div
          className="min-w-0 mb-6 hidden flex-wrap gap-2 *:min-w-0 max-w-full md:flex"
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
        {appsLoading && apps.length === 0 ? (
          <AppCardsSkeleton />
        ) : appsError ? (
          <div className="toon-card toon-paper bg-panel rounded-2xl p-10 text-center">
            <h3 className="mt-3 text-xl font-black">Could not load projects</h3>
            <p className="font-bold text-muted">{userFacingError(appsError)}</p>
            <Button variant="secondary" onClick={() => void loadApps()} className="mt-5">
              Retry
            </Button>
          </div>
        ) : apps.length ? (
          <div
            aria-busy={appsLoading}
            className="discovery-grid min-w-0 max-w-full *:min-w-0 motion-safe:[&>*:nth-child(-n+6)]:animate-content-in"
          >
            {apps.map((app, index) => (
              <AppCard
                key={app.id}
                app={app}
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
                onEditApp={(id) => openApp(id, true)}
              />
            ))}
          </div>
        ) : (
          <div className="toon-card toon-paper bg-panel rounded-2xl p-10 text-center">
            <MagnifyingGlass size={36} className="mx-auto" />
            <h3 className="mt-3 text-xl font-black">No projects found</h3>
            <p className="font-bold text-muted">Adjust your search or category filter.</p>
          </div>
        )}
      </section>
    </PostTimeProvider>
  );
}
