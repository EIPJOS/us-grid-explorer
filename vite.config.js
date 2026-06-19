import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const verificationToken = process.env.VITE_GOOGLE_SITE_VERIFICATION || env.VITE_GOOGLE_SITE_VERIFICATION;
  return {
    plugins: [statePageRoutes(), searchConsoleVerification(verificationToken), react()]
  };
});

function searchConsoleVerification(token) {
  return {
    name: "search-console-verification",
    transformIndexHtml() {
      if (!token) return [];
      return [{ tag: "meta", attrs: { name: "google-site-verification", content: token }, injectTo: "head" }];
    }
  };
}

function statePageRoutes() {
  const trustRoutes = new Set(["about", "methodology", "sources", "privacy", "terms", "corrections"]);
  const rewrite = (request, _response, next) => {
    const [pathname, query] = request.url.split("?");
    if (/^\/states\/?$/.test(pathname)) {
      request.url = `/states/index.html${query ? `?${query}` : ""}`;
    } else if (/^\/states\/[a-z-]+\/?$/.test(pathname)) {
      request.url = `${pathname.replace(/\/$/, "")}/index.html${query ? `?${query}` : ""}`;
    } else {
      const route = pathname.replaceAll("/", "");
      if (trustRoutes.has(route)) request.url = `/${route}/index.html${query ? `?${query}` : ""}`;
    }
    next();
  };

  return {
    name: "state-page-clean-urls",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    }
  };
}
