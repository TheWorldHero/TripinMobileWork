const {
  withAndroidManifest,
  withInfoPlist,
} = require('expo/config-plugins');

const LOCATION_USAGE =
  'TripIn uses your location to display and edit routes.';

const withTripinAmap = (config) => {
  const extra = config.extra ?? {};

  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];

    if (application && extra.amapAndroidKey) {
      const metadata = application['meta-data'] ?? [];
      const existing = metadata.find(
        (entry) => entry.$['android:name'] === 'com.amap.api.v2.apikey',
      );

      if (existing) {
        existing.$['android:value'] = extra.amapAndroidKey;
      } else {
        metadata.push({
          $: {
            'android:name': 'com.amap.api.v2.apikey',
            'android:value': extra.amapAndroidKey,
          },
        });
      }

      application['meta-data'] = metadata;
    }

    return modConfig;
  });

  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults.NSLocationWhenInUseUsageDescription = LOCATION_USAGE;

    if (extra.amapIosKey) {
      modConfig.modResults.AMapApiKey = extra.amapIosKey;
    }

    return modConfig;
  });

  return config;
};

module.exports = withTripinAmap;
