// export const ASSETS_SHA = process.env.NEXT_PUBLIC_BIRB_ASSETS_SHA || "main";
// export const PIXEL_BASE  = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${ASSETS_SHA}/pixel_clean`;
// export const ODDITY_BASE = `https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${ASSETS_SHA}/oddities_clean`;
// export const GLYDERS_PIXEL_BASE =`https://cdn.jsdelivr.net/gh/jkalinowsky2/birb-assets@${ASSETS_SHA}/glyders/glyders-pixel`;
// export const GLYDERS_ILLU_BASE = process.env.NEXT_PUBLIC_GLYDERS_ILLU_BASE || "";
// export const ILLU_PROXY  = process.env.NEXT_PUBLIC_ILLUSTRATED_PROXY || "/api/imgproxy";


// src/lib/assets.ts
export const MOONBIRDS_PIXEL_BASE =
    process.env.NEXT_PUBLIC_MOONBIRDS_PIXEL_BASE || "";

export const MOONBIRDS_ILLU_BASE =
    process.env.NEXT_PUBLIC_MOONBIRDS_ILLU_BASE || "";

export const MOONBIRDS_ODDITY_BASE =
    process.env.NEXT_PUBLIC_MOONBIRDS_ODDITY_BASE || "";

export const GLYDERS_PIXEL_BASE =
    process.env.NEXT_PUBLIC_GLYDERS_PIXEL_BASE || "";

export const GLYDERS_ILLU_BASE =
    process.env.NEXT_PUBLIC_GLYDERS_ILLU_BASE || "";

// If you still have an old ILLU_PROXY lying around, keep it for fallback only:
export const ILLU_PROXY = process.env.NEXT_PUBLIC_ILLU_PROXY || "";