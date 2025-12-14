"use client";

import { ReactNode, useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Briefcase, Mail, Clock3, Globe, MessageCircle, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

type ProfileFormProps = {
  initialData: {
    name: string;
    role: string;
    timezone: string;
    currency: string;
    reminderTone: string;
    backupEmail: string;
  };
};

const currencies = ["INR", "USD", "EUR", "GBP"];
const reminderTones = ["Warm + Polite", "Friendly", "Firm", "Custom"];
const timezones = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"];

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [form, setForm] = useState(initialData);
  const [initialFormData, setInitialFormData] = useState(initialData);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(
    (session?.user as any)?.workspaceName || null
  );

  // Helper function to get workspace initials
  const getWorkspaceInitials = (name: string | null | undefined): string => {
    if (!name) return "PC";
    // Remove common words and get first letters
    const words = name
      .replace(/'s\s+/gi, " ") // Remove possessive
      .split(/\s+/)
      .filter((w) => w.length > 0 && !/^(workspace|studio|agency|company)$/i.test(w));

    if (words.length === 0) return "PC";

    // Get first letter of first word
    const first = words[0][0]?.toUpperCase() || "";
    // Get first letter of second word if available, otherwise use second letter of first word
    const second = words.length > 1
      ? words[1][0]?.toUpperCase() || ""
      : words[0][1]?.toUpperCase() || "";

    return (first + second).slice(0, 2) || "PC";
  };

  // Load profile data from API on mount
  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const loadedData = {
            name: data.name || "",
            role: data.role || "Founder",
            timezone: data.timezone || "Asia/Kolkata",
            currency: data.currency || "INR",
            reminderTone: data.reminderTone || "Warm + Polite",
            backupEmail: data.backupEmail || "",
          };
          setForm(loadedData);
          setInitialFormData(loadedData);
          if (data.image) {
            // If image is a base64 string or URL, use it directly
            setAvatarPreview(data.image);
          }
          // Set workspace name from API or session
          const wsName = data.workspace?.name || (session?.user as any)?.workspaceName;
          if (wsName) {
            setWorkspaceName(wsName);
          }
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [session?.user]);

  const hasChanges = useMemo(() => {
    const formChanged = JSON.stringify(form) !== JSON.stringify(initialFormData);
    const avatarChanged = avatarFile !== null || (avatarPreview && avatarPreview !== initialData.name);
    return formChanged || avatarChanged;
  }, [form, initialFormData, avatarFile, avatarPreview, initialData.name]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetTone = () => {
    handleChange("reminderTone", initialData.reminderTone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    setError(null);
    setStatus(null);

    startTransition(async () => {
      try {
        // If avatar is uploaded, convert to base64
        let imageBase64 = null;
        if (avatarFile) {
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(avatarFile);
          });
        }

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            image: imageBase64 || avatarPreview,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update initial data to reflect saved state
          setInitialFormData(form);
          setAvatarFile(null);
          setStatus("Profile updated successfully.");
          setTimeout(() => {
            setStatus(null);
            router.refresh();
          }, 2000);
        } else {
          const errorData = await res.json();
          setError(errorData.error || "We couldn't update your profile. Please try again.");
        }
      } catch (err) {
        setError("We couldn't update your profile. Please try again.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Identity Section */}
      <section className="space-y-4 rounded-xl border border-white/20 bg-white/70 p-4 sm:p-6 shadow-sm">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Identity</p>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Personal info</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Clients see this on reminders, invoices, and agreements.</p>
        </header>

        {/* Avatar */}
        <div className="rounded-xl border border-border/60 bg-white/80 p-3 sm:p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Avatar</p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-primary/60 to-emerald-400/60 text-lg sm:text-xl font-semibold text-white shadow-inner shadow-primary/30 shrink-0">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Avatar preview" className="h-full w-full rounded-full object-cover" />
              ) : (
                getWorkspaceInitials(workspaceName)
              )}
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:bg-primary/5">
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert("File size must be less than 2MB");
                          return;
                        }
                        const url = URL.createObjectURL(file);
                        setAvatarPreview(url);
                        setAvatarFile(file);
                      }
                    }}
                  />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setAvatarPreview(null)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">PNG, JPG, or WebP · Min 240px · 2MB max.</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Name"
            icon={<User className="h-3.5 w-3.5" />}
            value={form.name}
            onChange={(value) => handleChange("name", value)}
          />
          <Field
            label="Role"
            icon={<Briefcase className="h-3.5 w-3.5" />}
            value={form.role}
            onChange={(value) => handleChange("role", value)}
          />
          <Field
            label="Backup email"
            icon={<Mail className="h-3.5 w-3.5" />}
            value={form.backupEmail}
            onChange={(value) => handleChange("backupEmail", value)}
            placeholder="finance@paperchai.com"
          />
        </div>
      </section>

      {/* Preferences Section */}
      <section className="space-y-4 rounded-xl border border-white/20 bg-white/70 p-4 sm:p-6 shadow-sm">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Preferences</p>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Reminders & currency</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">These choices define tone, currency, and timezone everywhere.</p>
        </header>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Timezone"
            icon={<Clock3 className="h-3.5 w-3.5" />}
            value={form.timezone}
            options={timezones}
            onChange={(value) => handleChange("timezone", value)}
          />
          <SelectField
            label="Currency"
            icon={<Globe className="h-3.5 w-3.5" />}
            value={form.currency}
            options={currencies}
            onChange={(value) => handleChange("currency", value)}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-foreground">
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Reminder tone
              </span>
              <button type="button" onClick={resetTone} className="text-[10px] sm:text-xs text-primary hover:underline">
                <RotateCcw className="mr-1 inline h-2.5 w-2.5" />
                Reset
              </button>
            </div>
            <select
              className="w-full rounded-lg border border-border/70 px-3 py-2 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              value={form.reminderTone}
              onChange={(e) => handleChange("reminderTone", e.target.value)}
            >
              {reminderTones.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="space-y-3 rounded-xl border border-white/20 bg-white/60 p-4 sm:p-6 shadow-sm backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Preview</p>
        <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{form.name || "Your name"}</span> • {form.role || "Role"}
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Tone · {form.reminderTone}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Currency · {form.currency}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Timezone · {form.timezone}</span>
          </div>
          <div className="rounded-xl border border-white/30 bg-gradient-to-br from-primary/5 via-white to-emerald-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-foreground shadow-inner">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">WhatsApp</p>
            "Hey Ankit — hope you're doing well! Dropping a {form.reminderTone.toLowerCase()} reminder for invoice #108
            ({form.currency})."
          </div>
        </div>
      </section>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-700">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {status && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{status}</span>
        </div>
      )}

      {/* Save Button - Sticky Footer */}
      <div className="sticky bottom-2 sm:bottom-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/20 bg-white/90 p-3 sm:p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          {!hasChanges && !isPending ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>All changes saved</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-amber-500" />
              <span>Unsaved changes</span>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || !hasChanges}
          className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save & Update"}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function Field({ label, icon, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="space-y-2 text-sm font-semibold text-foreground">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </span>
      <input
        className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  icon: ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectField({ label, icon, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="space-y-2 text-sm font-semibold text-foreground">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </span>
      <select
        className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
