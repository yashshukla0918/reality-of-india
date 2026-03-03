import { useState, useEffect, useRef } from "react";
import { MdKeyboardVoice } from "react-icons/md";
import { useSearchData, type SearchItem } from "../../hooks/useSearchData";
import "./SearchModal.css";

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateSelect: (stateName: string) => void;
  onDistrictSelect: (districtName: string, stateName: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onStateSelect,
  onDistrictSelect,
}: SearchModalProps) {
  const [searchValue, setSearchValue] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(false);
  const [useSystemDictationFallback, setUseSystemDictationFallback] =
    useState<boolean>(false);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string>("Tap to speak");
  const { filteredItems } = useSearchData(searchValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{
    lang: string;
    start: () => void;
    stop: () => void;
  } | null>(null);
  const recognitionLangsRef = useRef<string[]>([]);
  const recognitionRetryIndexRef = useRef(0);
  const shouldRetryVoiceRef = useRef(false);
  const isApplePlatform = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const speechApi =
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ||
      (
        window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }
      ).webkitSpeechRecognition;

    if (!speechApi || !window.isSecureContext) {
      setVoiceSupported(true);
      setUseSystemDictationFallback(true);
      setVoiceStatusMessage(
        !window.isSecureContext
          ? "Use system dictation (secure context required for web speech)"
          : isApplePlatform
            ? "Use macOS/iOS dictation to speak"
            : "Use system dictation to speak"
      );
      recognitionRef.current = null;
      return;
    }

    setVoiceSupported(true);
    setUseSystemDictationFallback(false);
    setVoiceStatusMessage("Tap to speak");
    const recognition = new speechApi();
    const languageCandidates = Array.from(
      new Set(["en-IN", "en-US", window.navigator.language || "en-US"])
    );
    recognitionLangsRef.current = languageCandidates;
    recognitionRetryIndexRef.current = 0;
    recognition.lang = languageCandidates[0];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setSearchValue(transcript);
      setShowResults(true);
      setVoiceStatusMessage("Tap to speak");
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    recognition.onerror = (event) => {
      const error = event.error ?? "unknown";
      if (error === "not-allowed") {
        setUseSystemDictationFallback(true);
        setVoiceStatusMessage(
          isApplePlatform
            ? "Mic blocked. Use macOS/iOS dictation to speak"
            : "Mic blocked. Use system dictation to speak"
        );
        shouldRetryVoiceRef.current = false;
      } else if (error === "network") {
        if (recognitionRetryIndexRef.current < recognitionLangsRef.current.length - 1) {
          recognitionRetryIndexRef.current += 1;
          recognition.lang = recognitionLangsRef.current[recognitionRetryIndexRef.current];
          shouldRetryVoiceRef.current = true;
          setVoiceStatusMessage("Retrying voice service...");
          setIsListening(true);
          return;
        }
        shouldRetryVoiceRef.current = false;
        setUseSystemDictationFallback(true);
        setVoiceStatusMessage(
          isApplePlatform
            ? "Web speech unavailable. Use macOS/iOS dictation to speak"
            : "Web speech unavailable. Use system dictation to speak"
        );
      } else if (error !== "aborted") {
        shouldRetryVoiceRef.current = false;
        setVoiceStatusMessage("Voice search failed. Try again");
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      if (shouldRetryVoiceRef.current) {
        shouldRetryVoiceRef.current = false;
        try {
          recognition.start();
          return;
        } catch {
          setUseSystemDictationFallback(true);
          setVoiceStatusMessage(
            isApplePlatform
              ? "Web speech unavailable. Use macOS/iOS dictation to speak"
              : "Web speech unavailable. Use system dictation to speak"
          );
        }
      }
      setIsListening(false);
      setVoiceStatusMessage((current) =>
        current === "Listening..." ? "Tap to speak" : current
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isApplePlatform]);

  useEffect(() => {
    if (!isOpen && isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [isOpen, isListening]);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === "state") {
      onStateSelect(item.name);
    } else {
      onDistrictSelect(item.districtName!, item.stateName!);
    }
    setSearchValue("");
    setShowResults(false);
    onClose();
  };

  const handleSearch = () => {
    if (searchValue.trim() && filteredItems.length > 0) {
      handleSelectItem(filteredItems[0]);
    }
  };

  const handleVoiceSearch = () => {
    if (useSystemDictationFallback || !recognitionRef.current) {
      inputRef.current?.focus();
      setShowResults(true);
      setVoiceStatusMessage(
        isApplePlatform
          ? "Input focused. Start Dictation and speak"
          : "Input focused. Start system dictation and speak"
      );
      return;
    }

    if (isListening) {
      shouldRetryVoiceRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceStatusMessage("Tap to speak");
      return;
    }

    try {
      recognitionRetryIndexRef.current = 0;
      if (recognitionLangsRef.current.length > 0) {
        recognitionRef.current.lang = recognitionLangsRef.current[0];
      }
      setVoiceStatusMessage("Listening...");
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
      setVoiceStatusMessage("Voice search unavailable right now");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={handleBackdropClick}>
      <div className="search-modal" ref={modalRef}>
        <div className="search-modal-content">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search state or district..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={handleKeyDown}
              className="search-modal-input"
            />
            <button
              className="search-modal-button"
              onClick={handleSearch}
              disabled={!searchValue.trim()}
            >
              Search
            </button>
          </div>
          <div className="voice-search-row">
            <button
              type="button"
              className={`voice-search-btn ${isListening ? "listening" : ""}`}
              onClick={handleVoiceSearch}
              disabled={!voiceSupported}
              aria-label={isListening ? "Stop voice search" : "Tap to speak"}
              title={useSystemDictationFallback ? "Use system dictation" : "Tap to speak"}
            >
              <span className="voice-search-icon">
                <MdKeyboardVoice size={26} />
              </span>
            </button>
            <span className="voice-search-label">
              {voiceStatusMessage}
            </span>
          </div>

          {showResults && searchValue.trim() && (
            <div className="search-results">
              {filteredItems.length > 0 ? (
                <ul className="search-results-list">
                  {filteredItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="search-result-item"
                      onClick={() => handleSelectItem(item)}
                    >
                      <span className="result-name">{item.name}</span>
                      {item.type === "district" && (
                        <span className="result-state">
                          {item.stateName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-no-results">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
