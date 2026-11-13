import { ButtonLink, Button } from "../components/Button";
import { useState } from "react";
import {
  EnvelopeSimple,
  Binoculars,
  RocketLaunch,
  UsersThree,
  Compass,
  Palette,
  Code,
  Stack,
  ShieldCheck,
  CloudArrowUp,
} from "@phosphor-icons/react";
import Avatar from "../components/Avatar";
import ImageViewer from "../components/ImageViewer";
import { APP_INFO, CONTACT_EMAIL, ORGANIZATION, TEAM } from "../data/team";

const badgeIcons = {
  Leadership: Compass,
  "UI/UX": Palette,
  Development: Code,
  "Full-Stack": Stack,
  Security: ShieldCheck,
  DevOps: CloudArrowUp,
};

export default function About() {
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);

  return (
    <div>
      <div className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
        <header className="grid min-w-0 gap-8 pb-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-16">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-primary">
              About {APP_INFO.name}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
              A home for
              <br className="hidden sm:block" />{" "}
              <span className="text-primary">what you build.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-body">{APP_INFO.description}</p>
          </div>
          <aside
            className="toon-card toon-paper min-w-0 bg-secondary p-7 pt-10 sm:p-8 sm:pt-12"
            aria-label="Our purpose"
          >
            <RocketLaunch
              size={40}
              weight="duotone"
              className="text-foreground"
              aria-hidden="true"
            />
            <p className="mt-5 text-2xl font-black leading-snug">
              Small projects.
              <br />
              Shared possibilities.
            </p>
            <p className="mt-4 leading-7 text-body">
              Bring an idea, a work in progress, or a release ready to share. Give others a way to
              explore your work, understand how it works, and help it grow.
            </p>
            <p className="mt-6 border-t-2 border-dashed border-divider pt-4 text-xs font-black uppercase tracking-wider">
              Creation starts with you. Progress grows together.
            </p>
          </aside>
        </header>

        <section
          className="border-t-2 border-dashed border-divider py-12"
          aria-labelledby="creations-heading"
        >
          <p className="text-xs font-black uppercase text-primary">What belongs on CodeCanvas</p>
          <h2 id="creations-heading" className="mt-1 text-2xl font-black">
            More ways to create. More to discover.
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-body">
            CodeCanvas welcomes a wide range of technological outputs, from complete applications to
            focused tools and resources others can reuse.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Supported creations">
            {APP_INFO.creationTypes.map((type) => (
              <li
                key={type}
                className="max-w-full rounded-full border border-primary/20 bg-surface px-3 py-1 text-sm font-bold text-body"
              >
                {type}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t-2 border-dashed border-divider py-12" aria-label="Features">
          <div className="mb-8">
            <p className="text-xs font-black uppercase text-primary">What you can do here</p>
            <h2 className="mt-1 text-2xl font-black">From first idea to shared progress.</h2>
          </div>
          <div className="min-w-0 grid *:min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6 max-w-full">
            {APP_INFO.features.map((f, i) => (
              <article key={f.title} className="min-w-0 border-l-2 border-primary/30 pl-5 py-2">
                <div className="mb-5 text-primary" aria-hidden="true">
                  {i === 0 ? (
                    <Binoculars size={30} weight="duotone" />
                  ) : i === 1 ? (
                    <RocketLaunch size={30} weight="duotone" />
                  ) : (
                    <UsersThree size={30} weight="duotone" />
                  )}
                </div>
                <h3 className="text-xl font-black">{f.title}</h3>
                <p className="mt-2 leading-7 text-body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="flex min-w-0 flex-col gap-6 border-t-2 border-dashed border-divider py-10 sm:flex-row sm:items-center"
          aria-labelledby="organization-heading"
        >
          <img
            src={ORGANIZATION.logo}
            alt="SPECS logo"
            width={96}
            height={96}
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-xl object-contain"
          />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-primary">
              The organization behind the initiative
            </p>
            <h2 id="organization-heading" className="mt-2 text-xl font-black">
              {ORGANIZATION.name} ({ORGANIZATION.shortName})
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-body">
              CodeCanvas is an initiative by SPECS, created to help developers share their digital
              creations, exchange knowledge, and learn together. Rooted in a community of computer
              science students and alumni, the initiative puts projects, people, and shared learning
              at its center.
            </p>
          </div>
        </section>

        <section className="border-t-2 border-dashed border-divider py-12" aria-label="Team">
          <div className="mb-8">
            <p className="text-xs font-black uppercase text-primary">The builders</p>
            <h2 className="mt-1 text-2xl font-black">Meet the people behind the canvas.</h2>
          </div>
          <div className="min-w-0 grid *:min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6 max-w-full">
            {TEAM.map((member) => (
              <article
                key={member.name}
                className="toon-card min-w-0 rounded-2xl bg-surface p-6 sm:p-8"
              >
                <div className="min-w-0 flex *:min-w-0 max-w-full">
                  {member.imageUrl ? (
                    <Button
                      variant="plain"
                      type="button"
                      onClick={() =>
                        setLightbox({ src: member.imageUrl as string, name: member.name })
                      }
                      aria-label={`View ${member.name}'s photo full size`}
                      title="View full size"
                      className="rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                    >
                      <Avatar
                        name={member.name}
                        color={member.color}
                        imageUrl={member.imageUrl}
                        size="xl"
                      />
                    </Button>
                  ) : (
                    <Avatar
                      name={member.name}
                      color={member.color}
                      imageUrl={member.imageUrl}
                      size="xl"
                    />
                  )}
                </div>
                <h3 className="mt-4 text-xl font-black">{member.name}</h3>
                <p className="mt-1 text-sm font-black uppercase text-primary">{member.role}</p>
                <p className="mt-2 text-sm leading-6 text-muted text-justify">{member.bio}</p>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${member.name}'s expertise`}>
                  {member.badges.map((badge) => {
                    const Icon = badgeIcons[badge];
                    return (
                      <li
                        key={badge}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary"
                      >
                        <Icon size={16} weight="duotone" aria-hidden="true" />
                        {badge}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          className="toon-card mb-4 flex min-w-0 flex-col gap-6 rounded-2xl bg-info p-6 sm:p-8 md:flex-row md:items-center md:justify-between"
          aria-labelledby="contact-heading"
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-primary">Get in touch</p>
            <h2 id="contact-heading" className="mt-2 text-2xl font-black">
              Help shape what comes next.
            </h2>
            <p className="mt-2 leading-7 text-body">
              Have an idea, a question, or a bug to report? We'd love to hear it.
            </p>
          </div>
          <ButtonLink
            variant="secondary"
            href={`mailto:${CONTACT_EMAIL}`}
            className="max-w-full shrink-0"
          >
            <EnvelopeSimple size={22} weight="duotone" aria-hidden="true" /> Email the team
          </ButtonLink>
        </section>
      </div>

      {lightbox && (
        <ImageViewer
          title={`${lightbox.name}'s photo`}
          images={[{ src: lightbox.src, alt: `${lightbox.name}'s photo full size` }]}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
