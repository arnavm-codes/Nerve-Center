<script lang="ts">
	import { get } from 'svelte/store';
	import { dashboardData, updateWidgetSettings } from '../../settings/store';
	import { resolveWhisperBinary, resolveWhisperModel } from './runWhisper';
	import type { VaultQAWidgetSettings } from './types';

	const WIDGET_ID = 'vault-qa';

	$: settings = ($dashboardData.widgets[WIDGET_ID]?.settings ?? {}) as VaultQAWidgetSettings;

	const initialSettings = (get(dashboardData).widgets[WIDGET_ID]?.settings ?? {}) as VaultQAWidgetSettings;
	let whisperBinaryPath = initialSettings.whisperBinaryPath ?? '';
	let whisperModelPath = initialSettings.whisperModelPath ?? '';

	function save(): void {
		updateWidgetSettings(WIDGET_ID, (s) => ({ ...s, whisperBinaryPath, whisperModelPath }));
	}

	$: detectedBinary = resolveWhisperBinary(whisperBinaryPath || undefined);
	$: detectedModel = resolveWhisperModel(whisperModelPath || undefined);
</script>

<div class="sbd-settings-form">
	<p class="sbd-muted sbd-settings-help">
		Voice input transcribes with a local <strong>whisper.cpp</strong> binary - fully offline, no
		API key. Leave these blank to use auto-detected common install locations; only set them if
		whisper.cpp lives somewhere non-standard.
	</p>

	<label>
		Whisper binary path
		<input
			type="text"
			bind:value={whisperBinaryPath}
			on:change={save}
			placeholder="auto-detect (e.g. ~/.local/share/whisper.cpp/build/bin/whisper-cli)"
		/>
	</label>
	<p class="sbd-muted">{detectedBinary ? `Found: ${detectedBinary}` : 'Not found - voice input will show an error until this resolves.'}</p>

	<label>
		Whisper model path
		<input
			type="text"
			bind:value={whisperModelPath}
			on:change={save}
			placeholder="auto-detect (e.g. ~/.local/share/whisper.cpp/models/ggml-base.en.bin)"
		/>
	</label>
	<p class="sbd-muted">{detectedModel ? `Found: ${detectedModel}` : 'Not found - voice input will show an error until this resolves.'}</p>
</div>
