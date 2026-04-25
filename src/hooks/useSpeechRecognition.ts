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

  const clearSafetyStops = useCallback(() => {
    safetyStopTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    safetyStopTimeoutsRef.current = [];
  }, []);

  const clearVoiceTimers = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
    }
  }, []);

  const cleanupVoiceSession = useCallback((reason: string, opts?: { scheduleSafety?: boolean }) => {
    void reason;
    sessionTokenRef.current += 1;
    clearVoiceTimers();

    mediaRecordersRef.current.forEach((recorder) => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {}
    });
    mediaRecordersRef.current.clear();

    activeStreamsRef.current.forEach((stream) => {
      try {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
          try { track.enabled = false; } catch {}
        });
      } catch {}
    });
    activeStreamsRef.current.clear();

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onaudiostart = null;
        recognition.onaudioend = null;
        recognition.onspeechstart = null;
        recognition.onspeechend = null;
        recognition.onstart = null;
      } catch {}
      try { recognition.stop(); } catch {}
      try { recognition.abort(); } catch {}
      recognitionRef.current = null;
    }

    if (opts?.scheduleSafety === false) return;

    [50, 150, 300, 600, 1200].forEach((delay) => {
      const timeoutId = setTimeout(() => {
        activeStreamsRef.current.forEach((stream) => hardStopStream(stream));
        const liveRecognition = recognitionRef.current;
        if (liveRecognition) {
          try { liveRecognition.stop(); } catch {}
          try { liveRecognition.abort(); } catch {}
        }
        const idx = safetyStopTimeoutsRef.current.indexOf(timeoutId);
        if (idx >= 0) safetyStopTimeoutsRef.current.splice(idx, 1);
      }, delay);
      safetyStopTimeoutsRef.current.push(timeoutId);
    });
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

    if (committedRef.current) {
      cleanupVoiceSession(reason);
      if (!errorStateRef.current) setState("captured");
      return;
    }

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
    cleanupVoiceSession(reason);
    setTimeout(() => setState("captured"), 0);
  }, [cleanupVoiceSession, minConfidence]);

  const scheduleSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    silenceTimeoutRef.current = setTimeout(() => {
      const transcript = (finalTranscriptRef.current || interimRef.current).trim();
      finalizeTranscript(transcript, finalConfidenceRef.current, "silence-timeout");
    }, 2000);
  }, [finalizeTranscript]);

  useEffect(() => {
    return () => {
      clearSafetyStops();
      cleanupVoiceSession("unmount", { scheduleSafety: false });
    };
  }, [clearSafetyStops, cleanupVoiceSession]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setState("unsupported");
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    clearSafetyStops();
    cleanupVoiceSession("restart", { scheduleSafety: false });

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
        scheduleSilenceTimeout();
      }

      if (final) {
        finalTranscriptRef.current = final.trim();
        finalConfidenceRef.current = bestConfidence;
        finalizeTranscript(finalTranscriptRef.current, bestConfidence, "final-transcript");
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      if (manualCancelRef.current || err === "aborted" || err === "canceled" || err === "audio-capture") {
        cleanupVoiceSession("manual-cancel");
        if (!committedRef.current) setState("idle");
        return;
      }

      if (err === "no-speech") {
        const transcript = (finalTranscriptRef.current || interimRef.current).trim();
        if (transcript) {
          finalizeTranscript(transcript, finalConfidenceRef.current, "no-speech");
          return;
        }
        setErrorMessage("No speech detected. Please try again.");
      } else if (err === "not-allowed" || err === "service-not-allowed") {
        setErrorMessage("Microphone permission denied. Please allow access in your browser settings.");
      } else if (err === "network") {
        setErrorMessage("Network error during speech recognition.");
      } else {
        setErrorMessage(`Speech recognition error: ${err}`);
      }

      errorStateRef.current = true;
      setState("error");
      cleanupVoiceSession(`error-${err}`);
    };

    recognition.onend = () => {
      if (committedRef.current && !errorStateRef.current) {
        cleanupVoiceSession("recognition-end-committed");
        setState("captured");
        return;
      }

      if (errorStateRef.current) {
        cleanupVoiceSession("recognition-end-error", { scheduleSafety: false });
        return;
      }

      const transcript = (finalTranscriptRef.current || interimRef.current).trim();
      if (transcript) {
        finalizeTranscript(transcript, finalConfidenceRef.current, "recognition-end");
        return;
      }

      cleanupVoiceSession("recognition-end");
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

    maxRecordingTimeoutRef.current = setTimeout(() => {
      const transcript = (finalTranscriptRef.current || interimRef.current).trim();
      finalizeTranscript(transcript, finalConfidenceRef.current, "max-timeout");
    }, 15000);

    try {
      recognition.start();
    } catch (startErr: any) {
      cleanupVoiceSession("start-failed");
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
          const sessionStillLive =
            sessionTokenRef.current === sessionToken &&
            recognitionRef.current === recognition &&
            !stoppingRef.current &&
            !errorStateRef.current &&
            !manualCancelRef.current;

          if (!sessionStillLive) {
            hardStopStream(stream);
            return;
          }

          activeStreamsRef.current.add(stream);
        })
        .catch(() => {
        });
    }
  }, [lang, clearSafetyStops, cleanupVoiceSession, finalizeTranscript, hardStopStream, scheduleSilenceTimeout]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    manualCancelRef.current = true;
    const transcript = (finalTranscriptRef.current || interimRef.current).trim();
    if (transcript) {
      finalizeTranscript(transcript, finalConfidenceRef.current, "manual-stop");
      return;
    }
    cleanupVoiceSession("manual-stop");
    setState((prev) => (prev === "listening" || prev === "processing" ? "idle" : prev));
  }, [cleanupVoiceSession, finalizeTranscript]);

  const reset = useCallback(() => {
    clearSafetyStops();
    cleanupVoiceSession("reset", { scheduleSafety: false });
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
