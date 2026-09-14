import express from "express"
import {
  getPosts,
  createPost,
  updatePost,
  updatePostStatus,
  deletePost,
  getPublishedPosts,
  getPublishedPostBySlug,
} from "../controllers/postController.js"
import { protect, authorize } from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const postRoutes = express.Router()

// Public — what grc.lk reads. Declared before "/:id" so "public" is never
// mistaken for an id.
postRoutes.get("/public", getPublishedPosts)
postRoutes.get("/public/:slug", getPublishedPostBySlug)

postRoutes
  .route("/")
  .get(protect, getPosts)
  .post(protect, upload.single("coverImage"), createPost)

// Only an ADMIN moves a post between DRAFT / PUBLISHED / ARCHIVED. Editing is
// checked per post inside the controller, since an author may edit their own draft.
postRoutes.put("/:id/status", protect, authorize("ADMIN"), updatePostStatus)

postRoutes
  .route("/:id")
  .put(protect, upload.single("coverImage"), updatePost)
  .delete(protect, deletePost)

export default postRoutes
