import {
  PROJECT_STAGES,
  type AppItem,
  type AppUpdate,
  type ProjectStage,
  type ProjectVersion,
} from "../data/types";

export function suggestedVersion(stage: ProjectStage | "", current?: string) {
  const parts = current?.replace(/^v/, "").split("-")[0].split(".");
  if (parts?.every((part) => /^\d+$/.test(part))) {
    const [major, minor = "0"] = parts;
    if (stage === "Released" && Number(major) === 0) return "v1.0";
    if (stage === "Beta" && Number(major) === 0 && Number(minor) < 9) return "v0.9";
    if (parts.length === 1) return `v${BigInt(major) + 1n}`;
    return `v${major}.${BigInt(minor) + 1n}`;
  }
  return stage === "Released" ? "v1.0" : stage === "Beta" ? "v0.9" : "v0.1";
}

export function validateVersion(stage: unknown, version?: string, notes?: string) {
  if (stage !== undefined && !PROJECT_STAGES.includes(stage as ProjectStage))
    throw new Error("Choose a valid project stage.");
  if (version && !/^v?\d+(?:\.\d+){0,2}(?:-[a-zA-Z0-9.-]+)?$/.test(version.trim()))
    throw new Error("Use a version like v0.1, v1.0, or v2.0-beta.");
  if (version && version.trim().length > 40)
    throw new Error("Keep the version under 40 characters.");
  if (notes !== undefined && (!notes.trim() || notes.trim().length > 2000))
    throw new Error("Describe what changed in 1 to 2000 characters.");
}

export function snapshotVersion(app: AppItem, notes: string): ProjectVersion {
  return {
    id: crypto.randomUUID(),
    stage: app.stage,
    version: app.version,
    notes,
    publishedAt: new Date().toISOString(),
    snapshot: {
      title: app.title,
      description: app.description,
      screenshots: app.screenshots ? [...app.screenshots] : undefined,
      docs: app.docs,
      url: app.url,
      repoUrl: app.repoUrl,
    },
  };
}

export function applyPublication(app: AppItem, previous: AppItem, patch: AppUpdate) {
  validateVersion(patch.stage, patch.version, patch.publication?.notes);
  if (!patch.publication) {
    if (patch.version !== undefined && patch.version !== previous.version)
      throw new Error("Publish an update to change the version.");
    return app;
  }
  if (!patch.stage || !patch.version?.trim())
    throw new Error("Choose a stage and version for this update.");
  if (patch.publication.expectedPublication !== previous.lastPublishedAt)
    throw new Error("This project changed. Reload before publishing an update.");
  if (
    previous.versions?.some(
      (entry) => entry.version?.replace(/^v/, "") === patch.version?.trim().replace(/^v/, ""),
    )
  )
    throw new Error("This version already exists. Choose a new version.");
  const entry = snapshotVersion(app, patch.publication.notes.trim());
  if (previous.lastPublishedAt && entry.publishedAt <= previous.lastPublishedAt)
    entry.publishedAt = new Date(new Date(previous.lastPublishedAt).getTime() + 1).toISOString();
  return {
    ...app,
    lastPublishedAt: entry.publishedAt,
    versions: [entry, ...(previous.versions ?? [])],
  };
}
