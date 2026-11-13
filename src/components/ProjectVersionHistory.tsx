import { PROJECT_STAGE_LABELS, type ProjectVersion } from "../data/types";
import PagedMarkdown from "./PagedMarkdown";
import ProjectImage from "./ProjectImage";
import { ButtonLink } from "./Button";
import { isSafeHttpUrl } from "../utils/urls";

export default function ProjectVersionHistory({ versions }: { versions: ProjectVersion[] }) {
  if (!versions.length) return null;
  return (
    <section className="mt-8 min-w-0">
      <h3 className="text-xl font-black">Version history</h3>
      <ol className="mt-4 grid gap-4">
        {versions.map((entry) => (
          <li key={entry.id} className="min-w-0 rounded-xl border-2 border-outline bg-surface p-4">
            <p className="font-black wrap-anywhere">
              {entry.version || "Initial publication"}
              {entry.stage && <> · {PROJECT_STAGE_LABELS[entry.stage]}</>}
            </p>
            <time className="text-xs text-muted" dateTime={entry.publishedAt}>
              {new Date(entry.publishedAt).toLocaleString()}
            </time>
            <p className="mt-2 whitespace-pre-wrap wrap-anywhere">{entry.notes}</p>
            <details className="mt-3">
              <summary className="cursor-pointer font-bold">View this version</summary>
              <div className="mt-3 grid min-w-0 gap-3">
                <h4 className="font-black wrap-anywhere">{entry.snapshot.title}</h4>
                <p className="whitespace-pre-wrap wrap-anywhere">{entry.snapshot.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {entry.snapshot.screenshots?.map((src, index) => (
                    <ProjectImage
                      key={src}
                      src={src}
                      alt={`${entry.version || "Initial"} screenshot ${index + 1}`}
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.snapshot.url && isSafeHttpUrl(entry.snapshot.url) && (
                    <ButtonLink
                      href={entry.snapshot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      Project link
                    </ButtonLink>
                  )}
                  {entry.snapshot.repoUrl && isSafeHttpUrl(entry.snapshot.repoUrl) && (
                    <ButtonLink
                      href={entry.snapshot.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      Repository
                    </ButtonLink>
                  )}
                </div>
                {entry.snapshot.docs && <PagedMarkdown text={entry.snapshot.docs} />}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
