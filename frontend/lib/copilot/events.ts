/* lib/copilot/events.ts */

/*
 * How the copilot tells the rest of the app it changed something.
 *
 * The panel floats above every page and can log a meal or save a routine while
 * the dashboard behind it is showing stale numbers. Threading a refresh
 * callback down through the layout to reach a hook two routes away would couple
 * every page to the copilot, so screens subscribe to the topic they care about
 * instead
 */

export type CopilotTopic = 'nutrition' | 'profile' | 'routines';

type Listener = () => void;

const listeners = new Map<CopilotTopic, Set<Listener>>();

export function onCopilotChange(
  topic: CopilotTopic,
  listener: Listener,
): () => void {
  const set = listeners.get(topic) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(topic, set);

  /* Returns its own unsubscribe so a useEffect can hand it straight back */
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(topic);
  };
}

/* One listener throwing must not stop the others from being told */
export function emitCopilotChange(topic: CopilotTopic): void {
  const set = listeners.get(topic);
  if (!set) return;
  for (const listener of Array.from(set)) {
    try {
      listener();
    } catch (error) {
      console.error(`Copilot listener for "${topic}" failed`, error);
    }
  }
}

export function clearCopilotListeners(): void {
  listeners.clear();
}
