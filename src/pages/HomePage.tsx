import {
  ArrowRight,
  Binoculars,
  CheckCircle,
  RocketLaunch,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import { ButtonLink } from "../components/Button";
import { APP_INFO } from "../data/team";
import { useAuth } from "../auth/authContext";
import { ROUTES, navigateInternalLink } from "./routes";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div>
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="min-w-0 mx-auto grid max-w-7xl gap-14 pb-16 pt-6 sm:pt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:items-center lg:pb-24 lg:pt-10">
          <div>
            <div className="min-w-0 inline-flex -rotate-2 items-center gap-2 border-2 border-dashed border-primary px-3 py-1 text-xs font-black uppercase text-primary mb-7 bg-surface max-w-full">
              <Sparkle size={17} weight="fill" />
              Create. Share. Learn together.
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              Digital creations, built{" "}
              <span className="relative inline-block after:absolute after:-bottom-[7px] after:-left-[2%] after:h-2 after:w-[104%] after:-rotate-1 after:rounded-[50%] after:border-t-[3px] after:border-primary after:content-[''] text-primary">
                and shared
                <span className="absolute -bottom-2 left-0 -z-10 h-3 w-full -rotate-1 rounded-full bg-secondary" />
              </span>{" "}
              here.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-body">{APP_INFO.description}</p>
            <div className="min-w-0 mt-9 flex flex-wrap gap-5 max-w-full">
              <ButtonLink
                href={user ? ROUTES.discover : ROUTES.signin}
                onClick={navigateInternalLink}
              >
                {user ? "Open CodeCanvas" : "Sign in to CodeCanvas"}{" "}
                <RocketLaunch size={21} weight="duotone" />
              </ButtonLink>
              <ButtonLink href="#discover" variant="secondary">
                Explore projects <Binoculars size={21} weight="duotone" />
              </ButtonLink>
            </div>
            <div className="min-w-0 mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm font-black max-w-full">
              {[
                "Projects and reusable resources",
                "Community learning",
                "Constructive feedback",
              ].map((item) => (
                <span key={item} className="min-w-0 flex items-center gap-2 max-w-full">
                  <CheckCircle size={20} weight="fill" className="text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="toon-card toon-paper sm:rotate-2 bg-info p-7 pt-10">
              <div className="rounded-[2rem] border-[3px] border-outline bg-surface p-6">
                <div className="min-w-0 flex items-center justify-between max-w-full">
                  <span className="rounded-full bg-success px-3 py-1 text-xs font-black">LIVE</span>
                  <RocketLaunch size={40} weight="duotone" />
                </div>
                <div className="mt-12 h-5 w-3/4 rounded-full bg-inverse" />
                <div className="mt-3 h-3 w-full rounded-full bg-placeholder" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-placeholder" />
                <div className="min-w-0 mt-8 grid grid-cols-3 gap-3 max-w-full">
                  {["bg-secondary", "bg-accent", "bg-success"].map((backgroundClassName) => (
                    <div
                      key={backgroundClassName}
                      className={`h-16 rounded-xl border-[3px] border-outline ${backgroundClassName}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-5 -rotate-6 rounded-2xl border-[3px] border-outline bg-accent p-4 shadow-[4px_4px_0_var(--color-outline)]">
              <UsersThree size={33} weight="duotone" />
            </div>
          </div>
        </header>

        <section
          id="discover"
          className="mx-auto max-w-7xl scroll-mt-8 border-t-2 border-dashed border-divider py-14"
        >
          <div className="text-center">
            <p className="text-xs font-black uppercase text-primary">How CodeCanvas works</p>
            <h2 className="mt-3 text-3xl font-black">A shared space for what you create.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-body">
              From a useful script to your next big release, give your work a place to be
              discovered.
            </p>
            <ul
              className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2"
              aria-label="Creations you can share"
            >
              {APP_INFO.creationTypes.map((type) => (
                <li
                  key={type}
                  className="max-w-full rounded-full border border-primary/20 bg-surface px-3 py-1 text-sm font-bold text-body"
                >
                  {type}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-6 max-w-full">
            {[
              {
                n: "01",
                t: "Sign in",
                d: "Join with your email or Google account to unlock the full community.",
              },
              {
                n: "02",
                t: "Publish a project",
                d: "Share a project link, screenshots, and documentation to show what your creation does.",
              },
              {
                n: "03",
                t: "Connect with the community",
                d: "Meet fellow developers and potential users working with related tools and ideas.",
              },
              {
                n: "04",
                t: "Learn and improve together",
                d: "Post updates, ask technical questions, and exchange feedback through community discussions.",
              },
            ].map((item, index) => (
              <article
                key={item.n}
                className={`toon-card toon-paper bg-panel p-6 pt-9 ${index === 0 ? "rotate-[-1deg]" : index === 1 ? "rotate-1" : "rotate-[-.5deg]"}`}
              >
                <span className="text-sm font-black">STEP {item.n}</span>
                <h3 className="mt-8 text-2xl font-black">{item.t}</h3>
                <p className="mt-3 leading-7 text-body">{item.d}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
