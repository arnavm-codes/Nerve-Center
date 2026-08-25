import { addIcon } from 'obsidian';

/** Icon id used for the ribbon button and command palette entry. */
export const NERVE_CENTER_ICON = 'nerve-center';

// A neuron / nerve-ending glyph: a central soma with dendrites branching out
// at irregular angles and lengths (deliberately not symmetric or cardinal,
// so it reads as organic rather than as a plus/cross), one of which forks,
// each ending in a small synaptic-bulb terminal.
const NERVE_CENTER_SVG = `
<line x1="50" y1="50" x2="80" y2="61" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="50" y1="50" x2="47" y2="67" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="47" y1="67" x2="45" y2="78" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="47" y1="67" x2="33" y2="73" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
<line x1="50" y1="50" x2="19" y2="64" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="50" y1="50" x2="26" y2="39" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="50" y1="50" x2="45" y2="20" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="50" y1="50" x2="75" y2="29" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<circle cx="50" cy="50" r="10" fill="currentColor"/>
<circle cx="80" cy="61" r="5" fill="currentColor"/>
<circle cx="45" cy="78" r="5" fill="currentColor"/>
<circle cx="33" cy="73" r="4" fill="currentColor"/>
<circle cx="19" cy="64" r="5" fill="currentColor"/>
<circle cx="26" cy="39" r="5" fill="currentColor"/>
<circle cx="45" cy="20" r="5" fill="currentColor"/>
<circle cx="75" cy="29" r="5" fill="currentColor"/>
`;

export function registerNerveCenterIcon(): void {
	addIcon(NERVE_CENTER_ICON, NERVE_CENTER_SVG);
}
