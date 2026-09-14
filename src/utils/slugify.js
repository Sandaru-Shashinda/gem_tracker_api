/** Combining diacritical marks, written as escapes because the literal range is
 *  invisible in source. NFKD splits "Î" into "I" + one of these, which is then
 *  dropped, so an accented title still yields a readable slug. */
const COMBINING_MARKS = /[̀-ͯ]/g

/**
 * Turns a post title into the slug that addresses it on grc.lk.
 *
 * Accents are stripped rather than dropped, so "Ceylon Sapphire — Île" becomes
 * "ceylon-sapphire-ile" instead of losing the word entirely.
 */
export const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)

/**
 * Finds a slug no live post is already using.
 *
 * `Model` is passed in rather than imported so this stays a plain helper, and
 * `excludeId` lets a post keep its own slug while being renamed.
 */
export const uniqueSlug = async (Model, title, excludeId = null) => {
  const base = slugify(title) || "post"

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const query = { slug: candidate, isDeleted: { $ne: true } }
    if (excludeId) query._id = { $ne: excludeId }

    const clash = await Model.findOne(query).select("_id").lean()
    if (!clash) return candidate
  }

  // Fifty same-titled posts is not a real case; fall back to something unique
  // rather than looping forever.
  return `${base}-${Date.now().toString(36)}`
}
