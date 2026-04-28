import type { ExpoConfig } from 'expo/config';

type AppExtra = {
  amapAndroidKey?: string;
  amapIosKey?: string;
};

export default (): ExpoConfig => {
  const extra: AppExtra = {
    amapAndroidKey: process.env.AMAP_ANDROID_KEY ?? '',
    amapIosKey: process.env.AMAP_IOS_KEY ?? '',
  };

  return {
    name: 'TripIn',
    slug: 'tripin-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#101828',
    },
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    plugins: [
      './plugins/withTripinAmap.js',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'TripIn 需要定位来创建即时记录点位。',
        },
      ],
    ],
    ios: {
      bundleIdentifier: 'com.tripin.mobile',
      supportsTablet: true,
    },
    android: {
      package: 'com.tripin.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#101828',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra,
  };
};
