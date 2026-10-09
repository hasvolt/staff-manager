/**
 * Reliable Print Utility that guarantees first-attempt printing
 * on mobile and desktop browsers.
 * Waits for fonts, images, and layout settling before calling window.print().
 */

export interface PrintOptions {
  title?: string;
}

export async function triggerPrint(options?: PrintOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  if (options?.title) {
    document.title = options.title;
  }

  try {
    // 1. Wait for web fonts to load
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 2. Wait for any images to be fully loaded
    const images = Array.from(document.images);
    const pendingImages = images.filter((img) => !img.complete);
    if (pendingImages.length > 0) {
      await Promise.all(
        pendingImages.map(
          (img) =>
            new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              // Safety timeout in case an image hangs
              setTimeout(resolve, 500);
            })
        )
      );
    }

    // 3. Double requestAnimationFrame to let browser finish paint and reflow
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80);
        });
      });
    });

    // 4. Trigger print dialog
    window.print();
  } catch (err) {
    console.warn('Print preparation error, proceeding with standard print:', err);
    window.print();
  } finally {
    if (options?.title) {
      document.title = originalTitle;
    }
  }
}
