/**
 * High-fidelity bidirectional conversion between Tiptap HTML and Markdown.
 */

export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Images: ![alt](src)
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');

  // Links: [text](href)
  md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Inline formatting
  md = md.replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)>(.*?)<\/(?:em|i)>/gi, '*$1*');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = inner.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n').trim();
    return (
      text
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n') + '\n\n'
    );
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let index = 1;
    return (
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: any, item: string) => {
        const cleanItem = item.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1').trim();
        return `${index++}. ${cleanItem}\n`;
      }) + '\n'
    );
  });

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return (
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: any, item: string) => {
        const cleanItem = item.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1').trim();
        return `- ${cleanItem}\n`;
      }) + '\n'
    );
  });

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // Line breaks & horizontal rules
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n');

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

function formatInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function markdownToHtml(md: string): string {
  if (!md) return '';

  if (/^\s*<[a-z][\s\S]*>/i.test(md)) {
    return md;
  }

  const lines = md.split('\n');
  const htmlLines: string[] = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      if (inUl) {
        htmlLines.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        htmlLines.push('</ol>');
        inOl = false;
      }
      if (inBlockquote) {
        htmlLines.push('</blockquote>');
        inBlockquote = false;
      }
      continue;
    }

    if (/^######\s+(.+)/.test(line)) {
      htmlLines.push(`<h6>${RegExp.$1}</h6>`);
      continue;
    }
    if (/^#####\s+(.+)/.test(line)) {
      htmlLines.push(`<h5>${RegExp.$1}</h5>`);
      continue;
    }
    if (/^####\s+(.+)/.test(line)) {
      htmlLines.push(`<h4>${RegExp.$1}</h4>`);
      continue;
    }
    if (/^###\s+(.+)/.test(line)) {
      htmlLines.push(`<h3>${RegExp.$1}</h3>`);
      continue;
    }
    if (/^##\s+(.+)/.test(line)) {
      htmlLines.push(`<h2>${RegExp.$1}</h2>`);
      continue;
    }
    if (/^#\s+(.+)/.test(line)) {
      htmlLines.push(`<h1>${RegExp.$1}</h1>`);
      continue;
    }

    if (/^>\s*(.+)/.test(line)) {
      if (!inBlockquote) {
        htmlLines.push('<blockquote>');
        inBlockquote = true;
      }
      htmlLines.push(`<p>${formatInline(RegExp.$1)}</p>`);
      continue;
    } else if (inBlockquote) {
      htmlLines.push('</blockquote>');
      inBlockquote = false;
    }

    if (/^[-*+]\s+(.+)/.test(line)) {
      if (!inUl) {
        htmlLines.push('<ul>');
        inUl = true;
      }
      htmlLines.push(`<li><p>${formatInline(RegExp.$1)}</p></li>`);
      continue;
    } else if (inUl) {
      htmlLines.push('</ul>');
      inUl = false;
    }

    if (/^\d+\.\s+(.+)/.test(line)) {
      if (!inOl) {
        htmlLines.push('<ol>');
        inOl = true;
      }
      htmlLines.push(`<li><p>${formatInline(RegExp.$1)}</p></li>`);
      continue;
    } else if (inOl) {
      htmlLines.push('</ol>');
      inOl = false;
    }

    htmlLines.push(`<p>${formatInline(line)}</p>`);
  }

  if (inUl) htmlLines.push('</ul>');
  if (inOl) htmlLines.push('</ol>');
  if (inBlockquote) htmlLines.push('</blockquote>');

  return htmlLines.join('\n');
}

