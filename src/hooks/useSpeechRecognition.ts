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

// Detect once
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
  const onResultRef = useRef(onResult);
  const stoppingRef = useRef(false);

  // Track committed state and final transcript via refs to avoid stale closures
  const committedRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const finalConfidenceRef = useRef(0);
  const errorStateRef = useRef(false);
  // Track latest interim transcript so we can commit it on manual stop
  const interimRef = useRef("");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Cleanup on unmount — abort + detach handlers to release mic immediately
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
        } catch {}
        try { rec.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setState("unsupported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    // Tear down any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang || navigator.language || "en-US";

    // Reset refs
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
        // Check confidence threshold
        if (bestConfidence > 0 && bestConfidence < minConfidence) {
          setInterimTranscript("");
          setState("error");
          errorStateRef.current = true;
          setErrorMessage("Could not understand speech clearly. Please try again.");
          committedRef.current = true;
          return;
        }

        // Store final transcript in ref for onend to use
        finalTranscriptRef.current = final.trim();
        finalConfidenceRef.current = bestConfidence;

        // Commit
        committedRef.current = true;
        setFinalTranscript(final.trim());
        setConfidence(bestConfidence);
        setInterimTranscript("");
        setState("processing");
        onResultRef.current?.(final.trim(), bestConfidence);
      }
    };

    recognition.onerror = (event: any) => {
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
    };

    // Force-release the microphone. SpeechRecognition.stop()/abort() does
    // not always release the underlying MediaStream in Chrome/Android, leaving
    // the browser mic indicator on. Detach handlers, abort, and null the ref
    // so the recognition object (and its internal MediaStream) is GC'd.
    const releaseMic = () => {
      const rec = recognitionRef.current;
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
      try { rec.abort(); } catch {}
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Always release the mic on end — covers manual stop, auto-end, errors.
      releaseMic();

      // If we already committed a result via onresult, transition to captured
      if (committedRef.current && !errorStateRef.current) {
        setState("captured");
        return;
      }

      // If we hit an error state, leave it as-is
      if (errorStateRef.current) {
        return;
      }

      // Manual stop or automatic end with uncommitted interim transcript —
      // commit whatever we have so the user can review/save it
      const pendingText = interimRef.current.trim();
      if (pendingText && !committedRef.current) {
        committedRef.current = true;
        finalTranscriptRef.current = pendingText;
        setFinalTranscript(pendingText);
        setInterimTranscript("");
        setConfidence(0);
        setState("processing");
        onResultRef.current?.(pendingText, 0);
        // Transition to captured after a tick so consumers see processing first
        setTimeout(() => setState("captured"), 50);
        return;
      }

      // No transcript at all
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

    // IMPORTANT: Call recognition.start() synchronously within the user gesture
    // handler. Do NOT await anything before this call — mobile browsers (iOS Safari,
    // Android Chrome) require the start() to be in the synchronous call stack of a
    // user tap/click event. Any preceding await breaks the gesture chain.
    try {
      recognition.start();
    } catch (startErr: any) {
      if (startErr.name === "NotAllowedError") {
        setState("error");
        setErrorMessage("Microphone permission denied. Please allow access in your browser settings.");
      } else {
        setState("error");
        setErrorMessage("Failed to start speech recognition.");
      }
    }
  }, [lang, minConfidence]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    // Safety net: if onend doesn't fire within 800ms (some browsers hang on
    // stop() and keep the mic indicator on), force-abort to release the mic.
    setTimeout(() => {
      const stillRec = recognitionRef.current;
      if (stillRec) {
        try {
          stillRec.onresult = null;
          stillRec.onerror = null;
          stillRec.onend = null;
        } catch {}
        try { stillRec.abort(); } catch {}
        recognitionRef.current = null;
      }
    }, 800);
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
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
  }, []);

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
