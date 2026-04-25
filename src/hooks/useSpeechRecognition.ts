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
  minConfidence?: number;
  lang?: string;
  onResult?: (transcript: string, confidence: number) => void;
}

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  interimTranscript: string;
  finalTranscript: string;
  errorMessage: string | null;
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
  const activeStreamsRef = useRef<Set<MediaStream>>(new Set());
  const mediaRecordersRef = useRef<Set<MediaRecorder>>(new Set());
  const sessionTokenRef = useRef(0);
  const stopFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyStopTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onResultRef = useRef(onResult);
  const stoppingRef = useRef(false);
  const committedRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const finalConfidenceRef = useRef(0);
  const errorStateRef = useRef(false);
  const interimRef = useRef("");
  const manualCancelRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

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

  const clearVoiceTimers = useCallback(() => {
    if (stopFallbackTimeoutRef.current) {
      clearTimeout(stopFallbackTimeoutRef.current);
      stopFallbackTimeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
    }
  }, []);

  /**
   * SINGLE source of truth for terminating a voice session.
   * Called from EVERY exit path: manual stop, final transcript, onend,
   * onerror, silence timeout, unmount, route change.
   *
   * Force-stops:
   *  - SpeechRecognition (stop + abort)
   *  - All MediaRecorder instances
   *  - All getUserMedia MediaStream tracks (stop + enabled=false)
   *  - Invalidates session token so any in-flight getUserMedia drops its stream
   *  - Schedules staggered safety re-runs to catch late-arriving streams
   */
  const cleanupVoiceSession = useCallback((reason: string, opts?: { scheduleSafety?: boolean }) => {
    // 1. Invalidate session — any in-flight getUserMedia callback will see this
    //    and immediately release its stream instead of adding it to our set.
    sessionTokenRef.current += 1;

    // 2. Clear any pending voice timers
    clearVoiceTimers();

    // 3. Force-stop all MediaRecorder instances
    mediaRecordersRef.current.forEach((rec) => {
      try { if (rec.state !== "inactive") rec.stop(); } catch {}
    });
    mediaRecordersRef.current.clear();

    // 4. Force-stop ALL getUserMedia tracks across every tracked stream
    activeStreamsRef.current.forEach((stream) => {
      try {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
          try { track.enabled = false; } catch {}
        });
      } catch {}
    });
    activeStreamsRef.current.clear();

    // 5. Force-stop SpeechRecognition (both stop and abort — Safari requires both)
    const rec = recognitionRef.current;
    if (rec) {
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
      try { rec.stop(); } catch {}
      try { rec.abort(); } catch {}
      recognitionRef.current = null;
    }

    // 6. Schedule staggered safety re-runs. Safari can take a few hundred ms
    //    to fully release its internal audio session, and a late-arriving
    //    getUserMedia callback can re-introduce a stream after step 4.
    if (opts?.scheduleSafety !== false) {
      [50, 150, 300, 600, 1200].forEach((delay) => {
        const t = setTimeout(() => {
          activeStreamsRef.current.forEach((stream) => {
            try {
              stream.getTracks().forEach((track) => {
                try { track.stop(); } catch {}
                try { track.enabled = false; } catch {}
              });
            } catch {}
          });
          activeStreamsRef.current.clear();
          const idx = safetyStopTimeoutsRef.current.indexOf(t);
          if (idx >= 0) safetyStopTimeoutsRef.current.splice(idx, 1);
        }, delay);
        safetyStopTimeoutsRef.current.push(t);
      });

      const finalSafetyStop = setTimeout(() => {
        activeStreamsRef.current.forEach((stream) => hardStopStream(stream));
        const rec = recognitionRef.current;
        if (rec) {
          try { rec.stop(); } catch {}
          try { rec.abort(); } catch {}
        }
        const idx = safetyStopTimeoutsRef.current.indexOf(finalSafetyStop);
        if (idx >= 0) safetyStopTimeoutsRef.current.splice(idx, 1);
      }, 300);
      safetyStopTimeoutsRef.current.push(finalSafetyStop);
    }
  }, [clearVoiceTimers, hardStopStream]);

  const finalizeTranscript = useCallback((transcript: string, transcriptConfidence: number, reason: string) => {
    const committedText = transcript.trim();

    if (!committedText) {
      cleanupVoiceSession(reason);
      if (stoppingRef.current || manualCancelRef.current) {
        setState("idle");
      } else if (!errorStateRef.current) {
        setState("error");
        setErrorMessage("No speech detected. Please try again.");
      }
      return;
    }

    if (!committedRef.current) {
      if (transcriptConfidence > 0 && transcriptConfidence < minConfidence) {
        committedRef.current = true;
        errorStateRef.current = true;
        setInterimTranscript("");
        setState("error");
        setErrorMessage("Could not understand speech clearly. Please try again.");
        cleanupVoiceSession(reason);
        return;
      }

      committedRef.current = true;
      finalTranscriptRef.current = committedText;
      finalConfidenceRef.current = transcriptConfidence;
      interimRef.current = "";
      setFinalTranscript(committedText);
      setConfidence(transcriptConfidence);
      setInterimTranscript("");
      setState("processing");
      onResultRef.current?.(committedText, transcriptConfidence);
    }

    cleanupVoiceSession(reason);
    setTimeout(() => {
      setState("captured");
    }, 0);
  }, [cleanupVoiceSession, minConfidence]);

  const scheduleSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    silenceTimeoutRef.current = setTimeout(() => {
      const transcript = (finalTranscriptRef.current || interimRef.current).trim();
      finalizeTranscript(transcript, finalConfidenceRef.current, "silence-timeout");
    }, 2000);
  }, [finalizeTranscript]);

  const clearSafetyStops = useCallback(() => {
    safetyStopTimeoutsRef.current.forEach((t) => clearTimeout(t));
    safetyStopTimeoutsRef.current = [];
  }, []);

  // Cleanup on unmount / route change
  useEffect(() => {
    return () => {
      clearSafetyStops();
      cleanupVoiceSession({ scheduleSafety: false });
    };
  }, [clearSafetyStops, cleanupVoiceSession]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setState("unsupported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    // Tear down any previous session BEFORE starting a new one.
    clearSafetyStops();
    cleanupVoiceSession({ scheduleSafety: false });

    // Capture the new session token AFTER cleanup (cleanup increments it).
    const sessionToken = sessionTokenRef.current;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang || navigator.language || "en-US";

    committedRef.current = false;
    stoppingRef.current = false;
    manualCancelRef.current = false;
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
          cleanupVoiceSession();
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
        // Natural completion path — full cleanup, same as manual stop.
        cleanupVoiceSession();
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      // Manual cancel/abort/audio-capture (fired when we stop tracks under
      // the recognizer) — never surface as a user-visible error.
      if (manualCancelRef.current || err === "aborted" || err === "canceled" || err === "audio-capture") {
        if (!committedRef.current) setState("idle");
        cleanupVoiceSession();
        return;
      }
      if (err === "no-speech") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("No speech detected. Please try again.");
      } else if (err === "not-allowed" || err === "service-not-allowed") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("Microphone permission denied. Please allow access in your browser settings.");
      } else if (err === "network") {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage("Network error during speech recognition.");
      } else {
        setState("error");
        errorStateRef.current = true;
        setErrorMessage(`Speech recognition error: ${err}`);
      }
      cleanupVoiceSession();
    };

    recognition.onend = () => {
      // Natural end (silence timeout, max recording, or after final result).
      // Always run full cleanup — same as manual stop path.
      const wasCommitted = committedRef.current;
      const wasError = errorStateRef.current;
      const pendingText = interimRef.current.trim();

      // Capture final pending text BEFORE cleanup (cleanup nulls recognitionRef).
      cleanupVoiceSession();

      if (wasCommitted && !wasError) {
        setState("captured");
        return;
      }
      if (wasError) return;

      if (pendingText && !committedRef.current) {
        committedRef.current = true;
        finalTranscriptRef.current = pendingText;
        setFinalTranscript(pendingText);
        setInterimTranscript("");
        setConfidence(0);
        setState("processing");
        onResultRef.current?.(pendingText, 0);
        // Schedule one more safety cleanup pass after state transition.
        setTimeout(() => {
          cleanupVoiceSession();
          setState("captured");
        }, 50);
        return;
      }

      if (stoppingRef.current || manualCancelRef.current) {
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
      cleanupVoiceSession();
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
          // If session changed while getUserMedia was pending, drop this stream.
          const sessionStillLive =
            sessionTokenRef.current === sessionToken &&
            recognitionRef.current === recognition &&
            !stoppingRef.current &&
            !errorStateRef.current &&
            !committedRef.current &&
            !manualCancelRef.current;
          if (!sessionStillLive) {
            hardStopStream(stream);
            return;
          }
          activeStreamsRef.current.add(stream);
        })
        .catch(() => {
          // SpeechRecognition surfaces user-facing permission errors.
        });
    }
  }, [lang, minConfidence, clearSafetyStops, cleanupVoiceSession, hardStopStream]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    manualCancelRef.current = true;
    cleanupVoiceSession();
    setState((prev) => (prev === "listening" || prev === "processing" ? "idle" : prev));
  }, [cleanupVoiceSession]);

  const reset = useCallback(() => {
    clearSafetyStops();
    cleanupVoiceSession({ scheduleSafety: false });
    stoppingRef.current = false;
    committedRef.current = false;
    manualCancelRef.current = false;
    finalTranscriptRef.current = "";
    finalConfidenceRef.current = 0;
    errorStateRef.current = false;
    interimRef.current = "";
    setState(SpeechRecognitionCtor ? "idle" : "unsupported");
    setInterimTranscript("");
    setFinalTranscript("");
    setErrorMessage(SpeechRecognitionCtor ? null : "Speech recognition is not supported in this browser.");
    setConfidence(0);
  }, [clearSafetyStops, cleanupVoiceSession]);

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
