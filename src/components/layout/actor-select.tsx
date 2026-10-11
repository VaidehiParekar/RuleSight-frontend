import { ChevronDown } from "lucide-react";

import { useActor } from "@/app/actor-context";
import { useToast } from "@/components/feedback/toast-context";

/** "Acting as" control. The choice is sent as X-Actor and recorded in the audit log. */
export function ActorSelect() {
  const { actor, actors, setActorId } = useActor();
  const { notify } = useToast();
  return (
    <label className="actor-select">
      <span className="avatar" aria-hidden="true">
        {actor.initials}
      </span>
      <span className="actor-copy" aria-hidden="true">
        <small>Acting as</small>
        <strong>{actor.name}</strong>
      </span>
      <ChevronDown size={14} className="actor-chevron" aria-hidden="true" />
      <select
        value={actor.id}
        aria-label="Acting as"
        onChange={(event) => {
          const next = actors.find((candidate) => candidate.id === event.target.value);
          if (!next) return;
          setActorId(next.id);
          notify({
            title: `Now acting as ${next.name}`,
            detail: "New actions are recorded under this name.",
            tone: "neutral",
          });
        }}
      >
        {actors.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}, {candidate.role}
          </option>
        ))}
      </select>
    </label>
  );
}
