# Design System

## Visual direction

An editorial event-planning identity: warm paper, tactile earth tones, generous whitespace, quiet linework, and original CSS-built decorative compositions. The homepage contains no provider claims, ratings, testimonials, or invented marketplace metrics.

Homepage service labels are illustrative placeholders only; they are not an approved service taxonomy or connected catalogue.

## Tokens

Defined in `src/index.css`:

- Canvas `#ebe3cf`, paper `#f7f3e9`, ink `#24231f`, accent `#8b4d32`.
- Supporting colors for muted text, borders, sage, success, warning, and error states.
- Four-pixel spacing scale from `--space-1` through `--space-24`.
- Small, medium, large, extra-large, and pill radii.
- Soft and lifted shadows.
- Tablet and desktop breakpoints at 760px and 1080px; responsive rules adapt around those widths.
- System and Georgia/Palatino fallbacks keep typography local and avoid remote font requests.

## Shared controls

`src/shared/ui/` includes Button/ButtonLink, labelled Input, Textarea, Select, Checkbox, Radio, Card, Badge, Avatar, Modal, Drawer, Dropdown, Tabs, Breadcrumb, Skeleton, Spinner, EmptyState, ErrorState, and ToastProvider/useToast. Controls use native semantics, visible focus, and responsive styles. Route and access semantics remain outside these generic components.

## Responsive and motion behavior

The public navigation becomes a keyboard-operable disclosure on narrow screens. Workspace navigation becomes an off-canvas sidebar with a scrim. Layouts collapse to one column, and `prefers-reduced-motion` disables nonessential movement.
