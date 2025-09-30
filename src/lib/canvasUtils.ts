
function drawCenteredNoScale(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement
) {
    // draw size = the smaller of image/canvas in each dimension (no scaling)
    const dw = Math.min(img.width, c.width);
    const dh = Math.min(img.height, c.height);

    // crop source from the image center if image is bigger than canvas
    const sx = Math.max(0, Math.floor((img.width - dw) / 2));
    const sy = Math.max(0, Math.floor((img.height - dh) / 2));

    // center destination rect on the canvas
    const dx = Math.floor((c.width - dw) / 2);
    const dy = Math.floor((c.height - dh) / 2);

    // draw 1:1 pixels, centered; crops if needed, never scales
    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}

function drawBottomOffsetNoScale(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    offset: number
) {
    const { w: iw, h: ih } = getImgSize(img);

    // destination size (no scaling)
    const dw = Math.min(iw, c.width);
    const dh = Math.min(ih, c.height);

    // source crop: center by width, **bottom-align by height**
    const sx = Math.max(0, Math.floor((iw - dw) / 2));
    const sy = ih > dh ? ih - dh : 0; // <-- bottom-crop instead of center-crop

    // destination position: center horizontally, **bottom-align vertically**
    const dx = Math.floor((c.width - dw) / 2);
    const dy = c.height - dh - offset;

    ctx.drawImage(img, sx, sy, dw, dh, dx, dy, dw, dh);
}
/**
 * Draws an image scaled by `scale`, horizontally centered,
 * and bottom-aligned (offset is optional).
 */
function drawBottomScaled(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: HTMLCanvasElement, scale: number, offset = 0) {
    const { w: iw, h: ih } = getImgSize(img);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (c.width - dw) / 2;
    const dy = c.height - dh - offset;
    ctx.drawImage(img, dx, dy, dw, dh);
}

function getImgSize(img: HTMLImageElement, fallbackW = 1600, fallbackH = 1600) {
    const w = img.naturalWidth || img.width || fallbackW;
    const h = img.naturalHeight || img.height || fallbackH;
    return { w, h };
}

// Choose an INTEGER scale so the SVG "pixel grid" lands on device pixels.
// targetWidthRatio controls how wide the pixel bird should be relative to canvas width.
function getIntegerPixelScale(
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    targetWidthRatio = 0.6,
    maxScale = 1.1   // <-- new
) {
    const { w, h } = getImgSize(img);
    const maxByWidth = (c.width * targetWidthRatio) / w;
    const maxByHeight = (c.height * .9) / h; // keep it from getting too tall; tweak if you like
    const raw = Math.min(maxByWidth, maxByHeight);
    // force a minimum of 1, and make it an integer to avoid seams
    return Math.max(1, Math.min(maxScale, Math.floor(raw))); // <-- clamp
}

function getContainedScale(
    img: HTMLImageElement,
    c: HTMLCanvasElement,
    targetWidthRatio = 0.6,
    targetHeightRatio = 0.9,
    maxScale = 2,
    minScale = 0.5
) {
    const { w, h } = getImgSize(img);
    const maxByW = (c.width * targetWidthRatio) / w;
    const maxByH = (c.height * targetHeightRatio) / h;
    return Math.max(minScale, Math.min(maxScale, maxByW, maxByH));
}

function drawTextCenteredVertically(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: HTMLCanvasElement
) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    // Scale down only if the text image is larger than the canvas.
    const scale = Math.min(1, c.width / iw, c.height / ih);

    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);

    // Center on both axes; vertical centering is the key ask.
    const dx = Math.round((c.width - dw) / 2);
    const dy = Math.round((c.height - dh) / 2);

    ctx.drawImage(img, dx, dy, dw, dh);
}

