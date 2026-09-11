import { createRoot } from "react-dom/client";
import Overlay from "./Overlay";
import contentStyles from "./content.css?inline";

function mount() {
  const host = document.createElement("div");
  host.id = "screen-snip-translate-root";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = contentStyles;
  shadow.appendChild(style);

  const appRoot = document.createElement("div");
  shadow.appendChild(appRoot);

  createRoot(appRoot).render(<Overlay />);
}

mount();
