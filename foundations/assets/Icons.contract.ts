import { defineIconsContract } from "../../contracts/assets.ts";

export const iconsContract = defineIconsContract({
  id: "foundation.icons",
  schemaVersion: 1,
  purpose: "Stable icon assets shared by Linden components.",
  keyline: {
    persistent: true,
    sizeOwner: "consumer-token",
    fit: "contain",
    color: "currentColor",
    swapGeometry: "fixed",
    decorativeByDefault: true,
  },
  icons: {
    "icon.plus": {
      source: { library: "lucide-react", exportName: "Plus" },
    },
    "icon.arrow-right": {
      source: { library: "lucide-react", exportName: "ArrowRight" },
    },
    "icon.loader-circle": {
      source: { library: "lucide-react", exportName: "LoaderCircle" },
    },
  },
});
