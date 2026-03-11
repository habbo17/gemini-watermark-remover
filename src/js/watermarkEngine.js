/**
 * Watermark engine
 * Coordinates watermark detection, alpha map calculation, and removal
 */

import { calculateAlphaMap } from './alphaMap.js';
import { removeWatermark } from './blendModes.js';
import { detectWatermarkConfig, calculateWatermarkPosition } from './watermarkConfig.js';

function createCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

async function loadImage(src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
}

export class WatermarkEngine {
    constructor() {
        this.alphaMaps = {};
        this.bgImages = {};
    }

    async init(bg48Path, bg96Path) {
        const [bg48, bg96] = await Promise.all([
            loadImage(bg48Path),
            loadImage(bg96Path)
        ]);
        this.bgImages = { bg48, bg96 };
    }

    getAlphaMap(size) {
        if (this.alphaMaps[size]) return this.alphaMaps[size];

        const bgImage = size === 48 ? this.bgImages.bg48 : this.bgImages.bg96;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bgImage, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);

        const alphaMap = calculateAlphaMap(imageData);
        this.alphaMaps[size] = alphaMap;
        return alphaMap;
    }

    processImage(image) {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const config = detectWatermarkConfig(canvas.width, canvas.height);
        const position = calculateWatermarkPosition(canvas.width, canvas.height, config);
        const alphaMap = this.getAlphaMap(config.logoSize);

        removeWatermark(imageData, alphaMap, position);
        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }
}
