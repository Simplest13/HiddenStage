# Route Map

Path constants live in `src/app/routes/routePaths.ts`; `src/app/router/router.tsx` defines the single route tree and lazy feature modules.

| Area | Route | Page / access |
|---|---|---|
| Public | `/` | Homepage |
| Public | `/services` | Filterable demo service category discovery |
| Public | `/services/:categorySlug` | Service category detail and related demo providers |
| Public | `/providers` | Searchable demo provider directory |
| Public | `/providers/:providerId` | Demo provider profile |
| Public | `/how-it-works` | Process overview |
| Public | `/for-professionals` | Professional introduction |
| Public | `/about` | About page |
| Public | `/contact` | Validated local-only contact form preview |
| Public | `/help` | Searchable preview help topics |
| Public | `/privacy` | Draft privacy information requiring legal review |
| Public | `/terms` | Draft terms requiring legal review |
| Authentication | `/auth/login` | Sign-in placeholder |
| Authentication | `/auth/register` | Registration placeholder |
| Authentication | `/auth/verify-email` | Verification placeholder |
| Authentication | `/auth/forgot-password` | Password-reset request placeholder |
| Authentication | `/auth/reset-password` | Password-reset placeholder |
| Customer | `/app/customer` | Authenticated shell |
| Customer | `/app/customer/requests` | Authenticated shell |
| Customer | `/app/customer/requests/new` | Authenticated shell |
| Customer | `/app/customer/requests/:requestId` | Authenticated shell |
| Customer | `/app/customer/quotes` | Authenticated shell |
| Customer | `/app/customer/commitments` | Authenticated shell |
| Provider | `/app/provider` | Authenticated shell |
| Provider | `/app/provider/profile` | Authenticated shell |
| Provider | `/app/provider/coverage` | Authenticated shell |
| Provider | `/app/provider/requests` | Authenticated shell |
| Provider | `/app/provider/quotes` | Authenticated shell |
| Provider | `/app/provider/commitments` | Authenticated shell |
| Business | `/app/business` | Authenticated shell |
| Business | `/app/business/profile` | Authenticated shell |
| Business | `/app/business/representatives` | Authenticated shell |
| Business | `/app/business/verification` | Authenticated shell |
| Admin | `/app/admin` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/businesses` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/reviews` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/audit` | Authenticated and `ADMIN` role |
| System | `/403` | Forbidden page |
| System | `*` | Not-found page |

The workspace pages are structural placeholders. This route map does not assert that the represented operations or server features are implemented.
