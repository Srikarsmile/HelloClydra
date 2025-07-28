// Escape HTML to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

export function highlight(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  
  // First escape the text to prevent XSS
  const escapedText = escapeHtml(text);
  
  // Escape regex special characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Apply highlighting with safe <mark> tags
  return escapedText.replace(
    new RegExp(`(${escapedQuery})`, 'gi'), 
    '<mark>$1</mark>'
  );
}
