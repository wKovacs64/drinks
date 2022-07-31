import * as React from 'react';
import { Form } from '@remix-run/react';
import { MdChevronRight } from 'react-icons/md';
import AlgoliaIcon from './algolia-icon';

export default function SearchForm({
  initialSearchTerm,
}: {
  initialSearchTerm?: HTMLInputElement['value'];
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = initialSearchTerm ?? '';
      inputRef.current.focus();
    }
  }, [initialSearchTerm]);

  React.useEffect(() => {
    const handleEsc = ({ key }: KeyboardEvent) => {
      if (key === 'Escape') {
        formRef.current?.reset();
        inputRef.current?.focus();
      }
    };

    window.addEventListener<'keydown'>('keydown', handleEsc);

    return () => {
      window.removeEventListener<'keydown'>('keydown', handleEsc);
    };
  }, []);

  return (
    <Form ref={formRef} method="get" className="mb-8 flex h-12 bg-white">
      <a
        href="https://www.algolia.com"
        title="Search by Algolia"
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="group p-2 transition-shadow ease-default focus-visible:outline-none focus-visible:ring"
      >
        <AlgoliaIcon
          aria-label="Search by Algolia"
          className="h-8 w-8 opacity-90 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </a>
      <input
        ref={inputRef}
        name="q"
        aria-label="Search Term"
        placeholder="Search all drinks..."
        type="text"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        // horizontal margin to account for 3px box-shadow on focus
        className="mx-[3px] w-full p-4 transition-shadow ease-default placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring"
      />
      <button
        className="bg-maroon px-2 text-cream transition-shadow ease-default hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon focus-visible:outline-none focus-visible:ring"
        title="Search"
        type="submit"
      >
        <span className="sr-only">Search</span>
        <MdChevronRight aria-hidden size={32} />
      </button>
    </Form>
  );
}
