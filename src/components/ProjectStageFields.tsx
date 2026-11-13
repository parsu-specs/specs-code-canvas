import Dropdown from "./Dropdown";
import Input from "./Input";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS, type ProjectStage } from "../data/types";
import { suggestedVersion } from "../utils/projectVersions";

export default function ProjectStageFields({
  stage,
  onStageChange,
  version,
  onVersionChange,
  versionRequired = false,
  disabled = false,
  currentVersion,
}: {
  stage: ProjectStage | "";
  onStageChange: (stage: ProjectStage) => void;
  version?: string;
  onVersionChange?: (version: string) => void;
  versionRequired?: boolean;
  disabled?: boolean;
  currentVersion?: string;
}) {
  return (
    <>
      <div>
        <span className="mb-2 block text-xs font-black uppercase">Project stage</span>
        <Dropdown
          label="Project stage"
          placeholder="Choose a stage"
          value={stage ?? ""}
          disabled={disabled}
          options={PROJECT_STAGES.map((value) => ({ value, label: PROJECT_STAGE_LABELS[value] }))}
          onChange={(value) => {
            const next = value as ProjectStage;
            onStageChange(next);
            if (!version || version === suggestedVersion(stage, currentVersion))
              onVersionChange?.(suggestedVersion(next, currentVersion));
          }}
        />
        <p className="mt-2 text-xs text-muted">
          Concept, visual design, working prototype, beta, or ready to use.
        </p>
      </div>
      {onVersionChange && (
        <label>
          <span className="mb-2 block text-xs font-black uppercase">
            Version{!versionRequired && " (optional)"}
          </span>
          <Input
            value={version ?? ""}
            onChange={(event) => onVersionChange(event.target.value)}
            required={versionRequired}
            disabled={disabled}
            maxLength={40}
            pattern="v?[0-9]+(\.[0-9]+){0,2}(-[a-zA-Z0-9.\-]+)?"
            placeholder={suggestedVersion(stage, currentVersion)}
          />
          <span className="mt-2 block text-xs text-muted">
            For example v0.1, v1.0, or v2.0-beta.
          </span>
        </label>
      )}
    </>
  );
}
