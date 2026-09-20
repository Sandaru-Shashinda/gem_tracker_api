import sanitizeHtml from "sanitize-html"

/**
 * The post body is rich text written in the laboratory's editor and rendered as
 * HTML on grc.lk, so whatever arrives here is treated as hostile: it is parsed
 * and rebuilt from this allowlist before it is ever stored. Anything outside the
 * list — script, style, iframe, event handlers, inline styles — is dropped.
 *
 * The list is deliberately the set of marks the editor's toolbar can produce.
 * Widening it means widening the toolbar too, not the other way round.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
]

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  // Links carry nothing but their destination; rel/target are forced below so an
  // author cannot opt out of the noopener protection.
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  // A relative or scheme-less href would resolve against grc.lk and read as an
  // internal link, so only absolute destinations survive.
  allowProtocolRelative: false,
  transformTags: {
    // The href is vetted here rather than left to allowedSchemes, because a
    // relative destination ("/admin") passes that check and would resolve against
    // grc.lk as though the laboratory had linked it. The tag name is never changed:
    // rewriting it mid-document desynchronises the closing tags. A link that fails
    // loses its href and is unwrapped afterwards.
    a: (_tagName, attribs) => {
      const href = typeof attribs.href === "string" ? attribs.href.trim() : ""
      const safe = /^(https?:|mailto:)/i.test(href)
      return {
        tagName: "a",
        attribs: safe ? { href, target: "_blank", rel: "noopener noreferrer nofollow" } : {},
      }
    },
  },
  // An empty paragraph is the author's blank line, so <p> stays even when bare.
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
}

/** Rebuilds a submitted body from the allowlist above. */
export const sanitizeRichText = (html) => {
  if (typeof html !== "string") return ""

  // Anchors stripped of an unusable destination are unwrapped so the sentence
  // keeps its words without a dead link in the middle of it. Safe to do with a
  // regex: this runs on sanitised output, where <a> can never nest.
  return sanitizeHtml(html, SANITIZE_OPTIONS)
    .replace(/<a(?![^>]*\shref=)[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .trim()
}

/**
 * The body as readable prose: what the excerpt is cut from, and the answer to
 * "did the author actually write anything" — an editor left untouched still
 * posts "<p></p>", which is not empty as a string but is empty as an article.
 */
export const richTextToPlain = (html) => {
  if (typeof html !== "string") return ""

  // Block boundaries become spaces first, or "one.</p><p>Two" would run together.
  const spaced = html.replace(/<\/(p|h2|h3|li|blockquote|pre|div)>|<br\s*\/?>|<hr\s*\/?>/gi, " ")

  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    // sanitize-html leaves entities encoded; the excerpt is plain text, so the
    // handful the editor emits are turned back into the characters they stand for.
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}
