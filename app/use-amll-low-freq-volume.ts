"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { FFTPlayer } from "@applemusic-like-lyrics/fft";
import { AmllFFTToLowPass } from "./vendor/amll-fft-to-low-pass";

type AudioGraph = {
  context: AudioContext;
  source?: MediaElementAudioSourceNode;
  capture?: AudioWorkletNode;
  createFFT?: () => FFTPlayer;
  fft?: FFTPlayer;
  spectrum: Float32Array<ArrayBuffer>;
  initializing?: Promise<void>;
  generation: number;
  active: boolean;
  disposed: boolean;
};

/** Official AMLL FFT + player response; Web Audio only transports playback PCM. */
export function useAmllLowFreqVolume(audioRef: RefObject<HTMLAudioElement | null>) {
  const lowFreqVolumeRef = useRef(0);
  const graphRef = useRef<AudioGraph | null>(null);
  const lifetimeRef = useRef(0);
  const syncRef = useRef<(() => void) | null>(null);

  const activateAudioAnalyzer = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || typeof AudioContext === "undefined" || typeof AudioWorkletNode === "undefined") return;
    const url = new URL(audio.currentSrc || audio.src, location.href);
    // Leave non-CORS remote fallback playback native rather than silencing it.
    if (url.protocol !== "blob:" && url.origin !== location.origin) return;
    try {
      let graph = graphRef.current;
      if (!graph) {
        graph = {
          context: new AudioContext(), spectrum: new Float32Array(128),
          generation: 0, active: false, disposed: false,
        };
        graphRef.current = graph;
      }
      const current = graph;
      // Invoke resume during the gesture, before imports or worklet loading await.
      const resume = current.context.resume();
      if (!current.initializing && !current.capture) {
        current.initializing = (async () => {
          const [library] = await Promise.all([
            import("@applemusic-like-lyrics/fft"),
            current.context.audioWorklet.addModule("/audio-worklets/amll-pcm.js"),
          ]);
          if (current.disposed) return;
          current.createFFT = () => {
            const fft = new library.FFTPlayer();
            fft.setFreqRange(80, 2000); // AMLL's default fftDataRangeAtom.
            return fft;
          };
          const capture = new AudioWorkletNode(current.context, "amll-pcm", {
            numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
            channelCountMode: "max",
          });
          current.capture = capture;
          capture.port.onmessage = ({ data }) => {
            if (current.disposed || data.type !== "pcm") return;
            try {
              if (current.active && data.generation === current.generation && current.fft) {
                current.fft.pushDataF32(data.rate, data.channels, data.samples);
              }
            } catch (error) {
              current.active = false;
              current.spectrum.fill(0);
              lowFreqVolumeRef.current = 0;
              capture.port.postMessage({ type: "state", active: false, generation: ++current.generation });
              console.warn("AMLL FFT unavailable; playback continues without audio response.", error);
            } finally {
              capture.port.postMessage({ type: "ack", generation: data.generation });
            }
          };
          capture.onprocessorerror = () => {
            current.active = false;
            lowFreqVolumeRef.current = 0;
            console.warn("AMLL PCM capture stopped; audio playback is unaffected.");
          };
        })().finally(() => { current.initializing = undefined; });
      }
      await Promise.all([resume, current.initializing]);
      if (current.disposed || current.context.state !== "running" || !current.capture) return;
      if (!current.source) {
        current.source = current.context.createMediaElementSource(audio);
        // FFT is on a silent side branch, never in the audible signal path.
        current.source.connect(current.context.destination);
        current.source.connect(current.capture);
        current.capture.connect(current.context.destination);
      }
      syncRef.current?.();
    } catch (error) {
      console.warn("AMLL audio analysis unavailable; keeping normal playback.", error);
    }
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const lifetimeCounter = lifetimeRef;
    const lifetime = ++lifetimeCounter.current;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const response = new AmllFFTToLowPass();
    let frame = 0;
    let lastRead = 0;

    const tick = (now: number) => {
      const graph = graphRef.current;
      if (graph?.active && graph.fft && graph.context.state === "running" && audio.readyState >= 3) {
        try {
          // Official native player publishes 128 spectrum values every 50 ms.
          if (now - lastRead >= 50) {
            graph.fft.read(graph.spectrum);
            lastRead = now;
          }
          // FFTToLowPassContext itself runs every animation frame, without our old gains.
          lowFreqVolumeRef.current = response.update(graph.spectrum, now);
        } catch (error) {
          graph.active = false;
          lowFreqVolumeRef.current = 0;
          graph.capture?.port.postMessage({ type: "state", active: false, generation: ++graph.generation });
          console.warn("AMLL FFT stopped; audio playback is unaffected.", error);
        }
      } else lowFreqVolumeRef.current = 0;
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      lowFreqVolumeRef.current = 0;
      response.reset();
      lastRead = 0;
      const graph = graphRef.current;
      if (!graph || graph.disposed) return;
      graph.active = Boolean(graph.source && graph.createFFT && !audio.paused && !audio.ended
        && !audio.seeking && audio.readyState >= 3 && !document.hidden && !motion.matches);
      graph.generation++;
      // FFTPlayer has no public clear(); recreate it to discard pre-seek/resume PCM.
      graph.fft?.free();
      graph.fft = undefined;
      graph.spectrum.fill(0);
      if (graph.active) {
        try { graph.fft = graph.createFFT!(); }
        catch (error) {
          graph.active = false;
          console.warn("AMLL FFT initialization failed.", error);
        }
      }
      graph.capture?.port.postMessage({ type: "state", active: graph.active, generation: graph.generation });
      if (graph.active) frame = requestAnimationFrame(tick);
    };
    syncRef.current = sync;
    const events = ["play", "pause", "ended", "seeking", "seeked", "emptied", "waiting", "playing"];
    events.forEach((event) => audio.addEventListener(event, sync));
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      lowFreqVolumeRef.current = 0;
      syncRef.current = null;
      events.forEach((event) => audio.removeEventListener(event, sync));
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      // React Strict Mode reattaches to this same audio element synchronously.
      queueMicrotask(() => {
        if (lifetimeCounter.current !== lifetime) return;
        lifetimeCounter.current++;
        const graph = graphRef.current;
        graphRef.current = null;
        if (!graph) return;
        graph.disposed = true;
        graph.source?.disconnect();
        graph.capture?.disconnect();
        graph.capture?.port.close();
        graph.fft?.free();
        void graph.context.close().catch(() => {});
      });
    };
  }, [audioRef]);

  return { lowFreqVolumeRef, activateAudioAnalyzer };
}
