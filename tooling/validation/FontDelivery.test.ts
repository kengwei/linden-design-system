import { describe, expect, it } from "vitest";
import { defineFontsContract, type FontsContract } from "../../contracts/fonts.ts";
import { fontsContract } from "../../foundations/assets/Fonts.contract.ts";
import { generateFontOutputs } from "../../generators/fonts.ts";

describe("Geist delivery boundary", () => {
  it("pins the official package, release, license, and portable binaries", () => {
    expect(fontsContract.source.npm).toMatchObject({
      name: "geist",
      version: "1.7.2",
      sha256: "88cbfaca51646078f3172802643691bb8fe2df15ca4c455b1b101e49b7d469a6",
    });
    expect(fontsContract.source.release.sha256).toBe(
      "7fc800d2ac6b92844895196e5041aca55d814c15db70c44f79b3b83ab82b04e2",
    );
    expect(fontsContract.license.id).toBe("OFL-1.1");
    expect(fontsContract.assets).toHaveLength(8);
    expect(fontsContract.assets.filter((asset) => asset.format === "woff2")).toHaveLength(4);
    expect(fontsContract.assets.filter((asset) => asset.format === "ttf")).toHaveLength(4);
    expect(new Set(fontsContract.assets.map((asset) => asset.style))).toEqual(
      new Set(["normal", "italic"]),
    );
    for (const asset of fontsContract.assets) {
      expect(asset.weight).toEqual({ min: 100, max: 900 });
    }
  });

  it("emits renderer-independent web faces and explicit fallbacks", () => {
    const [output] = generateFontOutputs(fontsContract);
    expect(output.path).toBe("foundations/assets/Fonts.css");
    expect(output.contents.match(/@font-face/g)).toHaveLength(4);
    expect(output.contents).toContain('font-family: "Geist";');
    expect(output.contents).toContain('font-family: "Geist Mono";');
    expect(output.contents).toContain("font-style: normal;");
    expect(output.contents).toContain("font-style: italic;");
    expect(output.contents).toContain("font-weight: 100 900;");
    expect(output.contents).toContain(
      '--linden-font-family-base-sans: "Geist", -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif;',
    );
    expect(output.contents).toContain(
      '--linden-font-family-base-mono: "Geist Mono", "SFMono-Regular", "Roboto Mono", "Menlo", "Monaco", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;',
    );
    expect(output.contents).not.toContain("node_modules");
  });

  it("fails closed when a checked-in binary digest drifts", () => {
    const invalid = defineFontsContract({
      ...fontsContract,
      assets: fontsContract.assets.map((asset, index) =>
        index === 0 ? { ...asset, sha256: "0".repeat(64) } : asset,
      ),
    } as FontsContract);
    expect(() => generateFontOutputs(invalid)).toThrow(/expected 000000/);
  });
});
