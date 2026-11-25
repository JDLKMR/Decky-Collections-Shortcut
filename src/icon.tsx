/*
 * Collections icon: three stacked rounded squares with a gap between each (filled style).
 * Uses currentColor so it matches whatever color the Steam Menu or Decky gives it.
 */

const MASK_BACK = "collections-shortcut-mask-back";
const MASK_MIDDLE = "collections-shortcut-mask-middle";

export function CollectionsIcon(props: Record<string, any>) {
  return (
    <svg width="1em" height="1em" {...props} viewBox="0 0 200 200" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id={MASK_BACK} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect x="0" y="0" width="200" height="200" fill="white" />
          <rect x="28" y="28" width="145" height="145" rx="29" fill="black" />
          <rect x="56" y="56" width="145" height="145" rx="29" fill="black" />
        </mask>
        <mask id={MASK_MIDDLE} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect x="0" y="0" width="200" height="200" fill="white" />
          <rect x="56" y="56" width="145" height="145" rx="29" fill="black" />
        </mask>
      </defs>
      <rect x="10" y="10" width="123" height="123" rx="18" mask={`url(#${MASK_BACK})`} />
      <rect x="39" y="39" width="123" height="123" rx="18" mask={`url(#${MASK_MIDDLE})`} />
      <rect x="67" y="67" width="123" height="123" rx="18" />
    </svg>
  );
}
