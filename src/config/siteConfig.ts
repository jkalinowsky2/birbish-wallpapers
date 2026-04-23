// src/config/siteConfig.ts

export const siteConfig = {
  // === FEATURE FLAGS ===
  checkoutEnabled: true,          // 🔥 Turn checkout on/off
  showInventory: true,            // 🔥 Show stock counts on products
  limitOrdersToInventory: true,   // 🔥 Set true to limit quantites added to ccart to in-stock items
  shopPopupOn: false,
  
  allowGifts: false,              // Moonbird gift stickers on/off
  enableStickerPackLogic: true,   // Inventory bundling for pack
  maintenanceMode: false,         // Show a banner + disable buying

  // === OPTIONAL UI FLAGS ===
  showSoldOutBadges: true,
  showShippingEstimator: true,

  // === EXPERIMENT FLAGS ===
  // (turn A/B tests or prototypes on/off)
  newProductCardLayout: false,
}
