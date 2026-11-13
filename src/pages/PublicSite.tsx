import { House, Info } from "@phosphor-icons/react";
import { ButtonLink } from "../components/Button";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { ROUTES, navigateInternalLink } from "./routes";

import HomePage from "./HomePage";
import About from "./About";

export default function PublicSite({ page }: { page: "home" | "about" }) {
  return (
    <div className="flex min-h-screen flex-col pt-[calc(var(--spacing-header)+1.5rem)] sm:pt-[calc(var(--spacing-header)+2rem)] lg:pt-[calc(var(--spacing-header)+2.5rem)]">
      <SiteHeader />
      <nav aria-label="Site navigation" className="flex flex-wrap justify-center gap-2 px-5 pb-2">
        {(
          [
            ["home", "Home", ROUTES.home],
            ["about", "About", ROUTES.about],
          ] as const
        ).map(([id, label, href]) => (
          <ButtonLink
            key={id}
            variant="plain"
            href={href}
            onClick={navigateInternalLink}
            aria-current={page === id ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-2xl border-2 border-outline px-3 py-2 text-sm font-black transition-colors ${page === id ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            {id === "home" ? (
              <House size={19} weight="duotone" aria-hidden="true" />
            ) : (
              <Info size={19} weight="duotone" aria-hidden="true" />
            )}
            {label}
          </ButtonLink>
        ))}
      </nav>
      <div className="flex-1">{page === "about" ? <About /> : <HomePage />}</div>
      <Footer />
    </div>
  );
}
