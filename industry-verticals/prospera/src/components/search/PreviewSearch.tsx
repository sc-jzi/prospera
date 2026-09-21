'use client';

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSuggest } from '@sitecore-content-sdk/nextjs/search';
import type { SearchDocument } from '@sitecore-content-sdk/search';
import { DEFAULT_IMG_URL } from '../../_data/customizations';

const DEBOUNCE_MS = 400;
const RESULTS_LIMIT = 6;

type FieldsMapping = {
  title?: string;
  description?: string;
  images?: string;
  link?: string;
};

type SearchFieldConfig = {
  searchIndex?: string;
  fieldsMapping?: FieldsMapping;
};

export type PreviewSearchProps = {
  params?: { [key: string]: string };
  fields?: {
    search?: {
      value?: string;
    };
  };
  /** Search index ID. Falls back to fields.search JSON or NEXT_PUBLIC_SEARCH_INDEX_ID. */
  searchIndexId?: string;
  isOpen?: boolean;
  setIsSearchOpen?: Dispatch<SetStateAction<boolean>>;
};

type PreviewResult = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
};

const EMPTY_SEARCH_FIELD: SearchFieldConfig = {
  searchIndex: '',
  fieldsMapping: {},
};

const parseSearchField = (value?: string | null): SearchFieldConfig => {
  const normalized = value?.trim();
  if (!normalized) {
    return EMPTY_SEARCH_FIELD;
  }

  try {
    return JSON.parse(normalized) as SearchFieldConfig;
  } catch (error) {
    console.warn('PreviewSearch: invalid search field JSON. Using defaults.', error);
    return EMPTY_SEARCH_FIELD;
  }
};

const getStringField = (doc: SearchDocument, keys: Array<string | undefined>): string => {
  for (const key of keys) {
    if (!key) continue;
    const value = doc[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const mapPreviewResult = (doc: SearchDocument, mapping: FieldsMapping, index: number): PreviewResult => {
  const title = getStringField(doc, [
    mapping.title,
    'title',
    'name',
    'Title',
    'Name',
    'ProductName',
  ]);
  const description = getStringField(doc, [
    mapping.description,
    'description',
    'summary',
    'Description',
    'Summary',
    'excerpt',
  ]);
  const imageUrl =
    getStringField(doc, [mapping.images, 'image_url', 'image', 'Image', 'imageUrl', 'thumbnail']) ||
    DEFAULT_IMG_URL;
  const url = getStringField(doc, [mapping.link, 'url', 'link', 'Link', 'sc_url', 'path']);
  const id =
    getStringField(doc, ['id', 'sc_id', 'sc_item_id', 'item_id']) || `${title || 'result'}-${index}`;

  return { id, title, description, imageUrl, url };
};

const useDebouncedValue = (value: string, delay = DEBOUNCE_MS): string => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export const Default = (props: PreviewSearchProps) => {
  const { params, fields, searchIndexId: searchIndexIdProp, setIsSearchOpen } = props;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { searchIndex: fieldSearchIndex, fieldsMapping = {} } = useMemo(
    () => parseSearchField(fields?.search?.value),
    [fields?.search?.value]
  );

  const searchIndexId =
    searchIndexIdProp?.trim() ||
    fieldSearchIndex?.trim() ||
    process.env.NEXT_PUBLIC_SEARCH_INDEX_ID?.trim() ||
    '';

  const debouncedQuery = useDebouncedValue(inputValue);
  const hasTypedQuery = inputValue.trim().length > 0;
  const hasDebouncedQuery = debouncedQuery.trim().length > 0;

  // const { previewResults, isLoading, isSuccess, isError } = useSuggest<SearchDocument>({
  //   searchIndexId,
  //   query: debouncedQuery,
  //   enabled: Boolean(searchIndexId) && hasDebouncedQuery,
  //   keepPreviousData: true,
  // });
  console.log(`searching for: ${debouncedQuery}`);

  const {
    querySuggestions,
    previewResults,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useSuggest({
    searchIndexId: searchIndexId,
    query: debouncedQuery,
  });

  const results = useMemo(
    () =>
      previewResults
        .slice(0, RESULTS_LIMIT)
        .map((doc, index) => mapPreviewResult(doc, fieldsMapping, index)),
    [previewResults, fieldsMapping]
  );

  const showResultsPanel = hasTypedQuery;
  const showNoResults = !isLoading && isSuccess && hasDebouncedQuery && results.length === 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []);

  const closeSearch = useCallback(() => {
    setInputValue('');
    setIsSearchOpen?.(false);
  }, [setIsSearchOpen]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = inputValue.trim();
      if (!query) return;

      closeSearch();
      router.push(`/search?q=${encodeURIComponent(query)}`);
    },
    [closeSearch, inputValue, router]
  );

  const handleResultNavigate = useCallback(
    (url: string) => {
      closeSearch();
      if (url) {
        router.push(url);
      }
    },
    [closeSearch, router]
  );

  const id = params?.RenderingIdentifier;
  const sxaStyles = params?.styles?.trimEnd() ?? '';

  if (!searchIndexId) {
    return (
      <div className={`component preview-search ${sxaStyles}`} id={id || undefined}>
        <p className="text-sm text-gray-600">
          Preview search is not configured. Set a search index via the component datasource or{' '}
          <code>NEXT_PUBLIC_SEARCH_INDEX_ID</code>.
        </p>
      </div>
    );
  }

  return (
    <div className={`component preview-search w-full ${sxaStyles}`} id={id || undefined}>
      <form onSubmit={handleSubmit} className="w-full" role="search">
        <input
          ref={inputRef}
          name="query"
          type="search"
          value={inputValue}
          onChange={handleChange}
          autoComplete="off"
          placeholder="Ask me anything"
          aria-controls={showResultsPanel ? 'preview-search-results' : undefined}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 placeholder:text-gray-400 focus:border-[#004bdf] focus:outline-none focus:ring-2 focus:ring-[#004bdf]/ring-offset-0"
        />
      </form>

      {showResultsPanel && (
        <div
          id="preview-search-results"
          className="mt-4 rounded-md border border-gray-200 bg-white p-3"
          aria-busy={isLoading}
          aria-live="polite"
        >
          {isError && (
            <div className="flex items-center justify-center p-8 text-center text-sm text-red-600">
              Something went wrong. Try again.
            </div>
          )}

          {!isError && showNoResults && (
            <div className="flex items-center justify-center p-8 text-center text-sm text-gray-600">
              No results found.
            </div>
          )}

          {!isError && !showNoResults && (
            <ul
              className={`m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:grid-cols-3 ${
                isLoading && results.length > 0 ? 'opacity-60' : ''
              }`}
            >
              {isLoading && results.length === 0 &&
                Array.from({ length: RESULTS_LIMIT }).map((_, index) => (
                  <li
                    key={`skeleton-${index}`}
                    className="min-h-[10rem] animate-pulse rounded-md border border-gray-100 bg-gray-50"
                    aria-hidden="true"
                  />
                ))}

              {results.map((result) => (
                <li key={result.id} className="m-0">
                  <a
                    href={result.url || '#'}
                    onClick={(event) => {
                      event.preventDefault();
                      handleResultNavigate(result.url);
                    }}
                    className="flex h-full w-full cursor-pointer flex-col items-center rounded-md border border-gray-200 bg-white p-3 text-center no-underline shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#004bdf]"
                  >
                    <div className="relative mb-3 flex h-24 w-full items-center justify-center overflow-hidden">
                      <Image
                        src={result.imageUrl}
                        alt={result.title || 'Search result'}
                        width={200}
                        height={100}
                        className="block h-auto max-h-full w-auto max-w-full object-contain"
                        unoptimized
                      />
                    </div>
                    {result.title && (
                      <span className="mb-1 line-clamp-2 text-sm font-bold text-black underline">
                        {result.title}
                      </span>
                    )}
                    {result.description && (
                      <span className="line-clamp-2 text-xs text-gray-600">{result.description}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Default;
