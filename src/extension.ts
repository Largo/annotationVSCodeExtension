import * as vscode from 'vscode';

let globalAnnotateVisible : boolean;

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

async function setGlobalAnnotateVisible(isAnnotateVisible: boolean) {
	globalAnnotateVisible = isAnnotateVisible;
	const config = vscode.workspace.getConfiguration();
    let target = vscode.ConfigurationTarget.Workspace;
    if (vscode.workspace.workspaceFolders === undefined) {
        target = vscode.ConfigurationTarget.Global;
    }

	return await config.update('annotateToggle.annotateVisible', isAnnotateVisible, target);
}

async function updateAnnotateTogglesVisibility() {
	let isAnnotateVisible = getGlobalAnnotateVisible();
    let currentActiveEditor = vscode.window.activeTextEditor;
    let currentlyVisibleEditors = vscode.window.visibleTextEditors;

	for(const tabGroup of vscode.window.tabGroups.all) {
		for (const tab of tabGroup.tabs) {
			if(tab.input instanceof vscode.TabInputText) {
				const uri = tab.input.uri;
                const editor : vscode.TextEditor | undefined  = undefined;
                const document : vscode.TextDocument | undefined = undefined;
                
               // TODO: go thtough currentlyVisibleEditors and if the viewColumn and the document.fileName is the same, then use the document and editor from there otherwise open a new document "document = await vscode.workspace.openTextDocument(uri)" and "editor = await vscode.window.showTextDocument(document, tab.group.viewColumn)"

				// const document = await vscode.workspace.openTextDocument(uri);
                if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
    				// const editor = await vscode.window.showTextDocument(document, tab.group.viewColumn);		
					const foldingRanges = getFoldingRanges(document);
					if (foldingRanges[0]) {
                            await vscode.window.showTextDocument(editor.document, editor.viewColumn).then(async () => {
                                    return await toggleFoldingForEditor(editor, isAnnotateVisible);
                            });
                        }
					}
				}		
			}
		}

    // When done, reactivate the previously active editor.
    if (currentActiveEditor) {
        return await vscode.window.showTextDocument(currentActiveEditor.document, currentActiveEditor.viewColumn);
    } else {
        return Promise.resolve();
    }
}
  
async function toggleAnnotate() {
	let isAnnotateVisible = ! getGlobalAnnotateVisible();
	await setGlobalAnnotateVisible(isAnnotateVisible);

	return await updateAnnotateTogglesVisibility();
}

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
        const args = {
            levels: 1, // Number of levels to fold/unfold. Modify this as per requirements
            direction: 'down', // Change this as per requirements
            selectionLines: [startLine, endLine] // Apply the fold/unfold action to the start line
        };
		//console.log(command, vscode.window.activeTextEditor?.document?.fileName === editor.document.fileName, editor.document.fileName, args, editor.selection.start, editor.selection.end, editor.selection.anchor.line);
        if (vscode.window.activeTextEditor?.document?.fileName === editor.document.fileName) {
            return await vscode.commands.executeCommand(command, args);
        } else {
            console.log("error: activeTextEditor mismatch");
        }
    } catch (error) {
        console.error(`Error executing ${command}:`, error);
	
    }
	
    return Promise.resolve();
}

async function toggleFoldingForEditor(editor: vscode.TextEditor, isAnnotateVisible: boolean): Promise<unknown> {
    const foldingRange = getFirstFoldingRange(editor.document);
    if (foldingRange) {
        const startLine = foldingRange.start;
        const endLine = foldingRange.end;

        setCursorPosition(editor, startLine);
        return await foldOrUnfold(editor, startLine, endLine, isAnnotateVisible);
    } else {
		console.log("no folding range");
	}
    return Promise.resolve();
}

// This method is called when your extension is activated
// Your extension is activated the first time a ruby document is opened or if the command is called.
export async function activate(context: vscode.ExtensionContext) {
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

	await updateAnnotateTogglesVisibility();

	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		if(editor) {
			const document = editor.document;
			if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
				let isAnnotateVisible = getGlobalAnnotateVisible();
				await toggleFoldingForEditor(editor, isAnnotateVisible);
			}
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}