// Minimal ambient typing for the Web Speech API (SpeechRecognition) -
// not part of TypeScript's DOM lib. Obsidian's Chromium/Electron shell
// exposes it as the vendor-prefixed `webkitSpeechRecognition`.
interface SpeechRecognitionResultEvent extends Event {
	results: {
		[index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
		length: number;
	};
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface SpeechRecognition extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
}

interface Window {
	SpeechRecognition?: new () => SpeechRecognition;
	webkitSpeechRecognition?: new () => SpeechRecognition;
}
