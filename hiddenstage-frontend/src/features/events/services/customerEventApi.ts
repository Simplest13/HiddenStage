import type { CustomerEvent, CreateEventInput, CustomerProfile, RequirementInput } from '../../../shared/api/customerContracts'
import { demoCustomerApi } from '../../customer/services/demoCustomerApi'

/** Replace this adapter with the approved backend implementation without changing event UI modules. */
export interface CustomerEventApi {
  listEvents(): Promise<CustomerEvent[]>
  getCustomerProfile(): Promise<CustomerProfile | null>
  getEvent(eventId: string): Promise<CustomerEvent | null>
  createEvent(input: CreateEventInput): Promise<CustomerEvent>
  updateEvent(eventId: string, input: CreateEventInput): Promise<CustomerEvent>
  uploadAttachment(file: File): Promise<{ id: string; name: string; type: string; size: number }>
  createServiceRequirement(eventId: string, input: RequirementInput): Promise<CustomerEvent>
}

export const customerEventApi: CustomerEventApi = {
  listEvents: () => demoCustomerApi.listEvents(),
  getCustomerProfile: () => demoCustomerApi.getCustomerProfile(),
  getEvent: (eventId) => demoCustomerApi.retrieveEvent(eventId),
  createEvent: (input) => demoCustomerApi.createEvent(input),
  updateEvent: (eventId, input) => demoCustomerApi.updateEvent(eventId, input),
  uploadAttachment: (file) => demoCustomerApi.uploadAttachment(file),
  createServiceRequirement: (eventId, input) => demoCustomerApi.createServiceRequirement(eventId, input),
}
