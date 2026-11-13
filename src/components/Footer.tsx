import { ButtonLink } from "./Button";
import Brand from "./Brand";
import { useAuth } from "../auth/authContext";
import { APP_INFO, CONTACT_EMAIL, ORGANIZATION } from "../data/team";
import { ROUTES, isProtectedRoute, navigateInternalLink } from "../pages/routes";

const exploreLinks = [
  { label: "Home", href: ROUTES.home },
  { label: "Discover", href: ROUTES.discover },
  { label: "Developers", href: ROUTES.developers },
  { label: "Feeds", href: ROUTES.feeds },
  { label: "Leaderboard", href: ROUTES.leaderboard },
  { label: "About", href: ROUTES.about },
];

export default function Footer() {
  const { user } = useAuth();
  const visibleLinks = [
    ...exploreLinks.filter((link) => user || !isProtectedRoute(link.href)),
    ...(!user ? [{ label: "Sign in", href: ROUTES.signin }] : []),
  ];

  return (
    <footer className="mt-16 border-t-2 border-dashed border-brand-foreground/25 bg-brand-surface text-brand-foreground">
      <div className="min-w-0 mx-auto grid *:min-w-0 max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,1fr)] lg:px-10">
        <div>
          <Brand light />
          <p className="mt-4 max-w-sm text-sm font-bold leading-6 opacity-90">
            {APP_INFO.description}
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="text-xs font-black uppercase opacity-80">Explore</p>
          <ul className="mt-3 space-y-2">
            {visibleLinks.map((link) => (
              <li key={link.href}>
                <ButtonLink
                  variant="plain"
                  href={link.href}
                  onClick={navigateInternalLink}
                  className="text-sm font-black underline-offset-4 hover:underline"
                >
                  {link.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-black uppercase opacity-80">Contact</p>
          <p className="mt-3 text-sm font-bold leading-6 opacity-90">
            Suggestions, concerns, or bug reports — we read everything.
          </p>
          <ButtonLink
            variant="plain"
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-2 inline-block break-all text-sm font-black underline decoration-2 underline-offset-4"
          >
            {CONTACT_EMAIL}
          </ButtonLink>
        </div>
      </div>
      <div className="border-t-2 border-surface/30">
        <div className="min-w-0 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-xs font-bold opacity-90 sm:px-8 lg:px-10 *:min-w-0">
          <span>
            CodeCanvas · An initiative by {ORGANIZATION.name} ({ORGANIZATION.shortName})
          </span>
          <span>A home for what you build.</span>
        </div>
      </div>
    </footer>
  );
}
