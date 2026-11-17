import { useState } from "react";
import { Code, SlidersHorizontal } from "@phosphor-icons/react";
import { DeveloperCardsSkeleton } from "../../components/Skeleton";
import { userFacingError } from "../../utils/userFacingError";
import { useViewLayout } from "../../utils/useViewLayout";
import Avatar from "../../components/Avatar";
import { Button, ButtonLink } from "../../components/Button";
import Dropdown from "../../components/Dropdown";
import SearchField from "../../components/SearchField";
import ViewLayoutControl from "../../components/ViewLayoutControl";
import TrophyMark from "../../components/TrophyMark";
import ShareButton from "../../components/ShareButton";
import { accountRole, type AccountRole } from "../../data/accountRoles";
import { developerProfilePath } from "../routes";
import type { StoreController } from "./useStoreController";

type Props = Pick<
  StoreController,
  | "countFor"
  | "devQuery"
  | "filteredProfiles"
  | "openProfile"
  | "setDevQuery"
  | "trophies"
  | "view"
  | "profilesLoading"
  | "profilesError"
  | "setProfileTick"
>;
const roles = [
  { value: "All", label: "All developers" },
  { value: "Member", label: "Members" },
  { value: "Guest", label: "Guests" },
] as const;

export default function DevelopersPage({
  countFor,
  devQuery,
  filteredProfiles,
  openProfile,
  setDevQuery,
  trophies,
  profilesLoading,
  profilesError,
  setProfileTick,
}: Props) {
  const [layout, setLayout] = useViewLayout("developers");
  const [role, setRole] = useState<AccountRole | "All">("All");
  const developers = filteredProfiles.filter(
    (profile) => role === "All" || accountRole(profile.role) === role,
  );
  const loading = profilesLoading;

  return (
    <section id="developers" className="mx-auto w-full min-w-0 max-w-5xl scroll-mt-6">
      <SearchField
        aria-label="Search developers"
        value={devQuery}
        onChange={(event) => setDevQuery(event.target.value)}
        placeholder="Search name or role..."
      >
        <div className="shrink-0 md:hidden">
          <Dropdown
            label="Developer roles"
            value={role}
            onChange={(value) => setRole(value as AccountRole | "All")}
            options={[...roles]}
            triggerVariant="minimal"
            mobileIcon={<SlidersHorizontal size={20} weight="duotone" aria-hidden="true" />}
          />
        </div>
      </SearchField>
      <div
        className="mt-4 hidden flex-wrap gap-2 md:flex"
        role="group"
        aria-label="Developer roles"
      >
        {roles.map(({ value, label }) => (
          <Button
            key={value}
            variant="outline-flat"
            size="small"
            aria-pressed={role === value}
            onClick={() => setRole(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="my-3 flex min-w-0 items-center justify-between gap-3">
        <p role="status" className="min-w-0 text-sm text-muted">
          {loading
            ? "Loading developers..."
            : profilesError
              ? "Developers unavailable"
              : `${developers.length} developer${developers.length === 1 ? "" : "s"}${role !== "All" ? ` · ${roles.find((item) => item.value === role)?.label}` : ""}`}
        </p>
        <ViewLayoutControl label="Developer view" value={layout} onChange={setLayout} />
      </div>
      {loading ? (
        <div className={layout === "list" ? "mx-auto w-full min-w-0 max-w-2xl" : "min-w-0"}>
          <DeveloperCardsSkeleton layout={layout} />
        </div>
      ) : profilesError ? (
        <div role="alert" className="toon-card bg-surface p-5 text-center">
          <h3 className="text-lg font-black">Could not load developers</h3>
          <p className="mt-1 text-sm text-muted">{userFacingError(profilesError)}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setProfileTick((tick) => tick + 1)}
          >
            Retry
          </Button>
        </div>
      ) : developers.length ? (
        <ul
          aria-label="Developers"
          className={`grid min-w-0 gap-3 ${layout === "grid" ? "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]" : "mx-auto w-full max-w-2xl grid-cols-1"}`}
        >
          {developers.map((profile) => {
            const place = trophies.get(profile.id);
            const projectCount = countFor(profile);
            return (
              <li key={profile.id} className="min-w-0 motion-safe:animate-content-in">
                <article className="toon-card flex h-full min-w-0 flex-col bg-surface p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <ButtonLink
                      variant="plain"
                      href={developerProfilePath(profile.name)}
                      onClick={(event) => {
                        event.preventDefault();
                        openProfile(profile.id);
                      }}
                      aria-label={`View ${profile.name}'s profile`}
                      className="shrink-0 rounded-full"
                    >
                      <Avatar
                        name={profile.name}
                        color={profile.color}
                        imageUrl={profile.imageUrl}
                        size="md"
                        className="size-11 sm:size-14"
                      />
                    </ButtonLink>
                    <div className="min-w-0 flex-1">
                      <h3 className="min-w-0 text-base font-black leading-6 wrap-anywhere">
                        <ButtonLink
                          variant="text"
                          href={developerProfilePath(profile.name)}
                          onClick={(event) => {
                            event.preventDefault();
                            openProfile(profile.id);
                          }}
                        >
                          {profile.name}
                        </ButtonLink>
                        {place !== undefined && <TrophyMark minimal place={place} size={18} />}
                      </h3>
                      {profile.fullName && profile.fullName !== profile.name && (
                        <p className="mt-0.5 text-sm text-body wrap-anywhere">{profile.fullName}</p>
                      )}
                      <span className="mt-1 inline-flex max-w-full rounded-full bg-panel px-2 py-0.5 text-xs font-bold text-muted">
                        {accountRole(profile.role)}
                      </span>
                    </div>
                    <ShareButton
                      profile={profile}
                      size="compact"
                      iconOnly
                      variant="minimal"
                      className="shrink-0"
                    />
                  </div>
                  {layout === "grid" && profile.bio.trim() && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-body wrap-anywhere">
                      {profile.bio}
                    </p>
                  )}
                  {layout === "grid" && (
                    <div className="mt-auto pt-4">
                      <p className="flex min-w-0 items-center gap-2 border-t border-divider pt-3 text-xs font-bold text-muted">
                        <Code size={18} weight="duotone" aria-hidden="true" className="shrink-0" />
                        {projectCount} project{projectCount === 1 ? "" : "s"} shared
                      </p>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="toon-card bg-surface p-5 text-center">
          <h3 className="text-lg font-black">No developers found</h3>
          <p className="mt-1 text-sm text-muted wrap-anywhere">
            {devQuery.trim()
              ? `No developers match “${devQuery.trim()}” with these filters.`
              : "There are no developers in this group yet."}
          </p>
          {(role !== "All" || devQuery.trim()) && (
            <Button
              variant="minimal"
              size="small"
              className="mt-3 min-h-11"
              onClick={() => {
                setRole("All");
                setDevQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
