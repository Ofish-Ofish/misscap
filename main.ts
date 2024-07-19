import {
	Editor,
	Plugin,
	MarkdownView,
	Notice,
	Modal,
	normalizePath,
} from "obsidian";
import * as fs from "fs";
import * as path from "path";
import { log } from "console";

export default class Misscap extends Plugin {
	statusBarElement: HTMLSpanElement;
	PROPERNOUNS: Set<string>;
	PERSONALPROPERNOUNS: Set<string>;
	debounceTimer: number;

	async onload() {
		this.statusBarElement = this.addStatusBarItem().createEl("span");
		this.PROPERNOUNS = await this.readFromNounFile("properNouns.txt");
		this.PERSONALPROPERNOUNS = await this.readFromNounFile(
			"personalWordBank.txt"
		);
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
					this.writeToPersonalWordBank(selection);
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
						this.writeToPersonalWordBank(selectedText);
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

	private async findCapWords(fileContent?: string, editor?: any) {
		if (!fileContent) return;

		let matches: Array<any> = [];
		let capitalizedWords = fileContent
			? [
					...fileContent.matchAll(
						/\b[A-Z][a-z]*(?:'[a-z]+)*(?:-[A-Z][a-z]*(?:'[a-z]+)*)*(?:\s[A-Z][a-z]*(?:'[a-z]+)*(?:-[A-Z][a-z]*(?:'[a-z]+)*)*)*\b/g
					),
			  ]
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

			// if (
			// 	fileContent[wordAndInfo.index - 1] === "\t" ||
			// 	fileContent[wordAndInfo.index - 2] === "." ||
			// 	fileContent[wordAndInfo.index - 3] === "." ||
			// 	fileContent[wordAndInfo.index - 1] === "\n" ||
			// 	fileContent[wordAndInfo.index - 2] === "!" ||
			// 	fileContent[wordAndInfo.index - 3] === "!" ||
			// 	fileContent[wordAndInfo.index - 2] === "?" ||
			// 	fileContent[wordAndInfo.index - 3] === "?" ||
			// 	fileContent[wordAndInfo.index - 1] === '"' ||
			// 	fileContent[wordAndInfo.index - 1] === "'" ||
			// 	fileContent[wordAndInfo.index - 1] === "#" ||
			// 	fileContent[wordAndInfo.index - 1] === ">" ||
			// 	fileContent[wordAndInfo.index - 1] === "“" ||
			// 	fileContent[wordAndInfo.index - 1] === "‘" ||
			// 	fileContent[wordAndInfo.index - 1] === "’" ||
			// 	fileContent[wordAndInfo.index - 1] === "”" ||
			// 	fileContent[wordAndInfo.index - 1] === undefined ||
			// 	wordAndInfo[0] === wordAndInfo[0].toUpperCase() ||
			// 	this.PROPERNOUNS.has(wordAndInfo[0]) ||
			// 	this.PERSONALPROPERNOUNS.has(wordAndInfo[0])
			// )
			if (
				this.CheckIfWordIsProperNoun(word) ||
				this.CheckIfWordIsTheBeginningOfASentence(
					wordAndInfo,
					fileContent
				)
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
		console.log(matches, "matches");
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

	private async readFromNounFile(file: string): Promise<Set<string>> {
		const filePath = path.join(
			this.app.vault.configDir,
			"plugins",
			"misscap",
			`${file}`
		);
		const data = await this.app.vault.adapter.read(filePath);
		const nouns = new Set(data.split(/\r?\n/));
		return nouns;
	}

	private async writeToPersonalWordBank(word: string) {
		const filePath = path.join(
			this.app.vault.configDir,
			"plugins",
			"misscap",
			"personalWordBank.txt"
		);
		const ProperNouns = await this.readFromNounFile("personalWordBank.txt");
		if (ProperNouns.has(word)) {
			new Notice("This word is already in the proper nouns list");
			return;
		}
		this.app.vault.adapter.append(filePath, `\n${word}`);
		this.PERSONALPROPERNOUNS = await this.readFromNounFile(
			"personalWordBank.txt"
		);
	}

	private CheckIfWordIsProperNoun(word: string) {
		if (
			word === word.toUpperCase() ||
			this.PROPERNOUNS.has(word) ||
			this.PERSONALPROPERNOUNS.has(word)
		) {
			return true;
		} else {
			return false;
		}
	}

	private CheckIfWordIsTheBeginningOfASentence(
		wordAndInfo: RegExpExecArray,
		fileContent: string
	) {
		console.log("hello");
		if (wordAndInfo[0].split("").length > 1) {
			return false;
		}
		if (
			fileContent[wordAndInfo.index - 1] === "\t" ||
			["\t", "\n", '"', "'", "“", "‘", "’", "”", undefined].includes(
				fileContent[wordAndInfo.index - 1]
			) ||
			[".", "!", "?"].includes(fileContent[wordAndInfo.index - 2]) ||
			fileContent[wordAndInfo.index - 3] === "."
		) {
			return true;
		}
	}
}
