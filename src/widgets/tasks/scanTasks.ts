import type { App } from 'obsidian';

export interface TaskItem {
	text: string;
	file: string;
	path: string;
	line: number;
	checked: boolean;
}

const TASK_LINE = /^\s*-\s\[([ xX])\]\s+(.*)$/;

export async function scanTasks(app: App): Promise<TaskItem[]> {
	const tasks: TaskItem[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		const content = await app.vault.cachedRead(file);
		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const match = TASK_LINE.exec(lines[i]!);
			if (match) {
				tasks.push({
					text: match[2]!.trim(),
					file: file.basename,
					path: file.path,
					line: i,
					checked: match[1]!.toLowerCase() === 'x',
				});
			}
		}
	}
	return tasks;
}
