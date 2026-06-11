import { useState, useRef, useCallback } from 'react';
import { aiApi } from '../../api/ai';

interface VoiceInputButtonProps {
  onResult: (transcript: string, extraction?: Awaited<ReturnType<typeof aiApi.voiceToIncident>>['data']) => void;
  onError?: (error: Error) => void;
}

/**
 * Balss ievades poga mobilajām ierīcēm.
 * Izmanto Web Speech API (Chrome/Android) vai fallback uz manuālu ievadi.
 */
export function VoiceInputButton({ onResult, onError }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.(new Error('Balss atpazīšana nav atbalstīta šajā pārlūkā'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'lv-LV';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      try {
        const result = await aiApi.voiceToIncident(transcript);
        onResult(transcript, result.data);
      } catch (err) {
        onResult(transcript);
        onError?.(err as Error);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      onError?.(new Error(`Balss kļūda: ${event.error}`));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult, onError]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={isProcessing}
      className={`btn-voice ${isListening ? 'animate-pulse bg-red-600' : ''}`}
      aria-label={isListening ? 'Apturēt klausīšanos' : 'Sākt balss ievadi'}
    >
      {isProcessing ? (
        <span className="text-sm">...</span>
      ) : (
        <span className="text-2xl">🎤</span>
      )}
    </button>
  );
}

// Web Speech API tipi
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
