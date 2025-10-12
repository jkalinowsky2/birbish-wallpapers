// export type FeatureFlags = {
//     headwear?: boolean;
//     oddity?: boolean;
//     pixel?: boolean;
// };

// export type CollectionMeta = {
//     name: string;
//     features?: string[];
//     artStyles?: string[];
//     labels?: {
//         background?: string;
//         text?: string;
//         character?: string;
//         headwear?: string;
//         tokenId?: string;
//         tokenHint?: string;
//     };
// };

// export type AssetBases = {
//     pixelBase?: string;
//     oddityBase?: string;
//     illustratedProxy?: string;
//     illustratedBase?: string;

//     // Per-art-style token scale overrides (optional)
//     pixelTokenScale?: number;
//     illustratedTokenScale?: number;
//     oddityTokenScale?: number;

//     // Banner scales
//     pixelBannerScale?: number;
//     illustratedBannerScale?: number;
//     oddityBannerScale?: number;
// };

// export type EffectsConfig = {
//     vignette?: boolean;
// };

// // Reuse these where helpful
// export type Device = { id: string; w: number; h: number; name: string };

// // NEW: include mode for tiling/background images
// export type Background = {
//     id: string;
//     label: string;
//     src: string;
//     mode?: "tile" | "image";
// };

// // NEW: include optional layout caps used by wallpaper composer
// export type TextLayer = {
//     id: string;
//     label: string;
//     src: string;
//     maxWidthRatio?: number;
//     maxHeightRatio?: number;
//     allowUpscale?: boolean;
// };

// export type Option = { id: string; label: string; src: string };

// export type CollectionConfig = {
//     devices: Device[];
//     backgrounds: Background[];     // ← now includes mode
//     texts: TextLayer[];            // ← now includes optional caps
//     birds: Option[];
//     headwear?: Option[];
//     assetBases: AssetBases;
//     effects?: EffectsConfig;       // ← you already added this
// };





export type FeatureFlags = {
    headwear?: boolean;
    oddity?: boolean;
    pixel?: boolean;
};

export type CollectionMeta = {
    name: string;
    // optional descriptive features
    features?: string[]; // e.g. ["tokens","headwear","oddity"]
    artStyles?: string[]; // e.g. ["illustrated","pixel","oddity"]
    labels?: {
        background?: string;
        text?: string;
        character?: string;
        headwear?: string;
        tokenId?: string;
        tokenHint?: string;
    };
};

export type AssetBases = {
    pixelBase?: string;
    oddityBase?: string;
    illustratedProxy?: string;

    illustratedBase?: string;  // NEW: direct base for illustrated (e.g., Glyders on R2/Worker)

    // NEW: per-art-style token scale overrides (all optional)
    pixelTokenScale?: number;        // e.g., 1.0
    illustratedTokenScale?: number;  // e.g., 0.32 for Moonbirds, 0.42 for Glyders
    oddityTokenScale?: number;       // e.g., 0.8

    /** Banner scales (NEW) */
    pixelBannerScale?: number;
    illustratedBannerScale?: number;
    oddityBannerScale?: number;
};

export type EffectsConfig = {
  vignette?: boolean;
};


export type Device = { id: string; w: number; h: number; name: string };
export type Option = { id: string; label: string; src: string };

export type CollectionConfig = {
    devices: { id: string; w: number; h: number; name: string }[];
    backgrounds: { id: string; label: string; src: string }[];
    texts: { id: string; label: string; src: string }[];
    birds: { id: string; label: string; src: string }[];
    headwear?: { id: string; label: string; src: string }[]; // optional if not supported
    assetBases: AssetBases;
    effects?: EffectsConfig;  
    // assetBases: {
    //     pixelBase?: string;        // e.g. https://.../pixel_clean
    //     oddityBase?: string;       // (Moonbirds only)
    //     illustratedProxy?: string; // e.g. /api/imgproxy
    // };
};