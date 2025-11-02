/**
 * Haptic feedback utility for mobile devices
 * Provides vibration patterns for different user interactions
 */

export const haptic = {
  /**
   * Light vibration for button clicks
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium vibration for important actions
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Strong vibration for errors
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  },

  /**
   * Success pattern vibration
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  },

  /**
   * Like/reaction pattern
   */
  like: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }
  },

  /**
   * Selection pattern
   */
  select: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },

  /**
   * Warning pattern
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 30, 20]);
    }
  },

  /**
   * Custom vibration pattern
   */
  custom: (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
};
