import type { ReactNode } from 'react';
/** Rendered once per breakpoint — keep the wording in one place. */
const MAINTAINER_ATTRIBUTION = 'Maintained by Open Source Kigali';

/**
 * Shell for the two pre-session screens (login, first-run setup).
 *
 * Below `lg` the brand is a compact row above the form so the password field
 * stays above the fold on a phone. At `lg` and up the layout splits: product
 * introduction on the left, form on the right. Both pages use this component
 * only — LoginPage / SetupPage stay form-focused.
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop brand panel — not in the tree below lg (no stacked full intro). */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-soft px-8 py-12 lg:flex xl:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/5 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            {/* Adjacent wordmark is the accessible name; empty alt avoids double announce. */}
            <img
              src="/docksight.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="text-heading font-semibold tracking-tight">
              DockSight
            </span>
          </div>

          <p className="mt-12 text-page font-semibold tracking-tight text-foreground">
            Container monitoring platform
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Every Docker host you run, in one dashboard.
          </p>

          <ul className="mt-8 space-y-3 text-sm leading-relaxed text-foreground">
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>Agents connect outbound — no inbound ports to open</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>Live container logs and lifecycle control</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>One install command per host</span>
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          {MAINTAINER_ATTRIBUTION}
        </p>
      </aside>

      {/* Form column: stays max-w-md so inputs never stretch across half a 1920px screen. */}
      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-12 xl:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Compact brand row for < lg only. */}
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <img
              src="/docksight.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-heading font-semibold tracking-tight">
              DockSight
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-section font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            {children}
          </div>

          {/* Below lg the brand panel is gone, so the attribution belongs here. */}
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            {MAINTAINER_ATTRIBUTION}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      {message}
    </div>
  );
}
