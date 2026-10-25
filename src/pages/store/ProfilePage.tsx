import ProfileView from "../../components/ProfileView";
import { ROUTES } from "../routes";
import type { StoreController } from "./useStoreController";

type Props = Pick<
  StoreController,
  | "openAppFromProfile"
  | "openProfile"
  | "profilesLookup"
  | "projectTrophies"
  | "rankedDevelopers"
  | "selectedProfileId"
  | "selectedProfileName"
  | "setProfileTick"
  | "setSelectedProfileId"
  | "setSelectedProfileName"
  | "setShowForm"
  | "setView"
  | "trophies"
  | "user"
>;

export default function ProfilePage({
  openAppFromProfile,
  openProfile,
  profilesLookup,
  projectTrophies,
  rankedDevelopers,
  selectedProfileId,
  selectedProfileName,
  setProfileTick,
  setSelectedProfileId,
  setSelectedProfileName,
  setShowForm,
  setView,
  trophies,
  user,
}: Props) {
  return (
    <>
      {(selectedProfileId || selectedProfileName) && (
        <section>
          <ProfileView
            key={selectedProfileId ?? selectedProfileName}
            profileId={
              selectedProfileId === "__me__" ? (user?.id ?? "__me__") : (selectedProfileId ?? "")
            }
            profileName={selectedProfileName ?? undefined}
            currentUser={user ?? null}
            trophies={trophies}
            projectTrophies={projectTrophies}
            profiles={profilesLookup}
            rankSummary={(() => {
              const resolvedId =
                selectedProfileId === "__me__"
                  ? (user?.id ?? "__me__")
                  : (selectedProfileId ??
                    profilesLookup.get(`name:${selectedProfileName?.trim().toLowerCase()}`)?.id);
              const rank = rankedDevelopers.findIndex((r) => r.profile.id === resolvedId);
              if (rank === -1) return undefined;
              return {
                rank: rank + 1,
                points: rankedDevelopers[rank].points,
                total: rankedDevelopers.length,
              };
            })()}
            onBack={() => {
              window.history.pushState({}, "", ROUTES.developers);
              setView("developers");
              setSelectedProfileId(null);
              setSelectedProfileName(null);
            }}
            onOpenApp={openAppFromProfile}
            onOpenProfile={openProfile}
            onSubmitProject={() => {
              window.history.pushState({}, "", ROUTES.discover);
              setView("discover");
              setSelectedProfileId(null);
              setSelectedProfileName(null);
              setShowForm(true);
            }}
            onProfileUpdated={(profile) => {
              if (selectedProfileName) {
                setSelectedProfileId(profile.id);
                setSelectedProfileName(null);
              }
              setProfileTick((t) => t + 1);
            }}
          />
        </section>
      )}
    </>
  );
}
