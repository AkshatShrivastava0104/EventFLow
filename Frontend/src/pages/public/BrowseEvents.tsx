import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { EventsAPI } from '../../lib/queries';
import { EventCard } from '../../components/shared/EventCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

const CATEGORIES = [
  'All',
  'Music',
  'Technology',
  'Art',
  'Sports',
  'Education',
  'Food & Drink',
  'Business',
  'Community',
];

const SORTS = [
  { value: 'soonest', label: 'Starting soonest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
];

export function BrowseEvents() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const perPage = 12;

  const q = params.get('q') || '';
  const category = params.get('category') || 'All';
  const city = params.get('city') || '';
  const priceFilter = params.get('price') || 'any';
  const sort = params.get('sort') || 'soonest';

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      'events',
      'all',
      {
        q,
        category,
        status: 'published',
      },
    ],
    queryFn: () =>
      EventsAPI.list({
        search: q || undefined,
        category:
          category !== 'All' ? category : undefined,
        status: 'published',
      }),
  });

  /*
   * EventsAPI.list() may return:
   *
   * 1. Event[]
   * 2. { data: Event[], meta: {...} }
   * 3. { events: Event[], pagination: {...} }
   *
   * Always normalize it to an array before doing
   * filter / sort / spread / map operations.
   */
  const eventItems = useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      const response = data as {
        data?: unknown;
        events?: unknown;
      };

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.events)) {
        return response.events;
      }
    }

    return [];
  }, [data]);

  const filtered = useMemo(() => {
    let items = [...eventItems];

    if (city) {
      items = items.filter((e) =>
        e.city
          ?.toLowerCase()
          .includes(city.toLowerCase())
      );
    }

    if (priceFilter === 'free') {
      items = items.filter(
        (e) => Number(e.price || 0) === 0
      );
    }

    if (priceFilter === 'paid') {
      items = items.filter(
        (e) => Number(e.price || 0) > 0
      );
    }

    switch (sort) {
      case 'price-asc':
        items = [...items].sort(
          (a, b) =>
            (a.price || 0) - (b.price || 0)
        );
        break;

      case 'price-desc':
        items = [...items].sort(
          (a, b) =>
            (b.price || 0) - (a.price || 0)
        );
        break;

      case 'popular':
        items = [...items].sort(
          (a, b) =>
            (b.registered_count || 0) -
            (a.registered_count || 0)
        );
        break;

      default:
        items = [...items].sort(
          (a, b) =>
            new Date(a.start_at).getTime() -
            new Date(b.start_at).getTime()
        );
        break;
    }

    return items;
  }, [
    eventItems,
    city,
    priceFilter,
    sort,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage)
  );

  const pageItems = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const updateParam = (
    key: string,
    value: string
  ) => {
    const p = new URLSearchParams(params);

    if (
      value &&
      value !== 'All' &&
      value !== 'any' &&
      value !== ''
    ) {
      p.set(key, value);
    } else {
      p.delete(key);
    }

    setParams(p, {
      replace: true,
    });

    setPage(1);
  };

  const activeChips: [string, string, string][] = [];

  if (q) {
    activeChips.push([
      'q',
      'Search: ' + q,
      '',
    ]);
  }

  if (category && category !== 'All') {
    activeChips.push([
      'category',
      category,
      'All',
    ]);
  }

  if (city) {
    activeChips.push([
      'city',
      'City: ' + city,
      '',
    ]);
  }

  if (
    priceFilter &&
    priceFilter !== 'any'
  ) {
    activeChips.push([
      'price',
      priceFilter === 'free'
        ? 'Free'
        : 'Paid',
      'any',
    ]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          Discover
        </p>

        <h1 className="font-display text-4xl font-semibold text-ink-900">
          Browse events
        </h1>

        <p className="max-w-xl text-ink-500">
          Filter by category, city and price. Find the next event worth showing up for.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3">
          <Search className="h-4 w-4 text-ink-400" />

          <input
            value={q}
            onChange={(e) =>
              updateParam('q', e.target.value)
            }
            placeholder="Search event titles"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <input
          value={city}
          onChange={(e) =>
            updateParam('city', e.target.value)
          }
          placeholder="City"
          className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none md:w-36"
        />

        <select
          value={priceFilter}
          onChange={(e) =>
            updateParam(
              'price',
              e.target.value
            )
          }
          className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none"
        >
          <option value="any">
            Any price
          </option>
          <option value="free">
            Free only
          </option>
          <option value="paid">
            Paid only
          </option>
        </select>

        <select
          value={sort}
          onChange={(e) =>
            updateParam(
              'sort',
              e.target.value
            )
          }
          className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none"
        >
          {SORTS.map((s) => (
            <option
              key={s.value}
              value={s.value}
            >
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categories chip row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-ink-400" />

        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() =>
              updateParam(
                'category',
                c
              )
            }
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${category === c
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-700 hover:border-ink-400'
              }`}
          >
            {c}
          </button>
        ))}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map(
            ([k, l, reset]) => (
              <button
                key={k}
                onClick={() =>
                  updateParam(
                    k,
                    reset
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
              >
                {l}

                <X className="h-3 w-3" />
              </button>
            )
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-ink-500">
          {isLoading
            ? 'Loading events…'
            : `${filtered.length} event${filtered.length === 1
              ? ''
              : 's'
            } found`}
        </p>

        <Badge tone="gray">
          Page {page} / {totalPages}
        </Badge>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({
            length: 8,
          }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : pageItems.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No events match your filters"
              description="Try clearing filters or searching a different city."
            />
          </div>
        ) : (
          pageItems.map((e) => (
            <EventCard
              key={e.id}
              event={e}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() =>
              setPage((p) =>
                Math.max(
                  1,
                  p - 1
                )
              )
            }
            className="h-9 rounded-lg border border-ink-200 bg-white px-4 text-sm disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({
            length: totalPages,
          }).map((_, i) => (
            <button
              key={i}
              onClick={() =>
                setPage(i + 1)
              }
              className={`h-9 w-9 rounded-lg text-sm font-semibold ${page === i + 1
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-white'
                }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={
              page === totalPages
            }
            onClick={() =>
              setPage((p) =>
                Math.min(
                  totalPages,
                  p + 1
                )
              )
            }
            className="h-9 rounded-lg border border-ink-200 bg-white px-4 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}