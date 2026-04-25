/**
 * Custom hook wrapping the Web Speech API with a proper state machine.
 *
 * States: idle → listening → processing → captured | error
 *
 * Only final recognition results are committed. Interim results are
 * surfaced for live preview but never saved.
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechState = "idle" | "listening" | "processing" | "captured" | "error" | "unsupported";

interface UseSpeechRecognitionOptions {
  /** Minimum confidence threshold (0-1). Below this the result is discarded. */
  minConfidence?: number;
  /** Language code, defaults to navigator language or en-US */
  lang?: string;
  /** Called with the final committed transcript */
  onResult?: (transcript: string, confidence: number) => void;
}

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  /** The latest interim (partial) transcript — for live preview only */
  interimTranscript: string;
  /** The committed final transcript */
  finalTranscript: string;
  /** Human-readable error */
  errorMessage: string | null;
  /** Confidence of the last final result (0-1) */
  confidence: number;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const { minConfidence = 0.4, lang, onResult } = opts;

  const [state, setState] = useState<SpeechState>(SpeechRecognitionCtor ? "idle" : "unsupported");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    SpeechRecognitionCtor ? null : "Speech recognition is not supported in this browser."
  );
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<any>(null);
  // Track EVERY active MediaStream so we can release them all on cleanup.
  // Safari/macOS keeps the orange mic indicator on if any track is still live.
  const activeStreamsRef = useRef<Set<MediaStream>>(new Set());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stopFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  const stoppingRef = useRef(false);
  const committedRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const finalConfidenceRef = useRef(0);
  const errorStateRef = useRef(false);
  const interimRef = useRef("");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const clearStopFallback = useCallback(() => {
    if (stopFallbackTimeoutRef.current) {
      clearTimeout(stopFallbackTimeoutRef.current);
      stopFallbackTimeoutRef.current = null;
    }
  }, []);

  const clearSafetyStop = useCallback(() => {
    if (safetyStopTimeoutRef.current) {
      clearTimeout(safetyStopTimeoutRef.current);
      safetyStopTimeoutRef.current = null;
    }
  }, []);

  const hardStopStream = useCallback((stream: MediaStream | null | undefined) => {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
        try { track.enabled = false; } catch {}
      });
    } catch {}
    activeStreamsRef.current.delete(stream);
  }, []);

  const stopMediaStream = useCallback(() => {
    // Stop ALL tracked streams, not just the latest one.
    activeStreamsRef.current.forEach((stream) => {
      try {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
          try { track.enabled = false; } catch {}
        });
      } catch {}
    });
    activeStreamsRef.current.clear();
    mediaStreamRef.current = null;
  }, []);

  const scheduleSafetyStop = useCallback(() => {
    clearSafetyStop();
    // Safari sometimes leaves the indicator on briefly; re-stop after 250ms.
    safetyStopTimeoutRef.current = setTimeout(() => {
      stopMediaStream();
      safetyStopTimeoutRef.current = null;
    }, 250);
  }, [clearSafetyStop, stopMediaStream]);

  const releaseRecognition = useCallback((instance?: any) => {
    const rec = instance ?? recognitionRef.current;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onaudiostart = null;
      rec.onaudioend = null;
      rec.onspeechstart = null;
      rec.onspeechend = null;
      rec.onstart = null;
    } catch {}
    // Call BOTH stop() and abort() — Safari needs both to fully release the mic.
    try { rec.stop(); } catch {}
    try { rec.abort(); } catch {}
    if (recognitionRef.current === rec) {
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearStopFallback();
      clearSafetyStop();
      stopMediaStream();
      releaseRecognition();
    };
  }, [clearStopFallback, clearSafetyStop, stopMediaStream, releaseRecognition]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setState("unsupported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    clearStopFallback();
    stopMediaStream();
    releaseRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang || navigator.language || "en-US";

    committedRef.current = false;
    stoppingRef.current = false;
    finalTranscriptRef.current = "";
    finalConfidenceRef.current = 0;
    errorStateRef.current = false;
    interimRef.current = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      let bestConfidence = 0;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const conf = result[0].confidence || 0;

        if (result.isFinal) {
          final += text;
          bestConfidence = Math.max(bestConfidence, conf);
        } else {
          interim += text;
        }
      }

      if (interim) {
        interimRef.current = interim;
        setInterimTranscript(interim);
      }

      if (final && !committedRef.current) {
        if (bestConfidence > 0 && bestConfidence < minConfidence) {
          setInterimTranscript("");
          setState("error");
          errorStateRef.current = true;
          setErrorMessage("Could not understand speech clearly. Please try again.");
          stopMediaStream();
          releaseRecognition(recognition);
          scheduleSafetyStop();
          committedRef.current = true;
          return;
        }

        const committedText = final.trim();
        finalTranscriptRef.current = committedText;
        finalConfidenceRef.current = bestConfidence;
        committedRef.current = true;
        setFinalTranscript(committedText);
        setConfidence(bestConfidence);
        setInterimTranscript("");
        setState("processing");
        onResultRef.current?.(committedText, bestConfidence);
        stopMediaStream();
        try { recognition.stop(); } catch {}
        try { recognition.abort(); } catch {}
        scheduleSafetyStop();
      }
    };

    recognition.onerror = (event: any) => {
      clearStopFallback();
      stopMediaStream();
      scheduleSafetyStop();
      const err = event.error;
      if (err === "no-speech") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("No speech detected. Please try again.");
      } else if (err === "aborted" || err === "canceled") {
        if (!committedRef.current) setState("idle");
      } else if (err === "not-allowed") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("Microphone permission denied. Please allow access in your browser settings.");
      } else if (err === "service-not-allowed") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("Microphone permission denied. Please allow access and try again.");
      } else if (err === "network") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("Network error during speech recognition.");
      } else {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage(`Speech recognition error: ${err}`);
      }
      releaseRecognition(recognition);
    };

    recognition.onend = () => {
      clearStopFallback();
      stopMediaStream();
      releaseRecognition(recognition);
      scheduleSafetyStop();
      if (committedRef.current && !errorStateRef.current) {
        setState("captured");
        return;
      }

      if (errorStateRef.current) {
        return;
      }

      const pendingText = interimRef.current.trim();
      if (pendingText && !committedRef.current) {
        committedRef.current = true;
        finalTranscriptRef.current = pendingText;
        setFinalTranscript(pendingText);
        setInterimTranscript("");
        setConfidence(0);
        setState("processing");
        onResultRef.current?.(pendingText, 0);
        setTimeout(() => setState("captured"), 50);
        return;
      }

      if (stoppingRef.current) {
        setState("idle");
      } else {
        setState("error");
        setErrorMessage("No speech detected. Please try again.");
      }
    };

    recognitionRef.current = recognition;
    setInterimTranscript("");
    setFinalTranscript("");
    setErrorMessage(null);
    setConfidence(0);
    setState("listening");

    try {
      recognition.start();
    } catch (startErr: any) {
      stopMediaStream();
      releaseRecognition(recognition);
      if (startErr.name === "NotAllowedError") {
        setState("error");
        setErrorMessage("Microphone permission denied. Please allow access in your browser settings.");
      } else {
        setState("error");
        setErrorMessage("Failed to start speech recognition.");
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const activeRecognition = recognitionRef.current === recognition;
          const shouldKeep = activeRecognition && !stoppingRef.current && !errorStateRef.current;
          if (!shouldKeep) {
            hardStopStream(stream);
            return;
          }
          // Stop any previous stream BEFORE storing the new one.
          stopMediaStream();
          activeStreamsRef.current.add(stream);
          mediaStreamRef.current = stream;
        })
        .catch(() => {
          // SpeechRecognition surfaces the user-facing permission errors.
        });
    }
  }, [lang, minConfidence, clearStopFallback, stopMediaStream, releaseRecognition, scheduleSafetyStop, hardStopStream]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    clearStopFallback();
    stopMediaStream();
    scheduleSafetyStop();

    const rec = recognitionRef.current;
    if (!rec) return;

    try { rec.stop(); } catch {}
    try { rec.abort(); } catch {}

    stopFallbackTimeoutRef.current = setTimeout(() => {
      stopMediaStream();
      releaseRecognition();
      setState((prev) => (prev === "listening" || prev === "processing" ? "idle" : prev));
      stopFallbackTimeoutRef.current = null;
    }, 800);
  }, [clearStopFallback, stopMediaStream, releaseRecognition, scheduleSafetyStop]);

  const reset = useCallback(() => {
    clearStopFallback();
    stopMediaStream();
    releaseRecognition();
    stoppingRef.current = false;
    committedRef.current = false;
    finalTranscriptRef.current = "";
    finalConfidenceRef.current = 0;
    errorStateRef.current = false;
    interimRef.current = "";
    setState(SpeechRecognitionCtor ? "idle" : "unsupported");
    setInterimTranscript("");
    setFinalTranscript("");
    setErrorMessage(SpeechRecognitionCtor ? null : "Speech recognition is not supported in this browser.");
    setConfidence(0);
  }, [clearStopFallback, stopMediaStream, releaseRecognition]);

  return {
    state,
    interimTranscript,
    finalTranscript,
    errorMessage,
    confidence,
    startListening,
    stopListening,
    reset,
  };
}
