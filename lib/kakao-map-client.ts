declare global {
  interface Window {
    kakao?: any;
  }
}

const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

let kakaoLoaderPromise: Promise<any> | null = null;

export async function loadKakaoMapsSdk(): Promise<any> {
  if (typeof window === "undefined") {
    return null;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  if (!appKey) {
    throw new Error("카카오 지도 JavaScript 키가 설정되지 않았습니다.");
  }

  if (window.kakao?.maps) {
    return window.kakao;
  }

  if (kakaoLoaderPromise) {
    return kakaoLoaderPromise;
  }

  kakaoLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;

    const finalizeLoad = () => {
      if (!window.kakao?.maps) {
        kakaoLoaderPromise = null;
        reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
        return;
      }

      window.kakao.maps.load(() => resolve(window.kakao));
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" && window.kakao?.maps) {
        finalizeLoad();
        return;
      }

      existingScript.addEventListener("load", finalizeLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          kakaoLoaderPromise = null;
          reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        finalizeLoad();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        kakaoLoaderPromise = null;
        reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
}
