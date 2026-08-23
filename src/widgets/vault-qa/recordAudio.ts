// Records mono 16kHz mic audio via the Web Audio API (not MediaRecorder,
// which would need a separate decode step) and returns it ready for WAV
// encoding. AudioContext({ sampleRate: 16000 }) resamples the mic input to
// whisper.cpp's expected rate on the way in, so no manual resampling needed.

export interface Recorder {
	stop(): Promise<Float32Array>;
	cancel(): void;
}

export const WHISPER_SAMPLE_RATE = 16000;

export async function startRecording(): Promise<Recorder> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });
	const source = audioContext.createMediaStreamSource(stream);
	// ScriptProcessorNode only fires while connected into the graph, but we
	// don't want raw mic audio audible - route through a silent gain node
	// instead of connecting straight to the speakers.
	const processor = audioContext.createScriptProcessor(4096, 1, 1);
	const silence = audioContext.createGain();
	silence.gain.value = 0;

	const chunks: Float32Array[] = [];
	processor.onaudioprocess = (event) => {
		chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
	};

	source.connect(processor);
	processor.connect(silence);
	silence.connect(audioContext.destination);

	function cleanup(): void {
		processor.disconnect();
		source.disconnect();
		silence.disconnect();
		for (const track of stream.getTracks()) track.stop();
		void audioContext.close();
	}

	return {
		stop: async () => {
			cleanup();
			const total = chunks.reduce((n, c) => n + c.length, 0);
			const merged = new Float32Array(total);
			let offset = 0;
			for (const chunk of chunks) {
				merged.set(chunk, offset);
				offset += chunk.length;
			}
			return merged;
		},
		cancel: cleanup,
	};
}

function floatTo16BitPCM(samples: Float32Array): Int16Array {
	const out = new Int16Array(samples.length);
	for (let i = 0; i < samples.length; i++) {
		const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
		out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}
	return out;
}

/** Encodes mono float samples as a 16-bit PCM WAV file buffer. */
export function encodeWav(samples: Float32Array, sampleRate = WHISPER_SAMPLE_RATE): Buffer {
	const pcm = floatTo16BitPCM(samples);
	const buffer = Buffer.alloc(44 + pcm.length * 2);

	buffer.write('RIFF', 0, 'ascii');
	buffer.writeUInt32LE(36 + pcm.length * 2, 4);
	buffer.write('WAVE', 8, 'ascii');
	buffer.write('fmt ', 12, 'ascii');
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20); // PCM format
	buffer.writeUInt16LE(1, 22); // mono
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
	buffer.writeUInt16LE(2, 32); // block align
	buffer.writeUInt16LE(16, 34); // bits per sample
	buffer.write('data', 36, 'ascii');
	buffer.writeUInt32LE(pcm.length * 2, 40);
	for (let i = 0; i < pcm.length; i++) {
		buffer.writeInt16LE(pcm[i] ?? 0, 44 + i * 2);
	}

	return buffer;
}
