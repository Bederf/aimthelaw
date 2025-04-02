export const safeGetDocumentContent = (content: any): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (typeof content === 'object' && content !== null) {
    return content.content || content.text || '';
  }
  return '';
}; 