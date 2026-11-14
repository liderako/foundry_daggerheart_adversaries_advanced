import { CATEGORIES_CHANGED, CATEGORIES_SETTING, DEFAULT_CATEGORY_ICON, KNOWN_PSYCHIC_IDS, KNOWN_PSYCHIC_NAMES, MODULE_ID, PSYCHIC_CATEGORY, SEED_CATEGORIES } from "./constants.js";

const FLAG = `flags.${MODULE_ID}.category`;

export function registerCategorySettings() {
	game.settings.register(MODULE_ID, CATEGORIES_SETTING, {
		scope: "world",
		config: false,
		type: Array,
		default: [],
		onChange: () => Hooks.callAll(CATEGORIES_CHANGED)
	});
}

/** A category id: letters and digits only, so it can be part of a tab id and a CSS class. */
export function cleanId(id) {
	return String(id ?? "").replace(/[^a-zA-Z0-9]/g, "");
}

/** The GM's feature categories, in tab order: [{ id, name, icon }]. */
export function getCategories() {
	const stored = game.settings.get(MODULE_ID, CATEGORIES_SETTING);
	const seen = new Set();
	const result = [];
	for (const entry of Array.isArray(stored) ? stored : []) {
		const id = cleanId(entry?.id);
		const name = String(entry?.name ?? "").trim();
		if (!id || !name || seen.has(id)) {
			continue;
		}
		seen.add(id);
		result.push({ id, name, icon: String(entry.icon ?? "").trim() || DEFAULT_CATEGORY_ICON });
	}
	return result;
}

export function saveCategories(categories) {
	return game.settings.set(MODULE_ID, CATEGORIES_SETTING, categories);
}

/** The sheet tab (and part) id of a category. */
export function categoryTab(id) {
	return `mistAdvCat${id}`;
}

/** The category id of a feature item, or null for an ordinary feature (also when its category was deleted). */
export function getCategory(item) {
	const category = item?.getFlag?.(MODULE_ID, "category");
	return category && getCategories().some(entry => entry.id === category) ? category : null;
}

/** Puts a feature in a category; null takes it back to the Features tab. */
export function setCategory(item, category) {
	return category ? item.setFlag(MODULE_ID, "category", category) : item.unsetFlag(MODULE_ID, "category");
}

/** One of the known Valarian psychic abilities, by name or by the compendium entry it was made from. */
export function isKnownPsychic(source) {
	if (KNOWN_PSYCHIC_NAMES.includes(source.name?.trim())) {
		return true;
	}
	const origin = source._stats?.compendiumSource ?? source.flags?.core?.sourceId ?? "";
	return KNOWN_PSYCHIC_IDS.some(id => origin.endsWith(`.${id}`));
}

function hasPsychicCategory() {
	return getCategories().some(entry => entry.id === PSYCHIC_CATEGORY);
}

/** A known psychic ability dropped on an adversary comes in already in the psychic category. */
export function registerAutoMark() {
	Hooks.on("preCreateItem", (item, data) => {
		if (item.type !== "feature" || item.parent?.type !== "adversary") {
			return;
		}
		if (foundry.utils.hasProperty(data, FLAG) || !hasPsychicCategory()) {
			return;
		}
		if (isKnownPsychic(data)) {
			item.updateSource({ [FLAG]: PSYCHIC_CATEGORY });
		}
	});
}

/** Adversaries of the world: world actors and the unlinked tokens of every scene. */
function allAdversaries() {
	const actors = [...game.actors.filter(actor => actor.type === "adversary")];
	for (const scene of game.scenes) {
		for (const token of scene.tokens) {
			if (!token.actorLink && token.actor?.type === "adversary") {
				actors.push(token.actor);
			}
		}
	}
	return actors;
}

/**
 * The categories set on features in the Item compendiums: by compendium UUID, and by name when every compendium
 * feature of that name has the same category.
 */
async function compendiumCategories() {
	const known = new Set(getCategories().map(category => category.id));
	const byUuid = new Map();
	const byName = new Map();
	for (const pack of game.packs.filter(pack => pack.documentName === "Item")) {
		const index = await pack.getIndex({ fields: [FLAG, "type"] });
		for (const entry of index) {
			const category = foundry.utils.getProperty(entry, FLAG);
			if (entry.type !== "feature" || !known.has(category)) {
				continue;
			}
			byUuid.set(`Compendium.${pack.collection}.Item.${entry._id}`, category);
			const name = entry.name?.trim();
			if (name) {
				byName.set(name, byName.has(name) && byName.get(name) !== category ? null : category);
			}
		}
	}
	return { byUuid, byName };
}

/**
 * Gives the features of every adversary (world actors and unlinked scene tokens) the category their compendium
 * entry has — found by the compendium the feature was made from, otherwise by name. Features that already have a
 * category keep it. Returns the number of features changed.
 */
export async function syncFromCompendiums() {
	const { byUuid, byName } = await compendiumCategories();
	if (!byUuid.size) {
		return 0;
	}
	let changed = 0;
	for (const actor of allAdversaries()) {
		const updates = [];
		for (const item of actor.items) {
			if (item.type !== "feature" || getCategory(item)) {
				continue;
			}
			const source = item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? "";
			const category = byUuid.get(source) ?? byName.get(item.name?.trim()) ?? null;
			if (category) {
				updates.push({ _id: item.id, [FLAG]: category });
			}
		}
		if (updates.length) {
			await actor.updateEmbeddedDocuments("Item", updates);
			changed += updates.length;
		}
	}
	console.log(`${MODULE_ID} | Categories from compendiums: ${changed} adversary feature(s) updated.`);
	return changed;
}

/**
 * GM, on ready. 1: the known psychic abilities already on adversaries go to the psychic category. 2: a world without
 * categories gets Психічні здібності and Соціальні здібності (ids "psychic" and "social", which step 1 already uses).
 * 3–4: adversary features take the category of their compendium entry.
 */
export async function migrate() {
	const version = game.settings.get(MODULE_ID, "migrationVersion");
	if (version < 2) {
		if (!getCategories().length) {
			await saveCategories(SEED_CATEGORIES);
		}
	}
	if (version < 1) {
		let marked = 0;
		for (const actor of allAdversaries()) {
			const updates = actor.items
				.filter(item => item.type === "feature" && !item.getFlag(MODULE_ID, "category") && isKnownPsychic(item))
				.map(item => ({ _id: item.id, [FLAG]: PSYCHIC_CATEGORY }));
			if (updates.length) {
				await actor.updateEmbeddedDocuments("Item", updates);
				marked += updates.length;
			}
		}
		if (marked) {
			console.log(`${MODULE_ID} | Put ${marked} known psychic feature(s) of adversaries in the psychic category.`);
		}
	}
	// 4: again, after more social features were tagged in the compendiums (2026-11-14).
	if (version < 4) {
		await syncFromCompendiums();
		await game.settings.set(MODULE_ID, "migrationVersion", 4);
	}
}
