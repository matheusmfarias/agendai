import { describe, expect, it, vi } from "vitest";

import {
  lockPageScroll,
  type PageScrollLockEnvironment,
} from "@/features/provider-notifications/page-scroll-lock";

function style(overrides: Partial<PageScrollLockEnvironment["bodyStyle"]> = {}) {
  return {
    left: "",
    overflow: "",
    overscrollBehavior: "",
    paddingRight: "",
    position: "",
    right: "",
    top: "",
    width: "",
    ...overrides,
  };
}

describe("lockPageScroll", () => {
  it("locks the page, compensates the scrollbar and restores prior state", () => {
    const bodyStyle = style({
      overflow: "clip",
      paddingRight: "1rem",
      position: "relative",
    });
    const htmlStyle = style({ overscrollBehavior: "auto" });
    const originalBody = { ...bodyStyle };
    const originalHtml = { ...htmlStyle };
    const scrollTo = vi.fn();

    const release = lockPageScroll({
      bodyStyle,
      computedBodyPaddingRight: "16px",
      documentWidth: 1180,
      htmlStyle,
      scrollTo,
      scrollY: 320,
      viewportWidth: 1200,
    });

    expect(bodyStyle).toMatchObject({
      left: "0",
      overflow: "hidden",
      overscrollBehavior: "none",
      paddingRight: "36px",
      position: "fixed",
      right: "0",
      top: "-320px",
      width: "100%",
    });
    expect(htmlStyle).toMatchObject({
      overflow: "hidden",
      overscrollBehavior: "none",
    });

    release();

    expect(bodyStyle).toEqual(originalBody);
    expect(htmlStyle).toEqual(originalHtml);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(0, 320);
  });

  it("keeps the first snapshot until nested locks release in LIFO order", () => {
    const bodyStyle = style({ overflow: "clip", paddingRight: "4px" });
    const htmlStyle = style({ overflow: "auto" });
    const originalBody = { ...bodyStyle };
    const originalHtml = { ...htmlStyle };
    const scrollTo = vi.fn();
    const firstEnvironment = {
      bodyStyle,
      computedBodyPaddingRight: "4px",
      documentWidth: 1180,
      htmlStyle,
      scrollTo,
      scrollY: 240,
      viewportWidth: 1200,
    };
    const releaseFirst = lockPageScroll(firstEnvironment);
    const releaseSecond = lockPageScroll({
      ...firstEnvironment,
      computedBodyPaddingRight: "24px",
      documentWidth: 1100,
      scrollY: 900,
    });

    releaseSecond();

    expect(bodyStyle.top).toBe("-240px");
    expect(bodyStyle.paddingRight).toBe("24px");
    expect(scrollTo).not.toHaveBeenCalled();

    releaseFirst();

    expect(bodyStyle).toEqual(originalBody);
    expect(htmlStyle).toEqual(originalHtml);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it("restores only after the last release when cleanup is out of order", () => {
    const bodyStyle = style({ position: "relative" });
    const htmlStyle = style({ overscrollBehavior: "auto" });
    const originalBody = { ...bodyStyle };
    const originalHtml = { ...htmlStyle };
    const scrollTo = vi.fn();
    const environment = {
      bodyStyle,
      computedBodyPaddingRight: "0px",
      documentWidth: 1200,
      htmlStyle,
      scrollTo,
      scrollY: 80,
      viewportWidth: 1200,
    };
    const releaseFirst = lockPageScroll(environment);
    const releaseSecond = lockPageScroll(environment);

    releaseFirst();
    releaseFirst();

    expect(bodyStyle.position).toBe("fixed");
    expect(scrollTo).not.toHaveBeenCalled();

    releaseSecond();

    expect(bodyStyle).toEqual(originalBody);
    expect(htmlStyle).toEqual(originalHtml);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith(0, 80);
  });

  it("preserves padding without a scrollbar and releases only once", () => {
    const bodyStyle = style({ paddingRight: "7px" });
    const htmlStyle = style();
    const scrollTo = vi.fn();
    const release = lockPageScroll({
      bodyStyle,
      computedBodyPaddingRight: "7px",
      documentWidth: 1200,
      htmlStyle,
      scrollTo,
      scrollY: 0,
      viewportWidth: 1200,
    });

    expect(bodyStyle.paddingRight).toBe("7px");
    release();
    release();
    expect(scrollTo).toHaveBeenCalledOnce();
  });
});
