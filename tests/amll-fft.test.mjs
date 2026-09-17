// Non-UI checks: execute the official WASM on PCM and verify the transport protocol.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as glue from "../node_modules/@applemusic-like-lyrics/fft/pkg/fft_bg.js";

const bytes = await readFile(new URL("../node_modules/@applemusic-like-lyrics/fft/pkg/fft_bg.wasm", import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes, { "./fft_bg.js": glue });
glue.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start();

function sine(rate, frequency, start, frames, channels = 2) {
  const pcm = new Float32Array(frames * channels);
  for (let i = 0; i < frames; i++) {
    const value = .5 * Math.sin(2 * Math.PI * frequency * (start + i) / rate);
    for (let channel = 0; channel < channels; channel++) pcm[i * channels + channel] = value;
  }
  return pcm;
}

async function spectrum(rate, frequency) {
  const fft = new glue.FFTPlayer();
  fft.setFreqRange(80, 2000);
  const output = new Float32Array(128);
  let read = false;
  try {
    for (let i = 0; i < 5; i++) {
      fft.pushDataF32(rate, 2, sine(rate, frequency, i * 2048, 2048));
      read = fft.read(output) || read;
      await new Promise(resolve => setTimeout(resolve, 47));
    }
    assert.ok(read, "official FFT produces a spectrum from streamed PCM");
    assert.ok(output.every(Number.isFinite));
    return output;
  } finally { fft.free(); }
}

test("official FFT resamples stereo PCM and distinguishes bass from higher tones", async () => {
  for (const rate of [44100, 48000]) {
    const bass = await spectrum(rate, 100);
    const higher = await spectrum(rate, 1000);
    assert.ok(bass[0] + bass[1] > 10 * (higher[0] + higher[1]));
    assert.ok(bass.indexOf(Math.max(...bass)) < 3);
    const higherPeak = higher.indexOf(Math.max(...higher));
    assert.ok(higherPeak >= 55 && higherPeak <= 70);
  }
  const silence = await spectrum(44100, 0);
  assert.ok(silence.every(value => value === 0));
});

test("PCM worklet preserves interleaving and discards stale blocks after seek/reset", async () => {
  let Processor;
  const packets = [];
  const context = vm.createContext({
    Float32Array, sampleRate: 48000,
    AudioWorkletProcessor: class {
      port = { postMessage: packet => packets.push(structuredClone(packet)) };
    },
    registerProcessor: (_name, ctor) => { Processor = ctor; },
  });
  vm.runInContext(await readFile(new URL("../public/audio-worklets/amll-pcm.js", import.meta.url), "utf8"), context);
  const processor = new Processor();
  const state = (generation, active = true) => processor.port.onmessage({ data: { type: "state", generation, active } });
  const feed = (left, right, blocks = 16) => {
    for (let i = 0; i < blocks; i++) processor.process([[new Float32Array(128).fill(left), new Float32Array(128).fill(right)]]);
  };
  state(1);
  feed(.25, -.5);
  assert.equal(packets.length, 1);
  assert.equal(packets[0].samples.length, 4096);
  assert.equal(packets[0].samples[0], .25);
  assert.equal(packets[0].samples[1], -.5);
  assert.equal(packets[0].rate, 48000);
  feed(1, 1);
  assert.equal(packets.length, 1, "unacknowledged packets apply backpressure");
  state(2);
  feed(.75, .5, 8);
  state(3);
  feed(.125, .25);
  assert.equal(packets.length, 2);
  assert.equal(packets[1].generation, 3);
  assert.equal(packets[1].samples[0], .125, "partial pre-seek data was discarded");
  state(4, false);
  feed(1, 1);
  assert.equal(packets.length, 2, "paused capture emits no PCM");
});
