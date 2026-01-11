import { useEffect, useRef, useCallback } from 'react';

const AD_IDS = {
  banner: import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-5901537254343592/4973586423',
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-5901537254343592/1988330432',
};

const isNativeApp = () => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform();
};

export function useAdMob() {
  const admobRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const interstitialReadyRef = useRef(false);

  useEffect(() => {
    const initAdMob = async () => {
      if (!isNativeApp() || initializedRef.current) return;
      
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        admobRef.current = AdMob;
        
        await AdMob.initialize({
          initializeForTesting: false,
        });
        
        initializedRef.current = true;
        console.log('AdMob initialized successfully');
      } catch (error) {
        console.log('AdMob not available (running in web mode):', error);
      }
    };

    initAdMob();
  }, []);

  const showBanner = useCallback(async () => {
    if (!admobRef.current || !initializedRef.current) return;
    
    try {
      const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      
      await admobRef.current.showBanner({
        adId: AD_IDS.banner,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      console.log('Banner shown');
    } catch (error) {
      console.error('Error showing banner:', error);
    }
  }, []);

  const hideBanner = useCallback(async () => {
    if (!admobRef.current || !initializedRef.current) return;
    
    try {
      await admobRef.current.hideBanner();
    } catch (error) {
      console.error('Error hiding banner:', error);
    }
  }, []);

  const prepareInterstitial = useCallback(async () => {
    if (!admobRef.current || !initializedRef.current) return;
    
    try {
      await admobRef.current.prepareInterstitial({
        adId: AD_IDS.interstitial,
      });
      interstitialReadyRef.current = true;
      console.log('Interstitial prepared');
    } catch (error) {
      console.error('Error preparing interstitial:', error);
    }
  }, []);

  const showInterstitial = useCallback(async () => {
    if (!admobRef.current || !initializedRef.current) return false;
    
    try {
      if (!interstitialReadyRef.current) {
        await prepareInterstitial();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await admobRef.current.showInterstitial();
      interstitialReadyRef.current = false;
      prepareInterstitial();
      return true;
    } catch (error) {
      console.error('Error showing interstitial:', error);
      prepareInterstitial();
      return false;
    }
  }, [prepareInterstitial]);

  return {
    showBanner,
    hideBanner,
    prepareInterstitial,
    showInterstitial,
    isNativeApp: isNativeApp(),
  };
}
