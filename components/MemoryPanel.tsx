interface MemoryPanelProps {
  memory: Uint8Array;
  /** Rebased (0-indexed) start address to display. */
  startIndex: number;
  wordCount: number;
  /** Rebased index highlighted as "the result". */
  highlightIndex?: number;
}

export function MemoryPanel({ memory, startIndex, wordCount, highlightIndex }: MemoryPanelProps) {
  const words: { addr: number; value: number }[] = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = startIndex + i * 4;
    const value = (memory[idx] | (memory[idx + 1] << 8) | (memory[idx + 2] << 16) | (memory[idx + 3] << 24)) >>> 0;
    words.push({ addr: idx, value });
  }

  return (
    <div className="mono flex flex-col gap-1 text-xs">
      {words.map((w) => (
        <div
          key={w.addr}
          className={`flex items-center justify-between rounded px-2 py-1 ${w.addr === highlightIndex ? "bg-accent/15 text-accent" : "text-muted"}`}
        >
          <span>0x{(0x80000000 + w.addr).toString(16)}</span>
          <span className="text-foreground">{w.value.toString(16).padStart(8, "0")}</span>
          <span>{w.value}</span>
        </div>
      ))}
    </div>
  );
}
