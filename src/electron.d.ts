// Minimal ambient typing for the `electron` module Obsidian provides at
// runtime (externalized in esbuild.config.mjs). Avoids depending on the full
// `electron` npm package - which bundles a ~300MB binary - just for types.
declare module 'electron' {
	export const shell: {
		openExternal(url: string): Promise<void>;
	};
}
