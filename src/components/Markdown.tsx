import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders user-supplied markdown as React elements (no dangerouslySetInnerHTML,
// raw HTML in the source is ignored), so pasted READMEs can't inject scripts.
// Links are protocol-allowlisted below: react-markdown renders any href by
// default, including javascript:/data: payloads planted in imported READMEs.

/** hrefs that may never become clickable links. */
const BLOCKED_PROTOCOL = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function isRelativeUrl(url: string): boolean {
  const clean = url.trim();
  if (clean === "" || clean.startsWith("/") || clean.startsWith("#")) return true;
  return !BLOCKED_PROTOCOL.test(clean);
}

/** Display URL for a markdown link target. Returns "#" for blocked protocols. */
export function sanitizeMarkdownUrl(url: string | undefined): string {
  if (url === undefined) return "#";
  const clean = url.trim();
  if (/^(https?:|mailto:)/i.test(clean)) return url;
  if (isRelativeUrl(clean)) return url;
  return "#";
}

const headingClassName = "mt-[1.25em] mb-[.5em] font-black leading-[1.3] text-foreground";

// Each rendered element owns its utilities, including GFM tables and task lists.
// The only child selectors live on this component's own wrapper/list/code block.
const components: Components = {
  h1: ({ node: _node, ...props }) => <h1 {...props} className={`${headingClassName} text-2xl`} />,
  h2: ({ node: _node, ...props }) => <h2 {...props} className={`${headingClassName} text-xl`} />,
  h3: ({ node: _node, ...props }) => (
    <h3 {...props} className={`${headingClassName} text-[1.05rem]`} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4 {...props} className={`${headingClassName} text-[1.05rem]`} />
  ),
  h5: ({ node: _node, ...props }) => (
    <h5 {...props} className={`${headingClassName} text-[1.05rem]`} />
  ),
  h6: ({ node: _node, ...props }) => (
    <h6 {...props} className={`${headingClassName} text-[1.05rem]`} />
  ),
  p: ({ node: _node, ...props }) => <p {...props} className="my-[.75em]" />,
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      className="font-extrabold text-primary underline decoration-2 underline-offset-[3px]"
    />
  ),
  ul: ({ node: _node, className = "", ...props }) => (
    <ul {...props} className={`my-[.75em] list-disc pl-6 ${className}`} />
  ),
  ol: ({ node: _node, className = "", ...props }) => (
    <ol {...props} className={`my-[.75em] list-decimal pl-6 ${className}`} />
  ),
  li: ({ node: _node, className = "", ...props }) => (
    <li {...props} className={`my-[.3em] [&>ul]:my-[.3em] [&>ol]:my-[.3em] ${className}`} />
  ),
  input: ({ node: _node, ...props }) => <input {...props} className="mr-[.4rem] accent-primary" />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      {...props}
      className="my-[1em] rounded-r-xl border-l-4 border-primary bg-surface px-[1em] py-[.5em]"
    />
  ),
  code: ({ node: _node, className = "", ...props }) => (
    <code
      {...props}
      className={`rounded-[.4rem] bg-inverse px-[.4em] py-[.15em] text-[.85em] text-inverse-foreground ${className}`}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      {...props}
      className="my-[1em] min-w-0 max-w-full whitespace-pre overflow-x-auto rounded-xl border-[3px] border-outline bg-inverse p-[1em] shadow-[3px_3px_0_var(--color-ink-shadow)] [&>code]:bg-transparent [&>code]:p-0"
    />
  ),
  table: ({ node: _node, ...props }) => (
    <table
      {...props}
      className="my-[1em] block w-full overflow-x-auto border-collapse text-[.9em]"
    />
  ),
  th: ({ node: _node, ...props }) => (
    <th
      {...props}
      className="border-2 border-divider bg-surface px-[.75em] py-[.5em] text-left font-black text-foreground"
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td {...props} className="border-2 border-divider px-[.75em] py-[.5em] text-left" />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr {...props} className="my-[1.5em] border-0 border-t-2 border-dashed border-divider" />
  ),
  img: ({ node: _node, ...props }) => (
    <img {...props} className="max-w-full rounded-xl border-[3px] border-outline" />
  ),
};

export default function Markdown({
  text,
  className = "",
  fullWidth = false,
}: {
  text: string;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`${fullWidth ? "max-w-none" : "max-w-3xl"} min-w-0 w-full leading-[1.8] text-body wrap-anywhere [&>:first-child]:mt-0 ${className}`}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        urlTransform={sanitizeMarkdownUrl}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
