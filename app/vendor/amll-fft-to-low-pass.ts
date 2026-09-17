// SPDX-License-Identifier: AGPL-3.0-only
// Adapted from AMLL Player's FFTToLowPassContext (React/Jotai shell removed only).
// https://github.com/amll-dev/amll-player/blob/6d21991731c2ad3217680872cee8ab556b4866a3/packages/player/src/components/LocalMusicContext/index.tsx#L60-L142
// Original arithmetic, window behavior and frame-time coefficient are preserved.
export class AmllFFTToLowPass {
  private curValue = 1;
  private lastTime = 0;
  private gradient: number[] = [];

  reset() {
    this.curValue = 1;
    this.lastTime = 0;
    this.gradient = [];
  }

  private amplitudeToLevel(amplitude: number) {
    const normalizedAmplitude = amplitude / 255;
    return .5 * Math.log10(normalizedAmplitude + 1);
  }

  private calculateGradient(fftData: ArrayLike<number>) {
    const window = 10;
    const volume = (this.amplitudeToLevel(fftData[0]) + this.amplitudeToLevel(fftData[1])) * .5;
    if (this.gradient.length < window && !this.gradient.includes(volume)) {
      this.gradient.push(volume);
      return 0;
    }
    this.gradient.shift();
    this.gradient.push(volume);
    const maxInInterval = Math.max(...this.gradient) ** 2;
    const minInInterval = Math.min(...this.gradient);
    const difference = maxInInterval - minInInterval;
    return difference > .35 ? maxInInterval : minInInterval * .5 ** 2;
  }

  update(fftData: ArrayLike<number>, time: number) {
    const delta = time - this.lastTime;
    const value = this.calculateGradient(fftData);
    const increasing = this.curValue < value;
    if (increasing) {
      this.curValue = Math.min(value, this.curValue + (value - this.curValue) * .003 * delta);
    } else {
      this.curValue = Math.max(value, this.curValue + (value - this.curValue) * .003 * delta);
    }
    if (Number.isNaN(this.curValue)) this.curValue = 1;
    this.lastTime = time;
    return this.curValue;
  }
}
