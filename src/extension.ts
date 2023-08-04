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

function updateAnnotateTogglesVisibility() {
	let isAnnotateVisible = getGlobalAnnotateVisible();
	let currentActiveEditor = vscode.window.activeTextEditor;
	if(currentActiveEditor) {
		vscode.window.visibleTextEditors.forEach((editor) => {
			const document = editor.document;
			const foldingRanges = getFoldingRanges(document);
			if (foldingRanges[0]) {
				console.log("visible editor1 " + isAnnotateVisible +  " " + editor.document.fileName);
				toggleFolding(editor, isAnnotateVisible);
			}
		});
	}
}

function toggleAnnotate() {
	let isAnnotateVisible = ! getGlobalAnnotateVisible();
	setGlobalAnnotateVisible(isAnnotateVisible);

	updateAnnotateTogglesVisibility();
}

// ...

function getFirstFoldingRange(document: vscode.TextDocument): vscode.FoldingRange | undefined {
    const foldingRanges = getFoldingRanges(document);
    return foldingRanges[0];
}

function setCursorPosition(editor: vscode.TextEditor, lineNumber: number) {
    const position = new vscode.Position(lineNumber, 0);
    editor.selection = new vscode.Selection(position, position);
}

async function foldOrUnfold(editor: vscode.TextEditor, startLine: number, endLine: number, isAnnotateVisible: boolean) {
	const command = isAnnotateVisible ? 'editor.unfold' : 'editor.fold';
	try {
        const args = isAnnotateVisible ? { startLineNumber: startLine, endLineNumber: endLine } : { startLineNumber: startLine, endLineNumber: endLine, levels: 1 };

        await vscode.commands.executeCommand(command, args);
    } catch (error) {
        console.error(`Error executing ${command}:`, error);
    }
}

function toggleFoldingForEditor(editor: vscode.TextEditor, isAnnotateVisible: boolean): Thenable<void> {
    const foldingRange = getFirstFoldingRange(editor.document);
    if (foldingRange) {
        const startLine = foldingRange.start;
        const endLine = foldingRange.end;

        setCursorPosition(editor, startLine);
        return foldOrUnfold(editor, startLine, endLine, isAnnotateVisible);
    }
    return Promise.resolve();
}

async function toggleFolding(editor: vscode.TextEditor, isAnnotateVisible: boolean) {
    let currentActiveEditor = vscode.window.activeTextEditor;

    globalCurrentlyAutomaticallyChangingFocus = true;
    await vscode.window.showTextDocument(editor.document, editor.viewColumn);
    
    if (currentActiveEditor) {
        await toggleFoldingForEditor(editor, isAnnotateVisible);

        // When you're done, reactivate the previously active editor.
        await vscode.window.showTextDocument(currentActiveEditor.document, currentActiveEditor.viewColumn);
        globalCurrentlyAutomaticallyChangingFocus = false;
    }
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
