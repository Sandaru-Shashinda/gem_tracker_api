import mongoose from "mongoose"
import { POST_CATEGORIES, POST_STATUSES } from "../constants/index.js"

/**
 * An article published to the Post section of grc.lk.
 *
 * Authored by laboratory staff: any signed-in user may write a blog, only an
 * ADMIN may file under GRC News, and only an ADMIN can move a post to PUBLISHED.
 * Until then nothing here is reachable from the public site — the public routes
 * filter on `status` rather than trusting the caller.
 */
const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    /** Addresses the post on grc.lk (/post/<slug>); unique across live posts. */
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, trim: true, maxlength: 400, default: "" },
    /**
     * Rich text, stored as the sanitised HTML the API rebuilds on every write —
     * never as whatever the editor submitted. The cap is generous because markup
     * inflates the same article several times over; it bounds the document, it is
     * not a word count. Posts written before the editor existed are plain text
     * and still render, so nothing needed migrating.
     */
    body: { type: String, required: true, maxlength: 120000 },

    category: {
      type: String,
      enum: Object.values(POST_CATEGORIES),
      default: POST_CATEGORIES.BLOG,
    },
    status: {
      type: String,
      enum: Object.values(POST_STATUSES),
      default: POST_STATUSES.DRAFT,
    },

    /** Compressed data URI, written by the shared image service. */
    coverImage: { type: String },

    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    /** Stamped the first time an ADMIN publishes; the public date shown on grc.lk. */
    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// The public listing: published posts, newest first, optionally one category.
PostSchema.index({ isDeleted: 1, status: 1, category: 1, publishedAt: -1 })
// The staff listing, which is ordered by when the draft was last touched.
PostSchema.index({ isDeleted: 1, author: 1, updatedAt: -1 })

export default mongoose.model("Post", PostSchema)
