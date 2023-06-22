// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the first time a ruby document is opened or if the command is called.
export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerFoldingRangeProvider('ruby', {
		provideFoldingRanges(document: vscode.TextDocument, _context: vscode.FoldingContext, _token: vscode.CancellationToken) {
			const foldingRanges: vscode.FoldingRange[] = [];
			const startRegex = /^# == Schema Info/;
			const endRegex = /^class\s/;
	
			let foldingStartLine: number | undefined = undefined;
	
			for (let i = 0; i < document.lineCount; i++) {
				const line = document.lineAt(i);
	
				if (startRegex.test(line.text)) {
					//console.log(i + " start of folding range");
					// Start of a new folding range
					foldingStartLine = i;
				} else if (endRegex.test(line.text)) {
					// End of the current folding range
					if (foldingStartLine !== undefined) {
						//console.log(i + " end of folding range");

						const foldingRange = new vscode.FoldingRange(foldingStartLine, i - 1, vscode.FoldingRangeKind.Region);
						foldingRanges.push(foldingRange);
						foldingStartLine = undefined;
					}
				}
			}
	
			return foldingRanges;
		}
	});

	const disposable = vscode.commands.registerCommand('annotation.collapseBlock', () => {
		vscode.commands.executeCommand('editor.fold', { levels: 1 });
	});
	context.subscriptions.push(disposable);

	 // Get the value of the extension.autoRunCommand setting
	 const autoRunCommand = vscode.workspace.getConfiguration().get<boolean>('extension.autoRunCommand');

	 if (autoRunCommand) {
		 // Automatically run the command once when a Ruby file is opened
		 vscode.workspace.onDidOpenTextDocument((document) => {
			 if (document.languageId === 'ruby' || document.fileName.endsWith(".rb.git")) {
				 vscode.commands.executeCommand('annotation.collapseBlock');
			 }
		 });
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
