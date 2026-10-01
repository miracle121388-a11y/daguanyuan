/** Wall-clock playback survives panel unmounts and throttled animation frames. */
export class PlaybackTimeline {
  private elapsed = 0;
  private last: number;
  constructor(readonly duration: number, private now = () => performance.now()) { this.last = now(); }
  sample(paused: boolean, rate: number) {
    const current = this.now();
    if (!paused) this.elapsed += Math.max(0, current - this.last) / 1000 * rate;
    this.last = current;
    return Math.min(1, this.elapsed / this.duration);
  }
}
