// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { start } from 'repl';
import * as vscode from 'vscode';

let globalAnnotateVisible : boolean;
let globalCurrentlyAutomaticallyChangingFocus : boolean = false; // Used to disable events when automatically switching focus

export function getFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const foldingRanges: vscode.FoldingRange[] = [];
    const startRegex = /^# == Schema Info/;
    const endRegex = /^class\s/;

    let foldingStartLine: number | undefined = undefined;

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);

        if (startRegex.test(line.text)) {
            // Start of a new folding range
            foldingStartLine = i;
        } else if (endRegex.test(line.text)) {
            // End of the current folding range
            if (foldingStartLine !== undefined) {
                const foldingRange = new vscode.FoldingRange(foldingStartLine, i - 1, vscode.FoldingRangeKind.Region);
                foldingRanges.push(foldingRange);
                foldingStartLine = undefined;
            }
        }
    }

    return foldingRanges;
}

function getGlobalAnnotateVisibleFromConfig(): boolean {
	const config = vscode.workspace.getConfiguration();
    let isAnnotateVisible = config.get<boolean>('annotateToggle.annotateVisible');

	if (isAnnotateVisible === undefined) {
		isAnnotateVisible = false; // Set default value
		setGlobalAnnotateVisible(isAnnotateVisible);
	} 
	return isAnnotateVisible;
}

function getGlobalAnnotateVisible(): boolean {
	return globalAnnotateVisible;
}

function setGlobalAnnotateVisible(isAnnotateVisible: boolean) {
	globalAnnotateVisible = isAnnotateVisible;
	const config = vscode.workspace.getConfiguration();
	config.update('annotateToggle.annotateVisible', isAnnotateVisible, vscode.ConfigurationTarget.Workspace);
}

function toggleFolding(editor: vscode.TextEditor, isAnnotateVisible: boolean) {
	let currentActiveEditor = vscode.window.activeTextEditor;
	console.log("currentlyActive while setting" + currentActiveEditor?.document.fileName);

	let editorToActivate = editor; // This should be the editor you want to activate.
	console.log("currentDoc " + editorToActivate.document.fileName);

	
	globalCurrentlyAutomaticallyChangingFocus = true;
	vscode.window.showTextDocument(editorToActivate.document).then((editor) => {
		console.log("currentlyActive showtext setting" + currentActiveEditor?.document.fileName);
		// Your code that requires `editorToActivate` to be active goes here...
		if(currentActiveEditor) {
			const foldingRanges = getFoldingRanges(editor.document);
			if (foldingRanges[0]) {
				const startLine = foldingRanges[0].start;
				const endLine = foldingRanges[0].end;
				
				const activeEditor = editor;
				if (activeEditor) {
					const document = activeEditor.document;
					const foldingRanges = getFoldingRanges(document);
					if (foldingRanges[0]) {
						const annotateTogglesStartLine = foldingRanges[0].start; // Calculate the line number of the first line of the annotateToggle block
						const position = new vscode.Position(annotateTogglesStartLine, 0);
						activeEditor.selection = new vscode.Selection(position, position);
					}
				}
		
				console.log("currentlyActive supposedly when folding" + editor?.document.fileName + " " + vscode.window.activeTextEditor?.document.fileName);

				if (!isAnnotateVisible) {
					console.log("fold");
					vscode.commands.executeCommand('editor.fold', {
						startLineNumber: startLine,
						endLineNumber: endLine,
						levels: 1
					}).then(() => {
						console.log("currentlyActive after when folding" + editor?.document.fileName + " " + vscode.window.activeTextEditor?.document.fileName);
					});
				} else if (isAnnotateVisible) {
					console.log("unfold");
					vscode.commands.executeCommand('editor.unfold', {
						startLineNumber: startLine,
						endLineNumber: endLine,
					});
				}
			}

			// When you're done, reactivate the previously active editor.
			vscode.window.showTextDocument(currentActiveEditor.document).then((editor) => { 
				console.log("currentlyActive when returning" + editor?.document.fileName);

				globalCurrentlyAutomaticallyChangingFocus = false;
			});
		}
	});
}

function updateAnnotateTogglesVisibility() {
	vscode.window.visibleTextEditors.forEach((editor) => {
		console.log("visible editor");
		const document = editor.document;
		const foldingRanges = getFoldingRanges(document);
		if (foldingRanges[0]) {
			let isAnnotateVisible = getGlobalAnnotateVisible();
			toggleFolding(editor, isAnnotateVisible);
		}
	});
}

function toggleAnnotate() {
	let isAnnotateVisible = ! getGlobalAnnotateVisible();
	setGlobalAnnotateVisible(isAnnotateVisible);

	updateAnnotateTogglesVisibility();
}

// This method is called when your extension is activated
// Your extension is activated the first time a ruby document is opened or if the command is called.
export function activate(context: vscode.ExtensionContext) {
	globalAnnotateVisible = getGlobalAnnotateVisibleFromConfig();

	vscode.languages.registerFoldingRangeProvider('ruby', {
		provideFoldingRanges(document: vscode.TextDocument, _context: vscode.FoldingContext, _token: vscode.CancellationToken) {
			const foldingRanges = getFoldingRanges(document);
			return foldingRanges;
		}
	});

    // Command to toggle annotateToggles visibility
	const toggleAnnotateCommand = vscode.commands.registerCommand('annotateToggle.toggleAnnotate',toggleAnnotate);
	
    context.subscriptions.push(toggleAnnotateCommand);

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if(globalCurrentlyAutomaticallyChangingFocus === false && editor) {
			const document = editor.document;
			if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
				updateAnnotateTogglesVisibility();
			}
		}
	 });

	 // Get the value of the extension.autoRunCommand setting
	 const autoRunCommand = vscode.workspace.getConfiguration().get<boolean>('annotateToggle.autoRunCommand');

	 if (autoRunCommand) {
		 // Automatically run the command once when a Ruby file is opened
		 updateAnnotateTogglesVisibility();
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
