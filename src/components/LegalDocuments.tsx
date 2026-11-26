import { useState } from "react";
import Markdown from "./Markdown";
import Modal from "./Modal";
import privacyPolicy from "../../docs/privacy-policy.md?raw";
import termsConditions from "../../docs/terms-conditions.md?raw";
import { Button } from "./Button";

type LegalDocument = "privacy" | "terms";

export default function LegalDocuments({ size = "sm" }: { size?: "xs" | "sm" }) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const title = document === "privacy" ? "Privacy policy" : "Terms and conditions";
  const linkSize = size === "xs" ? "text-xs" : "text-sm";

  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Button
          variant="plain"
          className={`${linkSize} font-black underline`}
          onClick={() => setDocument("privacy")}
        >
          Privacy policy
        </Button>
        <Button
          variant="plain"
          className={`${linkSize} font-black underline`}
          onClick={() => setDocument("terms")}
        >
          Terms and conditions
        </Button>
      </div>
      {document && (
        <Modal id="legal-document" title={title} onClose={() => setDocument(null)}>
          <article
            className="rounded-xl border-2 border-outline bg-surface p-4 sm:p-6"
            onClick={(event) => {
              const link = (event.target as HTMLElement).closest("a");
              const href = link?.getAttribute("href");
              if (href?.endsWith("privacy-policy.md")) {
                event.preventDefault();
                setDocument("privacy");
              } else if (href?.endsWith("terms-conditions.md")) {
                event.preventDefault();
                setDocument("terms");
              }
            }}
          >
            <Markdown text={document === "privacy" ? privacyPolicy : termsConditions} fullWidth />
          </article>
        </Modal>
      )}
    </>
  );
}
