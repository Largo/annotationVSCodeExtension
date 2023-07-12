// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { start } from 'repl';
import * as vscode from 'vscode';

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

function foldingRangeToRange(foldingRange: vscode.FoldingRange): vscode.Range {
    const startLine = foldingRange.start;
    const endLine = foldingRange.end;
    const startCharacter = 0; // Assuming the start column is always 0
    const endCharacter = 0; // Assuming the end column is always 0

    return new vscode.Range(
        new vscode.Position(startLine, startCharacter),
        new vscode.Position(endLine, endCharacter)
    );
}

// function isAnnotationsVisible(): boolean {
 
// }

function getGlobalAnnotationsVisible(): boolean {
	const config = vscode.workspace.getConfiguration();
    let isAnnotationsVisible = config.get<boolean>('annotation.annotationsVisible');
	if (isAnnotationsVisible === undefined) {
		isAnnotationsVisible = true; // Set default value
		setGlobalAnnotationsVisible(isAnnotationsVisible);
	} 
	return isAnnotationsVisible;
}

// TODO: configuration target project?
// watch conifg?

function setGlobalAnnotationsVisible(isAnnotationsVisible: boolean) {
	const config = vscode.workspace.getConfiguration();
	if (getGlobalAnnotationsVisible() !== isAnnotationsVisible) {
		config.update('annotation.annotationsVisible', isAnnotationsVisible, vscode.ConfigurationTarget.Workspace);
	}
}

function isRangeFolded(range: vscode.Range): boolean {
    const visibleRanges = vscode.window.activeTextEditor?.visibleRanges;

	let rangeIsFolded = false;
    if (visibleRanges) {
        for (const visibleRange of visibleRanges) {
            if (range.start.line >= visibleRange.start.line && range.start.line <= visibleRange.end.line) {
				if (visibleRange.start.line === visibleRange.end.line) {
					rangeIsFolded = true; // Fully folded, not visible
				}
            } 

        }
    }

    return rangeIsFolded; 
}

function toggleFolding(document: vscode.TextDocument, isAnnotationsVisible: boolean) {
	const foldingRanges = getFoldingRanges(document);
    if (foldingRanges[0]) {
        const startLine = foldingRanges[0].start;
        const endLine = foldingRanges[0].end;

		const isRangeFoldedNow = isRangeFolded(foldingRangeToRange(foldingRanges[0]));
		
//console.log(isAnnotationsVisible);
        if (!isAnnotationsVisible) {
			console.log("fold " + String(isRangeFoldedNow));
            // vscode.commands.executeCommand('editor.fold', {
            //     startLineNumber: startLine,
            //     endLineNumber: endLine,
            //     levels: 1
            // });
        } else if (isAnnotationsVisible ) {
			console.log("unfold " + String(isRangeFoldedNow));

            // vscode.commands.executeCommand('editor.unfold', {
            //     startLineNumber: startLine,
            //     endLineNumber: endLine,
            // });
        }
    }
}

// This method is called when your extension is activated
// Your extension is activated the first time a ruby document is opened or if the command is called.
export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerFoldingRangeProvider('ruby', {
		provideFoldingRanges(document: vscode.TextDocument, _context: vscode.FoldingContext, _token: vscode.CancellationToken) {
			const foldingRanges = getFoldingRanges(document);
			return foldingRanges;
		}
	});

	// Event listener for manual folding/unfolding
	vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const document = activeEditor.document;
            const foldingRanges = getFoldingRanges(document);
            const isAnnotationsVisible = isRangeFolded(foldingRangeToRange(foldingRanges[0]) );

			setGlobalAnnotationsVisible(isAnnotationsVisible);
        }
    });

	const config = vscode.workspace.getConfiguration();
    let isAnnotationsVisible = getGlobalAnnotationsVisible();

    // Command to toggle annotations visibility
	const toggleAnnotationsCommand = vscode.commands.registerCommand('annotation.toggleAnnotations', () => {
		isAnnotationsVisible = ! getGlobalAnnotationsVisible();
		setGlobalAnnotationsVisible(isAnnotationsVisible);

		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			//console.log(isAnnotationsVisible);

			const document = activeEditor.document;
			const foldingRanges = getFoldingRanges(document);
			if (foldingRanges[0]) {
				const annotationsStartLine = foldingRanges[0].start; // Calculate the line number of the first line of the annotation block
				const position = new vscode.Position(annotationsStartLine, 0);
				activeEditor.selection = new vscode.Selection(position, position);

				toggleFolding(document, isAnnotationsVisible);
			}
			
		}
	});
	

    context.subscriptions.push(toggleAnnotationsCommand);

	const disposable = vscode.commands.registerCommand('annotation.collapseBlock', () => {
		vscode.commands.executeCommand('editor.fold', { levels: 1 });
	});
	context.subscriptions.push(disposable);

	 // Get the value of the extension.autoRunCommand setting
	 const autoRunCommand = vscode.workspace.getConfiguration().get<boolean>('annotation.autoRunCommand');

	 if (autoRunCommand) {
		 // Automatically run the command once when a Ruby file is opened
		 vscode.window.onDidChangeActiveTextEditor((editor) => {
			if(editor) {
				const document = editor.document;
				console.log("test run " + Date.now().toString());

				if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
				   let isAnnotationsVisible = getGlobalAnnotationsVisible();
				   toggleFolding(document, isAnnotationsVisible);
   
				   // vscode.commands.executeCommand('annotation.collapseBlock');
				}
			}

		 });
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
