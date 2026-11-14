# The Mist Age - Adversaries Advanced

A Foundry VTT module for the Daggerheart system that adds tabs to the adversary sheet:

- **Feature categories** — the GM makes any number of categories in the module settings (name, Font Awesome icon, order); each one is a tab of the adversary sheet right after Features, shown only when the adversary has a feature of that category. A feature is put in a category (or back in Features) with the Category select in its Settings tab. Known Valarian psychic abilities of *The Mist Age - HB Items* go to the category with id `psychic` automatically, when the world has one. A category set on a compendium feature is copied to the adversaries that have that feature (by the compendium it came from, otherwise by name): once on update, and any time with the From compendiums button of the category window. A world with no categories gets two once: Психічні здібності (`psychic`) and Соціальні здібності (`social`).
- **Profile** — the adversary's religion (free text, with suggestions from the religions of *The Mist Age - Geopolitics* organizations) and the organizations it belongs to (picked from the Geopolitics organization and headquarters actors).

Data lives in flags: feature `flags["mist-age-adversaries-advanced"].category` (category id); categories: world setting `mist-age-adversaries-advanced.categories` = `[{ id, name, icon }]`, actor `flags["mist-age-adversaries-advanced"].religion` / `.organizations` (actor UUIDs). A small API is at `game.modules.get("mist-age-adversaries-advanced").api`.

Releases: push a tag `vX.Y.Z`; the workflow builds `module.json` and `module.zip`.
