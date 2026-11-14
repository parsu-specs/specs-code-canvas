import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { Button } from "./Button";

export function useDisplayNameConfirmation() {
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(
    () => () => {
      pending.current?.(false);
    },
    [],
  );
  const finish = (accepted: boolean) => {
    pending.current?.(accepted);
    pending.current = null;
    setMessage(null);
  };
  const confirm = (description: string) =>
    new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setMessage(description);
    });
  const confirmationModal = message && (
    <Modal
      id="change-display-name"
      title="Change username?"
      description={message}
      onClose={() => finish(false)}
    >
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="surface" onClick={() => finish(false)}>
          Keep editing
        </Button>
        <Button variant="danger" onClick={() => finish(true)}>
          Change username
        </Button>
      </div>
    </Modal>
  );
  return { confirm, confirmationModal };
}
