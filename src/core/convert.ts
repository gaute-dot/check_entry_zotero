import { ITEM_TYPES, baseField, fieldForBase } from "./schema";
import type { ItemData } from "./types";

/**
 * The item as it would look after Zotero changes its type: fields move via
 * their base fields (Document "publisher" -> Report "institution"), fields
 * the new type lacks are dropped, and creator types the new type does not
 * have become its primary creator type.
 */
export function convertItem(item: ItemData, itemType: string): ItemData {
	const fields: Record<string, string> = {};
	for (const [field, value] of Object.entries(item.fields)) {
		const target = fieldForBase(itemType, baseField(item.itemType, field));
		if (target && !(target in fields)) fields[target] = value;
	}
	const creatorTypes = ITEM_TYPES[itemType]?.creators ?? ["author"];
	const creators = item.creators.map((c) => (creatorTypes.includes(c.creatorType) ? c : { ...c, creatorType: creatorTypes[0] }));
	return { itemType, fields, creators };
}
