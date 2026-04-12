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
  startListening: () => Promise<void>;
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
  const stoppingRef = useRef(false); // track intentional stop

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechRecognitionCtor) {
      setState("unsupported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    // Check mic permission
    try {
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (perm.state === "denied") {
          setState("error");
          setErrorMessage("Microphone access is blocked. Please enable it in your browser settings.");
          return;
        }
      }
      // Request mic access (also acts as permission prompt)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately — SpeechRecognition manages its own stream
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      setState("error");
      if (err.name === "NotAllowedError") {
        setErrorMessage("Microphone permission denied. Please allow access and try again.");
      } else if (err.name === "NotFoundError") {
        setErrorMessage("No microphone found on this device.");
      } else {
        setErrorMessage("Could not access microphone.");
      }
      return;
    }

    // Tear down any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false; // one utterance per session — prevents duplicates
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang || navigator.language || "en-US";

    let committed = false;
    stoppingRef.current = false;

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
        setInterimTranscript(interim);
      }

      if (final && !committed) {
        // Check confidence threshold
        if (bestConfidence > 0 && bestConfidence < minConfidence) {
          // Low confidence — treat as noise
          setInterimTranscript("");
          setState("error");
          setErrorMessage("Could not understand speech clearly. Please try again.");
          committed = true;
          return;
        }

        committed = true;
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
        setErrorMessage("No speech detected. Please try again.");
      } else if (err === "aborted" || err === "canceled") {
        // Intentional abort — ignore
        if (!committed) setState("idle");
      } else if (err === "not-allowed") {
        setState("error");
        setErrorMessage("Microphone permission denied.");
      } else if (err === "network") {
        setState("error");
        setErrorMessage("Network error during speech recognition.");
      } else {
        setState("error");
        setErrorMessage(`Speech recognition error: ${err}`);
      }
    };

    recognition.onend = () => {
      // If we never committed and didn't get an error, mark as no speech
      if (!committed && state !== "error") {
        if (!stoppingRef.current) {
          // Natural end without result
          setState("error");
          setErrorMessage("No speech detected. Please try again.");
        } else {
          setState("idle");
        }
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
    } catch (err: any) {
      setState("error");
      setErrorMessage("Failed to start speech recognition.");
    }
  }, [lang, minConfidence]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop(); // triggers final result if available
      } catch {}
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    stoppingRef.current = false;
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
