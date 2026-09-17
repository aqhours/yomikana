// Transport only: FFT, resampling and channel mixing belong to the official AMLL package.
class AmllPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = false;
    this.generation = 0;
    this.pending = false;
    this.frames = 0;
    this.channels = 0;
    this.buffer = null;
    this.port.onmessage = ({ data }) => {
      if (data.type === "state") {
        this.active = data.active;
        this.generation = data.generation;
        this.pending = false;
        this.frames = 0;
      } else if (data.type === "ack" && data.generation === this.generation) {
        this.pending = false;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!this.active || !input?.length || !input[0]?.length) return true;
    if (this.channels !== input.length || !this.buffer) {
      this.channels = input.length;
      this.buffer = new Float32Array(2048 * this.channels);
      this.frames = 0;
    }
    for (let i = 0; i < input[0].length; i++) {
      for (let channel = 0; channel < this.channels; channel++) {
        this.buffer[this.frames * this.channels + channel] = input[channel][i];
      }
      this.frames++;
      if (this.frames === 2048) {
        if (!this.pending) {
          this.port.postMessage({
            type: "pcm", generation: this.generation, channels: this.channels,
            rate: sampleRate, samples: this.buffer,
          }, [this.buffer.buffer]);
          this.buffer = new Float32Array(2048 * this.channels);
          this.pending = true;
        }
        // Drop stale analysis blocks under backpressure; never block audible playback.
        this.frames = 0;
      }
    }
    // Outputs remain silent. The audio element has a separate direct audible path.
    return true;
  }
}
registerProcessor("amll-pcm", AmllPCM);
