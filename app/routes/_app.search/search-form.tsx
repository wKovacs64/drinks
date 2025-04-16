import * as React from 'react';
import { Form } from 'react-router';
import { Icon } from '~/icons/icon';

export function SearchForm({
  initialSearchTerm,
}: {
  initialSearchTerm?: HTMLInputElement['value'];
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      if (!inputRef.current.value && initialSearchTerm) {
        inputRef.current.value = initialSearchTerm;
      }
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
        className="drinks-focusable group p-2"
      >
        <Icon
          name="algolia"
          aria-label="Search by Algolia"
          className="h-8 w-8 text-[#003dff] opacity-90 group-hover:opacity-100 group-focus-visible:opacity-100"
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
        className="drinks-focusable mx-[3px] w-full p-4 placeholder:text-slate-500"
      />
      <button
        className="drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon px-2"
        title="Search"
        type="submit"
      >
        <span className="sr-only">Search</span>
        <Icon name="ic-baseline-chevron-right" aria-hidden size={32} />
      </button>
    </Form>
  );
}
