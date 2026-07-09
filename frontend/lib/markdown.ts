/**
 * Simple safe markdown parser to prevent XSS and render basic markdown (bold, italic, list, links, line breaks).
 */
export function parseMarkdownToHtml(markdown: string | null | undefined): string {
  if (!markdown) return "";
  
  // 1. Basic HTML Escaping to prevent XSS
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 3. Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 4. Links ([text](url)) with XSS validation (reject javascript:, data:, vbscript:)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
    const cleanUrl = url.trim();
    const lowerUrl = cleanUrl.toLowerCase();
    if (
      lowerUrl.startsWith("javascript:") ||
      lowerUrl.startsWith("data:") ||
      lowerUrl.startsWith("vbscript:")
    ) {
      return `<span>${text}</span>`;
    }
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${text}</a>`;
  });

  // 5. Lists (- item)
  const lines = html.split("\n");
  let inList = false;
  const processedLines = lines.map((line) => {
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch) {
      let content = "";
      if (!inList) {
        inList = true;
        content += '<ul class="list-disc pl-5 my-2 space-y-1">';
      }
      content += `<li>${listMatch[1]}</li>`;
      return content;
    } else {
      let content = "";
      if (inList) {
        inList = false;
        content += "</ul>";
      }
      content += line;
      return content;
    }
  });

  if (inList) {
    processedLines.push("</ul>");
  }

  html = processedLines.join("\n");

  // 6. Line breaks (\n) - but not inside lists or paragraphs
  html = html.replace(/\n/g, "<br />");

  return html;
}
