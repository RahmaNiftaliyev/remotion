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
	{
		type: 'item',
		id: 'label-vs-value',
		label: 'VisibleText',
		value: 'DifferentValue',
		onClick: () => undefined,
		keyHint: null,
		leftItem: null,
		subMenu: null,
		quickSwitcherLabel: null,
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

test('matches visible label when quickSwitcherLabel differs', () => {
	expect(findTypeaheadMenuItem({query: 'custom', values})).toBe(null);
	expect(findTypeaheadMenuItem({query: 'not', values})).toBe('custom');
});

test('does not match on value when label is a different string', () => {
	expect(findTypeaheadMenuItem({query: 'diff', values})).toBe(null);
	expect(findTypeaheadMenuItem({query: 'vis', values})).toBe('label-vs-value');
});

test('returns null for empty or unmatched query', () => {
	expect(findTypeaheadMenuItem({query: ' ', values})).toBe(null);
	expect(findTypeaheadMenuItem({query: 'zzz', values})).toBe(null);
});
