import { Link, useMatches } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'

export default function SystemPages() {
  const page = (useMatches().at(-1)?.handle as { page?: string } | undefined)?.page
  const forbidden = page === 'forbidden'
  return <main className="system-page"><span className="system-page__code">{forbidden ? '403' : '404'}</span><span className="eyebrow eyebrow--accent">{forbidden ? 'ACCESS NOT AVAILABLE' : 'A LITTLE OFF THE MAP'}</span><h1>{forbidden ? 'This space is for an approved administrator.' : 'We can’t find that page.'}</h1><p>{forbidden ? 'Your account does not have access to this area.' : 'The page may have moved, or the address may need another look.'}</p><Link className="button button--primary" to={routes.home}>Return to HiddenStage <span aria-hidden="true">→</span></Link></main>
}
