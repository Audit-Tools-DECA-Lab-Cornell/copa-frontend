export const QUERY_KEY = ["playspace", "admin", "instruments"] as const;

/** Version list key - shared by server prefetch and client `useQuery`; nested under `QUERY_KEY` for invalidation. */
export const INSTRUMENTS_LIST_QUERY_KEY = [...QUERY_KEY, "list"] as const;

export const SCALE_KEY_OPTIONS = ["provision", "variety", "challenge", "sociability"] as const;
export const CONSTRUCT_OPTIONS = ["play_value", "usability"] as const;
export const MODE_OPTIONS = ["audit", "survey", "both"] as const;
export const QUESTION_TYPE_OPTIONS = ["scaled", "checklist"] as const;
export const INPUT_TYPE_OPTIONS = ["single_select", "multi_select", "auto_timestamp"] as const;
export const PAGE_KEY_OPTIONS = ["audit_info", "space_setup"] as const;
