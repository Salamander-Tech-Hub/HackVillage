import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ThreeSphere from "../../frontend/components/ThreeSphere";

describe("ThreeSphere", () => {
  it("renders the wireframe sphere and diagonal rod structure", () => {
    const html = renderToStaticMarkup(React.createElement(ThreeSphere));

    expect(html).toContain("hero-sphere-container");
    expect(html).toContain("hero-sphere");
    expect(html).toContain("hero-sphere-ring");
    expect(html).toContain("hero-sphere-rod");
  });
});
