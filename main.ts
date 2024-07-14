import { Editor, Plugin, MarkdownView, Notice, Modal } from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { log } from "console";

export default class Misscap extends Plugin {
	statusBarElement: HTMLSpanElement;
	PROPERNOUNS: Set<string>;
	debounceTimer: number;

	async onload() {
		this.statusBarElement = this.addStatusBarItem().createEl("span");
		this.PROPERNOUNS = await this.loadProperNouns();
		this.readActiveFileAndFindCapWords();

		this.addCommand({
			id: "add-to-Library",
			name: "add to Library",
			editorCallback: (editor: Editor) => {
				let selection = editor.getSelection();
				if (selection.length) {
					const tempDiv = document.createElement("div");
					tempDiv.innerHTML = selection;
					selection = tempDiv.textContent || tempDiv.innerText || "";
					console.log(selection);
				} else {
					let selection2 = window.getSelection();
					let selectedText = "";
					if (selection2 && selection2.rangeCount > 0) {
						const range = selection2.getRangeAt(0);
						const container = document.createElement("div");
						container.appendChild(range.cloneContents());
						selectedText =
							container.textContent || container.innerText || "";
						selection2.removeAllRanges();
						console.log(selectedText);
					}
				}
			},
		});

		this.app.workspace.on("editor-change", (editor) => {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = window.setTimeout(() => {
				const content = editor.getDoc().getValue();
				this.findCapWords(content, editor);
			}, 300);
		});

		this.app.workspace.on("active-leaf-change", () => {
			this.readActiveFileAndFindCapWords();
		});
	}

	onunload() {
		this.statusBarElement.remove();
	}

	private async readActiveFileAndFindCapWords() {
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

	private async findCapWords(fileContent?: string, editor: any) {
		if (!fileContent) return;

		let matches: Array<any> = [];
		let capitalizedWords = fileContent
			? [...fileContent.matchAll(/\b[A-Z][a-z]*\b/g)]
			: [];
		for (const wordAndInfo of capitalizedWords) {
			const word = wordAndInfo[0];
			const startIndex = wordAndInfo.index;

			// Check if the word is already within a <span> tag
			const spanword = fileContent.substring(
				Math.max(0, startIndex - 22),
				Math.min(fileContent.length, startIndex + 7)
			);
			if (
				spanword.includes('<span class="misscap">') ||
				spanword.includes("</span>")
			) {
				continue;
			}

			if (
				fileContent[wordAndInfo.index - 1] === "\t" ||
				fileContent[wordAndInfo.index - 2] === "." ||
				fileContent[wordAndInfo.index - 3] === "." ||
				fileContent[wordAndInfo.index - 1] === "\n" ||
				fileContent[wordAndInfo.index - 2] === "!" ||
				fileContent[wordAndInfo.index - 3] === "!" ||
				fileContent[wordAndInfo.index - 2] === "?" ||
				fileContent[wordAndInfo.index - 3] === "?" ||
				fileContent[wordAndInfo.index - 1] === '"' ||
				fileContent[wordAndInfo.index - 1] === "'" ||
				fileContent[wordAndInfo.index - 1] === "#" ||
				fileContent[wordAndInfo.index - 1] === ">" ||
				fileContent[wordAndInfo.index - 1] === "“" ||
				fileContent[wordAndInfo.index - 1] === "‘" ||
				fileContent[wordAndInfo.index - 1] === "’" ||
				fileContent[wordAndInfo.index - 1] === "”" ||
				fileContent[wordAndInfo.index - 1] === undefined ||
				wordAndInfo[0] === wordAndInfo[0].toUpperCase() ||
				this.PROPERNOUNS.has(wordAndInfo[0])
			) {
				continue;
			}
			matches.push(wordAndInfo);
			console.log(fileContent[wordAndInfo.index - 1]);
		}

		if (matches.length < 1) {
			return;
		}

		// Sort matches by their starting index in descending order
		matches.sort((a, b) => b.index - a.index);
		console.log(matches);
		// Replace matches in the original content
		let newContent = fileContent;
		for (const match of matches) {
			newContent =
				newContent.substring(0, match.index) +
				`<span class="misscap">${match[0]}</span>` +
				newContent.substring(match.index + match[0].length);
		}

		editor.getDoc().setValue(newContent);
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
