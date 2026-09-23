import sharp from "sharp";

// The original GIFs are 48px sprites enlarged 10x, with six 100ms frames.
for (const [source, output] of [
  ["PixelShop Moonbird 8209 east idle.png", "beerme-player.png"],
  ["PixelShop Moonbird 7041 west idle.png", "beerme-opponent.png"],
]) {
  const frames = [];
  for (let page = 0; page < 6; page += 1) {
    frames.push({
      input: await sharp(`public/sprites/${source}`, { page })
        .resize(48, 48, { kernel: "nearest" }).png().toBuffer(),
      left: page * 48,
      top: 0,
    });
  }
  await sharp({ create: { width: 288, height: 48, channels: 4, background: "transparent" } })
    .composite(frames).png().toFile(`public/sprites/${output}`);
}

await sharp("public/sprites/can.png")
  .resize(18, 18, { kernel: "nearest" })
  .png({ palette: true, colours: 16 })
  .toFile("public/sprites/beerme-can.png");
