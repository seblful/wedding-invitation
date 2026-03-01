# AI Coding Rules & Frontend Best Practices

## Code Quality

- **Semantic HTML**: Use proper HTML5 elements for structure and accessibility
- **CSS Organization**: Group related styles and use meaningful class names
- **DRY Principle**: Don't repeat code; extract reusable components and utilities
- **Comments**: Write clear comments for complex logic, but keep code self-documenting

## Performance

- **Minimize HTTP Requests**: Combine files, use CSS sprites for icons
- **Optimize Images**: Compress images, use appropriate formats (webp, svg)
- **Lazy Loading**: Load assets on demand, defer non-critical resources
- **CSS Efficiency**: Avoid deep nesting, use class selectors over element selectors

## Responsive Design

- **Mobile-First**: Start with mobile design, progressively enhance for larger screens
- **Flexible Layouts**: Use flexbox and grid for layout
- **Viewport Meta Tag**: Always include viewport settings for mobile
- **Test Across Devices**: Verify design works on phones, tablets, desktops

## Accessibility

- **Alt Text**: Provide meaningful alt text for all images
- **Semantic Elements**: Use heading, nav, main, footer, article tags properly
- **Color Contrast**: Ensure sufficient contrast between text and background
- **Keyboard Navigation**: All interactive elements must work with keyboard

## JavaScript Best Practices

- **Unobtrusive JS**: Keep JavaScript separate from HTML
- **Event Delegation**: Use event bubbling to reduce event listeners
- **Avoid Global Variables**: Use modules and scoping to avoid conflicts
- **Progressive Enhancement**: Core functionality works without JavaScript

## Browser Compatibility

- **Cross-Browser Testing**: Test on Chrome, Firefox, Safari, Edge
- **Feature Detection**: Check for browser support before using new APIs
- **Fallbacks**: Provide alternatives for unsupported features
- **Vendor Prefixes**: Use autoprefixer tools for CSS compatibility

## Commit Messages

- **Format**: `type(scope): subject`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
- **Subject**: Imperative mood, no period, lowercase
- **Scope**: Optional, affected component or feature
- **Body**: Explain what and why, not how (optional)
- **Footer**: Reference issues (#123) or breaking changes (optional)

**Examples**:

- `feat(auth): add login validation`
- `fix(header): correct alignment on mobile`
- `docs: update deployment guide`
- `refactor(utils): simplify date formatting`
