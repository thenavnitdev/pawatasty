export interface FacebookAppDetectionResult {
  isInstalled: boolean;
  shouldUseNativeApp: boolean;
}

export async function detectFacebookApp(): Promise<FacebookAppDetectionResult> {
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (!isMobileDevice) {
    return {
      isInstalled: false,
      shouldUseNativeApp: false,
    };
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  try {
    const detected = await tryDetectFacebookApp(isIOS, isAndroid);
    return {
      isInstalled: detected,
      shouldUseNativeApp: detected && (isIOS || isAndroid),
    };
  } catch (error) {
    console.log('Facebook app detection failed:', error);
    return {
      isInstalled: false,
      shouldUseNativeApp: false,
    };
  }
}

async function tryDetectFacebookApp(isIOS: boolean, isAndroid: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 2000);

    if (isIOS) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'fb://';

      document.body.appendChild(iframe);

      setTimeout(() => {
        document.body.removeChild(iframe);
        clearTimeout(timeout);

        if (document.hidden || document.webkitHidden) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    } else if (isAndroid) {
      const testLink = document.createElement('a');
      testLink.href = 'fb://page';
      testLink.style.display = 'none';
      document.body.appendChild(testLink);

      const startTime = Date.now();
      testLink.click();

      setTimeout(() => {
        const elapsedTime = Date.now() - startTime;
        document.body.removeChild(testLink);
        clearTimeout(timeout);

        if (elapsedTime < 1500 || document.hidden || document.webkitHidden) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    } else {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

export function openFacebookAppForAuth(authUrl: string): boolean {
  try {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isIOS) {
      window.location.href = authUrl;
      return true;
    } else if (isAndroid) {
      const intent = `intent://authenticate#Intent;package=com.facebook.katana;scheme=https;S.browser_fallback_url=${encodeURIComponent(authUrl)};end`;
      window.location.href = intent;
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to open Facebook app:', error);
    return false;
  }
}

export function getFacebookDeepLinkUrl(authUrl: string): string {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOS) {
    return authUrl;
  } else {
    return `intent://authenticate#Intent;package=com.facebook.katana;scheme=https;S.browser_fallback_url=${encodeURIComponent(authUrl)};end`;
  }
}
