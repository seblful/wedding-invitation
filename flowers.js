/**
 * Every corner flower, one entry each — the single owner of a flower's facts.
 *
 * A flower used to be described in four places at once: `public/custom.css`
 * held its start position and both widths, the `FLOWERS` table in
 * `public/js/floral-decor.js` held its scroll target, `public/index.html` held
 * its `<img>` and asset, and which edge it was anchored to was declared in the
 * stylesheet and recovered at runtime with `getComputedStyle`. Nothing checked
 * the three against each other, which is how `.p-br-c2` kept a position entry,
 * two stylesheet rules and an image after its `<img>` was deleted.
 *
 * Now `src/render.js` renders the whole floral block from this table, so a
 * flower's placement is in the markup on first paint and
 * `public/js/floral-decor.js` reads its target off the element it decorates —
 * the same shape as `data-wedding-date` and `data-map-embed`.
 *
 * Coordinates are percentages of the corner group.
 *
 * - `x` is always measured from the group's **left** edge, at both ends of the
 *   animation. A right-anchored flower is rendered at `right: (100 - x)%`.
 *   `start.x` used to be spelled in the anchored edge's own space while the
 *   target was spelled from the left, which is why the runtime had to ask the
 *   stylesheet which edge it was looking at.
 * - `y` is measured from whichever edge `anchor.y` names.
 *
 * `start` is where the flowers sit before the hero scrolls away; `target` is
 * where they come to rest, and it differs per breakpoint so nothing clips off
 * a narrow screen. Widths are in `vw`.
 */

'use strict';

/**
 * @typedef {object} Flower
 * @property {string} corner which `.corner-group` it belongs to
 * @property {string} asset filename under `public/images/background/`
 * @property {{ width: number, height: number }} intrinsic the image's own size
 * @property {boolean} cropped cross-fades instead of moving
 * @property {{ x: 'left' | 'right', y: 'top' | 'bottom' }} anchor
 * @property {{ x: number, y: number }} start
 * @property {{ desktop: { x: number, y: number }, mobile: { x: number, y: number } }} target
 * @property {{ desktop: number, mobile: number }} width in `vw`
 */

/**
 * The group element each corner renders into, in render order.
 *
 * The class names are spelled out rather than composed from the corner name
 * because Tailwind purges any rule in `@layer components` whose class it
 * cannot find in a scanned file — and `tailwind.config.js` scans this one.
 * A `${corner}-group` template would leave the four group rules out of the
 * built stylesheet with nothing to say so.
 */
const CORNER_GROUP_CLASS = Object.freeze({
  'top-left': 'corner-group top-left-group',
  'top-right': 'corner-group top-right-group',
  'bottom-left': 'corner-group bottom-left-group',
  'bottom-right': 'corner-group bottom-right-group',
});

/** The four corners, in the order they are rendered. */
const CORNERS = Object.freeze(Object.keys(CORNER_GROUP_CLASS));

/** Every flower on the page. @type {readonly Flower[]} */
const FLOWERS = Object.freeze([
  Object.freeze({
    corner: 'top-left',
    asset: 'TopLeft_1.png',
    intrinsic: { width: 1402, height: 1038 },
    cropped: false,
    anchor: { x: 'left', y: 'top' },
    start: { x: 1, y: 13 },
    target: {
      desktop: { x: 0, y: 20 },
      mobile: { x: 4, y: 20 },
    },
    width: { desktop: 16, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-left',
    asset: 'TopLeft_2.png',
    intrinsic: { width: 1580, height: 988 },
    cropped: false,
    anchor: { x: 'left', y: 'top' },
    start: { x: 25, y: 10 },
    target: {
      desktop: { x: 8, y: 3 },
      mobile: { x: 10, y: 4 },
    },
    width: { desktop: 18, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-left',
    asset: 'TopLeft_3.png',
    intrinsic: { width: 1000, height: 1155 },
    cropped: false,
    anchor: { x: 'left', y: 'top' },
    start: { x: 14, y: 25 },
    target: {
      desktop: { x: 12, y: 40 },
      mobile: { x: 13, y: 40 },
    },
    width: { desktop: 11, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-left',
    asset: 'TopLeftCropped_1.png',
    intrinsic: { width: 1714, height: 619 },
    cropped: true,
    anchor: { x: 'left', y: 'top' },
    start: { x: 11, y: 0 },
    target: {
      desktop: { x: 3, y: 2 },
      mobile: { x: 6, y: 3 },
    },
    width: { desktop: 18, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-right',
    asset: 'TopRight_1.png',
    intrinsic: { width: 1860, height: 1083 },
    cropped: false,
    anchor: { x: 'right', y: 'top' },
    start: { x: 81, y: 20 },
    target: {
      desktop: { x: 75, y: 27 },
      mobile: { x: 84, y: 28 },
    },
    width: { desktop: 19, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-right',
    asset: 'TopRight_2.png',
    intrinsic: { width: 1517, height: 1070 },
    cropped: false,
    anchor: { x: 'right', y: 'top' },
    start: { x: 94, y: 2 },
    target: {
      desktop: { x: 82, y: 3 },
      mobile: { x: 90, y: 4 },
    },
    width: { desktop: 16, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-right',
    asset: 'TopRightCropped_1.png',
    intrinsic: { width: 1089, height: 929 },
    cropped: true,
    anchor: { x: 'right', y: 'top' },
    start: { x: 72, y: 0 },
    target: {
      desktop: { x: 80, y: 22 },
      mobile: { x: 86, y: 22 },
    },
    width: { desktop: 11, mobile: 13 },
  }),
  Object.freeze({
    corner: 'top-right',
    asset: 'TopRightCropped_2.png',
    intrinsic: { width: 489, height: 893 },
    cropped: true,
    anchor: { x: 'right', y: 'top' },
    start: { x: 100, y: 17 },
    target: {
      desktop: { x: 80, y: 2 },
      mobile: { x: 88, y: 3 },
    },
    width: { desktop: 5, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-left',
    asset: 'BottomLeft_1.png',
    intrinsic: { width: 1502, height: 1470 },
    cropped: false,
    anchor: { x: 'left', y: 'bottom' },
    start: { x: 2, y: 16 },
    target: {
      desktop: { x: 0, y: 17 },
      mobile: { x: 6, y: 17 },
    },
    width: { desktop: 16, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-left',
    asset: 'BottomLeft_2.png',
    intrinsic: { width: 1540, height: 1246 },
    cropped: false,
    anchor: { x: 'left', y: 'bottom' },
    start: { x: 20, y: 10 },
    target: {
      desktop: { x: 11, y: 0 },
      mobile: { x: 13, y: 2 },
    },
    width: { desktop: 15, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-left',
    asset: 'BottomLeftCropped_1.png',
    intrinsic: { width: 734, height: 480 },
    cropped: true,
    anchor: { x: 'left', y: 'bottom' },
    start: { x: 0, y: 0 },
    target: {
      desktop: { x: 3, y: 2 },
      mobile: { x: 6, y: 3 },
    },
    width: { desktop: 8, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-left',
    asset: 'BottomLeftCropped_2.png',
    intrinsic: { width: 1036, height: 332 },
    cropped: true,
    anchor: { x: 'left', y: 'bottom' },
    start: { x: 31, y: 0 },
    target: {
      desktop: { x: 15, y: 12 },
      mobile: { x: 16, y: 12 },
    },
    width: { desktop: 11, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-right',
    asset: 'BottomRight_1.png',
    intrinsic: { width: 2009, height: 1581 },
    cropped: false,
    anchor: { x: 'right', y: 'bottom' },
    start: { x: 79, y: 0 },
    target: {
      desktop: { x: 75, y: 0 },
      mobile: { x: 82, y: 2 },
    },
    width: { desktop: 20, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-right',
    asset: 'BottomRight_2.png',
    intrinsic: { width: 1433, height: 1524 },
    cropped: false,
    anchor: { x: 'right', y: 'bottom' },
    start: { x: 96, y: 17 },
    target: {
      desktop: { x: 85, y: 26 },
      mobile: { x: 86, y: 27 },
    },
    width: { desktop: 14, mobile: 13 },
  }),
  Object.freeze({
    corner: 'bottom-right',
    asset: 'BottomRightCropped_1.png',
    intrinsic: { width: 868, height: 565 },
    cropped: true,
    anchor: { x: 'right', y: 'bottom' },
    start: { x: 100, y: 0 },
    target: {
      desktop: { x: 80, y: 2 },
      mobile: { x: 88, y: 3 },
    },
    width: { desktop: 9, mobile: 13 },
  }),
]);

module.exports = { CORNERS, CORNER_GROUP_CLASS, FLOWERS };
