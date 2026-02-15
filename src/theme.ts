import { createTheme } from '@mui/material/styles';

/**
 * NOCO Performance brand green.
 * This is the single source of truth for the primary color.
 * Also referenced (by necessity as a literal) in:
 *   - index.html  <meta name="theme-color">
 *   - vite.config.ts  manifest.theme_color
 *   - src/index.css   --color-primary custom property
 */
export const PRIMARY_COLOR = '#056c01';

export const theme = createTheme({
  palette: {
    primary: {
      main: PRIMARY_COLOR,
    },
  },
}); 