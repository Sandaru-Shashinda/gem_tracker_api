export const GEM_STATUSES = {
  DRAFT_INTAKE: "DRAFT_INTAKE",
  TOOK_IN: "TOOK_IN",

  DRAFT_TEST_1: "DRAFT_TEST_1",
  READY_FOR_T1: "READY_FOR_T1",

  DRAFT_TEST_2: "DRAFT_TEST_2",
  READY_FOR_T2: "READY_FOR_T2",

  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  DRAFT_APPROVAL: "DRAFT_APPROVAL",
  SUBMITTED_FOR_REPORT: "SUBMITTED_FOR_REPORT",

  REQUEST_CHANGES: "REQUEST_CHANGES",

  DONE: "DONE",
}

export const ROLES = {
  ADMIN: "ADMIN",
  TESTER: "TESTER",
  HELPER: "HELPER",
}

/**
 * Which kind of certificate a gem was taken in for.
 *
 * Decided at intake, because it decides what the rest of the flow is even asking:
 * a default gem gets one of the lab's standard certificates and is asked which paper
 * sizes, a custom gem gets a card written for it and is asked none of that. Keeping
 * the two apart at the point of choice is what stops the configuration page offering
 * both and leaving somebody to work out which one this stone is actually getting.
 */
export const REPORT_MODES = {
  DEFAULT: "default",
  CUSTOM: "custom",
}

export const REPORT_TYPES = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
  VERBAL: "verbal",
}

export const CONTACT_STATUSES = {
  NEW: "NEW",
  READ: "READ",
  ARCHIVED: "ARCHIVED",
}

export const POST_STATUSES = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
}

// Slugs match the categories already linked from the grc.lk navigation.
export const POST_CATEGORIES = {
  BLOG: "blog",
  GRC_NEWS: "grc-news",
  UNCATEGORIZED: "uncategorized",
}
