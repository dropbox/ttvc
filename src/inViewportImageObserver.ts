import {Logger} from './utils/logger';

/**
 * Modeled after IntersectionObserver and MutationObserver, this Image observer
 * reports image load times for images that are visible within the viewport.
 *
 * @example
 * const observer = new InViewportImageObserver((timestamp) => {
 *   // do something with the image load event time
 * });
 *
 * // begin listening for all visible image load events
 * // note that observe() takes no arguments
 * observer.observe();
 *
 * // stop listening to image load events
 * observer.disconnect();
 */
export class InViewportImageObserver {
  private intersectionObserver: IntersectionObserver;
  private imageLoadTimes = new Map<HTMLImageElement, number>();
  private callback: (timestamp: number) => void;

  public lastImageLoadTimestamp = 0;

  constructor(callback: (timestamp: number) => void) {
    this.callback = callback;
    this.intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback);
  }

  private intersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const img = entry.target as HTMLImageElement;
      if (entry.isIntersecting) {
        const timestamp = this.imageLoadTimes.get(img);
        Logger.info('InViewportImageObserver.callback()', '::', 'timestamp =', timestamp);
        this.callback(timestamp);
      }
      this.intersectionObserver.unobserve(img);
      this.imageLoadTimes.delete(img);
    });
  };

  private handleLoadOrErrorEvent = (event: Event) => {
    if (event.target instanceof HTMLImageElement) {
      Logger.debug('InViewportImageObserver.handleLoadOrErrorEvent()', '::', 'event =', event);
      this.imageLoadTimes.set(event.target, performance.now());
      this.intersectionObserver.observe(event.target);
    }
  };

  /** Start observing loading images. */
  observe() {
    Logger.debug('InViewportImageObserver.observe()');
    document.addEventListener('load', this.handleLoadOrErrorEvent, {capture: true});
    document.addEventListener('error', this.handleLoadOrErrorEvent, {capture: true});
  }

  /** Stop observing loading images, and clean up. */
  disconnect() {
    Logger.debug('InViewportImageObserver.disconnect()');
    this.lastImageLoadTimestamp = 0;
    this.imageLoadTimes.clear();
    this.intersectionObserver.disconnect();
    document.removeEventListener('load', this.handleLoadOrErrorEvent);
    document.removeEventListener('error', this.handleLoadOrErrorEvent);
  }
}
