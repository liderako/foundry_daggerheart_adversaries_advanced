import { MODULE_ID, PROFILE_TAB } from "./constants.js";
import { categoryTab, getCategories, getCategory } from "./categories.js";
import { addOrganization, prepareProfileContext, removeOrganization } from "./profile.js";

const CATEGORY_TEMPLATE = `modules/${MODULE_ID}/templates/category-tab.hbs`;
const PROFILE_TEMPLATE = `modules/${MODULE_ID}/templates/profile-tab.hbs`;
export const TEMPLATES = [CATEGORY_TEMPLATE, PROFILE_TEMPLATE, `modules/${MODULE_ID}/templates/categories.hbs`];

/** The patched sheet class and its tabs/parts as they were before this module added any. */
let sheetClass = null;
let baseTabs = null;
let baseParts = null;

/** The Daggerheart adversary sheet class, however this version of the system exposes it. */
function adversarySheetClass() {
	const registered = Object.values(CONFIG.Actor.sheetClasses?.adversary ?? {}).find(entry => entry.id === "daggerheart.AdversarySheet" || entry.cls?.name === "AdversarySheet");
	return registered?.cls ?? game.system.api?.applications?.sheets?.actors?.Adversary ?? null;
}

/** Inserts the entries before the part/tab with this id (or at the end). */
function insertBefore(entries, beforeId, additions) {
	const result = [];
	let inserted = false;
	for (const [id, value] of entries) {
		if (id === beforeId && !inserted) {
			result.push(...additions);
			inserted = true;
		}
		result.push([id, value]);
	}
	if (!inserted) {
		result.push(...additions);
	}
	return result;
}

/** The category of a part/tab id, if it is one of ours. */
function categoryOfTab(partId) {
	return getCategories().find(category => categoryTab(category.id) === partId) ?? null;
}

/**
 * (Re)builds the sheet's tabs: one per GM category right after Features (before Effects), and Profile before Notes.
 * Called on setup and whenever the categories change.
 */
export function applyTabs() {
	if (!sheetClass) {
		return;
	}
	const categories = getCategories();
	const primary = baseTabs.primary;
	let tabs = primary.tabs.map(tab => [tab.id, tab]);
	tabs = insertBefore(tabs, "effects", categories.map(category => [categoryTab(category.id), { id: categoryTab(category.id), label: category.name }]));
	tabs = insertBefore(tabs, "notes", [[PROFILE_TAB, { id: PROFILE_TAB, label: "MIST_ADV.Tabs.Profile" }]]);
	sheetClass.TABS = { ...baseTabs, primary: { ...primary, tabs: tabs.map(([, tab]) => tab) } };

	let parts = Object.entries(baseParts);
	parts = insertBefore(parts, "effects", categories.map(category => [categoryTab(category.id), { id: categoryTab(category.id), template: CATEGORY_TEMPLATE, scrollable: [".feature-section"] }]));
	parts = insertBefore(parts, "notes", [[PROFILE_TAB, { id: PROFILE_TAB, template: PROFILE_TEMPLATE, scrollable: [".mist-adv-profile"] }]]);
	sheetClass.PARTS = Object.fromEntries(parts);
}

/** Open adversary sheets are rendered again with the new tabs; one left on a deleted tab goes back to Features. */
export function refreshSheets() {
	if (!sheetClass) {
		return;
	}
	const tabIds = sheetClass.TABS.primary.tabs.map(tab => tab.id);
	for (const app of foundry.applications.instances.values()) {
		if (app instanceof sheetClass && app.rendered) {
			if (app.tabGroups?.primary && !tabIds.includes(app.tabGroups.primary)) {
				app.tabGroups.primary = "features";
			}
			app.render({ force: true });
		}
	}
}

/**
 * Adds the category tabs and Profile to the Daggerheart adversary sheet. Features in a category are taken off the
 * Features tab and shown on their category's tab. Runs once, on setup, before any sheet opens.
 */
export function patchAdversarySheet() {
	const cls = adversarySheetClass();
	if (!cls) {
		console.warn(`${MODULE_ID} | Daggerheart adversary sheet not found, the tabs are not added.`);
		return false;
	}
	if (sheetClass) {
		return true;
	}
	sheetClass = cls;
	baseTabs = foundry.utils.deepClone(cls.TABS);
	baseParts = { ...cls.PARTS };
	applyTabs();

	const preparePartContext = cls.prototype._preparePartContext;
	cls.prototype._preparePartContext = async function (partId, context, options) {
		const result = (await preparePartContext.call(this, partId, context, options)) ?? context;
		const category = categoryOfTab(partId);
		if (partId === "features") {
			result.features = (result.features ?? []).filter(item => !getCategory(item));
			result.evolutionFeatures = (result.evolutionFeatures ?? []).filter(item => !getCategory(item));
		} else if (category) {
			const tab = categoryTab(category.id);
			result.mistCategory = {
				tab,
				label: category.name,
				cssClass: result.tabs?.[tab]?.cssClass ?? "",
				features: categoryFeatures(this.document, category.id)
			};
		} else if (partId === PROFILE_TAB) {
			result.mistProfile = prepareProfileContext(this.document, this.isEditable);
		}
		return result;
	};

	const prepareTabs = cls.prototype._prepareTabs;
	// A category tab is shown only while the adversary has a feature of that category. A sheet left on a tab that
	// just emptied (its last feature moved out) goes back to Features.
	cls.prototype._prepareTabs = function (group) {
		const hidden = group === "primary"
			? getCategories().filter(category => !categoryFeatures(this.document, category.id).length).map(category => categoryTab(category.id))
			: [];
		if (hidden.includes(this.tabGroups?.primary)) {
			this.tabGroups.primary = "features";
		}
		const result = prepareTabs.call(this, group);
		for (const tabId of hidden) {
			delete result[tabId];
		}
		return result;
	};

	const attachPartListeners = cls.prototype._attachPartListeners;
	cls.prototype._attachPartListeners = function (partId, htmlElement, options) {
		attachPartListeners.call(this, partId, htmlElement, options);
		if (partId === PROFILE_TAB) {
			activateProfileListeners(this, htmlElement);
		}
	};
	return true;
}

/** The adversary's features of one category, in the sheet's order. */
function categoryFeatures(actor, categoryId) {
	return actor.items.filter(item => item.type === "feature" && getCategory(item) === categoryId).sort((a, b) => a.sort - b.sort);
}

function activateProfileListeners(sheet, root) {
	const actor = sheet.document;
	for (const link of root.querySelectorAll("[data-mist-adv-open]")) {
		link.addEventListener("click", async event => {
			event.preventDefault();
			event.stopPropagation();
			const doc = await fromUuid(link.dataset.mistAdvOpen);
			doc?.sheet?.render(true);
		});
	}
	if (!sheet.isEditable) {
		return;
	}
	const select = root.querySelector("[data-mist-adv-add-org]");
	select?.addEventListener("change", event => {
		event.stopPropagation();
		if (select.value) {
			addOrganization(actor, select.value);
		}
	});
	for (const button of root.querySelectorAll("[data-mist-adv-remove-org]")) {
		button.addEventListener("click", event => {
			event.preventDefault();
			event.stopPropagation();
			removeOrganization(actor, button.dataset.mistAdvRemoveOrg);
		});
	}
}
