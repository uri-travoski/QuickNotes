import TurndownService from 'turndown';

// Create and configure TurndownService singleton
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Rule for line breaks (<br>)
turndownService.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '\n',
});

// Rule for strikethrough (<del>, <s>)
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
});

// Rule for checkboxes / task lists
turndownService.addRule('taskList', {
  filter: (node) => {
    return (
      node.nodeName === 'INPUT' &&
      (node as HTMLInputElement).getAttribute('type') === 'checkbox'
    );
  },
  replacement: (_content, node) => {
    const isChecked = (node as HTMLInputElement).checked;
    return isChecked ? '[x] ' : '[ ] ';
  },
});

// Rule for HTML tables
turndownService.addRule('table', {
  filter: 'table',
  replacement: (_content, node) => {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.rows);
    if (rows.length === 0) return '';

    const tableData: string[][] = [];
    let maxCols = 0;

    for (const row of rows) {
      const cells = Array.from(row.cells).map((c) =>
        c.textContent?.trim().replace(/\|/g, '\\|') || ''
      );
      if (cells.length > maxCols) maxCols = cells.length;
      tableData.push(cells);
    }

    if (maxCols === 0) return '';

    let md = '\n';
    // Header row
    const header = tableData[0] || [];
    while (header.length < maxCols) header.push('');
    md += `| ${header.join(' | ')} |\n`;

    // Delimiter row
    md += `| ${Array(maxCols).fill('---').join(' | ')} |\n`;

    // Data rows
    for (let i = 1; i < tableData.length; i++) {
      const row = tableData[i];
      while (row.length < maxCols) row.push('');
      md += `| ${row.join(' | ')} |\n`;
    }

    return `${md}\n`;
  },
});

/**
 * Checks if HTML string has meaningful rich text markup that warrants conversion to Markdown.
 */
function hasRichMarkup(html: string): boolean {
  if (!html) return false;
  return /<(p|h[1-6]|ul|ol|li|strong|b|em|i|a|table|code|pre|blockquote|del|s|table|tr|th|td|hr|br|div)[^>]*>/i.test(
    html
  );
}

/**
 * Cleans up and normalizes Markdown whitespace and line breaks.
 */
function cleanMarkdownSpacing(md: string): string {
  let cleaned = md
    // Collapse 3 or more consecutive newlines down to 2
    .replace(/\n{3,}/g, '\n\n')
    // Collapse double newlines between consecutive short metadata/field lines (e.g. Source:, Date:, Likes:)
    .replace(/^([A-Za-z0-9 _\-|~*]+:\s*.*?)\n{2,}(?=[A-Za-z0-9 _\-|~*]+:\s*)/gm, '$1\n')
    // Remove trailing spaces on lines
    .replace(/[ \t]+$/gm, '')
    .trim();

  return cleaned;
}

/**
 * Converts clipboard HTML into formatted Markdown and inserts it into a textarea.
 * Returns true if handled, false if default browser paste should occur.
 */
export function handleSmartPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement> | ClipboardEvent,
  textarea: HTMLTextAreaElement | null,
  setContent: (val: string | ((prev: string) => string)) => void
): boolean {
  const clipboardData = (e as any).clipboardData;
  if (!clipboardData || !textarea) return false;

  const html = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');

  // If there is rich HTML markup from browser/web
  if (html && hasRichMarkup(html)) {
    try {
      let markdown = turndownService.turndown(html);
      markdown = cleanMarkdownSpacing(markdown);

      // Fallback to plain text if converted markdown is empty
      if (!markdown && plainText) {
        markdown = cleanMarkdownSpacing(plainText);
      }

      if (markdown) {
        e.preventDefault();

        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const currentVal = textarea.value;

        const before = currentVal.substring(0, start);
        const after = currentVal.substring(end);
        const newVal = before + markdown + after;

        setContent(newVal);

        // Restore cursor position after the inserted markdown
        requestAnimationFrame(() => {
          if (textarea) {
            textarea.selectionStart = start + markdown.length;
            textarea.selectionEnd = start + markdown.length;
            textarea.focus();
          }
        });

        return true;
      }
    } catch (err) {
      console.warn('HTML to Markdown paste failed, falling back to default paste:', err);
    }
  }

  return false;
}
