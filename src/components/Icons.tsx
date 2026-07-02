import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const HomeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const BrowseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M21 7v10M9 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PersonIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const PlayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M6 4.5v15l13-7.5z" />
  </svg>
);

export const HeartIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21s-7-4.35-9.5-8.5C.9 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5.1 3.5 3.5 6.5C19 16.65 12 21 12 21z" />
  </svg>
);

export const CommentIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
  </svg>
);

export const ShareIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

export const VolumeOnIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const VolumeOffIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
    <path d="m17 9 5 5M22 9l-5 5" />
  </svg>
);

export const EyeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const TvIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="2" y="7" width="20" height="13" rx="2" />
    <path d="m8 3 4 4 4-4" />
  </svg>
);

export const UsersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 6M18 20c0-2.8-1.3-4.3-3-4.8" />
  </svg>
);

export const UploadIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const TrashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const EditIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const ImageIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

export const PlaylistIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 6h13M3 12h13M3 18h8M17 14v6M14 17h6" />
  </svg>
);

export const FlagIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 21V4M4 4h13l-2 4 2 4H4" />
  </svg>
);

export const AutoplayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6a8 8 0 1 1-1.5 6" />
    <path d="M2 5v4h4" />
    <path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const BackIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const BotIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="8" width="16" height="11" rx="3" />
    <path d="M12 8V4M9 13h.01M15 13h.01M2 12v3M22 12v3" />
  </svg>
);

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const SendIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
  </svg>
);

export const VerifiedIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="m12 1.5 2.4 1.9 3-.3 1 2.9 2.7 1.4-.9 2.9L23 14l-1.8 2.3.9 2.9-2.7 1.4-1 2.9-3-.3L12 25l-2.4-2.4-3 .3-1-2.9-2.7-1.4.9-2.9L1 14l1.8-2.3-.9-2.9L4.6 7l1-2.9 3 .3z" />
  </svg>
);
