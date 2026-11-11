/**
 * Google's Gemini API, called over REST.
 *
 * fetch rather than the @google/genai SDK for the same reason drive.service avoids
 * googleapis: one endpoint is all that is used here.
 *
 * Built for the free tier, where each model has its own small daily quota. Requests go to
 * GEMINI_MODEL first and, when that model's quota is spent or it is unavailable, to
 * GEMINI_FALLBACK_MODEL. The defaults are Google's "latest" aliases, so the app moves to
 * new Flash releases without a code change; pin exact model ids in the env to stop that.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 90_000

export const isGeminiConfigured = () => !!process.env.GEMINI_API_KEY

const modelChain = () =>
  [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest",
  ].filter((model, i, all) => model && all.indexOf(model) === i)

/** An error carrying the HTTP status the API should answer with, and a code the app can read. */
export class GeminiError extends Error {
  constructor(message, status = 502, code = "AI_FAILED") {
    super(message)
    this.status = status
    this.code = code
  }
}

const callModel = async (model, body) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      // A non-JSON body — kept as text in the error below.
    }
    return { ok: response.ok, status: response.status, json, text }
  } catch (error) {
    if (error.name === "AbortError") {
      return { ok: false, status: 504, json: null, text: "Timed out waiting for Gemini" }
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Worth trying the next model for: quota spent, model retired or not on the free tier, overloaded. */
const isRetryableOnNextModel = (status) => [404, 429, 500, 503, 504].includes(status)

/**
 * Sends one request and returns the parsed JSON answer, with the model that gave it.
 *
 * @param {object} args
 * @param {string} args.systemInstruction
 * @param {Array}  args.parts           user-turn parts: { text } and { inline_data }
 * @param {object} args.responseSchema  Gemini's OpenAPI-subset schema
 */
export const generateJson = async ({ systemInstruction, parts, responseSchema }) => {
  if (!isGeminiConfigured()) {
    throw new GeminiError("AI insights are not set up on this server", 503, "AI_NOT_CONFIGURED")
  }

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts }],
    // Temperature is left at the model's default: Google advises against lowering it on
    // the newer Flash models, where it can make answers loop.
    generationConfig: { responseMimeType: "application/json", responseSchema },
  }

  let last = null
  for (const model of modelChain()) {
    const result = await callModel(model, body)
    last = result
    if (result.ok) {
      const candidate = result.json?.candidates?.[0]
      const text = (candidate?.content?.parts || [])
        .filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text)
        .join("")
      if (!text) {
        const reason = result.json?.promptFeedback?.blockReason || candidate?.finishReason || "empty answer"
        throw new GeminiError(`Gemini gave no answer (${reason})`, 502)
      }
      try {
        return { model, data: JSON.parse(text) }
      } catch {
        throw new GeminiError("Gemini's answer was not valid JSON", 502)
      }
    }
    if (!isRetryableOnNextModel(result.status)) break
    console.warn(`Gemini ${model} failed (${result.status}); trying the next model if any.`)
  }

  const detail = last?.json?.error?.message || last?.text || "unknown error"
  if (last?.status === 429) {
    throw new GeminiError(
      "The free AI quota is used up for now. Try again later — the daily quota resets at midnight Pacific time.",
      429,
      "AI_QUOTA",
    )
  }
  if (last?.status === 400 && /api key/i.test(detail)) {
    throw new GeminiError("The server's Gemini API key was rejected", 503, "AI_NOT_CONFIGURED")
  }
  throw new GeminiError(`Gemini request failed (${last?.status}): ${detail.slice(0, 300)}`, 502)
}
