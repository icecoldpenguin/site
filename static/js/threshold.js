function thresholdImage(img) {
    const canvas = document.createElement('canvas');
    const origWidth = img.naturalWidth || img.width || 220;
    const origHeight = img.naturalHeight || img.height || 350;

    // Cap resolution to 440px max width for retina displays while optimizing RAM & speed on mobile
    const maxWidth = 440;
    const scale = origWidth > maxWidth ? maxWidth / origWidth : 1;
    canvas.width = Math.round(origWidth * scale);
    canvas.height = Math.round(origHeight * scale);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const threshold = Number(img.dataset.threshold || 20);

    for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness < threshold) {
            pixels[i] = 39;
            pixels[i + 1] = 129;
            pixels[i + 2] = 196;
            pixels[i + 3] = 255;
        } else {
            pixels[i + 3] = 0; // Transparent background: lets CSS var(--bg-color) show through instantly
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

async function setupThresholdImages() {
    const images = document.querySelectorAll('.threshold-hover');

    for (const img of images) {
        if (img.dataset.initialized) continue;
        img.dataset.initialized = 'true';

        const originalSrc = img.src;
        if (!img.complete) await img.decode().catch(() => {});

        const wrapper = document.createElement('div');
        wrapper.className = 'threshold-hover-wrapper';
        img.parentElement.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const original = document.createElement('img');
        original.src = originalSrc;
        original.className = 'original-hover';
        original.alt = img.alt || '';
        original.dataset.threshold = img.dataset.threshold || '20';
        wrapper.appendChild(original);

        img.src = thresholdImage(original);

        const rating = img.dataset.rating;
        if (rating) {
            const ratingBar = document.createElement('div');
            ratingBar.textContent = rating;
            ratingBar.className = 'rating-bar';
            wrapper.appendChild(ratingBar);
        }

        wrapper.addEventListener('click', (e) => {
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) {
                document.querySelectorAll('.threshold-hover-wrapper.active').forEach(w => {
                    if (w !== wrapper) w.classList.remove('active');
                });
                wrapper.classList.toggle('active');
                e.stopPropagation();
            }
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.threshold-hover-wrapper.active').forEach(w => w.classList.remove('active'));
    });
}

function refreshThresholdImages() {}

document.addEventListener('DOMContentLoaded', setupThresholdImages);
