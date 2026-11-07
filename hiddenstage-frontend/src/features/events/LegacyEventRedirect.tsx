import { Navigate, useParams } from 'react-router-dom'
import { customerEventPath } from '../../app/routes/routePaths'

export default function LegacyEventRedirect() {
  const { requestId = '' } = useParams()
  return <Navigate to={customerEventPath(requestId)} replace />
}
