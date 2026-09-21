export type ShuffleQueue = { history: string[]; cursor: number; remaining: string[] };

function shuffle(tracks: readonly string[], random: () => number) {
  const result = [...tracks];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function startQueue(tracks: readonly string[], first: string, random = Math.random): ShuffleQueue {
  return { history: [first], cursor: 0, remaining: shuffle(tracks.filter((track) => track !== first), random) };
}

export function nextTrack(queue: ShuffleQueue, tracks: readonly string[], random = Math.random): ShuffleQueue {
  if (queue.cursor < queue.history.length - 1) return { ...queue, cursor: queue.cursor + 1 };
  let remaining = queue.remaining;
  if (!remaining.length) {
    remaining = shuffle(tracks, random);
    if (remaining.length > 1 && remaining[0] === queue.history[queue.cursor]) {
      [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    }
  }
  const [next, ...rest] = remaining;
  if (!next) return queue;
  return { history: [...queue.history, next], cursor: queue.cursor + 1, remaining: rest };
}

export function previousTrack(queue: ShuffleQueue): ShuffleQueue {
  return { ...queue, cursor: Math.max(0, queue.cursor - 1) };
}
