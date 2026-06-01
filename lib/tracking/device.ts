export function getTrackingDeviceType() {
  if (typeof window === "undefined") {
    return null;
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return "tablet";
  }
  if (/mobi|android|iphone|ipod/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}
