// iOS ve React Native için Canvas polyfill
import { Platform } from 'react-native';

declare global {
  interface Window {
    labelUpdateTimeout?: NodeJS.Timeout;
  }
  
  interface CanvasRenderingContext2D {
    roundRect?: (x: number, y: number, width: number, height: number, radius: number) => void;
  }
}

// iOS için roundRect polyfill
if (Platform.OS === 'ios' && typeof CanvasRenderingContext2D !== 'undefined') {
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(
      x: number, 
      y: number, 
      width: number, 
      height: number, 
      radius: number
    ) {
      if (width < 2 * radius) radius = width / 2;
      if (height < 2 * radius) radius = height / 2;
      
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + width, y, x + width, y + height, radius);
      this.arcTo(x + width, y + height, x, y + height, radius);
      this.arcTo(x, y + height, x, y, radius);
      this.arcTo(x, y, x + width, y, radius);
      this.closePath();
    };
  }
}

// iOS için window objesi güvenli erişim
if (typeof window === 'undefined') {
  (global as any).window = {
    devicePixelRatio: 1,
    labelUpdateTimeout: undefined,
  };
}

export const iOSCanvasSupport = {
  isSupported: () => {
    if (Platform.OS !== 'ios') return true;
    
    try {
      // Canvas desteğini test et
      if (typeof document !== 'undefined' && document.createElement) {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      }
      
      // OffscreenCanvas desteğini test et
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(100, 100);
        return !!(canvas.getContext && canvas.getContext('2d'));
      }
      
      return false;
    } catch (error) {
      console.warn('Canvas support test failed:', error);
      return false;
    }
  },
  
  createSafeCanvas: (width: number = 512, height: number = 128) => {
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      }
      
      if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
      }
      
      throw new Error('No canvas implementation available');
    } catch (error) {
      console.warn('Safe canvas creation failed:', error);
      return null;
    }
  }
};