function getNonBlueColor() {
    try {
        const computedBg = getComputedStyle(document.body).backgroundColor;
        const match = computedBg.match(/\d+/g);
        if (match && match.length >= 3) {
            return [parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)];
        }
    } catch (e) {}

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
    return isDark ? [23, 24, 28] : [247, 247, 247];
}

function thresholdImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 220;
    canvas.height = img.naturalHeight || img.height || 350;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const threshold = Number(img.dataset.threshold || 20);
    const [bgR, bgG, bgB] = getNonBlueColor();

    for (let i = 0; i < pixels.length; i += 4) {
        if ((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 < threshold) {
            pixels[i] = 39;
            pixels[i + 1] = 129;
            pixels[i + 2] = 196;
        } else {
            pixels[i] = bgR;
            pixels[i + 1] = bgG;
            pixels[i + 2] = bgB;
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

function refreshThresholdImages() {
    const wrappers = document.querySelectorAll('.threshold-hover-wrapper');
    for (const wrapper of wrappers) {
        const thresholdImg = wrapper.querySelector('.threshold-hover');
        const originalImg = wrapper.querySelector('.original-hover');
        if (thresholdImg && originalImg) {
            thresholdImg.src = thresholdImage(originalImg);
        }
    }
}

const themeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
            refreshThresholdImages();
            break;
        }
    }
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

document.addEventListener('DOMContentLoaded', setupThresholdImages);
