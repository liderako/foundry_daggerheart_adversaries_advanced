import { MODULE_ID, ORGANIZATION_TYPES } from "./constants.js";

export function getReligion(actor) {
	return actor.getFlag(MODULE_ID, "religion") ?? "";
}

/** The organizations an adversary belongs to, as actor UUIDs. */
export function getOrganizations(actor) {
	const list = actor.getFlag(MODULE_ID, "organizations");
	return Array.isArray(list) ? list : [];
}

export function setOrganizations(actor, uuids) {
	return actor.setFlag(MODULE_ID, "organizations", [...new Set(uuids.filter(Boolean))]);
}

export function addOrganization(actor, uuid) {
	return setOrganizations(actor, [...getOrganizations(actor), uuid]);
}

export function removeOrganization(actor, uuid) {
	return setOrganizations(actor, getOrganizations(actor).filter(entry => entry !== uuid));
}

/** Organization actors of the world, sorted by name. */
export function organizationActors() {
	return game.actors.filter(actor => ORGANIZATION_TYPES.includes(actor.type)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Religion names to suggest: those of the Geopolitics organizations and those already given to adversaries. */
export function knownReligions() {
	const names = new Set();
	for (const actor of game.actors) {
		if (ORGANIZATION_TYPES.includes(actor.type)) {
			for (const religion of actor.system.religions ?? []) {
				if (religion.name?.trim()) {
					names.add(religion.name.trim());
				}
			}
		}
		const own = actor.getFlag(MODULE_ID, "religion")?.trim();
		if (own) {
			names.add(own);
		}
	}
	return [...names].sort((a, b) => a.localeCompare(b));
}

/** Render data of the Profile tab. */
export function prepareProfileContext(actor, editable) {
	const chosen = getOrganizations(actor);
	const organizations = chosen.map(uuid => {
		const doc = fromUuidSync(uuid);
		return {
			uuid,
			name: doc?.name ?? game.i18n.localize("MIST_ADV.Profile.Missing"),
			img: doc?.img ?? "icons/svg/mystery-man.svg",
			missing: !doc
		};
	});
	const available = organizationActors()
		.filter(org => !chosen.includes(org.uuid))
		.map(org => ({ uuid: org.uuid, name: org.name }));
	return {
		editable,
		religion: getReligion(actor),
		religionField: `flags.${MODULE_ID}.religion`,
		religions: knownReligions(),
		organizations,
		available,
		noOrganizations: !organizationActors().length
	};
}
