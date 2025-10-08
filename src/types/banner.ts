// src/types/banner.ts
export type BannerBackground = { id: string; label: string; src: string; mode?: "tile" | "image"; };
export type BannerCenterOverlay = { id: string; label: string; src: string };

export type BannerSlotDefault = {
    id: string;           // default token id (can be "")
    style: "none" | "illustrated" | "pixel" | "oddity";
    x: number; y: number; w: number; h: number;
    scale: number;
    mirror?: boolean;
};

export type BannerDefaults = {
    bgId?: string;          // default background id
    centerId?: string;      // default overlay id
    centerScale?: number;     // ← new
    centerYOffset?: number;   // ← new
    slots?: BannerSlotDefault[];
    tileScale?: number;
    mode?: "tile" | "image"; // default "tile" or "image"
};

export type BannerConfig = {
    allowedStyles?: ("illustrated" | "pixel")[];
    defaults?: BannerDefaults;     
    backgrounds: BannerBackground[];
    centerOverlays: BannerCenterOverlay[];
    assetBases?: {
        pixelBannerScale?: number;
        illustratedBannerScale?: number;
        oddityBannerScale?: number;
    };
};