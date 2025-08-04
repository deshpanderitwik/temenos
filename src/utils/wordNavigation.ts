/**
 * Vim-like sentence navigation utilities for TipTap editor
 */

/**
 * Finds the next sentence boundary from the current position
 * @param doc - The ProseMirror document
 * @param pos - Current position
 * @returns Position of the next sentence boundary, or -1 if not found
 */
export function findNextSentenceBoundary(doc: any, pos: number): number {
  if (!doc || pos >= doc.content.size) return -1;
  
  const text = doc.textBetween(pos, doc.content.size);
  if (!text) return -1;
  
  // Skip any whitespace at current position
  const skipWhitespace = text.match(/^\s+/);
  const afterWhitespace = pos + (skipWhitespace ? skipWhitespace[0].length : 0);
  
  if (afterWhitespace >= doc.content.size) return -1;
  
  // Find the next sentence boundary
  // Look for sentence endings: . ! ? followed by whitespace or end of text
  const remainingText = doc.textBetween(afterWhitespace, doc.content.size);
  const sentenceMatch = remainingText.match(/[.!?]\s+/);
  
  if (sentenceMatch) {
    // Found a sentence ending with whitespace after
    return afterWhitespace + sentenceMatch.index! + sentenceMatch[0].length;
  } else {
    // Check if there's a sentence ending at the end of the text
    const endMatch = remainingText.match(/[.!?]$/);
    if (endMatch) {
      return afterWhitespace + endMatch.index! + endMatch[0].length;
    }
  }
  
  // If no sentence boundary found, go to the end of the document
  return doc.content.size;
}

/**
 * Finds the previous sentence boundary from the current position
 * @param doc - The ProseMirror document
 * @param pos - Current position
 * @returns Position of the previous sentence boundary, or -1 if not found
 */
export function findPreviousSentenceBoundary(doc: any, pos: number): number {
  if (!doc || pos <= 0) return 0;
  
  const text = doc.textBetween(0, pos);
  if (!text) return 0;
  
  // Skip any whitespace at current position
  const skipWhitespace = text.match(/\s+$/);
  const beforeWhitespace = pos - (skipWhitespace ? skipWhitespace[0].length : 0);
  
  if (beforeWhitespace <= 0) return 0;
  
  // Find the previous sentence boundary
  // Look for sentence endings: . ! ? followed by whitespace
  const beforeText = doc.textBetween(0, beforeWhitespace);
  const sentenceMatch = beforeText.match(/[.!?]\s+[^.!?]*$/);
  
  if (sentenceMatch) {
    // Found a sentence ending with whitespace before current position
    return beforeText.length - sentenceMatch[0].length + sentenceMatch[0].match(/[.!?]\s+/)?.[0].length || 0;
  } else {
    // Check if we're at the beginning of a sentence
    const startMatch = beforeText.match(/[.!?]\s*$/);
    if (startMatch) {
      return beforeText.length - startMatch[0].length;
    }
  }
  
  // If no sentence boundary found, go to the beginning of the document
  return 0;
}

/**
 * Moves cursor to the next sentence boundary
 * @param editor - The TipTap editor instance
 */
export function moveToNextSentence(editor: any): void {
  if (!editor) return;
  
  const { state } = editor;
  const { doc } = state;
  const { from } = state.selection;
  
  const nextPos = findNextSentenceBoundary(doc, from);
  if (nextPos !== -1) {
    editor.commands.setTextSelection(nextPos);
  }
}

/**
 * Moves cursor to the previous sentence boundary
 * @param editor - The TipTap editor instance
 */
export function moveToPreviousSentence(editor: any): void {
  if (!editor) return;
  
  const { state } = editor;
  const { doc } = state;
  const { from } = state.selection;
  
  const prevPos = findPreviousSentenceBoundary(doc, from);
  if (prevPos !== -1) {
    editor.commands.setTextSelection(prevPos);
  }
} 