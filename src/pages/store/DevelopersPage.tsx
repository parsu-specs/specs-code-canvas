import { useState } from "react";
import { DeveloperCardsSkeleton } from "../../components/Skeleton";
import { userFacingError } from "../../utils/userFacingError";
import { ListBullets, MagnifyingGlass, SquaresFour } from "@phosphor-icons/react";
import Avatar from "../../components/Avatar";
import { Button, ButtonLink } from "../../components/Button";
import Input from "../../components/Input";
import TrophyMark from "../../components/TrophyMark";
import ShareButton from "../../components/ShareButton";
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
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  return (
    <>
      <section id="developers" className="scroll-mt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Search developers</span>
            <MagnifyingGlass
              size={20}
              weight="bold"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              type="search"
              value={devQuery}
              onChange={(event) => setDevQuery(event.target.value)}
              className="py-2.5 pl-11 text-sm truncate"
              placeholder="Search name or role…"
            />
          </label>
          <div role="group" aria-label="Developer view" className="flex shrink-0 gap-2">
            <Button
              variant="outline-flat"
              className="px-3 py-2"
              aria-pressed={layout === "grid"}
              onClick={() => setLayout("grid")}
            >
              <SquaresFour size={20} aria-hidden="true" />
              Grid
            </Button>
            <Button
              variant="outline-flat"
              className="px-3 py-2"
              aria-pressed={layout === "list"}
              onClick={() => setLayout("list")}
            >
              <ListBullets size={20} aria-hidden="true" />
              List
            </Button>
          </div>
        </div>
        <div
          className={`min-w-0 toon-card toon-paper bg-panel grid max-w-full ${layout === "grid" ? "gap-4 p-4 pt-10 sm:p-8 sm:pt-12 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]" : "grid-cols-1 gap-1 p-3 pt-10 sm:p-4 sm:pt-12"}`}
        >
          {profilesLoading ? (
            <div className="col-span-full">
              <DeveloperCardsSkeleton layout={layout} />
            </div>
          ) : profilesError ? (
            <div role="alert" className="col-span-full">
              <p className="font-bold text-muted">{userFacingError(profilesError)}</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setProfileTick((tick) => tick + 1)}
              >
                Retry
              </Button>
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const place = trophies.get(p.id);
              return (
                <article
                  key={p.id}
                  className={`min-w-0 motion-safe:animate-content-in rounded-xl border-[3px] ${place !== undefined ? "border-outline" : "border-transparent"} ${place === 1 ? "bg-podium-gold" : place === 2 ? "bg-podium-silver" : place === 3 ? "bg-podium-bronze" : ""} ${layout === "list" ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]" : "p-4"}`}
                >
                  <div
                    className={`min-w-0 flex items-center max-w-full ${layout === "list" ? "col-span-2 gap-2 sm:col-span-1" : "gap-3"}`}
                  >
                    <ButtonLink
                      variant="plain"
                      href={developerProfilePath(p.name)}
                      onClick={(e) => {
                        e.preventDefault();
                        openProfile(p.id);
                      }}
                      aria-label={`View ${p.name}'s profile`}
                      className="shrink-0"
                    >
                      <Avatar
                        name={p.name}
                        color={p.color}
                        imageUrl={p.imageUrl}
                        size={layout === "list" ? "sm" : "md"}
                      />
                    </ButtonLink>
                    <h3
                      className={`min-w-0 flex-1 wrap-break-word font-black ${layout === "list" ? "text-sm" : "text-lg"}`}
                    >
                      <ButtonLink
                        variant="text"
                        href={developerProfilePath(p.name)}
                        onClick={(e) => {
                          e.preventDefault();
                          openProfile(p.id);
                        }}
                      >
                        {p.name}
                      </ButtonLink>
                    </h3>
                    {place !== undefined && <TrophyMark minimal place={place as 1 | 2 | 3} />}
                    <ShareButton profile={p} size="compact" />
                  </div>
                  <p
                    className={`min-w-0 wrap-break-word text-muted ${layout === "grid" ? "mt-2 text-sm" : "text-xs"}`}
                  >
                    {p.role}
                  </p>
                  <p
                    className={`text-xs font-black uppercase ${layout === "grid" ? "mt-3" : "text-right"}`}
                  >
                    {countFor(p)} project{countFor(p) === 1 ? "" : "s"} shared
                  </p>
                </article>
              );
            })
          )}
          {!profilesLoading && !profilesError && filteredProfiles.length === 0 && (
            <p className="font-bold text-muted col-span-full">
              No developers match “{devQuery.trim()}”.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
