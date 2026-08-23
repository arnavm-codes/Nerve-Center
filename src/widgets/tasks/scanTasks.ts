import type { App } from 'obsidian';

export interface TaskItem {
	text: string;
	file: string;
	checked: boolean;
}

const TASK_LINE = /^\s*-\s\[([ xX])\]\s+(.*)$/;

export async function scanTasks(app: App): Promise<TaskItem[]> {
	const tasks: TaskItem[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		const content = await app.vault.cachedRead(file);
		for (const line of content.split('\n')) {
			const match = TASK_LINE.exec(line);
			if (match) {
				tasks.push({
					text: match[2]!.trim(),
					file: file.basename,
					checked: match[1]!.toLowerCase() === 'x',
				});
			}
		}
	}
	return tasks;
}
