// Runs before styles/first paint, independently of storage and session restoration.
export const nativeSplashScript = `try{if(/Android/i.test(navigator.userAgent)&&["standalone","fullscreen","minimal-ui"].some(function(m){return matchMedia("(display-mode: "+m+")").matches}))document.documentElement.dataset.nativeSplash="true"}catch(e){}`;
