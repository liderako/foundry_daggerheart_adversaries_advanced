import { MODULE_ID } from "./constants.js";
import { getCategories, getCategory } from "./categories.js";

const FIELD = `flags.${MODULE_ID}.category`;

/**
 * A Category select in the General block of the feature sheet's Settings tab. It is a plain form field
 * (flags.<module>.category), so the sheet saves it like its own fields; an empty value means no category.
 */
export function registerFeatureSheetField() {
	Hooks.on("renderFeatureSheet", (sheet, element) => {
		const root = element instanceof HTMLElement ? element : element?.[0];
		const fieldset = root?.querySelector('.tab[data-tab="settings"] fieldset');
		if (!fieldset || fieldset.querySelector(".mist-adv-category-field")) {
			return;
		}
		const categories = getCategories();
		if (!categories.length) {
			return;
		}
		const current = getCategory(sheet.document) ?? "";

		const label = document.createElement("span");
		label.className = "mist-adv-category-label";
		label.textContent = game.i18n.localize("MIST_ADV.Category.Label");

		const wrapper = document.createElement("span");
		wrapper.className = "mist-adv-category-field";
		const select = document.createElement("select");
		select.name = FIELD;
		select.disabled = !sheet.isEditable;
		const options = [{ id: "", name: game.i18n.localize("MIST_ADV.Category.None") }, ...categories];
		for (const entry of options) {
			const option = document.createElement("option");
			option.value = entry.id;
			option.textContent = entry.name;
			option.selected = entry.id === current;
			select.append(option);
		}
		wrapper.append(select);

		// Right after the Feature Form row, so it sits with the other general settings.
		const formRow = fieldset.querySelector('[name="system.featureForm"]')?.closest("span");
		if (formRow) {
			formRow.after(label, wrapper);
		} else {
			fieldset.append(label, wrapper);
		}
	});
}
