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

export type Device = { id: string; w: number; h: number; name: string };
export type Option = { id: string; label: string; src: string };

export type CollectionConfig = {
    devices: { id: string; w: number; h: number; name: string }[];
    backgrounds: { id: string; label: string; src: string }[];
    texts: { id: string; label: string; src: string }[];
    birds: { id: string; label: string; src: string }[];
    headwear?: { id: string; label: string; src: string }[]; // optional if not supported

    assetBases: {
        pixelBase?: string;        // e.g. https://.../pixel_clean
        oddityBase?: string;       // (Moonbirds only)
        illustratedProxy?: string; // e.g. /api/imgproxy
    };
};