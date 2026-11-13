import { useId, useState } from "react";
import { Play, SpeakerHigh } from "@phosphor-icons/react";
import { Button } from "./Button";
import Toggle from "./Toggle";
import { isSoundsMuted, playNotificationSound, setSoundsMuted } from "../utils/sounds";

export default function SoundControl() {
  const [muted, setMuted] = useState(isSoundsMuted);
  const descriptionId = useId();

  const changeSounds = (enabled: boolean) => {
    setSoundsMuted(!enabled);
    setMuted(!enabled);
    if (enabled) playNotificationSound();
  };

  return (
    <section className="toon-card toon-paper bg-panel p-6 pt-10 sm:p-8 sm:pt-12">
      <div className="flex min-w-0 items-center gap-2">
        <SpeakerHigh size={22} weight="duotone" aria-hidden="true" />
        <h2 className="text-2xl font-black">Sounds</h2>
      </div>
      <p id={descriptionId} className="mt-2 text-sm font-bold text-muted">
        Chimes for likes and new notifications. Stored on this device only.
      </p>
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
        <Toggle
          checked={!muted}
          onCheckedChange={changeSounds}
          aria-label="Sound effects"
          aria-describedby={descriptionId}
        />
        <span className="text-sm font-black">{muted ? "Muted" : "On"}</span>
        <Button
          variant="surface"
          size="small"
          onClick={playNotificationSound}
          disabled={muted}
          title={muted ? "Enable sounds to preview" : "Preview the notification chime"}
          className="sm:ml-auto"
        >
          <Play size={18} weight="duotone" aria-hidden="true" />
          Preview chime
        </Button>
      </div>
    </section>
  );
}
