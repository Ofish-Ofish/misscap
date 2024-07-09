import { match } from "assert";
import { Editor, Plugin, MarkdownView, Notice, Modal } from "obsidian";
import * as fs from "fs";
import * as path from "path";

export default class misscap extends Plugin {
	statusBarElement: HTMLSpanElement;
	PROPERNOUNS: Set<string>;

	async onload() {
		this.statusBarElement = this.addStatusBarItem().createEl("span");
		this.PROPERNOUNS = await this.loadProperNouns();
		this.readActiveFileAndfindCapWords();

		this.app.workspace.on("editor-change", (editor) => {
			const content = editor.getDoc().getValue();
			this.findCapWords(content, editor);
		});

		this.app.workspace.on("active-leaf-change", () => {
			this.readActiveFileAndfindCapWords();
		});
	}

	onunload() {
		this.statusBarElement.remove();
	}

	private async readActiveFileAndfindCapWords() {
		const file = this.app.workspace.getActiveFile();
		if (file) {
			const content = await this.app.vault.read(file);
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			const editor = activeView ? activeView.editor : null;
			this.findCapWords(content, editor);
		} else {
			this.findCapWords(undefined, undefined);
		}
	}

	private findCapWords(fileContent?: string, editor: any) {
		if (!fileContent) return;

		let matches: Array<any> = [];
		let capitalizedWords = fileContent
			? [...fileContent.matchAll(/\b[A-Z][a-z]*\b/g)]
			: [];
		for (const wordAndInfo of capitalizedWords) {
			if (
				fileContent[wordAndInfo.index - 1] === "\t" ||
				fileContent[wordAndInfo.index - 2] === "." ||
				fileContent[wordAndInfo.index - 1] === "!" ||
				fileContent[wordAndInfo.index - 1] === "?" ||
				fileContent[wordAndInfo.index - 1] === '"' ||
				fileContent[wordAndInfo.index - 1] === "'" ||
				fileContent[wordAndInfo.index - 1] === "#" ||
				wordAndInfo[0] === wordAndInfo[0].toUpperCase() ||
				this.PROPERNOUNS.has(wordAndInfo[0])
			) {
				continue;
			}
			matches.push(wordAndInfo);
		}
		console.log(matches);
		if (matches.length < 1) {
			return;
		}

		for (const match of matches) {
			console.log(match[0]);
			// const newContent = fileContent.replace(
			// 	match[0],
			// 	`<span class="misscap">${match[0]}</span>`
			// );
			// editor.getDoc().setValue(newContent);
		}
	}

	private async loadProperNouns(): Promise<Set<string>> {
		const filePath = path.join(
			this.app.vault.configDir,
			"plugins",
			"misscap",
			"properNouns.txt"
		);
		const data = await this.app.vault.adapter.read(filePath);
		const nouns = new Set(data.split(/\r?\n/));
		return nouns;
	}
}
