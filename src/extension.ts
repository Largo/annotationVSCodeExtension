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

// This method is called when your extension is activated
// Your extension is activated the first time a ruby document is opened or if the command is called.
export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerFoldingRangeProvider('ruby', {
		provideFoldingRanges(document: vscode.TextDocument, _context: vscode.FoldingContext, _token: vscode.CancellationToken) {
			const foldingRanges = getFoldingRanges(document);
			return foldingRanges;
		}
	});

	const config = vscode.workspace.getConfiguration();
    let isAnnotationsVisible = config.get<boolean>('annotation.annotationsVisible');

    if (isAnnotationsVisible === undefined) {
        isAnnotationsVisible = true; // Set default value
        config.update('annotation.annotationsVisible', isAnnotationsVisible, vscode.ConfigurationTarget.Global);
    }


    // Command to toggle annotations visibility
	const toggleAnnotationsCommand = vscode.commands.registerCommand('annotation.toggleAnnotations', () => {
		isAnnotationsVisible = !isAnnotationsVisible;
		config.update('annotation.annotationsVisible', isAnnotationsVisible, vscode.ConfigurationTarget.Global);

		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			console.log(isAnnotationsVisible);

			const document = activeEditor.document;
			const foldingRanges = getFoldingRanges(document);
			if (foldingRanges[0]) {
				const annotationsStartLine = foldingRanges[0].start; // Calculate the line number of the first line of the annotation block
				const position = new vscode.Position(annotationsStartLine, 0);
				activeEditor.selection = new vscode.Selection(position, position);


				const startLine = foldingRanges[0].start;
				const endLine = foldingRanges[0].end;

				if(isAnnotationsVisible) {
					vscode.commands.executeCommand('editor.fold', {
						startLineNumber: startLine,
						endLineNumber: endLine,
						levels: 1
					});
					
					//activeEditor.revealRange(new vscode.Range(new vscode.Position(foldingRanges[0].start, 0), new vscode.Position(foldingRanges[0].end, 0)), vscode.TextEditorRevealType.Default);
					console.log("reveal");
				} else {
					console.log("hide");
					vscode.commands.executeCommand('editor.unfold', {
						startLineNumber: startLine,
						endLineNumber: endLine,
						levels: 1
					});
								}
				
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
		 vscode.workspace.onDidOpenTextDocument((document) => {
			 if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
				// vscode.commands.executeCommand('annotation.collapseBlock');
			 }
		 });
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
