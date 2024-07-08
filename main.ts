import { match } from "assert";
import { Editor, Plugin } from "obsidian";
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
			if (this.app.workspace.activeEditor()) {
				editor = this.app.workspace.activeEditor();
			}
			this.findCapWords(content);
		} else {
			this.findCapWords(undefined);
		}
	}

	private updateLineCount(fileContent?: string) {
		const count = fileContent ? fileContent.split(/\r\n|\r|\n/).length : 0;
		const linesWord = count === 1 ? "line" : "lines";
		this.statusBarElement.textContent = `${count} ${linesWord}`;
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

	private;
}
