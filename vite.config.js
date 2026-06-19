import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [statePageRoutes(), react()]
});

function statePageRoutes() {
  const rewrite = (request, _response, next) => {
    const [pathname, query] = request.url.split("?");
    if (/^\/states\/?$/.test(pathname)) {
      request.url = `/states/index.html${query ? `?${query}` : ""}`;
    } else if (/^\/states\/[a-z-]+\/?$/.test(pathname)) {
      request.url = `${pathname.replace(/\/$/, "")}/index.html${query ? `?${query}` : ""}`;
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
