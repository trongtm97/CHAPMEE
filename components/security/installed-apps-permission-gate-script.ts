/** Runs before any app JS — blocks getInstalledRelatedApps permission on passive load. */
export const INSTALLED_APPS_PERMISSION_GATE_SCRIPT = `
(function () {
  var FLAG = "__chapmeeInstalledAppsPermissionGate";
  if (typeof navigator === "undefined" || navigator[FLAG]) return;
  navigator[FLAG] = true;

  var original = navigator.getInstalledRelatedApps;
  navigator.getInstalledRelatedApps = function () {
    return Promise.resolve([]);
  };

  if (typeof original === "function") {
    window.__chapmeeRequestInstalledRelatedApps = function () {
      return original.call(navigator);
    };
  }
})();
`;
