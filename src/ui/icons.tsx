import type { ComponentChildren } from 'preact';

/** Знак расширения — та же картинка, что на иконке в панели браузера (design/icon-small.svg). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="1 1 30 30" width={size} height={size} aria-hidden="true" class="logo-mark">
      <defs>
        <linearGradient id="logo-tile" x1="1" y1="1" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#5b6cff" />
          <stop offset="1" stop-color="#7344f0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#logo-tile)" />
      <rect x="6" y="8.5" width="20" height="17.5" rx="4" fill="#ffffff" />
      <rect x="9.5" y="5.5" width="3" height="6" rx="1.5" fill="#ffffff" />
      <rect x="19.5" y="5.5" width="3" height="6" rx="1.5" fill="#ffffff" />
      <circle cx="16" cy="18" r="4.6" fill="none" stroke="#5b5ff8" stroke-width="2.2" />
      <path
        d="M16 15.6v2.7l1.8 1.1"
        fill="none"
        stroke="#5b5ff8"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** Контурные иконки 24×24 в цвет текста. */
function Icon({ size = 16, children }: { size?: number; children: ComponentChildren }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <Icon>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </Icon>
  );
}

export function VideoIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="2.5" y="6" width="13" height="12" rx="3" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </Icon>
  );
}

export function ExternalIcon() {
  return (
    <Icon size={14}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Icon>
  );
}

export function CalendarIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Icon>
  );
}

export function BellIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function SlidersIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  );
}

export function LinkIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </Icon>
  );
}

export function LockIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="3" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function CheckIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function InviteIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </Icon>
  );
}

export function AlertIcon({ size }: { size?: number }) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Icon>
  );
}

/** Картинка для пустого списка: чашка кофе — встреч нет. */
export function FreeTimeIllustration() {
  return (
    <svg viewBox="0 0 96 80" width="96" height="80" aria-hidden="true" class="illustration">
      <ellipse cx="48" cy="72" rx="34" ry="5" fill="var(--accent-soft)" />
      <path d="M22 32h44v16a20 20 0 0 1-20 20h-4a20 20 0 0 1-20-20z" fill="var(--surface)" stroke="var(--accent)" stroke-width="3" />
      <path d="M66 38h5a8 8 0 0 1 0 16h-6" fill="none" stroke="var(--accent)" stroke-width="3" />
      <path d="M36 12c-3 4 3 7 0 12M46 8c-3 5 3 9 0 15M56 12c-3 4 3 7 0 12" fill="none" stroke="var(--border-strong)" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}
