/** Data passed from the main window to the review dialog. */
import type { Severity, Suggestion } from "../core/types";

export interface ShownMessage {
	id: string;
	args: Record<string, string | number>;
}

export interface ShownSuggestion extends Suggestion {
	fieldLabel: string;
	suggestedLabel: string;
	sourceLabel: string;
	shownReason: ShownMessage;
}

export interface DialogItem {
	itemID: number;
	title: string;
	itemTypeLabel: string;
	issues: { severity: Severity; fieldLabel: string; message: ShownMessage }[];
	suggestions: ShownSuggestion[];
}

export interface DialogIO {
	items: DialogItem[];
	apply(selection: { itemID: number; suggestions: Suggestion[] }[]): Promise<void>;
}
