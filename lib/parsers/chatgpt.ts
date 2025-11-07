import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

/**
 * Extracts a ChatGPT share page into a structured Conversation.
 */
export async function parseChatGPT(html: string): Promise<Conversation> {
  // configuration parameters
  const minMessages = 2;
  const minScore = 3.0;
  const roleKeywords = ['user', 'assistant', 'bot', 'gpt', 'claude', 'message'];
  const timestampRegex = new RegExp(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}:\d{2})\b/);

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const body = doc.body;
  if (!body) {
    console.log('Conversation to parse does not have a body, returning full HTML');
    return {
      model: 'ChatGPT',
      content: html,
      scrapedAt: new Date().toISOString(),
      sourceHtmlBytes: html.length,
    };
  }

  const queue: Element[] = [body];

  while (queue.length) {
    const node = queue.shift();

    // consider only Element nodes
    if (node?.nodeType !== 1) continue;

    // node should have multiple child nodes to be considered a container candidate
    const childElements = Array.from(node.children || []);
    if (childElements.length >= minMessages) {
      const scoreInfo = scoreCandidate(node, childElements, { roleKeywords, timestampRegex });
      if (scoreInfo.score >= minScore) {
        const messages = parseMessages(childElements, { roleKeywords, timestampRegex });
        if (messages.length >= minMessages) {
          return {
            model: 'ChatGPT',
            content: messages.join(''),
            scrapedAt: new Date().toISOString(),
            sourceHtmlBytes: html.length,
          };
        }
      }
    }

    // enqueue children to perform BFS
    for (const c of childElements) queue.push(c);
  }
  
  return {
    model: 'ChatGPT',
    content: html,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}

function scoreCandidate(node: Element, children: Element[],
  { roleKeywords, timestampRegex }: { roleKeywords: string[], timestampRegex: RegExp}) {
    let score = 0;
    let roleHits = 0;
    let timestampHits = 0;
    let textNodes = 0;
    let avgTextLen = 0;

    for (const ch of children) {
      const txt = ch.textContent.trim().toLowerCase();
      if (!txt) continue;
      textNodes++;
      avgTextLen += txt.length;

      for (const k of roleKeywords) if (txt.includes(k)) roleHits++;

      if (timestampRegex.test(txt)) timestampHits++;
    }

    if (textNodes > 0) avgTextLen = avgTextLen / textNodes;

    // Build a score from signals:
    const className = (node.getAttribute('class') || '').toLowerCase();
    if (className.includes('conversation') || className.includes('prose') || className.includes('message')) {
      score += 1.25;
    }

    score += (children.length >= 5) ? 1.5 : (children.length >= 3) ? 1.0 : 0;
    score += (roleHits > 0) ? Math.min(2, roleHits / 2) : 0;
    score += (timestampHits > 0) ? 1.0 : 0;
    score += (avgTextLen >= 20 && avgTextLen <= 100) ? 1.0 : 0; // shortish messages
    // Small extra boost if children follow similar tag names (div, article, li)
    const tagSet = new Set(children.map(c => c.tagName));
    score += (tagSet.size <= 3) ? 0.5 : 0;

    return { score, roleHits, timestampHits, textNodes, avgTextLen };
}

function parseMessages(children: Element[],
  { roleKeywords, timestampRegex }: { roleKeywords: string[]; timestampRegex: RegExp}) {
  const out: string[] = [];
  for (const ch of children) {
    const txt = ch.textContent.trim();
    if (!txt) continue;

    // naive role detection
    const lower = txt.toLowerCase();
    let role = "unknown";
    for (const k of roleKeywords) {
      if (lower.includes(k)) {
        role = k === "assistant" || k.includes("gpt") || k === "bot" ? "assistant" : "user";
        break;
      }
    }

    // Extract timestamp if present
    const tsMatch = txt.match(timestampRegex);
    const timestamp = tsMatch ? tsMatch[0] : null;

    // For simplicity, remove name/timestamp lines if they're present as metadata
    // In practice, you'd want more robust HTML parsing for nested .metadata nodes
    out.push(`${role} ${timestamp}: ${txt}\n\n`);
  }
  return out;
}