import { apiRequest, jsonBody } from '../client'
import type {
  ApiAvailability,
  ApiNetworkAssociation,
  ApiNetworkInvitation,
  ApiWorkerAssignment,
  ApiWorkerDiscovery,
} from './types'

function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export type AssignmentPayload = {
  worker_id: string
  commitment_id: string
  role: string
  task_description: string
  start_time: string
  end_time: string
  reporting_time?: string | null
  location?: string
  instructions?: string
  compensation_paise?: number | null
  response_deadline?: string | null
  replaces_id?: string | null
}

export const networkApi = {
  discoverWorkers(params: { category?: string; city?: string; pin_code?: string; locality?: string }) {
    return apiRequest<ApiWorkerDiscovery[]>(`/network/workers/${queryString(params)}`)
  },
  workerDetail(userId: string) {
    return apiRequest<ApiWorkerDiscovery>(`/network/workers/${encodeURIComponent(userId)}/`)
  },

  listInvitations() {
    return apiRequest<ApiNetworkInvitation[]>('/network/invitations/')
  },
  inviteWorker(workerId: string, message: string) {
    return apiRequest<ApiNetworkInvitation>('/network/invitations/', {
      method: 'POST',
      ...jsonBody({ worker_id: workerId, message }),
    })
  },
  requestAssociation(managerId: string, message = '') {
    return apiRequest<ApiNetworkInvitation>('/network/invitations/', {
      method: 'POST',
      ...jsonBody({ manager_id: managerId, message }),
    })
  },
  respondToInvitation(invitationId: string, accept: boolean) {
    return apiRequest<ApiNetworkInvitation>(
      `/network/invitations/${encodeURIComponent(invitationId)}/${accept ? 'accept' : 'decline'}/`,
      { method: 'POST' },
    )
  },
  cancelInvitation(invitationId: string) {
    return apiRequest<ApiNetworkInvitation>(
      `/network/invitations/${encodeURIComponent(invitationId)}/cancel/`,
      { method: 'POST' },
    )
  },

  listAssociations(history = false) {
    return apiRequest<ApiNetworkAssociation[]>(`/network/associations/${history ? '?history=1' : ''}`)
  },
  endAssociation(associationId: string, reason: string) {
    return apiRequest<ApiNetworkAssociation>(
      `/network/associations/${encodeURIComponent(associationId)}/end/`,
      { method: 'POST', ...jsonBody({ reason }) },
    )
  },

  listAssignments(params: { commitment?: string; status?: string } = {}) {
    return apiRequest<ApiWorkerAssignment[]>(`/assignments/${queryString(params)}`)
  },
  assignment(assignmentId: string) {
    return apiRequest<ApiWorkerAssignment>(`/assignments/${encodeURIComponent(assignmentId)}/`)
  },
  createAssignment(payload: AssignmentPayload) {
    return apiRequest<ApiWorkerAssignment>('/assignments/', {
      method: 'POST',
      ...jsonBody(payload),
    })
  },
  availability(params: { worker_id: string; event_date: string; start_time: string; end_time: string }) {
    return apiRequest<ApiAvailability>(`/assignments/availability/${queryString(params)}`)
  },
  assignmentAction(assignmentId: string, action: 'accept' | 'decline' | 'start' | 'complete' | 'cancel', payload: { reason?: string; completion_notes?: string } = {}) {
    return apiRequest<ApiWorkerAssignment>(
      `/assignments/${encodeURIComponent(assignmentId)}/${action}/`,
      { method: 'POST', ...jsonBody(payload) },
    )
  },
}
