import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: PropsWithChildren) {
  // SDK 58: generated styles, fonts, metadata, and the client bundle are passed
  // through the document context. Without these nodes the HTML renders but no
  // JavaScript loads, leaving the app stuck on its pre-hydration state.
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="de" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#004191" />
        <meta name="application-name" content="University Assistant" />
        <meta name="apple-mobile-web-app-title" content="University Assistant" />
        <meta name="format-detection" content="telephone=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const responsiveBackground = `
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  background-color: #F3F6F8;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
/* Links and pressable surfaces should feel native to the browser. */
a {
  color: inherit;
  text-decoration: none;
}
a[href], [role="link"], [role="button"] {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[aria-disabled="true"], [data-disabled="true"] {
  cursor: default;
}
/* Keep keyboard navigation visible without showing rings on mouse clicks. */
:focus:not(:focus-visible) {
  outline: none;
}
:focus-visible {
  outline: 2px solid #00BEFF;
  outline-offset: 2px;
  border-radius: 6px;
}
::selection {
  background: rgba(0, 190, 255, 0.28);
}
/* Slim, theme-neutral scrollbars instead of the macOS overlay bars. */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 65, 145, 0.22) transparent;
}
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0, 65, 145, 0.22);
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 65, 145, 0.38);
  background-clip: padding-box;
}
input, textarea {
  caret-color: #004191;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}`;
