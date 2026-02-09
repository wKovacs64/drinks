import { useState } from 'react';

export type SortState<T> = {
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
      : [...filtered].sort((a: T, b: T) => {
          const aValue = a[sort.key];
          const bValue = b[sort.key];

          const aNum = Number(aValue);
          const bNum = Number(bValue);
          const bothNumeric = typeof aValue === 'number' && typeof bValue === 'number';
          const bothCoercibleToNumber =
            !Number.isNaN(aNum) && !Number.isNaN(bNum) && aValue !== '' && bValue !== '';

          let comparison: number;

          if (bothNumeric || bothCoercibleToNumber) {
            comparison = aNum - bNum;
          } else {
            comparison = String(aValue ?? '').localeCompare(String(bValue ?? ''));
          }

          return sort.direction === 'asc' ? comparison : -comparison;
        });

  return { processed, filter, setFilter, sort, handleSort };
}
