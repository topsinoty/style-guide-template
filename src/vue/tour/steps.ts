export type TourStep = {
  title: string;
  body: string;
  target?: string;
  drawer?: boolean;
  tab?: string;
  area?: string;
};

const READ: TourStep[] = [
  {
    title: 'Sections',
    body: 'Jump to any part of the brand book. The link of the section you are reading is underlined.',
    target: '#cd-nav',
    drawer: false,
  },
  {
    title: 'Inspect any text',
    body: 'Hover over text, or select it, to see its HTML element, the text style that dresses it, and its font and size.',
    target: 'main > h1',
  },
  {
    title: 'Themes',
    body: 'Switch between the brand’s themes, such as light and dark. The whole page follows.',
    target: '#theme-toggle',
  },
  {
    title: 'Contrast',
    body: 'Each role’s text is checked against its background, and input and focus borders against the page, in every theme. Open this to see every pair and its ratio.',
    target: '.cd-contrast-button',
  },
];

export const EDIT_STEPS: TourStep[] = [
  {
    title: 'Welcome',
    body: 'This page is a brand book and its own editor. The tour shows where everything is in about a minute. Skip it any time; Help can start it again.',
    drawer: false,
  },
  ...READ,
  {
    title: 'Open the editor',
    body: 'Edit opens the editor beside the page. Every change shows on the page right away.',
    target: '#edit-toggle',
    drawer: false,
  },
  {
    title: 'Five tabs, in build order',
    body: 'Brand, Color, Type, Tokens and Assets. Working left to right builds a brand from nothing.',
    target: '#cd-drawer .ed-tabs',
    drawer: true,
    tab: 'Brand',
  },
  {
    title: 'Start from a preset or from blank',
    body: 'Replace with a preset loads a finished brand to adapt. Clear to blank leaves black, white and the spacing scale. Undo brings your work back either way.',
    drawer: true,
    tab: 'Brand',
    area: 'Start again',
  },
  {
    title: 'Write the brand book',
    body: 'Give each section its own text, such as logo rules or tone of voice, reorder sections, and add text-only ones.',
    drawer: true,
    tab: 'Brand',
    area: 'Guide sections',
  },
  {
    title: 'Pick the theme you edit',
    body: 'Color edits apply to the theme chosen here. Other themes keep only what differs from the default.',
    target: '#cd-drawer .ed-theme-bar',
    drawer: true,
    tab: 'Color',
  },
  {
    title: 'Palette',
    body: 'Add a color and its shades from 50 to 950 are generated around it. Select a shade to change it by hand.',
    drawer: true,
    tab: 'Color',
    area: 'Palette',
  },
  {
    title: 'Roles',
    body: 'Roles are what the interface uses: page, card, buttons, alerts. Point each part at a shade, or use “Fill every part from one shade”.',
    drawer: true,
    tab: 'Color',
    area: 'Roles',
  },
  {
    title: 'Type',
    body: 'Top to bottom: font files (from Fontsource or your own), font families, font sizes, then text styles. “Applies to” maps a style to an element such as Heading 1.',
    drawer: true,
    tab: 'Type',
    area: 'Fonts and type styles',
  },
  {
    title: 'Scales',
    body: 'Spacing and radius grow from a base. Change the base and every step follows; “Use standard steps” fills an empty scale.',
    drawer: true,
    tab: 'Tokens',
    area: 'Scales',
  },
  {
    title: 'Shadows and other tokens',
    body: 'Shadows can stack layers and differ per theme. Other tokens holds durations, easing and anything else.',
    drawer: true,
    tab: 'Tokens',
    area: 'Shadows',
  },
  {
    title: 'Assets',
    body: 'Logos, icons, favicons and groups of your own. Upload files, pick them from the library, or drop or paste them anywhere on the page.',
    drawer: true,
    tab: 'Assets',
    area: 'Asset groups',
  },
  {
    title: 'Undo and redo',
    body: 'Every edit can be undone, also with Ctrl+Z (Cmd+Z on a Mac). Edits are kept in this browser until you replace them.',
    target: '#undo-btn',
    drawer: true,
  },
  {
    title: 'See what readers see',
    body: 'View shows the brand book without the editor, the way it looks when you share it.',
    target: '#view-link',
    drawer: false,
  },
  {
    title: 'Keep and share your work',
    body: 'Save downloads the brand file as JSON, a brand kit ZIP with the file, CSS, fonts and assets, or the brand book as a PDF. Load opens a brand file again.',
    target: '#save-btn',
    drawer: false,
  },
  {
    title: 'Help',
    body: 'Help explains every part of the page and can start this tour again.',
    target: '#help-btn',
    drawer: false,
  },
];

export const READ_STEPS: TourStep[] = [
  {
    title: 'Welcome',
    body: 'This is a brand book: its colors, type, spacing and assets, styled with the brand itself. The tour takes under a minute.',
  },
  ...READ,
  {
    title: 'Back to editing',
    body: 'This view hides the editor. Go back to keep editing your draft.',
    target: '#view-link',
  },
  {
    title: 'Take it with you',
    body: 'Save downloads the brand file as JSON, a brand kit ZIP with the file, CSS, fonts and assets, or the brand book as a PDF.',
    target: '#save-btn',
  },
  {
    title: 'Help',
    body: 'Help explains every part of the page and can start this tour again.',
    target: '#help-btn',
  },
];
