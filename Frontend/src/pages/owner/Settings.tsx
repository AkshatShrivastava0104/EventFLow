import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Database,
  Globe2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Server,
  Shield,
  SlidersHorizontal,
  Trash2,
  Webhook,
  CreditCard,
  Users,
  CalendarDays,
  Settings2,
  X,
  Zap,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';

type SettingsSection =
  | 'general'
  | 'platform'
  | 'security'
  | 'notifications'
  | 'payments'
  | 'integrations'
  | 'system'
  | 'privacy'
  | 'danger';

type IntegrationStatus =
  | 'Connected'
  | 'Not connected';

type Integration = {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ReactNode;
};

const sections: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
    {
      id: 'general',
      label: 'General',
      description: 'Platform identity and regional preferences',
      icon: <Globe2 className="h-4 w-4" />,
    },
    {
      id: 'platform',
      label: 'Platform & Registration',
      description: 'Control discovery, registration and events',
      icon: <SlidersHorizontal className="h-4 w-4" />,
    },
    {
      id: 'security',
      label: 'Security',
      description: 'Sessions, authentication and access',
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Platform alert preferences',
      icon: <Bell className="h-4 w-4" />,
    },
    {
      id: 'payments',
      label: 'Payments & Payouts',
      description: 'Payment and payout configuration',
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'External services and webhooks',
      icon: <Webhook className="h-4 w-4" />,
    },
    {
      id: 'system',
      label: 'System',
      description: 'Infrastructure and operational controls',
      icon: <Server className="h-4 w-4" />,
    },
    {
      id: 'privacy',
      label: 'Data & Privacy',
      description: 'Retention and platform data policies',
      icon: <Database className="h-4 w-4" />,
    },
    {
      id: 'danger',
      label: 'Danger Zone',
      description: 'Irreversible platform operations',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

export function OwnerSettings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('general');

  const [hasChanges, setHasChanges] =
    useState(false);

  const [platformName, setPlatformName] =
    useState('EventFlow');

  const [platformDescription, setPlatformDescription] =
    useState(
      'Event registration and management platform.',
    );

  const [timezone, setTimezone] =
    useState('Asia/Kolkata');

  const [currency, setCurrency] =
    useState('INR');

  const [dateFormat, setDateFormat] =
    useState('DD MMM YYYY');

  const [registrationEnabled, setRegistrationEnabled] =
    useState(true);

  const [publicDiscovery, setPublicDiscovery] =
    useState(true);

  const [organizationCreation, setOrganizationCreation] =
    useState(true);

  const [waitlistEnabled, setWaitlistEnabled] =
    useState(true);

  const [defaultVisibility, setDefaultVisibility] =
    useState('public');

  const [sessionTimeout, setSessionTimeout] =
    useState('24h');

  const [reauthentication, setReauthentication] =
    useState(true);

  const [loginProtection, setLoginProtection] =
    useState(true);

  const [notifySecurity, setNotifySecurity] =
    useState(true);

  const [notifyRegistrations, setNotifyRegistrations] =
    useState(true);

  const [notifyPayments, setNotifyPayments] =
    useState(true);

  const [notifySystem, setNotifySystem] =
    useState(true);

  const [paymentGateway, setPaymentGateway] =
    useState('razorpay');

  const [payoutSchedule, setPayoutSchedule] =
    useState('weekly');

  const [platformFee, setPlatformFee] =
    useState('5');

  const [maintenanceMode, setMaintenanceMode] =
    useState(false);

  const [apiRateLimit, setApiRateLimit] =
    useState('standard');

  const [auditRetention, setAuditRetention] =
    useState('365');

  const [dataRetention, setDataRetention] =
    useState('730');

  const [showSensitiveModal, setShowSensitiveModal] =
    useState(false);

  const [sensitiveAction, setSensitiveAction] =
    useState<
      | 'revoke'
      | 'maintenance'
      | 'cache'
      | null
    >(null);

  const markChanged = () => {
    setHasChanges(true);
  };

  const handleSave = () => {
    /*
     * Backend persistence will be wired here once the
     * platform settings API/database model is added.
     *
     * We intentionally do not pretend these settings
     * are persisted server-side yet.
     */
    setHasChanges(false);

    toast.success(
      'Settings updated for this session.',
    );
  };

  const handleReset = () => {
    setPlatformName('EventFlow');
    setPlatformDescription(
      'Event registration and management platform.',
    );
    setTimezone('Asia/Kolkata');
    setCurrency('INR');
    setDateFormat('DD MMM YYYY');

    setRegistrationEnabled(true);
    setPublicDiscovery(true);
    setOrganizationCreation(true);
    setWaitlistEnabled(true);
    setDefaultVisibility('public');

    setSessionTimeout('24h');
    setReauthentication(true);
    setLoginProtection(true);

    setNotifySecurity(true);
    setNotifyRegistrations(true);
    setNotifyPayments(true);
    setNotifySystem(true);

    setPaymentGateway('razorpay');
    setPayoutSchedule('weekly');
    setPlatformFee('5');

    setMaintenanceMode(false);
    setApiRateLimit('standard');

    setAuditRetention('365');
    setDataRetention('730');

    setHasChanges(false);

    toast.success('Settings reset.');
  };

  const confirmSensitiveAction = (
    action:
      | 'revoke'
      | 'maintenance'
      | 'cache',
  ) => {
    setSensitiveAction(action);
    setShowSensitiveModal(true);
  };

  const executeSensitiveAction = () => {
    if (sensitiveAction === 'revoke') {
      toast.success(
        'Session revocation request prepared.',
      );
    }

    if (sensitiveAction === 'maintenance') {
      setMaintenanceMode(
        (current) => !current,
      );

      toast.success(
        maintenanceMode
          ? 'Maintenance mode disabled.'
          : 'Maintenance mode enabled.',
      );
    }

    if (sensitiveAction === 'cache') {
      toast.success(
        'Cache clear request prepared.',
      );
    }

    setShowSensitiveModal(false);
    setSensitiveAction(null);
  };

  const activeSectionData = useMemo(
    () =>
      sections.find(
        (section) =>
          section.id === activeSection,
      ),
    [activeSection],
  );

  return (
    <div className="min-h-full bg-ink-50/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col gap-4 border-b border-ink-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
              <Settings2 className="h-3.5 w-3.5" />
              Owner Console
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950">
              Settings
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-ink-500">
              Configure EventFlow platform behaviour,
              security, notifications, payments and
              operational controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="hidden items-center gap-1.5 text-xs text-amber-600 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Reset
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
              leftIcon={
                <Save className="h-4 w-4" />
              }
            >
              Save changes
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* ===================================================
              SETTINGS NAVIGATION
          =================================================== */}

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
              <div className="border-b border-ink-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Settings
                </p>
              </div>

              <nav className="p-2">
                {sections.map((section) => {
                  const active =
                    activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() =>
                        setActiveSection(
                          section.id,
                        )
                      }
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active
                          ? 'bg-ink-900 text-white'
                          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                        }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active
                            ? 'bg-white/10 text-white'
                            : 'bg-ink-50 text-ink-500 group-hover:text-ink-800'
                          }`}
                      >
                        {section.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs font-semibold ${section.id === 'danger'
                              ? active
                                ? 'text-red-200'
                                : 'text-red-600'
                              : ''
                            }`}
                        >
                          {section.label}
                        </span>

                        <span
                          className={`mt-0.5 block truncate text-[10px] ${active
                              ? 'text-white/60'
                              : 'text-ink-400'
                            }`}
                        >
                          {section.description}
                        </span>
                      </span>

                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${active
                            ? 'text-white/50'
                            : 'text-ink-300'
                          }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ===================================================
              CONTENT
          =================================================== */}

          <main className="min-w-0">
            {/* Section heading */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  {activeSectionData?.icon}
                </span>

                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-950">
                    {activeSectionData?.label}
                  </h2>

                  <p className="text-xs text-ink-500">
                    {activeSectionData?.description}
                  </p>
                </div>
              </div>
            </div>

            {activeSection === 'general' && (
              <GeneralSection
                platformName={platformName}
                setPlatformName={(value) => {
                  setPlatformName(value);
                  markChanged();
                }}
                platformDescription={
                  platformDescription
                }
                setPlatformDescription={(value) => {
                  setPlatformDescription(value);
                  markChanged();
                }}
                timezone={timezone}
                setTimezone={(value) => {
                  setTimezone(value);
                  markChanged();
                }}
                currency={currency}
                setCurrency={(value) => {
                  setCurrency(value);
                  markChanged();
                }}
                dateFormat={dateFormat}
                setDateFormat={(value) => {
                  setDateFormat(value);
                  markChanged();
                }}
              />
            )}

            {activeSection === 'platform' && (
              <PlatformSection
                registrationEnabled={
                  registrationEnabled
                }
                setRegistrationEnabled={(value) => {
                  setRegistrationEnabled(value);
                  markChanged();
                }}
                publicDiscovery={
                  publicDiscovery
                }
                setPublicDiscovery={(value) => {
                  setPublicDiscovery(value);
                  markChanged();
                }}
                organizationCreation={
                  organizationCreation
                }
                setOrganizationCreation={(value) => {
                  setOrganizationCreation(value);
                  markChanged();
                }}
                waitlistEnabled={
                  waitlistEnabled
                }
                setWaitlistEnabled={(value) => {
                  setWaitlistEnabled(value);
                  markChanged();
                }}
                defaultVisibility={
                  defaultVisibility
                }
                setDefaultVisibility={(value) => {
                  setDefaultVisibility(value);
                  markChanged();
                }}
              />
            )}

            {activeSection === 'security' && (
              <SecuritySection
                sessionTimeout={
                  sessionTimeout
                }
                setSessionTimeout={(value) => {
                  setSessionTimeout(value);
                  markChanged();
                }}
                reauthentication={
                  reauthentication
                }
                setReauthentication={(value) => {
                  setReauthentication(value);
                  markChanged();
                }}
                loginProtection={
                  loginProtection
                }
                setLoginProtection={(value) => {
                  setLoginProtection(value);
                  markChanged();
                }}
                onRevokeSessions={() =>
                  confirmSensitiveAction(
                    'revoke',
                  )
                }
              />
            )}

            {activeSection ===
              'notifications' && (
                <NotificationsSection
                  notifySecurity={
                    notifySecurity
                  }
                  setNotifySecurity={(value) => {
                    setNotifySecurity(value);
                    markChanged();
                  }}
                  notifyRegistrations={
                    notifyRegistrations
                  }
                  setNotifyRegistrations={(value) => {
                    setNotifyRegistrations(value);
                    markChanged();
                  }}
                  notifyPayments={
                    notifyPayments
                  }
                  setNotifyPayments={(value) => {
                    setNotifyPayments(value);
                    markChanged();
                  }}
                  notifySystem={
                    notifySystem
                  }
                  setNotifySystem={(value) => {
                    setNotifySystem(value);
                    markChanged();
                  }}
                />
              )}

            {activeSection === 'payments' && (
              <PaymentsSection
                paymentGateway={
                  paymentGateway
                }
                setPaymentGateway={(value) => {
                  setPaymentGateway(value);
                  markChanged();
                }}
                payoutSchedule={
                  payoutSchedule
                }
                setPayoutSchedule={(value) => {
                  setPayoutSchedule(value);
                  markChanged();
                }}
                platformFee={platformFee}
                setPlatformFee={(value) => {
                  setPlatformFee(value);
                  markChanged();
                }}
              />
            )}

            {activeSection ===
              'integrations' && (
                <IntegrationsSection />
              )}

            {activeSection === 'system' && (
              <SystemSection
                maintenanceMode={
                  maintenanceMode
                }
                apiRateLimit={
                  apiRateLimit
                }
                setApiRateLimit={(value) => {
                  setApiRateLimit(value);
                  markChanged();
                }}
                onMaintenance={() =>
                  confirmSensitiveAction(
                    'maintenance',
                  )
                }
                onClearCache={() =>
                  confirmSensitiveAction(
                    'cache',
                  )
                }
              />
            )}

            {activeSection === 'privacy' && (
              <PrivacySection
                auditRetention={
                  auditRetention
                }
                setAuditRetention={(value) => {
                  setAuditRetention(value);
                  markChanged();
                }}
                dataRetention={
                  dataRetention
                }
                setDataRetention={(value) => {
                  setDataRetention(value);
                  markChanged();
                }}
              />
            )}

            {activeSection === 'danger' && (
              <DangerSection />
            )}
          </main>
        </div>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      {showSensitiveModal && (
        <ConfirmationModal
          action={sensitiveAction}
          maintenanceMode={
            maintenanceMode
          }
          onClose={() => {
            setShowSensitiveModal(false);
            setSensitiveAction(null);
          }}
          onConfirm={
            executeSensitiveAction
          }
        />
      )}
    </div>
  );
}

/* ============================================================
   GENERAL
============================================================ */

function GeneralSection({
  platformName,
  setPlatformName,
  platformDescription,
  setPlatformDescription,
  timezone,
  setTimezone,
  currency,
  setCurrency,
  dateFormat,
  setDateFormat,
}: {
  platformName: string;
  setPlatformName: (value: string) => void;
  platformDescription: string;
  setPlatformDescription: (
    value: string,
  ) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  currency: string;
  setCurrency: (value: string) => void;
  dateFormat: string;
  setDateFormat: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Platform identity"
        description="These details are used across the EventFlow platform."
        icon={
          <Globe2 className="h-4 w-4" />
        }
      >
        <div className="grid gap-4">
          <Input
            label="Platform name"
            value={platformName}
            onChange={(event) =>
              setPlatformName(
                event.target.value,
              )
            }
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">
              Platform description
            </label>

            <textarea
              value={platformDescription}
              onChange={(event) =>
                setPlatformDescription(
                  event.target.value,
                )
              }
              rows={3}
              className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Regional preferences"
        description="Default regional settings used when organizations do not override them."
        icon={
          <Clock3 className="h-4 w-4" />
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Timezone"
            value={timezone}
            onChange={(event) =>
              setTimezone(
                event.target.value,
              )
            }
          >
            <option value="Asia/Kolkata">
              India — Kolkata
            </option>
            <option value="UTC">
              UTC
            </option>
            <option value="America/New_York">
              US — Eastern
            </option>
            <option value="Europe/London">
              UK — London
            </option>
          </Select>

          <Select
            label="Currency"
            value={currency}
            onChange={(event) =>
              setCurrency(
                event.target.value,
              )
            }
          >
            <option value="INR">
              INR — ₹
            </option>
            <option value="USD">
              USD — $
            </option>
            <option value="EUR">
              EUR — €
            </option>
            <option value="GBP">
              GBP — £
            </option>
          </Select>

          <Select
            label="Date format"
            value={dateFormat}
            onChange={(event) =>
              setDateFormat(
                event.target.value,
              )
            }
          >
            <option value="DD MMM YYYY">
              28 Sep 2026
            </option>
            <option value="MMM DD, YYYY">
              Sep 28, 2026
            </option>
            <option value="YYYY-MM-DD">
              2026-09-28
            </option>
          </Select>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   PLATFORM
============================================================ */

function PlatformSection({
  registrationEnabled,
  setRegistrationEnabled,
  publicDiscovery,
  setPublicDiscovery,
  organizationCreation,
  setOrganizationCreation,
  waitlistEnabled,
  setWaitlistEnabled,
  defaultVisibility,
  setDefaultVisibility,
}: {
  registrationEnabled: boolean;
  setRegistrationEnabled: (
    value: boolean,
  ) => void;
  publicDiscovery: boolean;
  setPublicDiscovery: (
    value: boolean,
  ) => void;
  organizationCreation: boolean;
  setOrganizationCreation: (
    value: boolean,
  ) => void;
  waitlistEnabled: boolean;
  setWaitlistEnabled: (
    value: boolean,
  ) => void;
  defaultVisibility: string;
  setDefaultVisibility: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Platform behaviour"
        description="Control the main capabilities available across EventFlow."
        icon={
          <SlidersHorizontal className="h-4 w-4" />
        }
      >
        <div className="divide-y divide-ink-100">
          <ToggleRow
            icon={
              <Users className="h-4 w-4" />
            }
            title="Allow user registrations"
            description="Allow users to register for published events."
            enabled={registrationEnabled}
            onChange={
              setRegistrationEnabled
            }
          />

          <ToggleRow
            icon={
              <CalendarDays className="h-4 w-4" />
            }
            title="Public event discovery"
            description="Allow published public events to appear on the public browse page."
            enabled={publicDiscovery}
            onChange={
              setPublicDiscovery
            }
          />

          <ToggleRow
            icon={
              <Users className="h-4 w-4" />
            }
            title="Organization creation"
            description="Allow eligible users to create new organizations."
            enabled={
              organizationCreation
            }
            onChange={
              setOrganizationCreation
            }
          />

          <ToggleRow
            icon={
              <Clock3 className="h-4 w-4" />
            }
            title="Waitlist"
            description="Allow attendees to join waitlists when events are full."
            enabled={waitlistEnabled}
            onChange={
              setWaitlistEnabled
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Event defaults"
        description="Default behaviour for newly created events."
        icon={
          <CalendarDays className="h-4 w-4" />
        }
      >
        <Select
          label="Default event visibility"
          value={defaultVisibility}
          onChange={(event) =>
            setDefaultVisibility(
              event.target.value,
            )
          }
        >
          <option value="public">
            Public
          </option>
          <option value="unlisted">
            Unlisted
          </option>
          <option value="private">
            Private
          </option>
        </Select>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   SECURITY
============================================================ */

function SecuritySection({
  sessionTimeout,
  setSessionTimeout,
  reauthentication,
  setReauthentication,
  loginProtection,
  setLoginProtection,
  onRevokeSessions,
}: {
  sessionTimeout: string;
  setSessionTimeout: (
    value: string,
  ) => void;
  reauthentication: boolean;
  setReauthentication: (
    value: boolean,
  ) => void;
  loginProtection: boolean;
  setLoginProtection: (
    value: boolean,
  ) => void;
  onRevokeSessions: () => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Authentication"
        description="Protect platform-owner and user accounts."
        icon={
          <Shield className="h-4 w-4" />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Session timeout"
            value={sessionTimeout}
            onChange={(event) =>
              setSessionTimeout(
                event.target.value,
              )
            }
          >
            <option value="1h">
              1 hour
            </option>
            <option value="8h">
              8 hours
            </option>
            <option value="24h">
              24 hours
            </option>
            <option value="7d">
              7 days
            </option>
            <option value="30d">
              30 days
            </option>
          </Select>

          <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-3">
            <p className="text-xs font-semibold text-ink-800">
              Current security level
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-700">
                Protected
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-ink-100">
          <ToggleRow
            icon={
              <KeyRound className="h-4 w-4" />
            }
            title="Re-authenticate sensitive actions"
            description="Require recent authentication before security-critical platform operations."
            enabled={reauthentication}
            onChange={
              setReauthentication
            }
          />

          <ToggleRow
            icon={
              <Lock className="h-4 w-4" />
            }
            title="Login attempt protection"
            description="Protect accounts against repeated failed login attempts."
            enabled={loginProtection}
            onChange={
              setLoginProtection
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Session management"
        description="Immediately invalidate active sessions across the platform."
        icon={
          <LogOut className="h-4 w-4" />
        }
      >
        <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Revoke all active sessions
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              All active users will need to
              authenticate again.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={
              onRevokeSessions
            }
          >
            Revoke sessions
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS
============================================================ */

function NotificationsSection({
  notifySecurity,
  setNotifySecurity,
  notifyRegistrations,
  setNotifyRegistrations,
  notifyPayments,
  setNotifyPayments,
  notifySystem,
  setNotifySystem,
}: {
  notifySecurity: boolean;
  setNotifySecurity: (
    value: boolean,
  ) => void;
  notifyRegistrations: boolean;
  setNotifyRegistrations: (
    value: boolean,
  ) => void;
  notifyPayments: boolean;
  setNotifyPayments: (
    value: boolean,
  ) => void;
  notifySystem: boolean;
  setNotifySystem: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Platform notifications"
        description="Choose which operational events should appear in the Owner Console."
        icon={
          <Bell className="h-4 w-4" />
        }
      >
        <div className="divide-y divide-ink-100">
          <ToggleRow
            icon={
              <Shield className="h-4 w-4" />
            }
            title="Security alerts"
            description="Failed login spikes, unauthorized access and session security events."
            enabled={notifySecurity}
            onChange={
              setNotifySecurity
            }
          />

          <ToggleRow
            icon={
              <Users className="h-4 w-4" />
            }
            title="Registration alerts"
            description="Important registration, cancellation and waitlist events."
            enabled={
              notifyRegistrations
            }
            onChange={
              setNotifyRegistrations
            }
          />

          <ToggleRow
            icon={
              <CreditCard className="h-4 w-4" />
            }
            title="Payment alerts"
            description="Payment failures, successful payments and payment-related activity."
            enabled={notifyPayments}
            onChange={
              setNotifyPayments
            }
          />

          <ToggleRow
            icon={
              <Activity className="h-4 w-4" />
            }
            title="System alerts"
            description="Database, Redis, API, queue and system-health notifications."
            enabled={notifySystem}
            onChange={
              setNotifySystem
            }
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   PAYMENTS
============================================================ */

function PaymentsSection({
  paymentGateway,
  setPaymentGateway,
  payoutSchedule,
  setPayoutSchedule,
  platformFee,
  setPlatformFee,
}: {
  paymentGateway: string;
  setPaymentGateway: (
    value: string,
  ) => void;
  payoutSchedule: string;
  setPayoutSchedule: (
    value: string,
  ) => void;
  platformFee: string;
  setPlatformFee: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Payment configuration"
        description="Configure the platform's default payment provider."
        icon={
          <CreditCard className="h-4 w-4" />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Payment gateway"
            value={paymentGateway}
            onChange={(event) =>
              setPaymentGateway(
                event.target.value,
              )
            }
          >
            <option value="razorpay">
              Razorpay — India
            </option>
            <option value="stripe">
              Stripe — International
            </option>
            <option value="paypal">
              PayPal — Global
            </option>
          </Select>

          <Input
            label="Platform fee (%)"
            type="number"
            min="0"
            max="100"
            value={platformFee}
            onChange={(event) =>
              setPlatformFee(
                event.target.value,
              )
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Payouts"
        description="Control how platform-connected organizations receive payouts."
        icon={
          <Zap className="h-4 w-4" />
        }
      >
        <Select
          label="Payout schedule"
          value={payoutSchedule}
          onChange={(event) =>
            setPayoutSchedule(
              event.target.value,
            )
          }
        >
          <option value="daily">
            Daily
          </option>
          <option value="weekly">
            Weekly
          </option>
          <option value="monthly">
            Monthly
          </option>
          <option value="manual">
            Manual
          </option>
        </Select>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

            <div>
              <p className="text-xs font-semibold text-blue-900">
                Payment provider status
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Provider credentials and payout
                accounts should be stored securely
                on the backend and never exposed to
                the frontend.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   INTEGRATIONS
============================================================ */

function IntegrationsSection() {
  const integrations: Integration[] = [
    {
      name: 'Slack',
      description:
        'Send operational alerts and event activity to selected channels.',
      status: 'Connected',
      icon: (
        <Activity className="h-4 w-4" />
      ),
    },
    {
      name: 'Email',
      description:
        'Transactional email delivery for platform notifications.',
      status: 'Connected',
      icon: (
        <Mail className="h-4 w-4" />
      ),
    },
    {
      name: 'Zoom',
      description:
        'Create and manage virtual event meetings.',
      status: 'Not connected',
      icon: (
        <Monitor className="h-4 w-4" />
      ),
    },
    {
      name: 'Webhooks',
      description:
        'Send EventFlow events to external systems.',
      status: 'Not connected',
      icon: (
        <Webhook className="h-4 w-4" />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Connected services"
        description="Manage external services used by EventFlow."
        icon={
          <Webhook className="h-4 w-4" />
        }
      >
        <div className="space-y-3">
          {integrations.map(
            (integration) => (
              <div
                key={integration.name}
                className="flex flex-col gap-4 rounded-xl border border-ink-200 p-4 transition hover:border-ink-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                    {integration.icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        {integration.name}
                      </p>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${integration.status ===
                            'Connected'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-ink-100 text-ink-500'
                          }`}
                      >
                        {integration.status}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-ink-500">
                      {integration.description}
                    </p>
                  </div>
                </div>

                <Button
                  variant={
                    integration.status ===
                      'Connected'
                      ? 'outline'
                      : 'secondary'
                  }
                  size="sm"
                  onClick={() =>
                    toast(
                      `${integration.name} integration will be connected through the backend integration service.`,
                    )
                  }
                >
                  {integration.status ===
                    'Connected'
                    ? 'Manage'
                    : 'Connect'}
                </Button>
              </div>
            ),
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="API access"
        description="Manage machine-to-machine access for external services."
        icon={
          <KeyRound className="h-4 w-4" />
        }
      >
        <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-ink-500" />

            <div>
              <p className="text-sm font-semibold text-ink-800">
                API keys
              </p>

              <p className="mt-1 text-xs leading-5 text-ink-500">
                API keys should be scoped, hashed where
                appropriate and shown only once after
                creation.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   SYSTEM
============================================================ */

function SystemSection({
  maintenanceMode,
  apiRateLimit,
  setApiRateLimit,
  onMaintenance,
  onClearCache,
}: {
  maintenanceMode: boolean;
  apiRateLimit: string;
  setApiRateLimit: (
    value: string,
  ) => void;
  onMaintenance: () => void;
  onClearCache: () => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Operational controls"
        description="Controls that affect platform availability and infrastructure behaviour."
        icon={
          <Server className="h-4 w-4" />
        }
      >
        <div className="divide-y divide-ink-100">
          <div className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">
                  Maintenance mode
                </p>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${maintenanceMode
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                    }`}
                >
                  {maintenanceMode
                    ? 'Active'
                    : 'Off'}
                </span>
              </div>

              <p className="mt-1 text-xs text-ink-500">
                Temporarily restrict public platform
                access during deployments or incidents.
              </p>
            </div>

            <Button
              variant={
                maintenanceMode
                  ? 'secondary'
                  : 'outline'
              }
              size="sm"
              onClick={
                onMaintenance
              }
            >
              {maintenanceMode
                ? 'Disable'
                : 'Enable'}
            </Button>
          </div>

          <div className="py-4">
            <Select
              label="API rate-limit profile"
              value={apiRateLimit}
              onChange={(event) =>
                setApiRateLimit(
                  event.target.value,
                )
              }
            >
              <option value="strict">
                Strict
              </option>
              <option value="standard">
                Standard
              </option>
              <option value="relaxed">
                Relaxed
              </option>
            </Select>
          </div>

          <div className="flex flex-col gap-4 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Application cache
              </p>

              <p className="mt-1 text-xs text-ink-500">
                Clear application-level cache after
                configuration changes or incidents.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <RefreshCw className="h-4 w-4" />
              }
              onClick={
                onClearCache
              }
            >
              Clear cache
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Runtime status"
        description="Quick operational snapshot."
        icon={
          <Activity className="h-4 w-4" />
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusTile
            label="API"
            value="Operational"
          />

          <StatusTile
            label="Database"
            value="Operational"
          />

          <StatusTile
            label="Redis"
            value="Operational"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
          <RefreshCw className="h-3.5 w-3.5" />
          Detailed health metrics are available in
          System Health.
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   PRIVACY
============================================================ */

function PrivacySection({
  auditRetention,
  setAuditRetention,
  dataRetention,
  setDataRetention,
}: {
  auditRetention: string;
  setAuditRetention: (
    value: string,
  ) => void;
  dataRetention: string;
  setDataRetention: (
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Retention policies"
        description="Define how long platform operational data should be retained."
        icon={
          <Database className="h-4 w-4" />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Audit log retention"
            value={auditRetention}
            onChange={(event) =>
              setAuditRetention(
                event.target.value,
              )
            }
          >
            <option value="90">
              90 days
            </option>
            <option value="180">
              180 days
            </option>
            <option value="365">
              1 year
            </option>
            <option value="730">
              2 years
            </option>
            <option value="forever">
              Indefinitely
            </option>
          </Select>

          <Select
            label="Application data retention"
            value={dataRetention}
            onChange={(event) =>
              setDataRetention(
                event.target.value,
              )
            }
          >
            <option value="365">
              1 year
            </option>
            <option value="730">
              2 years
            </option>
            <option value="1095">
              3 years
            </option>
            <option value="forever">
              Indefinitely
            </option>
          </Select>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Privacy controls"
        description="Platform-level data protection behaviour."
        icon={
          <Lock className="h-4 w-4" />
        }
      >
        <div className="space-y-3">
          <InfoRow
            title="Sensitive credentials"
            description="Payment and integration secrets must remain server-side."
          />

          <InfoRow
            title="Auditability"
            description="Security-sensitive administrative operations should be recorded in audit logs."
          />

          <InfoRow
            title="User data access"
            description="Platform-owner access should follow least-privilege principles and remain auditable."
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ============================================================
   DANGER ZONE
============================================================ */

function DangerSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-red-900">
              Dangerous platform operations
            </h3>

            <p className="mt-1 text-xs leading-5 text-red-700">
              These operations can affect the entire
              EventFlow platform. They should require
              explicit confirmation and, in production,
              recent owner authentication.
            </p>
          </div>
        </div>
      </div>

      <DangerAction
        icon={
          <LogOut className="h-4 w-4" />
        }
        title="Revoke all platform sessions"
        description="Immediately invalidate active authentication sessions."
        action="Revoke sessions"
      />

      <DangerAction
        icon={
          <RefreshCw className="h-4 w-4" />
        }
        title="Force platform configuration reload"
        description="Reload runtime configuration after a controlled deployment."
        action="Reload configuration"
      />

      <DangerAction
        icon={
          <Trash2 className="h-4 w-4" />
        }
        title="Permanent platform deletion"
        description="Permanent deletion should only exist after a dedicated backend workflow, confirmation process and recovery policy are implemented."
        action="Unavailable"
        disabled
      />
    </div>
  );
}

/* ============================================================
   SHARED SETTINGS CARD
============================================================ */

function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      <div className="border-b border-ink-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-600">
            {icon}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              {title}
            </h3>

            <p className="mt-0.5 text-xs leading-5 text-ink-500">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   TOGGLE
============================================================ */

function ToggleRow({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-900">
            {title}
          </p>

          <p className="mt-0.5 max-w-xl text-xs leading-5 text-ink-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() =>
          onChange(!enabled)
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled
            ? 'bg-brand-600'
            : 'bg-ink-200'
          }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${enabled
              ? 'left-6'
              : 'left-1'
            }`}
        />
      </button>
    </div>
  );
}

/* ============================================================
   STATUS TILE
============================================================ */

function StatusTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <p className="text-xs font-semibold text-ink-700">
          {label}
        </p>
      </div>

      <p className="mt-2 text-xs text-emerald-700">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <p className="text-sm font-semibold text-ink-800">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-ink-500">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   DANGER ACTION
============================================================ */

function DangerAction({
  icon,
  title,
  description,
  action,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-900">
            {title}
          </p>

          <p className="mt-1 max-w-xl text-xs leading-5 text-ink-500">
            {description}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          toast(
            disabled
              ? 'This operation is not available.'
              : `${action} requires backend confirmation.`,
          )
        }
      >
        {action}
      </Button>
    </div>
  );
}

/* ============================================================
   CONFIRMATION MODAL
============================================================ */

function ConfirmationModal({
  action,
  maintenanceMode,
  onClose,
  onConfirm,
}: {
  action:
  | 'revoke'
  | 'maintenance'
  | 'cache'
  | null;
  maintenanceMode: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action) {
    return null;
  }

  const content = {
    revoke: {
      title: 'Revoke all sessions?',
      description:
        'All active authentication sessions will need to authenticate again.',
      confirm: 'Revoke sessions',
    },
    maintenance: {
      title: maintenanceMode
        ? 'Disable maintenance mode?'
        : 'Enable maintenance mode?',
      description: maintenanceMode
        ? 'Public platform access will be restored.'
        : 'Public platform access may become unavailable while maintenance mode is active.',
      confirm: maintenanceMode
        ? 'Disable maintenance'
        : 'Enable maintenance',
    },
    cache: {
      title: 'Clear application cache?',
      description:
        'Cached application data may be invalidated. This action should be performed carefully in production.',
      confirm: 'Clear cache',
    },
  }[action];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-ink-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink-950">
          {content.title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-ink-500">
          {content.description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onConfirm}
          >
            {content.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}