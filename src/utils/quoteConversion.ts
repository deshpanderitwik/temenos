/**
 * Utility functions for converting regular quotes to typographic quotes
 */

/**
 * Converts regular quotes to typographic quotes in text
 * @param text - The text to convert
 * @returns The text with typographic quotes
 */
export function convertToTypographicQuotes(text: string): string {
  if (!text) return text;

  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    // First, we need to handle the text as HTML content since TipTap uses HTML
    // We'll work with the text content and then reconstruct the HTML
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    
    // Get the text content and convert quotes
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const convertedText = convertQuotesInText(textContent);
    
    // If the original was just plain text, return the converted text
    if (text === textContent) {
      return convertedText;
    }
    
    // For HTML content, we need to be more careful
    // We'll replace quotes in text nodes while preserving HTML structure
    return convertQuotesInHTML(text);
  } else {
    // Node.js environment - just convert the text directly
    return convertQuotesInText(text);
  }
}

/**
 * Converts quotes in plain text
 * @param text - Plain text to convert
 * @returns Text with typographic quotes
 */
export function convertQuotesInText(text: string): string {
  let result = text;
  
  // Convert double quotes to typographic quotes
  // Look for patterns like "word" or "word" and convert them
  result = result.replace(/"([^"]*)"/g, '\u201C$1\u201D');
  
  // Convert single quotes to typographic quotes
  // Look for patterns like 'word' or 'word' and convert them
  result = result.replace(/'([^']*)'/g, '\u2018$1\u2019');
  
  // Handle apostrophes with proper direction
  // Convert apostrophes at the end of words (possessive, contractions like don't, can't)
  result = result.replace(/(?<=\w)'/g, '\u2019');
  
  // Convert apostrophes at the beginning of words (use left apostrophe for most cases)
  // But exclude cases where it's followed by 's' (possessive forms)
  result = result.replace(/'(?=\w(?!s\b))/g, '\u2018');
  
  // Handle possessive forms with 's specifically
  result = result.replace(/'(?=s\b)/g, '\u2019');
  
  return result;
}

/**
 * Converts quotes in HTML content while preserving HTML structure
 * @param html - HTML content to convert
 * @returns HTML with typographic quotes
 */
function convertQuotesInHTML(html: string): string {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Node.js environment - just convert the text directly
    return convertQuotesInText(html);
  }
  
  // Create a temporary div to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Walk through all text nodes and convert quotes
  walkTextNodes(tempDiv, (textNode) => {
    textNode.textContent = convertQuotesInText(textNode.textContent || '');
  });
  
  return tempDiv.innerHTML;
}

/**
 * Walks through all text nodes in an element and applies a function to each
 * @param element - The element to walk through
 * @param callback - Function to apply to each text node
 */
function walkTextNodes(element: Node, callback: (textNode: Text) => void): void {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return;
  }
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let textNode: Text | null;
  while (textNode = walker.nextNode() as Text) {
    callback(textNode);
  }
}

/**
 * Converts quotes in the current selection of a TipTap editor
 * @param editor - The TipTap editor instance
 */
export function convertQuotesInSelection(editor: any): void {
  if (!editor) return;
  
  const { state, dispatch } = editor;
  const { from, to } = state.selection;
  
  if (from === to) {
    // No selection, convert quotes in the entire document
    // Use a more careful approach to preserve tabs and document structure
    convertQuotesInDocument(editor);
  } else {
    // Convert quotes in the selected text
    const selectedText = state.doc.textBetween(from, to);
    const convertedText = convertQuotesInText(selectedText);
    
    // Replace the selected text with converted text
    editor.commands.insertContent(convertedText);
  }
}

/**
 * Converts quotes in the entire document while preserving tabs and structure
 * @param editor - The TipTap editor instance
 */
function convertQuotesInDocument(editor: any): void {
  if (!editor) return;
  
  const { state } = editor;
  const { doc, tr } = state;
  
  // Walk through all text nodes in the document and convert quotes
  let transaction = tr;
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const text = node.text || '';
      const convertedText = convertQuotesInText(text);
      
      if (text !== convertedText) {
        // Replace the text node with converted text
        transaction = transaction.replaceWith(
          pos,
          pos + text.length,
          state.schema.text(convertedText)
        );
      }
    }
  });
  
  // Apply the transaction if there were any changes
  if (transaction.docChanged) {
    editor.view.dispatch(transaction);
  }
} 