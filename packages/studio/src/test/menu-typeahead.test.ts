import {expect, test} from 'bun:test';
import type {ComboboxValue} from '../components/NewComposition/ComboBox';
import {findTypeaheadMenuItem} from '../components/NewComposition/menu-typeahead';

const values: ComboboxValue[] = [
	{
		type: 'divider',
		id: 'divider-1',
	},
	{
		type: 'item',
		id: 'apple',
		label: 'Apple',
		value: 'apple',
		onClick: () => undefined,
		keyHint: null,
		leftItem: null,
		subMenu: null,
		quickSwitcherLabel: null,
	},
	{
		type: 'item',
		id: 'banana-disabled',
		label: 'Banana',
		value: 'banana',
		onClick: () => undefined,
		keyHint: null,
		leftItem: null,
		subMenu: null,
		quickSwitcherLabel: null,
		disabled: true,
	},
	{
		type: 'item',
		id: 'custom',
		label: 'Not used',
		value: 'fallback',
		onClick: () => undefined,
		keyHint: null,
		leftItem: null,
		subMenu: null,
		quickSwitcherLabel: 'Custom Label',
	},
];

test('finds item by label prefix', () => {
	expect(findTypeaheadMenuItem({query: 'ap', values})).toBe('apple');
});

test('matches case-insensitive', () => {
	expect(findTypeaheadMenuItem({query: 'AP', values})).toBe('apple');
});

test('ignores divider and disabled items', () => {
	expect(findTypeaheadMenuItem({query: 'ban', values})).toBe(null);
});

test('prefers quickSwitcherLabel if available', () => {
	expect(findTypeaheadMenuItem({query: 'custom', values})).toBe('custom');
});

test('returns null for empty or unmatched query', () => {
	expect(findTypeaheadMenuItem({query: ' ', values})).toBe(null);
	expect(findTypeaheadMenuItem({query: 'zzz', values})).toBe(null);
});
