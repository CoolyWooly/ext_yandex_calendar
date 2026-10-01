import { XMLParser } from 'fast-xml-parser';

/** Один `<response>` из ответа 207 Multi-Status: адрес и свойства из успешных `<propstat>`. */
export interface DavResource {
  href: string;
  props: Record<string, unknown>;
}

// Яндекс смешивает префиксы (`D:href`, `href xmlns="DAV:"`), поэтому префиксы срезаем
// и ищем свойства по локальному имени.
const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  isArray: (name) => name === 'response' || name === 'propstat' || name === 'comp',
});

export function parseMultistatus(xml: string): DavResource[] {
  const doc = parser.parse(xml) as { multistatus?: { response?: unknown[] } };
  const responses = doc.multistatus?.response ?? [];

  return responses.map((raw) => {
    const response = raw as { href?: unknown; propstat?: unknown[] };
    const props: Record<string, unknown> = {};
    for (const rawPropstat of response.propstat ?? []) {
      const propstat = rawPropstat as { status?: unknown; prop?: unknown };
      if (!isSuccessStatus(textOf(propstat.status))) continue;
      if (propstat.prop && typeof propstat.prop === 'object') {
        Object.assign(props, propstat.prop);
      }
    }
    return { href: textOf(response.href).trim(), props };
  });
}

/** Текст узла: строка как есть или `#text` у узла с атрибутами. */
export function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && '#text' in node) {
    return textOf((node as { '#text': unknown })['#text']);
  }
  return '';
}

/** Имена дочерних элементов узла, без атрибутов: `<resourcetype><calendar/></resourcetype>` → `['calendar']`. */
export function childNames(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  return Object.keys(node).filter((key) => !key.startsWith('@_') && key !== '#text');
}

function isSuccessStatus(status: string): boolean {
  return /\s2\d\d(\s|$)/.test(status);
}
