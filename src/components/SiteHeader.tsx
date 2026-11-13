import { useAuth } from "../auth/authContext";
import { ROUTES, navigateInternalLink } from "../pages/routes";
import Brand from "./Brand";
import AppearanceControl from "./AppearanceControl";
import { ButtonLink } from "./Button";

export default function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-60 h-header border-b-[3px] border-outline bg-primary text-primary-foreground lg:z-40">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-5 lg:gap-4 lg:px-8">
        <ButtonLink
          variant="plain"
          href={ROUTES.home}
          onClick={navigateInternalLink}
          aria-label="CodeCanvas home page"
        >
          <span className="block sm:hidden">
            <Brand onPrimary monogram size="navigation" className="ml-2" />
          </span>
          <span className="hidden sm:block">
            <Brand onPrimary text size="navigation" />
          </span>
        </ButtonLink>
        <div className="flex shrink-0 items-center gap-2">
          <AppearanceControl compact />
          <ButtonLink
            variant="secondary"
            size="small"
            href={user ? ROUTES.discover : ROUTES.signin}
            onClick={navigateInternalLink}
          >
            {user ? "Back to app" : "Sign in"}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
