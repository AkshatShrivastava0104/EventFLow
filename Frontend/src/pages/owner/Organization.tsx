import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { OrgsAPI, StaffAPI } from '../../lib/queries';
import { Input, TextArea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { slugify } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Building2, Save } from 'lucide-react';

export function OrganizationPage() {
  const { data: orgs, refetch } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => OrgsAPI.list(),
  });

  const org = orgs?.[0];

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        slug: (org as any).slug || '',
        description: org.description || '',
      });
    }
  }, [org]);

  /* =========================================================
     Organization Members
  ========================================================= */

  const { data: members = [] } = useQuery({
    queryKey: ['staff', org?.id],
    queryFn: () => StaffAPI.list(org!.id),
    enabled: !!org?.id,
  });

  const adminCount = members.filter(
    (member: any) =>
      String(member?.role || '').toUpperCase() === 'ADMIN'
  ).length;

  const staffCount = members.filter(
    (member: any) =>
      String(member?.role || '').toUpperCase() === 'STAFF'
  ).length;

  /* =========================================================
     Save Organization
  ========================================================= */

  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();

      if (!name) {
        throw new Error('Organization name is required');
      }

      if (org) {
        return OrgsAPI.update(org.id, {
          name,
          description: form.description.trim(),
        });
      }

      return OrgsAPI.create({
        name,
        description: form.description.trim(),
      });
    },

    onSuccess: async () => {
      toast.success('Organization saved');
      await refetch();
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save organization'
      );
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h2 className="font-display text-2xl font-semibold">
          Organization
        </h2>

        <p className="text-sm text-ink-500">
          Manage the organization information attendees see
          across your events.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Organization Form */}

        <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
          {/* Organization preview */}

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 text-2xl font-bold text-white">
              {form.name ? (
                form.name
                  .slice(0, 1)
                  .toUpperCase()
              ) : (
                <Building2 className="h-6 w-6" />
              )}
            </div>

            <div>
              <p className="font-display text-xl font-semibold">
                {form.name || 'Your organization'}
              </p>

              {form.slug && (
                <p className="text-sm text-ink-500">
                  eventflow.io/orgs/{form.slug}
                </p>
              )}
            </div>
          </div>

          {/* Fields */}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Organization name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="Acme Events"
            />

            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value,
                })
              }
              placeholder={slugify(form.name)}
              disabled={!!org}
            />
          </div>

          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
            placeholder="Tell attendees about your organization..."
          />

          <div className="flex justify-end">
            <Button
              variant="secondary"
              leftIcon={
                <Save className="h-4 w-4" />
              }
              onClick={() => save.mutate()}
              loading={save.isPending}
            >
              Save organization
            </Button>
          </div>
        </div>

        {/* Organization Information */}

        <aside className="h-fit space-y-4 rounded-2xl border border-ink-200 bg-white p-6">
          <div>
            <p className="font-display text-lg font-semibold">
              Organization
            </p>

            <p className="mt-1 text-sm text-ink-500">
              Your organization members and their
              organization-level roles.
            </p>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Total members
              </p>

              <p className="font-semibold text-ink-900">
                {members.length}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Admins
              </p>

              <p className="font-semibold text-ink-900">
                {adminCount}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Staff
              </p>

              <p className="font-semibold text-ink-900">
                {staffCount}
              </p>
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <p className="text-xs leading-5 text-ink-500">
              Organization roles are managed separately
              from platform roles. Members can be assigned
              ADMIN or STAFF access from the Staff & Roles
              section.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}