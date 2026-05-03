import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './templates/**/*.liquid',
    './blocks/**/*.liquid',
    './frontend/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        edm: {
          coral:       '#E8704A',
          'coral-lt':  '#F2A58E',
          rose:        '#F0C4B8',
          yellow:      '#F5C842',
          caribbean:   '#3BAEC5',
          gold:        '#C9903A',
          cream:       '#FBF7F2',
          sand:        '#F5EDE4',
          brown:       '#6B4E3D',
          dark:        '#1C1410',
        },
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}

export default config
