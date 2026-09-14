import Post from "../models/Post.js"
import { POST_CATEGORIES, POST_STATUSES, ROLES } from "../constants/index.js"
import { uniqueSlug } from "../utils/slugify.js"
import { handleImageUpload } from "../services/image.service.js"

const AUTHOR_FIELDS = "name email role"
const PUBLIC_FIELDS = "title slug excerpt body category coverImage publishedAt createdAt"

const asText = (value) => (typeof value === "string" ? value.trim() : "")
const isAdmin = (user) => user?.role === ROLES.ADMIN
const isValid = (map, value) => Object.values(map).includes(value)

/** The author's own drafts are theirs to edit; everything else needs ADMIN. */
const canEdit = (post, user) =>
  isAdmin(user) ||
  (String(post.author?._id || post.author) === String(user._id) &&
    post.status === POST_STATUSES.DRAFT)

/** Derives the excerpt shown on the grc.lk card when the author left it blank. */
const deriveExcerpt = (body) => {
  const flat = asText(body).replace(/\s+/g, " ")
  if (flat.length <= 200) return flat
  return `${flat.slice(0, 197).trimEnd()}…`
}

// @desc    List posts for the laboratory (all statuses)
// @route   GET /api/posts
// @access  Private
export const getPosts = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10
    const page = Number(req.query.page) || 1

    const query = { isDeleted: { $ne: true } }

    if (req.query.status && isValid(POST_STATUSES, req.query.status)) {
      query.status = req.query.status
    }
    if (req.query.category && isValid(POST_CATEGORIES, req.query.category)) {
      query.category = req.query.category
    }
    // "mine=true" backs the author's own view; everyone can still read the rest,
    // since a shared editorial queue is the point of the section.
    if (req.query.mine === "true") {
      query.author = req.user._id
    }
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: "i" }
      query.$or = [{ title: searchRegex }, { excerpt: searchRegex }, { body: searchRegex }]
    }

    const [count, posts, draftCount] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .populate("author", AUTHOR_FIELDS)
        .populate("publishedBy", AUTHOR_FIELDS)
        .sort({ updatedAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1)),
      Post.countDocuments({ isDeleted: { $ne: true }, status: POST_STATUSES.DRAFT }),
    ])

    res.json({
      posts,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
      draftCount,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message })
  }
}

// @desc    Create a post (always as a draft unless an ADMIN says otherwise)
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const title = asText(req.body.title)
    const body = asText(req.body.body)

    const errors = {}
    if (!title) errors.title = "A title is required."
    if (!body) errors.body = "The post needs some content."
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Please complete the post.", errors })
    }

    // Only an ADMIN may file under GRC News; everyone else writes blog posts.
    let category = asText(req.body.category)
    if (!isValid(POST_CATEGORIES, category)) category = POST_CATEGORIES.BLOG
    if (!isAdmin(req.user) && category !== POST_CATEGORIES.BLOG) {
      category = POST_CATEGORIES.BLOG
    }

    // A non-admin's post starts as a draft no matter what was sent.
    const requested = asText(req.body.status)
    const status =
      isAdmin(req.user) && isValid(POST_STATUSES, requested) ? requested : POST_STATUSES.DRAFT

    let coverImage
    if (req.file) {
      const saved = await handleImageUpload(req.file, req.user, { category: "post" })
      coverImage = saved?.url
    }

    const post = await Post.create({
      title,
      slug: await uniqueSlug(Post, title),
      excerpt: asText(req.body.excerpt) || deriveExcerpt(body),
      body,
      category,
      status,
      coverImage,
      author: req.user._id,
      ...(status === POST_STATUSES.PUBLISHED
        ? { publishedAt: new Date(), publishedBy: req.user._id }
        : {}),
    })

    await post.populate("author", AUTHOR_FIELDS)
    res.status(201).json(post)
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error: error.message })
  }
}

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private (author while draft, or ADMIN)
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found" })
    }
    if (!canEdit(post, req.user)) {
      return res.status(403).json({
        message: "Published posts can only be edited by an administrator.",
      })
    }

    const title = asText(req.body.title)
    if (title && title !== post.title) {
      post.title = title
      // The slug follows the title only while the post is still a draft: changing
      // it after publication would break every link already shared.
      if (post.status === POST_STATUSES.DRAFT) {
        post.slug = await uniqueSlug(Post, title, post._id)
      }
    }

    if (req.body.body !== undefined) {
      const body = asText(req.body.body)
      if (!body) {
        return res.status(400).json({
          message: "Please complete the post.",
          errors: { body: "The post needs some content." },
        })
      }
      post.body = body
    }

    if (req.body.excerpt !== undefined) {
      post.excerpt = asText(req.body.excerpt) || deriveExcerpt(post.body)
    }

    if (req.body.category !== undefined) {
      const category = asText(req.body.category)
      if (isValid(POST_CATEGORIES, category)) {
        if (isAdmin(req.user) || category === POST_CATEGORIES.BLOG) {
          post.category = category
        }
      }
    }

    if (req.file) {
      const saved = await handleImageUpload(req.file, req.user, { category: "post" })
      if (saved?.url) post.coverImage = saved.url
    }

    const saved = await post.save()
    await saved.populate("author", AUTHOR_FIELDS)
    await saved.populate("publishedBy", AUTHOR_FIELDS)

    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: "Error updating post", error: error.message })
  }
}

// @desc    Publish, unpublish or archive a post
// @route   PUT /api/posts/:id/status
// @access  Private/Admin
export const updatePostStatus = async (req, res) => {
  try {
    const status = asText(req.body.status)
    if (!isValid(POST_STATUSES, status)) {
      return res.status(400).json({ message: "Unknown post status" })
    }

    const post = await Post.findById(req.params.id)
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found" })
    }

    post.status = status

    // publishedAt is the date grc.lk prints, so it is set once on first
    // publication and then left alone — unpublishing and republishing a post
    // should not silently re-date it.
    if (status === POST_STATUSES.PUBLISHED) {
      if (!post.publishedAt) post.publishedAt = new Date()
      post.publishedBy = req.user._id
    }

    const saved = await post.save()
    await saved.populate("author", AUTHOR_FIELDS)
    await saved.populate("publishedBy", AUTHOR_FIELDS)

    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: "Error updating post status", error: error.message })
  }
}

// @desc    Remove a post
// @route   DELETE /api/posts/:id
// @access  Private (author while draft, or ADMIN)
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found" })
    }
    if (!canEdit(post, req.user)) {
      return res.status(403).json({
        message: "Published posts can only be removed by an administrator.",
      })
    }

    post.isDeleted = true
    await post.save()

    res.json({ message: "Post removed" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error: error.message })
  }
}

/* -------------------------------------------------------------------------- */
/* Public endpoints — what grc.lk reads                                       */
/* -------------------------------------------------------------------------- */

// @desc    List published posts for the public site
// @route   GET /api/posts/public
// @access  Public
export const getPublishedPosts = async (req, res) => {
  try {
    const pageSize = Math.min(Number(req.query.limit) || 12, 50)
    const page = Number(req.query.page) || 1

    // Status is fixed here rather than taken from the query: a draft must not be
    // reachable from the public site by asking for it.
    const query = { isDeleted: { $ne: true }, status: POST_STATUSES.PUBLISHED }

    if (req.query.category && isValid(POST_CATEGORIES, req.query.category)) {
      query.category = req.query.category
    }

    const [count, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .select(`${PUBLIC_FIELDS} author`)
        .populate("author", "name")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1)),
    ])

    res.json({
      posts,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message })
  }
}

// @desc    Read one published post by its slug
// @route   GET /api/posts/public/:slug
// @access  Public
export const getPublishedPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: asText(req.params.slug).toLowerCase(),
      isDeleted: { $ne: true },
      status: POST_STATUSES.PUBLISHED,
    })
      .select(`${PUBLIC_FIELDS} author`)
      .populate("author", "name")

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    res.json(post)
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error: error.message })
  }
}
