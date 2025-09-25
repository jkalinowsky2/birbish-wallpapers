export const ASSETS_SHA = process.env.NEXT_PUBLIC_BIRB_ASSETS_SHA || "main";

export const PIXEL_BASE  = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${ASSETS_SHA}/pixel_clean`;
export const ODDITY_BASE = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${ASSETS_SHA}/oddities_clean`;

export const ILLU_PROXY  = process.env.NEXT_PUBLIC_ILLUSTRATED_PROXY || "/api/imgproxy";