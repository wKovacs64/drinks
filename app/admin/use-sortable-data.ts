import { useState } from 'react';

type SortState<T> = {
  key: keyof T & string;
  direction: 'asc' | 'desc';
};

function matchesFilter(value: unknown, filterLower: string): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase().includes(filterLower);
  }
  if (Array.isArray(value)) {
    return value.some((element) => matchesFilter(element, filterLower));
  }
  return false;
}

export function useSortableData<T extends Record<string, unknown>>(items: T[]) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortState<T> | null>(null);

  function handleSort(key: keyof T & string) {
    setSort((previous) => {
      if (previous?.key !== key) {
        return { key, direction: 'asc' };
      }
      if (previous.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      // Third click resets to unsorted
      return null;
    });
  }

  const filterLower = filter.toLowerCase();

  const filtered =
    filterLower === ''
      ? items
      : items.filter((item) => {
          for (const value of Object.values(item)) {
            if (matchesFilter(value, filterLower)) {
              return true;
            }
          }
          return false;
        });

  const processed =
    sort === null
      ? filtered
      : [...filtered].sort((itemA: T, itemB: T) => {
          const valueA = itemA[sort.key];
          const valueB = itemB[sort.key];

          const numA = Number(valueA);
          const numB = Number(valueB);
          const bothNumeric = typeof valueA === 'number' && typeof valueB === 'number';
          const bothCoercibleToNumber =
            !Number.isNaN(numA) && !Number.isNaN(numB) && valueA !== '' && valueB !== '';

          let comparison: number;

          if (bothNumeric || bothCoercibleToNumber) {
            comparison = numA - numB;
          } else {
            comparison = String(valueA ?? '').localeCompare(String(valueB ?? ''));
          }

          return sort.direction === 'asc' ? comparison : -comparison;
        });

  return { processed, filter, setFilter, sort, handleSort };
}
