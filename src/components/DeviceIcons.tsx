/**
 * Inline SVG device/interaction icons for timeline nodes.
 * Each renders at a given (x, y) center with a specified size.
 * All paths designed for white fill on colored backgrounds.
 */

interface IconProps {
  x: number;
  y: number;
  size: number;
  opacity?: number;
}

export function SmartphoneIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="5" y="1" width="14" height="22" rx="3" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="19" r="1" fill="white" />
      <line x1="9" y1="4" x2="15" y2="4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function LaptopIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="white" strokeWidth="2" />
      <line x1="2" y1="20" x2="22" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="18" x2="8" y2="20" stroke="white" strokeWidth="1.5" />
      <line x1="16" y1="18" x2="16" y2="20" stroke="white" strokeWidth="1.5" />
    </g>
  );
}

export function DesktopIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="2" y="3" width="20" height="13" rx="2" fill="none" stroke="white" strokeWidth="2" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="21" stroke="white" strokeWidth="2" />
    </g>
  );
}

export function HeadsetIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <path d="M4 15V12a8 8 0 0 1 16 0v3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="2" y="14" width="4" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="18" y="14" width="4" height="6" rx="1.5" fill="white" opacity="0.9" />
      <path d="M18 20a4 4 0 0 1-4 0" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function TabletIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill="white" />
      <line x1="9" y1="5" x2="15" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function EnvelopeIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="white" strokeWidth="2" />
      <polyline points="2,4 12,13 22,4" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

export function BotIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <rect x="4" y="8" width="16" height="12" rx="3" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
      <line x1="12" y1="4" x2="12" y2="8" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="3" r="1.5" fill="white" />
      <line x1="4" y1="13" x2="2" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="13" x2="22" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

export function IncognitoIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      {/* Hat brim */}
      <path d="M3 12 L12 6 L21 12" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Mask/glasses */}
      <circle cx="8" cy="16" r="3" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" fill="none" stroke="white" strokeWidth="2" />
      <line x1="11" y1="16" x2="13" y2="16" stroke="white" strokeWidth="1.5" />
    </g>
  );
}

export function HistoryIcon({ x, y, size, opacity = 1 }: IconProps) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - 12 * s},${y - 12 * s}) scale(${s})`} opacity={opacity}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="white" strokeWidth="2" />
      <polyline points="12,7 12,12 16,14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12 L2 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12 L2 14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/**
 * Returns the correct icon component for a given device string.
 */
export function getDeviceIcon(device: string): React.FC<IconProps> {
  const d = device.toLowerCase();

  if (d.includes('incognito')) return IncognitoIcon;
  if (d.includes('bot') || d.includes('server')) return BotIcon;
  if (d.includes('phone call') || d.includes('call')) return HeadsetIcon;
  if (d.includes('(email)') || d === 'email') return EnvelopeIcon;
  if (d.includes('old ') || d.includes('historical')) return HistoryIcon;
  if (d.includes('tablet')) return TabletIcon;
  if (d.includes('iphone') || d.includes('mobile') || d.includes('phone') || d.includes('new phone')) return SmartphoneIcon;
  if (d.includes('desktop') || d.includes('home pc')) return DesktopIcon;
  if (d.includes('laptop') || d.includes('pc') || d.includes('chromebook') || d.includes('work')) return LaptopIcon;

  return LaptopIcon; // fallback
}
