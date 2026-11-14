import { DEFAULT_CATEGORY_ICON, MODULE_ID } from "./constants.js";
import { cleanId, getCategories, saveCategories, syncFromCompendiums } from "./categories.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM: the feature categories of adversaries — each one is a tab of the adversary sheet. Name, Font Awesome icon,
 * order; deleting a category sends its features back to the Features tab.
 */
export class CategoryConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: `${MODULE_ID}-categories`,
		tag: "form",
		classes: ["mist-adv-categories"],
		window: { title: "MIST_ADV.Categories.Title", icon: "fa-solid fa-tags", resizable: true },
		position: { width: 520, height: "auto" },
		form: { handler: CategoryConfig.#onSubmit, submitOnChange: false, closeOnSubmit: true },
		actions: {
			add: CategoryConfig.#onAdd,
			remove: CategoryConfig.#onRemove,
			up: CategoryConfig.#onUp,
			down: CategoryConfig.#onDown,
			sync: CategoryConfig.#onSync
		}
	};

	static PARTS = {
		body: { template: `modules/${MODULE_ID}/templates/categories.hbs` }
	};

	/** The rows being edited, kept between re-renders until saved. */
	#rows = null;

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		this.#rows ??= getCategories().map(category => ({ ...category }));
		context.rows = this.#rows.map((row, index) => ({ ...row, index, first: index === 0, last: index === this.#rows.length - 1 }));
		context.defaultIcon = DEFAULT_CATEGORY_ICON;
		return context;
	}

	_onRender(context, options) {
		super._onRender(context, options);
		// The icon preview follows what is typed.
		for (const input of this.element.querySelectorAll("input[data-icon-input]")) {
			input.addEventListener("input", () => {
				const preview = input.closest(".mist-adv-category-row")?.querySelector(".preview i");
				if (preview) {
					preview.className = input.value.trim() || DEFAULT_CATEGORY_ICON;
				}
			});
		}
	}

	/** Takes what is typed in the form into the rows, so add/remove/move keep it. */
	#readForm() {
		for (const row of this.element.querySelectorAll(".mist-adv-category-row")) {
			const entry = this.#rows[Number(row.dataset.index)];
			if (entry) {
				entry.name = row.querySelector('[data-field="name"]').value;
				entry.icon = row.querySelector('[data-field="icon"]').value;
			}
		}
	}

	static #onAdd() {
		this.#readForm();
		this.#rows.push({ id: foundry.utils.randomID(), name: "", icon: DEFAULT_CATEGORY_ICON });
		this.render();
	}

	static #onRemove(event, target) {
		this.#readForm();
		this.#rows.splice(Number(target.closest("[data-index]").dataset.index), 1);
		this.render();
	}

	static #move(target, step) {
		this.#readForm();
		const index = Number(target.closest("[data-index]").dataset.index);
		const other = index + step;
		if (other < 0 || other >= this.#rows.length) {
			return;
		}
		[this.#rows[index], this.#rows[other]] = [this.#rows[other], this.#rows[index]];
		this.render();
	}

	static #onUp(event, target) {
		CategoryConfig.#move.call(this, target, -1);
	}

	static #onDown(event, target) {
		CategoryConfig.#move.call(this, target, 1);
	}

	static async #onSync(event, target) {
		target.disabled = true;
		try {
			const count = await syncFromCompendiums();
			ui.notifications.info(game.i18n.format("MIST_ADV.Categories.Synced", { count }));
		} finally {
			target.disabled = false;
		}
	}

	static async #onSubmit() {
		this.#readForm();
		const categories = this.#rows
			.map(row => ({ id: cleanId(row.id) || foundry.utils.randomID(), name: row.name.trim(), icon: row.icon.trim() || DEFAULT_CATEGORY_ICON }))
			.filter(row => row.name);
		await saveCategories(categories);
		this.#rows = null;
	}

	_onClose(options) {
		super._onClose(options);
		this.#rows = null;
	}
}

/** The settings menu entry: opens the category window. */
export class CategoryConfigMenu extends CategoryConfig {}
