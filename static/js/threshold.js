function getThresholdColor() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    return isDark ? [24, 27, 34] : [39, 129, 196];
}

async function thresholdImage(img, signal) {
    const source = img.dataset.originalSrc || img.src;
    const response = await fetch(source, signal ? { signal } : undefined);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const threshold = Number(img.dataset.threshold || 20);
    const [replaceR, replaceG, replaceB] = getThresholdColor();

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness < threshold) {
            pixels[i] = replaceR;
            pixels[i + 1] = replaceG;
            pixels[i + 2] = replaceB;
        } else {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

async function setupThresholdImages() {
    const images = document.querySelectorAll('.threshold-hover');

    for (const img of images) {
        if (img.dataset.initialized) continue;

        img.dataset.initialized = 'true';

        // Save original forever
        img.dataset.originalSrc = img.src;

        await img.decode();

        const width = img.width;
        const height = img.height;

        const processed = await thresholdImage(img);

        img.src = processed;

        const wrapper = document.createElement('div');
        wrapper.className = 'threshold-hover-wrapper';

        Object.assign(wrapper.style, {
            position: 'relative',
            display: 'inline-block',
            width: width + 'px',
            height: height + 'px'
        });

        img.parentElement.insertBefore(wrapper, img);

        wrapper.appendChild(img);

        const original = document.createElement('img');
        original.src = img.dataset.originalSrc;
        original.className = 'original-hover';

        Object.assign(original.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: width + 'px',
            height: height + 'px',
            opacity: '0',
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none'
        });

        wrapper.appendChild(original);

        const rating = img.dataset.rating;

        if (rating) {
            const ratingBar = document.createElement('div');
            ratingBar.textContent = rating;
            ratingBar.className = 'rating-bar';

            Object.assign(ratingBar.style, {
                position: 'absolute',
                top: '6px',
                right: '6px',
                padding: '3px 8px',
                background: 'rgba(0,0,0,0.9)',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: "'Playfair Display', serif",
                fontWeight: '700',
                fontSize: '14px',
                pointerEvents: 'none',
                zIndex: '2'
            });

            wrapper.appendChild(ratingBar);
        }

        wrapper.addEventListener('mouseenter', () => {
            original.style.opacity = '1';
        });

        wrapper.addEventListener('mouseleave', () => {
            original.style.opacity = '0';
        });
    }
}

async function refreshThresholdImages() {
    // Abort any in-flight refresh to avoid races when toggling fast
    if (window.__thresholdRefreshController) {
        try {
            window.__thresholdRefreshController.abort();
        } catch (e) {}
    }

    const controller = new AbortController();
    window.__thresholdRefreshController = controller;

    const images = document.querySelectorAll('.threshold-hover');
    for (const img of images) {
        if (!img.dataset.originalSrc) continue; // not yet initialized
        let processed;
        try {
            processed = await thresholdImage(img, controller.signal);
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            continue;
        }

        if (controller.signal.aborted) return;
        img.src = processed;
    }
}

document.addEventListener('DOMContentLoaded', setupThresholdImages);
