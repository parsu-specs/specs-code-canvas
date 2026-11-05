import { Suspense } from "react";
import Modal from "../../components/Modal";
import { SubmissionFormSkeleton } from "../../components/Skeleton";
import { lazyPage } from "../../utils/lazyPage";
import type { SubmitProjectModalProps } from "./SubmitProjectForm";

export type { SubmitProjectModalProps } from "./SubmitProjectForm";

const SubmitProjectForm = lazyPage(() => import("./SubmitProjectForm"));

export default function SubmitProjectModal(props: SubmitProjectModalProps) {
  return (
    <Modal
      id="submit-project"
      title="Submit a project"
      description="Add a concise description and a link to your project."
      onClose={props.closeSubmission}
      closeDisabled={props.submitting}
      closeConfirmation="Closing will discard all project details, collaborators, images, and documentation. This cannot be undone."
    >
      <Suspense
        fallback={
          <div className="min-h-[90dvh]">
            <SubmissionFormSkeleton />
          </div>
        }
      >
        <SubmitProjectForm {...props} />
      </Suspense>
    </Modal>
  );
}
