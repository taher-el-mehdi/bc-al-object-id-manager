export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function inAnyRange(n: number, ranges: { from: number; to: number }[]): boolean {
  for (const r of ranges) {
    if (n >= r.from && n <= r.to) return true;
  }
  return false;
}

export function* iterateRanges(ranges: { from: number; to: number }[]): Generator<number> {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  for (const r of sorted) {
    for (let i = r.from; i <= r.to; i++) {
      yield i;
    }
  }
}
