import { Code, Heart, Trophy, UsersThree } from "@phosphor-icons/react";
import VotersDialog from "../../components/VotersDialog";
import TrophyMark from "../../components/TrophyMark";
import Avatar from "../../components/Avatar";
import { Button } from "../../components/Button";
import type { StoreController } from "./useStoreController";
import { LeaderboardSkeleton } from "../../components/Skeleton";
import { userFacingError } from "../../utils/userFacingError";

type Props = Pick<
  StoreController,
  | "boardTab"
  | "openApp"
  | "openProfile"
  | "profilesLookup"
  | "projectTrophies"
  | "rankedDevelopers"
  | "rankedProjects"
  | "setBoardTab"
  | "trophies"
  | "appsLoading"
  | "appsError"
  | "profilesLoading"
  | "profilesError"
>;

export default function LeaderboardPage({
  boardTab,
  openApp,
  openProfile,
  profilesLookup,
  rankedDevelopers,
  rankedProjects,
  setBoardTab,
  appsLoading,
  appsError,
  profilesLoading,
  profilesError,
}: Props) {
  const developers = boardTab === "developers";
  const entries = developers
    ? rankedDevelopers.slice(0, 10).map(({ profile, projects, points }) => ({
        id: profile.id,
        name: profile.name,
        profile,
        detail: `${projects} ${projects === 1 ? "project" : "projects"}`,
        score: points,
        open: () => openProfile(profile.id),
      }))
    : rankedProjects.slice(0, 10).map((app) => {
        const profile = app.creatorId
          ? profilesLookup.get(app.creatorId)
          : [...profilesLookup.values()].find(
              (p) => p.name.toLowerCase() === app.creator.toLowerCase(),
            );
        return {
          id: app.id,
          name: app.title,
          profile,
          detail: `by ${profile?.name ?? app.creator}`,
          score: app.votes,
          open: () => openApp(app.id),
        };
      });
  const ScoreIcon = developers ? Trophy : Heart;
  const renderScore = (entry: (typeof entries)[number]) =>
    developers ? (
      <>
        {entry.score} <span className="text-xs uppercase text-muted">pts</span>
      </>
    ) : (
      <VotersDialog
        appId={entry.id}
        appTitle={entry.name}
        totalVotes={entry.score}
        onOpenProfile={openProfile}
      />
    );
  const renderDetail = (entry: (typeof entries)[number]) => {
    if (developers || !entry.profile) return entry.detail;
    const author = entry.profile;
    return (
      <>
        by{" "}
        <Button
          variant="text"
          onClick={() => openProfile(author.id)}
          className=""
          aria-label={`View ${author.name}'s profile`}
        >
          {author.name}
        </Button>
      </>
    );
  };

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-black uppercase text-primary">
          {developers
            ? "Rank points = likes + 20 per published project"
            : "Ranked by project likes"}
        </p>
        <h2 className="mt-1 text-2xl font-black">
          {developers ? "Top developers" : "Top projects"}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard view">
          {(["developers", "projects"] as const).map((tab) => (
            <Button
              variant="filter"
              key={tab}
              role="tab"
              aria-selected={boardTab === tab}
              onClick={() => setBoardTab(tab)}
              className="capitalize"
            >
              {tab === "developers" ? (
                <UsersThree size={19} weight="duotone" aria-hidden="true" />
              ) : (
                <Code size={19} weight="duotone" aria-hidden="true" />
              )}
              {tab}
            </Button>
          ))}
        </div>
      </div>
      {appsLoading || profilesLoading ? (
        <LeaderboardSkeleton />
      ) : appsError || profilesError ? (
        <p role="alert" className="font-bold text-muted">
          {userFacingError(appsError || profilesError)}
        </p>
      ) : entries.length ? (
        <>
          <ol aria-label="Top three" className="grid grid-cols-3 items-end gap-2 pt-4 sm:gap-5">
            {entries.slice(0, 3).map((entry, index) => (
              <li
                key={entry.id}
                value={index + 1}
                className={`toon-card motion-safe:animate-content-in relative flex min-w-0 flex-col items-center rounded-2xl px-2 py-5 text-center sm:px-4 sm:py-7 ${index === 0 ? "col-start-2 row-start-1 bg-podium-gold" : index === 1 ? "col-start-1 row-start-1 bg-podium-silver" : "col-start-3 row-start-1 bg-podium-bronze"}`}
              >
                <span className="mb-3 inline-flex">
                  <TrophyMark
                    minimal
                    place={(index + 1) as 1 | 2 | 3}
                    size={index === 0 ? 96 : index === 1 ? 60 : 48}
                  />
                </span>
                <span className="mb-3 text-xs font-black uppercase tracking-wider sm:text-sm">
                  {index === 0 ? "1st place" : index === 1 ? "2nd place" : "3rd place"}
                </span>
                <Avatar
                  name={entry.profile?.name ?? entry.name}
                  color={entry.profile?.color ?? "primary"}
                  imageUrl={entry.profile?.imageUrl}
                  size="lg"
                  className="h-14! w-14! sm:h-20! sm:w-20!"
                />
                <Button
                  variant="text"
                  onClick={entry.open}
                  className="mt-3 max-w-full wrap-anywhere text-sm font-black hover:text-primary active:text-primary sm:text-xl"
                >
                  {entry.name}
                </Button>
                <p className="mt-1 w-full wrap-break-word text-xs font-bold text-muted sm:text-sm">
                  {renderDetail(entry)}
                </p>
                <p className="mt-4 text-sm font-black sm:text-lg">{renderScore(entry)}</p>
              </li>
            ))}
          </ol>
          {entries.length > 3 && (
            <ol start={4} aria-label="Remaining rankings" className="mt-6 space-y-3">
              {entries.slice(3).map((entry, index) => (
                <li
                  key={entry.id}
                  className="toon-card motion-safe:animate-content-in flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-3 sm:gap-4 sm:p-5"
                >
                  <span
                    aria-label={`Rank ${index + 4}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] border-outline bg-background font-black"
                  >
                    {index + 4}
                  </span>
                  <Avatar
                    name={entry.profile?.name ?? entry.name}
                    color={entry.profile?.color ?? "primary"}
                    imageUrl={entry.profile?.imageUrl}
                    size="md"
                    className="h-10! w-10! sm:h-14! sm:w-14!"
                  />
                  <div className="min-w-0 flex-1">
                    <Button
                      variant="text"
                      onClick={entry.open}
                      className="block max-w-full truncate text-sm sm:text-lg"
                    >
                      {entry.name}
                    </Button>
                    <p className="truncate text-xs font-bold text-muted sm:text-sm">
                      {renderDetail(entry)}
                    </p>
                  </div>
                  <p className="flex shrink-0 items-center gap-1 text-sm font-black sm:gap-2 sm:text-base">
                    <ScoreIcon size={20} weight="duotone" className="hidden text-muted sm:block" />
                    {renderScore(entry)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="toon-card toon-paper rounded-2xl bg-panel p-10 text-center">
          <h3 className="text-xl font-black">No {boardTab} yet</h3>
          <p className="font-bold text-muted">
            Check back once builders {developers ? "join" : "share work"}.
          </p>
        </div>
      )}
    </section>
  );
}
