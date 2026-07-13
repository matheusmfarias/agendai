type PageScrollLockStyle = {
  left: string;
  overflow: string;
  overscrollBehavior: string;
  paddingRight: string;
  position: string;
  right: string;
  top: string;
  width: string;
};

export type PageScrollLockEnvironment = {
  bodyStyle: PageScrollLockStyle;
  computedBodyPaddingRight: string;
  documentWidth: number;
  htmlStyle: PageScrollLockStyle;
  scrollTo: (x: number, y: number) => void;
  scrollY: number;
  viewportWidth: number;
};

type ActivePageScrollLock = {
  bodyStyle: PageScrollLockStyle;
  htmlStyle: PageScrollLockStyle;
  previousBodyStyle: PageScrollLockStyle;
  previousHtmlStyle: PageScrollLockStyle;
  scrollTo: (x: number, y: number) => void;
  scrollY: number;
  tokens: Set<symbol>;
};

const activePageScrollLocks = new WeakMap<
  PageScrollLockStyle,
  ActivePageScrollLock
>();

function browserEnvironment(): PageScrollLockEnvironment {
  return {
    bodyStyle: document.body.style,
    computedBodyPaddingRight:
      window.getComputedStyle(document.body).paddingRight,
    documentWidth: document.documentElement.clientWidth,
    htmlStyle: document.documentElement.style,
    scrollTo: (x, y) => window.scrollTo(x, y),
    scrollY: window.scrollY,
    viewportWidth: window.innerWidth,
  };
}

function snapshotStyle(style: PageScrollLockStyle): PageScrollLockStyle {
  return {
    left: style.left,
    overflow: style.overflow,
    overscrollBehavior: style.overscrollBehavior,
    paddingRight: style.paddingRight,
    position: style.position,
    right: style.right,
    top: style.top,
    width: style.width,
  };
}

function restoreStyle(
  style: PageScrollLockStyle,
  snapshot: PageScrollLockStyle,
) {
  Object.assign(style, snapshot);
}

function applyPageScrollLock(environment: PageScrollLockEnvironment) {
  const { bodyStyle, htmlStyle, scrollY } = environment;
  const scrollbarWidth = Math.max(
    0,
    environment.viewportWidth - environment.documentWidth,
  );

  htmlStyle.overflow = "hidden";
  htmlStyle.overscrollBehavior = "none";
  bodyStyle.overflow = "hidden";
  bodyStyle.overscrollBehavior = "none";
  bodyStyle.position = "fixed";
  bodyStyle.top = `-${scrollY}px`;
  bodyStyle.left = "0";
  bodyStyle.right = "0";
  bodyStyle.width = "100%";

  if (scrollbarWidth > 0) {
    const currentPadding =
      Number.parseFloat(environment.computedBodyPaddingRight) || 0;
    bodyStyle.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }
}

export function lockPageScroll(
  environment: PageScrollLockEnvironment = browserEnvironment(),
) {
  const token = Symbol("page-scroll-lock");
  let activeLock = activePageScrollLocks.get(environment.bodyStyle);

  if (!activeLock) {
    activeLock = {
      bodyStyle: environment.bodyStyle,
      htmlStyle: environment.htmlStyle,
      previousBodyStyle: snapshotStyle(environment.bodyStyle),
      previousHtmlStyle: snapshotStyle(environment.htmlStyle),
      scrollTo: environment.scrollTo,
      scrollY: environment.scrollY,
      tokens: new Set<symbol>(),
    };
    applyPageScrollLock(environment);
    activePageScrollLocks.set(environment.bodyStyle, activeLock);
  }

  activeLock.tokens.add(token);

  return () => {
    const currentLock = activePageScrollLocks.get(environment.bodyStyle);
    if (!currentLock?.tokens.delete(token) || currentLock.tokens.size > 0) {
      return;
    }

    restoreStyle(currentLock.bodyStyle, currentLock.previousBodyStyle);
    restoreStyle(currentLock.htmlStyle, currentLock.previousHtmlStyle);
    activePageScrollLocks.delete(environment.bodyStyle);
    currentLock.scrollTo(0, currentLock.scrollY);
  };
}
