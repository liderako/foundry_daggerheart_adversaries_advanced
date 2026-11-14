import { CATEGORIES_CHANGED, MODULE_ID } from "./constants.js";
import { getCategories, getCategory, migrate, registerAutoMark, registerCategorySettings, saveCategories, setCategory, syncFromCompendiums } from "./categories.js";
import { CategoryConfig, CategoryConfigMenu } from "./category-config.js";
import { registerFeatureSheetField } from "./feature-sheet.js";
import { addOrganization, getOrganizations, getReligion, removeOrganization, setOrganizations } from "./profile.js";
import { TEMPLATES, applyTabs, patchAdversarySheet, refreshSheets } from "./sheet.js";

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, "migrationVersion", {
		scope: "world",
		config: false,
		type: Number,
		default: 0
	});
	registerCategorySettings();
	game.settings.registerMenu(MODULE_ID, "categoriesMenu", {
		name: "MIST_ADV.Settings.Categories.Name",
		label: "MIST_ADV.Settings.Categories.Label",
		hint: "MIST_ADV.Settings.Categories.Hint",
		icon: "fa-solid fa-tags",
		type: CategoryConfigMenu,
		restricted: true
	});
	foundry.applications.handlebars.loadTemplates(TEMPLATES);
	registerAutoMark();
	registerFeatureSheetField();
});

Hooks.once("setup", () => {
	patchAdversarySheet();
});

Hooks.on(CATEGORIES_CHANGED, () => {
	applyTabs();
	refreshSheets();
});

Hooks.once("ready", async () => {
	if (game.users.activeGM?.isSelf) {
		await migrate();
	}
	game.modules.get(MODULE_ID).api = {
		/** The feature categories: [{ id, name, icon }], in tab order. */
		categories: () => getCategories(),
		/** GM: replaces the feature categories. */
		setCategories: categories => saveCategories(categories),
		/** GM: the category window. */
		editCategories: () => new CategoryConfig().render({ force: true }),
		/** GM: adversary features without a category take the one of their compendium entry. */
		syncFromCompendiums: () => syncFromCompendiums(),
		/** A feature's category id, or null for an ordinary feature. */
		category: item => getCategory(item),
		/** Puts a feature in a category (by id); null takes it back to Features. */
		setCategory: (item, category) => setCategory(item, category),
		/** An adversary's religion (free text). */
		religion: actor => getReligion(actor),
		/** Sets an adversary's religion; an empty string clears it. */
		setReligion: (actor, name) => actor.setFlag(MODULE_ID, "religion", name ?? ""),
		/** The organizations an adversary belongs to, as actor UUIDs. */
		organizations: actor => getOrganizations(actor),
		setOrganizations: (actor, uuids) => setOrganizations(actor, uuids),
		addOrganization: (actor, uuid) => addOrganization(actor, uuid),
		removeOrganization: (actor, uuid) => removeOrganization(actor, uuid)
	};
});
