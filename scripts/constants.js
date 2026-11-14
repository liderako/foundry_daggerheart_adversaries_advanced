export const MODULE_ID = "mist-age-adversaries-advanced";

export const PROFILE_TAB = "mistAdvProfile";

/** Settings key of the GM's feature categories, and the hook called when they change. */
export const CATEGORIES_SETTING = "categories";
export const CATEGORIES_CHANGED = `${MODULE_ID}.categoriesChanged`;
export const DEFAULT_CATEGORY_ICON = "fa-solid fa-tag";

/** The category the known Valarian psychic abilities are put in, when the world has it. */
export const PSYCHIC_CATEGORY = "psychic";

/** Categories created once in a world that has none yet (The Mist Age world). */
export const SEED_CATEGORIES = [
	{ id: PSYCHIC_CATEGORY, name: "Психічні здібності", icon: "fa-solid fa-brain" },
	{ id: "social", name: "Соціальні здібності", icon: "fa-solid fa-comments" }
];

/** Actor types of The Mist Age - Geopolitics that count as organizations. */
export const ORGANIZATION_TYPES = ["mist-age-organization.organization", "mist-age-organization.headquarters"];

/**
 * The Valarian psychic abilities (mist-age-hb-items, Adversaries Features). A feature with one of these names, or made
 * from one of these compendium entries, is put in the psychic category (if the world has one) when it lands on an adversary.
 */
export const KNOWN_PSYCHIC_NAMES = ["Психочуття", "Psychic-body", "Психо-тіло", "Ментальний щит", "Психокінез", "Емоційний Диригент", "Телепатія"];
export const KNOWN_PSYCHIC_IDS = ["Y601SFZjz8FbQzGc", "tstHeQj0skMlXXnz", "GYSZJWTzeUbGeiKB", "GRpJ9CDJgl03ygwW", "MRyuvz1W3LEQ1bqP", "wlgmfbAVmBsSPSKe"];
