import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight,
  Search,
  MapPin,
  CalendarDays,
  Ticket,
  ShieldCheck,
  Zap,
  BarChart3,
  Sparkles,
  ChevronRight,
  Music,
  Cpu,
  Palette,
  Trophy,
  GraduationCap,
  Utensils,
  Briefcase,
  HeartHandshake,
} from 'lucide-react';
import { EventsAPI } from '../../lib/queries';
import { resolveMediaUrl } from '../../lib/api';
import { EventCard } from '../../components/shared/EventCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { motion } from 'framer-motion';

const CATEGORY_ICONS: Record<string, any> = {
  Music,
  Technology: Cpu,
  Art: Palette,
  Sports: Trophy,
  Education: GraduationCap,
  'Food & Drink': Utensils,
  Business: Briefcase,
  Community: HeartHandshake,
};

function normalizeEvents(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const response = value as {
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
}

export function Landing() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const nav = useNavigate();
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const {
    data: featured,
    isLoading: fLoad,
  } = useQuery({
    queryKey: ['events', 'featured'],
    queryFn: () =>
      EventsAPI.list({
        featured: 'true',
        status: 'published',
        limit: 6,
      }),
  });

  const {
    data: upcoming,
    isLoading: uLoad,
  } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () =>
      EventsAPI.list({
        status: 'published',
        limit: 8,
      }),
  });

  const featuredEvents = normalizeEvents(featured);
  const upcomingEvents = normalizeEvents(upcoming);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const p = new URLSearchParams();

    if (q) {
      p.set('q', q);
    }

    if (city) {
      p.set('city', city);
    }

    nav(`/events?${p.toString()}`);
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-ink-100">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -top-40 -right-20 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-3 py-1 text-xs font-medium text-ink-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              Now with smart waitlists & QR check-in
            </div>

            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] text-ink-900 sm:text-6xl md:text-7xl">
              Every great event
              <br />
              starts with a{' '}
              <span className="bg-gradient-to-r from-brand-500 to-sky-500 bg-clip-text text-transparent">
                single click
              </span>
              .
            </h1>

            <p className="mt-5 max-w-xl text-lg text-ink-600">
              Discover concerts, conferences and community meetups. Or launch your own — EventFlow handles ticketing, attendees and check-in end-to-end.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/events"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink-900 px-5 font-semibold text-white hover:bg-ink-800"
              >
                Browse events
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/organizers"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 font-semibold text-ink-900 hover:border-ink-400"
              >
                Host an event
              </Link>
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onSubmit={submitSearch}
            className="mt-10 flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white/95 p-3 shadow-xl backdrop-blur md:flex-row md:items-center"
          >
            <div className="flex flex-1 items-center gap-3 px-3">
              <Search className="h-5 w-5 text-ink-400" />

              <input
                placeholder="Search concerts, conferences, workshops…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
              />
            </div>

            <div className="h-px bg-ink-100 md:h-8 md:w-px" />

            <div className="flex items-center gap-3 px-3">
              <MapPin className="h-5 w-5 text-ink-400" />

              <input
                placeholder="Any city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 w-40 bg-transparent text-sm outline-none placeholder:text-ink-400"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>

          {/* social proof */}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-ink-400">
            <span>Trusted by 4,200+ organizers</span>
            <span className="hidden sm:inline">•</span>
            <span>1.6M tickets issued</span>
            <span className="hidden sm:inline">•</span>
            <span>SOC-2 ready platform</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Categories
            </p>

            <h2 className="font-display mt-1 text-3xl font-semibold">
              Find something you love
            </h2>
          </div>

          <Link
            to="/events"
            className="hidden sm:inline text-sm font-medium text-ink-700 hover:text-brand-600"
          >
            Browse all →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.keys(CATEGORY_ICONS).map((cat) => {
            const Icon = CATEGORY_ICONS[cat];

            return (
              <Link
                key={cat}
                to={`/events?category=${encodeURIComponent(cat)}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-ink-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="text-xs font-semibold text-ink-800">
                  {cat}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Featured
            </p>

            <h2 className="font-display mt-1 text-3xl font-semibold">
              Handpicked this week
            </h2>
          </div>

          <Link
            to="/events"
            className="text-sm font-medium text-ink-700 hover:text-brand-600"
          >
            See all events{' '}
            <ChevronRight className="inline h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fLoad ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : featuredEvents.length === 0 ? (
            <p className="text-sm text-ink-500">
              No featured events yet.
            </p>
          ) : (
            featuredEvents.map((e) => {
              const coverImage =
                e?.cover_image ||
                e?.cover_media_url ||
                '';

              const eventWithCover = {
                ...e,
                cover_image: coverImage
                  ? resolveMediaUrl(coverImage)
                  : '',
              };

              return (
                <EventCard
                  key={e.id}
                  event={eventWithCover}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Upcoming */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Upcoming
            </p>

            <h2 className="font-display mt-1 text-3xl font-semibold">
              Happening soon
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {uLoad ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            upcomingEvents
              .slice(0, 8)
              .map((e) => {
                const coverImage =
                  e?.cover_image ||
                  e?.cover_media_url ||
                  '';

                const eventWithCover = {
                  ...e,
                  cover_image: coverImage
                    ? resolveMediaUrl(coverImage)
                    : '',
                };

                return (
                  <EventCard
                    key={e.id}
                    event={eventWithCover}
                    compact
                  />
                );
              })
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-ink-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                For organizers
              </p>

              <h2 className="font-display mt-2 text-4xl font-semibold leading-tight">
                The operating system for modern events.
              </h2>

              <p className="mt-4 text-lg text-ink-600">
                From smart landing pages to instant QR check-in, EventFlow keeps every stakeholder in sync — organizers, staff and attendees.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {!authLoading && !user && (
                  <Link
                    to="/register"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-semibold text-white hover:bg-ink-800"
                  >
                    Start free
                  </Link>
                )}

                <Link
                  to="/organizers"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 px-5 text-sm font-semibold text-ink-900 hover:border-ink-400"
                >
                  See how it works
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: <Ticket className="h-5 w-5" />,
                  t: 'Free & paid tickets',
                  d: 'Multiple tiers, promo codes, and secure Stripe/Razorpay payouts.',
                },
                {
                  icon: <CalendarDays className="h-5 w-5" />,
                  t: 'Beautiful event pages',
                  d: 'Publish in minutes with an auto-optimized SEO-ready page.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  t: 'Team roles',
                  d: 'Invite admins and door staff with fine-grained permissions.',
                },
                {
                  icon: <Zap className="h-5 w-5" />,
                  t: 'Instant check-in',
                  d: 'Scan QR codes at the door with any phone — no hardware needed.',
                },
                {
                  icon: <BarChart3 className="h-5 w-5" />,
                  t: 'Live analytics',
                  d: 'Track sales, attendance and waitlists in real time.',
                },
                {
                  icon: <Sparkles className="h-5 w-5" />,
                  t: 'Waitlists that work',
                  d: 'Auto-promote guests when a spot opens up.',
                },
              ].map((f) => (
                <div
                  key={f.t}
                  className="rounded-2xl border border-ink-200 bg-white p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white">
                    {f.icon}
                  </div>

                  <p className="mt-3 font-display text-base font-semibold">
                    {f.t}
                  </p>

                  <p className="mt-1 text-sm text-ink-500">
                    {f.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      {!authLoading && !user && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-10 text-white sm:p-14">
            <div className="absolute inset-0 bg-grid-dark opacity-70" />

            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />

            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />

            <div className="relative max-w-2xl">
              <h3 className="font-display text-4xl font-semibold sm:text-5xl">
                Ready to run your next event?
              </h3>

              <p className="mt-3 text-lg text-ink-200">
                Create your first event in under 2 minutes. No credit card required.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 font-semibold text-white hover:bg-brand-600"
                >
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/events"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 font-semibold text-white hover:bg-white/15"
                >
                  Explore events
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}