import { match } from "assert";
import { Plugin } from "obsidian";

export default class misscap extends Plugin {
	statusBarElement: HTMLSpanElement;

	onload() {
		this.statusBarElement = this.addStatusBarItem().createEl("span");
		this.readActiveFileAndUpdateLineCount();

		this.app.workspace.on("editor-change", (editor) => {
			const content = editor.getDoc().getValue();
			this.updateLineCount(content);
			this.findCapWords(content);
		});

		this.app.workspace.on("active-leaf-change", () => {
			this.readActiveFileAndUpdateLineCount();
		});
	}

	onunload() {
		this.statusBarElement.remove();
	}

	private async readActiveFileAndUpdateLineCount() {
		const file = this.app.workspace.getActiveFile();
		if (file) {
			const content = await this.app.vault.read(file);
			this.updateLineCount(content);
			this.findCapWords(content);
		} else {
			this.updateLineCount(undefined);
			this.findCapWords(undefined);
		}
	}

	private updateLineCount(fileContent?: string) {
		const count = fileContent ? fileContent.split(/\r\n|\r|\n/).length : 0;
		const linesWord = count === 1 ? "line" : "lines";
		this.statusBarElement.textContent = `${count} ${linesWord}`;
	}

	private findCapWords(fileContent?: string) {
		if (!fileContent) return;

		let matches = [];
		let capitalizedWords = fileContent
			? [...fileContent.matchAll(/\b[A-Z][a-z]*\b/g)]
			: [];

		for (const word of capitalizedWords) {
			if (
				fileContent[word.index - 1] === "\t" ||
				fileContent[word.index - 2] === "." ||
				fileContent[word.index - 1] === "!" ||
				fileContent[word.index - 1] === "?" ||
				fileContent[word.index - 1] === '"' ||
				fileContent[word.index - 1] === "'" ||
				word[0] === word[0].toUpperCase()
			) {
				continue;
			}
			matches.push(word);
		}
		console.log(matches);
	}
}
