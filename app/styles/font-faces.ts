import sourceSansProLatin200Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-200-normal.woff';
import sourceSansProLatin200Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-200-normal.woff2';
import sourceSansProLatin300Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-300-normal.woff';
import sourceSansProLatin300Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-300-normal.woff2';
import sourceSansProLatin400Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-400-normal.woff';
import sourceSansProLatin400Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-400-normal.woff2';
import sourceSansProLatin600Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-600-normal.woff';
import sourceSansProLatin600Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-600-normal.woff2';
import sourceSansProLatin700Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-700-normal.woff';
import sourceSansProLatin700Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-700-normal.woff2';
import sourceSansProLatin900Woff from '~/fonts/source-sans-pro/source-sans-pro-latin-900-normal.woff';
import sourceSansProLatin900Woff2 from '~/fonts/source-sans-pro/source-sans-pro-latin-900-normal.woff2';

export const sourceSansProFontFaces = `
  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 200;
    src: url(${sourceSansProLatin200Woff2}) format('woff2'), url(${sourceSansProLatin200Woff}) format('woff');
  }

  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 300;
    src: url(${sourceSansProLatin300Woff2}) format('woff2'), url(${sourceSansProLatin300Woff}) format('woff');
  }

  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 400;
    src: url(${sourceSansProLatin400Woff2}) format('woff2'), url(${sourceSansProLatin400Woff}) format('woff');
  }

  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 600;
    src: url(${sourceSansProLatin600Woff2}) format('woff2'), url(${sourceSansProLatin600Woff}) format('woff');
  }

  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 700;
    src: url(${sourceSansProLatin700Woff2}) format('woff2'), url(${sourceSansProLatin700Woff}) format('woff');
  }

  @font-face {
    font-family: 'Source Sans Pro';
    font-style: normal;
    font-display: swap;
    font-weight: 900;
    src: url(${sourceSansProLatin900Woff2}) format('woff2'), url(${sourceSansProLatin900Woff}) format('woff');
  }
`;
