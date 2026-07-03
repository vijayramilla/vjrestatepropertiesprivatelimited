import { useEffect, useState, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  onResult: (value: number) => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

function parseIndianNumber(text: string): number | null {
  const cleaned = text.toLowerCase().replace(/and/g, '').replace(/,/g, '').trim();

  const multipliers: [RegExp, number][] = [
    [/crore\b/, 10000000],
    [/cr\b/, 10000000],
    [/lakh\b/, 100000],
    [/lac\b/, 100000],
    [/l\b/, 100000],
    [/thousand/, 1000],
    [/hundred/, 100],
  ];

  let total = 0;
  let currentNumber = 0;
  const words = cleaned.split(/[\s-]+/);

  for (const word of words) {
    const num = Number(word.replace(/[^0-9]/g, ''));
    if (!isNaN(num) && num > 0) {
      currentNumber = num;
      continue;
    }

    let matched = false;
    for (const [pattern, mult] of multipliers) {
      if (pattern.test(word)) {
        if (currentNumber > 0) {
          total += currentNumber * mult;
          currentNumber = 0;
        } else {
          total += 1 * mult;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      const numberWords: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
        sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
        thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
        eighty: 80, ninety: 90,
      };
      if (word in numberWords) {
        currentNumber = numberWords[word];
      }
    }
  }

  total += currentNumber;

  const digitMatch = cleaned.replace(/[^0-9]/g, '');
  if (digitMatch.length > 0 && total === 0) {
    return parseInt(digitMatch, 10);
  }

  return total > 0 ? total : null;
}

export default function VoiceInput({ onResult }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input not supported');
      return;
    }
    const instance = new SR();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = 'en-IN';

    instance.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const parsed = parseIndianNumber(transcript);
      if (parsed && parsed > 0) {
        onResult(parsed);
      } else {
        setError(`Could not parse "${transcript}"`);
        setTimeout(() => setError(''), 3000);
      }
      setIsListening(false);
    };

    instance.onerror = () => {
      setIsListening(false);
      setError('Voice recognition failed');
      setTimeout(() => setError(''), 3000);
    };

    setRecognition(instance);
  }, [onResult]);

  const toggle = useCallback(() => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setError('');
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={!recognition}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse shadow-lg'
            : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400'
        }`}
        title="Say the loan amount (e.g. 'fifty lakh' or '1 crore')"
      >
        {isListening ? <MicOff size={13} /> : <Mic size={13} />}
        {isListening ? 'Listening...' : 'Voice'}
      </button>
      {error && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
