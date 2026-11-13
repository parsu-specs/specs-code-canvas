import ProjectStageFields from "../../components/ProjectStageFields";
import { useRef, useState } from "react";
import { userFacingError } from "../../utils/userFacingError";
import {
  ArrowRight,
  BookOpenText,
  DownloadSimple,
  Eye,
  Images,
  LinkSimple,
  PencilSimple,
} from "@phosphor-icons/react";
import MarkdownTextarea from "../../components/MarkdownTextarea";
import PagedMarkdown from "../../components/PagedMarkdown";
import { Button, ButtonLabel } from "../../components/Button";
import Input, { FileInput, Checkbox } from "../../components/Input";
import Dropdown from "../../components/Dropdown";
import SortableThumbnails from "../../components/SortableThumbnails";
import ImageEditor from "../../components/ImageEditor";
import { IMAGE_FILE_ACCEPT } from "../../utils/imageInput";
import CollaboratorPicker from "../../components/CollaboratorPicker";
import MentionInput from "../../components/MentionInput";
import { isGitHubRepositoryUrl } from "../../utils/readGitHubReadme";
import type { Category } from "../../data/types";
import type { StoreController } from "./useStoreController";

export type SubmitProjectModalProps = Pick<
  StoreController,
  | "projectStage"
  | "setProjectStage"
  | "projectVersion"
  | "setProjectVersion"
  | "categories"
  | "categoryInput"
  | "collabIds"
  | "closeSubmission"
  | "desc"
  | "docs"
  | "docsFile"
  | "docsPreviewReturnTab"
  | "docsRepoUrl"
  | "docsTab"
  | "downloadDocumentation"
  | "imageBusy"
  | "icon"
  | "setIcon"
  | "pickIcon"
  | "imgError"
  | "importRepositoryFiles"
  | "loadRepositoryFiles"
  | "pickImages"
  | "profiles"
  | "readMdFile"
  | "repoUrl"
  | "repositoryFiles"
  | "repositoryFilesError"
  | "repositoryFilesImporting"
  | "repositoryFilesLoading"
  | "resetRepositoryFiles"
  | "screenshots"
  | "selectedRepositoryFiles"
  | "setCategoryInput"
  | "setCollabIds"
  | "setDesc"
  | "setDocs"
  | "setDocsFile"
  | "setDocsPreviewReturnTab"
  | "setDocsTab"
  | "setRepoUrl"
  | "setScreenshots"
  | "setSelectedRepositoryFiles"
  | "setTitle"
  | "setUrl"
  | "submit"
  | "submitError"
  | "submitting"
  | "title"
  | "url"
>;

export default function SubmitProjectForm({
  projectStage,
  setProjectStage,
  projectVersion,
  setProjectVersion,
  categories,
  categoryInput,
  collabIds,
  closeSubmission,
  desc,
  docs,
  docsFile,
  docsPreviewReturnTab,
  docsRepoUrl,
  docsTab,
  downloadDocumentation,
  imageBusy,
  icon,
  setIcon,
  pickIcon,
  imgError,
  importRepositoryFiles,
  loadRepositoryFiles,
  pickImages,
  profiles,
  readMdFile,
  repoUrl,
  repositoryFiles,
  repositoryFilesError,
  repositoryFilesImporting,
  repositoryFilesLoading,
  resetRepositoryFiles,
  screenshots,
  selectedRepositoryFiles,
  setCategoryInput,
  setCollabIds,
  setDesc,
  setDocs,
  setDocsFile,
  setDocsPreviewReturnTab,
  setDocsTab,
  setRepoUrl,
  setScreenshots,
  setSelectedRepositoryFiles,
  setTitle,
  setUrl,
  submit,
  submitError,
  submitting,
  title,
  url,
}: SubmitProjectModalProps) {
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingIcon, setPendingIcon] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editingImage = pendingImages[0];
  const imageUploadDisabled =
    submitting || imageBusy || !!editingImage || !!pendingIcon || screenshots.length >= 3;

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid min-w-0 max-w-full gap-5 @min-[36rem]/content:grid-cols-2 motion-safe:animate-content-in"
    >
      <ProjectStageFields
        stage={projectStage}
        onStageChange={setProjectStage}
        version={projectVersion}
        onVersionChange={setProjectVersion}
        disabled={submitting}
      />
      <div className="@min-[36rem]/content:col-span-2">
        <span className="mb-2 block text-xs font-black uppercase">Project icon (optional)</span>
        <div className="flex flex-wrap items-center gap-4">
          {icon && (
            <img
              src={icon}
              alt="Project icon preview"
              className="size-20 rounded-2xl border-2 border-outline bg-surface object-contain"
            />
          )}
          <ButtonLabel variant="surface" size="small" className="cursor-pointer">
            <Images size={20} weight="duotone" aria-hidden="true" />
            {icon ? "Replace icon" : "Choose icon"}
            <FileInput
              aria-label="Choose project icon"
              accept={IMAGE_FILE_ACCEPT}
              disabled={submitting || imageBusy || !!editingImage || !!pendingIcon}
              onChange={(event) => {
                setPendingIcon(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </ButtonLabel>
          {icon && (
            <Button
              type="button"
              variant="text"
              size="small"
              disabled={submitting || imageBusy || !!pendingIcon}
              onClick={() => setIcon("")}
            >
              Remove icon
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-body">
          Choose an image up to 8MB. Crop it to a square for your project icon.
        </p>
        {pendingIcon && (
          <div className="mt-4">
            <h3 className="mb-3 text-lg font-black">Edit project icon</h3>
            <ImageEditor
              file={pendingIcon}
              aspectRatio={1}
              onCancel={() => setPendingIcon(null)}
              onSave={async (file) => {
                if (!(await pickIcon(file))) throw new Error("Could not add this icon.");
                setPendingIcon(null);
              }}
            />
          </div>
        )}
      </div>
      <label className="@min-[36rem]/content:col-span-2">
        <span className="mb-2 block text-xs font-black uppercase">Project name</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="Project name"
        />
      </label>
      <label className="@min-[36rem]/content:col-span-2">
        <span className="mb-2 block text-xs font-black uppercase">
          What does it do? (type @ to mention developers)
        </span>
        <MentionInput
          multiline
          className="scrollbar-minimal"
          value={desc}
          onChange={setDesc}
          profiles={profiles}
          required
          placeholder="One clear sentence — @ a collaborator"
        />
      </label>
      <div className="@min-[36rem]/content:col-span-2">
        <span className="mb-2 block text-xs font-black uppercase">Collaborators (optional)</span>
        <CollaboratorPicker profiles={profiles} selected={collabIds} onChange={setCollabIds} />
      </div>
      <div>
        <span className="mb-2 block text-xs font-black uppercase">Category</span>
        <Dropdown
          label="Category"
          value={categoryInput}
          onChange={(value) => setCategoryInput(value as Category)}
          options={categories
            .filter(({ label }) => label !== "All")
            .map(({ label, Icon }) => ({
              value: label,
              label,
              icon: <Icon size={20} weight="duotone" />,
            }))}
          variant="icons"
        />
      </div>
      <label>
        <span className="mb-2 block text-xs font-black uppercase">Project link (optional)</span>
        <span className="relative block">
          <LinkSimple
            size={21}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2"
          />
          <Input
            className="pl-12"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              resetRepositoryFiles();
            }}
            placeholder="https://project.example"
            aria-describedby="app-link-help"
          />
        </span>
        <span id="app-link-help" className="mt-2 block text-xs text-body">
          Link a prototype, demo, or project page. You can also showcase your work with screenshots.
        </span>
      </label>
      <label>
        <span className="mb-2 block text-xs font-black uppercase">
          GitHub project repo link (optional)
        </span>
        <span className="relative block">
          <LinkSimple
            size={21}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2"
          />
          <Input
            className="pl-12"
            type="url"
            value={repoUrl}
            onChange={(event) => {
              setRepoUrl(event.target.value);
              resetRepositoryFiles();
            }}
            placeholder="https://github.com/you/project"
            aria-describedby="repo-link-help"
          />
        </span>
        <span id="repo-link-help" className="mt-2 block text-xs text-body">
          Only used to import documentation. Never shown on the Open app button.
        </span>
      </label>
      <div className="@min-[36rem]/content:col-span-2">
        <span className="mb-2 block text-xs font-black uppercase">
          Thumbnails (up to 3, first is the cover)
        </span>
        <FileInput
          ref={imageInputRef}
          tabIndex={-1}
          aria-label="Choose thumbnail images"
          accept={IMAGE_FILE_ACCEPT}
          multiple
          disabled={imageUploadDisabled}
          onChange={(e) => {
            setPendingImages(
              Array.from(e.target.files ?? []).slice(0, Math.max(0, 3 - screenshots.length)),
            );
            e.target.value = "";
          }}
        />
        <SortableThumbnails
          images={screenshots}
          onReorder={setScreenshots}
          onRemove={(i) => setScreenshots((prev) => prev.filter((_, j) => j !== i))}
        >
          {Array.from({ length: Math.max(0, 3 - screenshots.length) }, (_, index) => {
            const slot = screenshots.length + index + 1;
            return (
              <div key={slot} role="listitem" className="aspect-video w-full max-w-64">
                <Button
                  type="button"
                  variant="plain"
                  fullWidth
                  fullHeight
                  disabled={imageUploadDisabled}
                  aria-label={`Add thumbnail ${slot}`}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-[3px] border-dashed border-divider bg-surface text-muted transition-colors enabled:hover:border-primary enabled:hover:text-primary"
                >
                  <Images size={28} weight="duotone" aria-hidden="true" />
                  <span className="text-sm font-bold">Add image</span>
                </Button>
              </div>
            );
          })}
        </SortableThumbnails>
        {editingImage && (
          <div className="mt-4">
            <h3 className="text-lg font-black">Edit thumbnail</h3>
            <p className="mt-1 mb-3 break-all text-xs font-bold text-muted">
              {editingImage.name} · {pendingImages.length} image
              {pendingImages.length === 1 ? "" : "s"} remaining
            </p>
            <ImageEditor
              file={editingImage}
              aspectRatio={16 / 9}
              onCancel={() => setPendingImages((images) => images.slice(1))}
              onSave={async (file) => {
                if (!(await pickImages([file]))) {
                  throw new Error("Could not add this thumbnail.");
                }
                setPendingImages((images) => images.slice(1));
              }}
            />
          </div>
        )}
        {imgError && (
          <p role="alert" className="mt-2 text-sm font-bold">
            {userFacingError(imgError)}
          </p>
        )}
        <span className="mt-2 block text-xs text-body">
          JPEG, PNG, WebP, GIF, BMP, AVIF, SVG, and iPhone HEIC/HEIF photos up to 8MB. Animated
          images become still thumbnails. Crop before adding, then drag to reorder — the first image
          becomes the cover.
        </span>
      </div>
      <div className="@min-[36rem]/content:col-span-2">
        <div className="min-w-0 mb-3 flex flex-wrap items-center gap-2 max-w-full">
          {(["write", "upload", "repository"] as const).map((tab) => (
            <Button
              key={tab}
              variant="outline-flat"
              size="small"
              type="button"
              onClick={() => {
                setDocsPreviewReturnTab(tab);
                setDocsTab(tab);
              }}
              aria-pressed={docsTab === tab}
              className="capitalize"
            >
              {tab === "upload" ? "Upload .md" : tab === "repository" ? "GitHub repository" : tab}
            </Button>
          ))}
          <Button
            variant="outline-flat"
            size="small"
            type="button"
            onClick={() => {
              if (docsTab === "preview") setDocsTab(docsPreviewReturnTab);
              else {
                setDocsPreviewReturnTab(docsTab);
                setDocsTab("preview");
              }
            }}
            aria-pressed={docsTab === "preview"}
            className="ml-auto"
          >
            {docsTab === "preview" ? (
              <>
                <PencilSimple size={16} weight="bold" /> Edit
              </>
            ) : (
              <>
                <Eye size={16} weight="bold" /> Preview
              </>
            )}
          </Button>
        </div>
        {docsTab === "write" && (
          <MarkdownTextarea
            aria-label="Project documentation (Markdown)"
            className="min-h-24"
            value={docs}
            onChange={(event) => {
              setDocs(event.target.value);
              setDocsFile(null);
            }}
            maxLength={50000}
            showCharacterCount
            placeholder={"# My project\n\nWhat it does, how to run it…"}
          />
        )}
        {docsTab === "upload" && (
          <div>
            <ButtonLabel variant="surface" size="small" className="cursor-pointer">
              <BookOpenText size={20} weight="duotone" />
              Choose README.md
              <FileInput
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={(e) => {
                  void readMdFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </ButtonLabel>
            <span className="mt-2 block text-xs text-body">
              Works with README.md or plain extensionless README files, like on GitHub.
            </span>
            {docsFile && (
              <div className="mt-3 rounded-xl border-2 border-dashed border-divider p-3">
                <p className="text-sm font-black">✓ {docsFile} loaded</p>
                <p className="mt-1 text-sm font-bold text-muted">
                  {docs.length} chars —{" "}
                  <Button
                    variant="text"
                    type="button"
                    onClick={() => setDocsTab("preview")}
                    className="underline decoration-2 underline-offset-4"
                  >
                    see the finished doc
                  </Button>
                </p>
              </div>
            )}
          </div>
        )}
        {docsTab === "repository" && (
          <div className="rounded-xl border-2 border-outline bg-surface p-4">
            {!isGitHubRepositoryUrl(docsRepoUrl) ? (
              <p role="status" className="text-sm font-bold text-body">
                Provide your GitHub project repo link first — paste it in the repo link field above,
                then come back here to choose Markdown files.
              </p>
            ) : (
              <>
                <p className="text-sm font-bold text-body">
                  Choose Markdown files from the public GitHub repository in your project link.
                </p>
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  onClick={() => void loadRepositoryFiles()}
                  disabled={repositoryFilesLoading || repositoryFilesImporting}
                  className="mt-3"
                >
                  {repositoryFilesLoading ? "Loading repository files…" : "Load Markdown files"}
                </Button>
                {repositoryFilesError && (
                  <p role="alert" className="mt-3 text-sm font-bold text-foreground">
                    {userFacingError(repositoryFilesError)}
                  </p>
                )}
                {repositoryFiles.length > 0 && (
                  <>
                    <div className="min-w-0 mt-4 flex flex-wrap items-center justify-between gap-3 max-w-full">
                      <p className="text-sm font-black">
                        {selectedRepositoryFiles.length} of {repositoryFiles.length} selected
                      </p>
                      <label className="min-w-0 flex items-center gap-2 text-sm font-black max-w-full">
                        <Checkbox
                          checked={selectedRepositoryFiles.length === repositoryFiles.length}
                          onChange={(event) =>
                            setSelectedRepositoryFiles(event.target.checked ? repositoryFiles : [])
                          }
                        />
                        Select all
                      </label>
                    </div>
                    <div className="scrollbar-minimal mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border-2 border-divider p-2">
                      {repositoryFiles.map((path) => (
                        <label
                          key={path}
                          className="min-w-0 flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm font-bold hover:bg-background max-w-full"
                        >
                          <Checkbox
                            checked={selectedRepositoryFiles.includes(path)}
                            onChange={(event) =>
                              setSelectedRepositoryFiles((selected) =>
                                event.target.checked
                                  ? [...selected, path]
                                  : selected.filter((item) => item !== path),
                              )
                            }
                            className="mt-1 shrink-0"
                          />
                          <span className="break-all">{path}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      size="small"
                      type="button"
                      onClick={() => void importRepositoryFiles()}
                      disabled={!selectedRepositoryFiles.length || repositoryFilesImporting}
                      className="mt-3"
                    >
                      {repositoryFilesImporting
                        ? "Importing selected files…"
                        : `Use ${selectedRepositoryFiles.length} selected file${selectedRepositoryFiles.length === 1 ? "" : "s"}`}
                    </Button>
                    <p className="mt-2 text-xs font-bold text-muted">
                      Selected files are combined into project documentation (50,000-character
                      limit).
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {docsTab === "preview" && (
          <div className="rounded-2xl border-[3px] border-outline bg-surface p-4">
            {docsFile && docs.trim() && (
              <p className="mb-3 text-xs font-black uppercase text-muted">Preview of {docsFile}</p>
            )}
            {docs.length > 50000 && (
              <div
                role="status"
                className="min-w-0 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-outline bg-secondary/40 p-3 max-w-full"
              >
                <p className="text-sm font-bold">
                  This document is {docs.length.toLocaleString()} characters. It exceeds the
                  50,000-character project limit, but you can still download it.
                </p>
                <Button
                  variant="surface"
                  size="small"
                  type="button"
                  onClick={downloadDocumentation}
                  className="shrink-0"
                >
                  <DownloadSimple size={18} weight="bold" />
                  Download Markdown
                </Button>
              </div>
            )}
            {docs.trim() ? (
              <PagedMarkdown text={docs} fadeTo="var(--color-surface)" />
            ) : (
              <p className="text-sm font-bold text-muted">
                Nothing to preview yet — write some markdown or upload a README.
              </p>
            )}
          </div>
        )}
      </div>
      {submitError && (
        <p
          role="alert"
          className="@min-[36rem]/content:col-span-2 text-sm font-bold text-foreground"
        >
          {userFacingError(submitError)}
        </p>
      )}
      <Button
        type="button"
        onClick={(event) => {
          if (event.currentTarget.form?.reportValidity()) void submit(event);
        }}
        disabled={
          submitting ||
          imageBusy ||
          !!editingImage ||
          !!pendingIcon ||
          repositoryFilesLoading ||
          repositoryFilesImporting
        }
        className="@min-[36rem]/content:col-span-2 @min-[36rem]/content:justify-self-start"
      >
        {submitting
          ? "Publishing…"
          : imageBusy
            ? "Processing images…"
            : repositoryFilesLoading || repositoryFilesImporting
              ? "Loading documentation…"
              : "Publish project"}{" "}
        <ArrowRight size={20} weight="bold" />
      </Button>
    </form>
  );
}
