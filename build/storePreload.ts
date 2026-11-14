import type { Plugin } from "vite";
import pwaManifest from "../api/pwa-manifest.js";
import { startupShell } from "./startupShell.ts";
import { SITE_PALETTE_IDS } from "../src/data/types.ts";
import { darkPaletteFor } from "../src/utils/darkPalettes.ts";

/** Discover the hashed Store chunk in the document, before the main entry executes. */
export function storePreload(source: string, promptNamespace: string): Plugin {
  const createThemeScript = (preloadHrefs: string[] = []) => {
    const viewerKey = JSON.stringify(`cc.viewer.v1:${source}`);
    const hrefs = JSON.stringify(preloadHrefs);
    const darkColors = JSON.stringify(
      Object.fromEntries(SITE_PALETTE_IDS.map((id) => [id, darkPaletteFor(id).colors])),
    );
    const namespace = JSON.stringify(promptNamespace);
    return `try{if(localStorage.getItem("cc.experimental.scrollbars.v1")==="true")document.documentElement.dataset.scrollbars="visible";var r=document.documentElement,u=localStorage.getItem(${viewerKey}),s=${JSON.stringify(source)},k=function(n){return n+":"+s+":"+(u?"user:"+u:"visitor")},c=u?localStorage.getItem(k("cc.palette.v1")):"candy",a=localStorage.getItem(k("cc.appearance.v1"))||(u&&c==="midnight"?"dark":"system"),d=${darkColors};c=d[c]?c:"candy";r.dataset.palette=c;r.dataset.mode=a==="dark"||(a==="system"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";document.cookie="cc_pwa_theme="+c+"-"+r.dataset.mode+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");if(r.dataset.mode==="dark")Object.entries(d[c]).forEach(function(e){r.style.setProperty("--color-"+e[0],e[1])});if(location.pathname!=="/"&&location.pathname!=="/about")r.dataset.startupSignin="true";if(u&&/^\\/(discover|developers|apps|feeds?|community|milestones|leaderboard|profile|settings)(\\/|$)/.test(location.pathname)){r.dataset.startupStore="true";var q=location.pathname.replace(/\\/$/,""),v=/^\\/(apps|discover)\\//.test(q)?"project":/^\\/developers\\//.test(q)||q==="/profile"?"profile":q==="/developers"?"developers":q==="/leaderboard"?"leaderboard":q==="/settings"?"settings":/^\\/(feeds?|community|milestones)$/.test(q)?"feeds":"discover";r.dataset.startupView=v;if(localStorage.getItem("codecanvas:submission-prompt:"+${namespace}+":"+u)==="hidden")r.dataset.startupPromptHidden="true";${hrefs}.forEach(function(h){if(!document.querySelector('link[rel="modulepreload"][href="'+h+'"]')){var p=document.createElement("link");p.rel="modulepreload";p.href=h;p.fetchPriority="low";document.head.appendChild(p)}})}}catch(e){}`;
  };
  return {
    name: "codecanvas-store-preload",
    enforce: "post",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] === "/manifest.webmanifest")
          return pwaManifest(request, response);
        next();
      });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] === "/manifest.webmanifest")
          return pwaManifest(request, response);
        if (request.url?.split("?")[0] !== "/startup-theme.js") return next();
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        response.setHeader("Cache-Control", "no-cache");
        response.end(createThemeScript());
      });
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /(<meta charset="utf-8"\s*\/?>)/,
          '$1<script src="/startup-theme.js"></script>',
        );
      },
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const store = Object.values(bundle).find(
          (file) =>
            file.type === "chunk" &&
            file.facadeModuleId?.replaceAll("\\", "/").endsWith("/src/pages/Store.tsx"),
        );
        const html = bundle["index.html"];
        if (!store || html?.type !== "asset")
          this.error("Could not prepare the Store preload hint.");
        // modulepreload does not reliably fetch a module's dependencies recursively.
        // Discover needs this entire static graph before it can render its first card.
        const imports = new Set<string>();
        const collectImports = (name: string) => {
          if (imports.has(name)) return;
          const chunk = bundle[name];
          // The entry already has a normal-priority script tag in the document.
          if (chunk?.type !== "chunk" || chunk.isEntry) return;
          imports.add(name);
          chunk.imports.forEach(collectImports);
        };
        collectImports(store.fileName);
        this.emitFile({
          type: "asset",
          fileName: "startup-theme.js",
          source: createThemeScript([...imports].map((name) => `/${name}`)),
        });
        const root = /(<div\s+id="root"[^>]*>)[\s\S]*?(<\/div>\s*<\/body>)/;
        const content = String(html.source);
        if (!root.test(content)) this.error("Could not prepare the initial HTML shell.");
        html.source = content.replace(root, `$1${startupShell()}$2`);
      },
    },
  };
}
