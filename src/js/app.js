/**
 * Main Application
 * Gemini Watermark Remover using reverse alpha blending
 */

import { WatermarkEngine } from './watermarkEngine.js';

class App {
    constructor() {
        this.engine = null;
        this.elements = {};
    }

    async init() {
        this.elements = {
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            resultArea: document.getElementById('resultArea'),
            previewImg: document.getElementById('previewImg'),
            downloadLink: document.getElementById('downloadLink'),
            resetBtn: document.getElementById('resetBtn'),
            logArea: document.getElementById('logArea'),
            comparisonContainer: document.getElementById('comparisonContainer')
        };

        this.log('Initializing engine...');

        this.engine = new WatermarkEngine();
        await this.engine.init('src/assets/bg_48.png', 'src/assets/bg_96.png');

        this.log('Engine ready. Drop an image to process.');
        this.setupEvents();
    }

    log(msg) {
        const { logArea } = this.elements;
        logArea.style.display = 'block';
        const line = document.createElement('div');
        line.className = 'log-line';
        const time = new Date().toLocaleTimeString();
        line.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
        logArea.appendChild(line);
        logArea.scrollTop = logArea.scrollHeight;
    }

    setupEvents() {
        const { dropZone, fileInput, resetBtn } = this.elements;

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                this.handleFile(fileInput.files[0]);
            }
        });

        resetBtn.addEventListener('click', () => this.reset());
    }

    async handleFile(file) {
        if (!file.type.startsWith('image/')) {
            this.log('Error: Please select an image file.');
            return;
        }

        const { dropZone, progressContainer, progressBar, progressText } = this.elements;
        dropZone.style.display = 'none';
        progressContainer.style.display = 'block';

        try {
            // Step 1: Load image
            progressBar.style.width = '30%';
            progressText.innerText = '30% - Loading image...';
            this.log(`Loading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

            const bitmap = await createImageBitmap(file);
            this.log(`Image: ${bitmap.width}x${bitmap.height}px`);

            // Step 2: Process
            progressBar.style.width = '60%';
            progressText.innerText = '60% - Removing watermark...';

            // Convert bitmap to image element for canvas drawing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = bitmap.width;
            tempCanvas.height = bitmap.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(bitmap, 0, 0);

            const img = new Image();
            img.width = bitmap.width;
            img.height = bitmap.height;

            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = tempCanvas.toDataURL('image/png');
            });

            const resultCanvas = this.engine.processImage(img);
            this.log('Watermark removed via reverse alpha blending');

            // Step 3: Generate output
            progressBar.style.width = '90%';
            progressText.innerText = '90% - Generating output...';

            const resultDataUrl = resultCanvas instanceof OffscreenCanvas
                ? URL.createObjectURL(await resultCanvas.convertToBlob({ type: 'image/png' }))
                : resultCanvas.toDataURL('image/png');

            const originalDataUrl = tempCanvas.toDataURL('image/png');

            // Done
            progressBar.style.width = '100%';
            progressText.innerText = '100% - Complete!';
            this.log('Done! Image ready for download.');

            setTimeout(() => this.showResult(resultDataUrl, originalDataUrl), 400);
        } catch (err) {
            this.log(`Error: ${err.message}`);
            progressContainer.style.display = 'none';
            dropZone.style.display = 'flex';
        }
    }

    showResult(resultUrl, originalUrl) {
        const { progressContainer, resultArea, previewImg, downloadLink, comparisonContainer } = this.elements;

        progressContainer.style.display = 'none';
        resultArea.style.display = 'block';
        previewImg.src = resultUrl;
        downloadLink.href = resultUrl;
        downloadLink.download = `gemini-clean-${Date.now()}.png`;

        // Comparison slider
        comparisonContainer.style.display = 'block';
        comparisonContainer.innerHTML = `
            <div class="comparison-wrapper">
                <div class="comparison-images">
                    <img src="${resultUrl}" class="comparison-after" alt="After">
                    <div class="comparison-before-wrapper" style="width: 50%;">
                        <img src="${originalUrl}" class="comparison-before" alt="Before">
                    </div>
                </div>
                <input type="range" min="0" max="100" value="50" class="comparison-slider">
                <div class="comparison-labels">
                    <span>Original</span>
                    <span>Cleaned</span>
                </div>
            </div>
        `;

        const slider = comparisonContainer.querySelector('.comparison-slider');
        const beforeWrapper = comparisonContainer.querySelector('.comparison-before-wrapper');
        slider.addEventListener('input', (e) => {
            beforeWrapper.style.width = `${e.target.value}%`;
        });
    }

    reset() {
        const { dropZone, resultArea, progressContainer, fileInput, logArea, comparisonContainer } = this.elements;
        resultArea.style.display = 'none';
        progressContainer.style.display = 'none';
        dropZone.style.display = 'flex';
        comparisonContainer.style.display = 'none';
        comparisonContainer.innerHTML = '';
        fileInput.value = '';
        logArea.innerHTML = '';
        this.log('Ready for new image.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App().init());
} else {
    new App().init();
}
