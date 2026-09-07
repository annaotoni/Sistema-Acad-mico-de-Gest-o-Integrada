import { apiClient } from '@/lib/api-client';

export interface UserMe {
  id: string;
  email: string;
  role: 'ALUNO' | 'PROFESSOR' | 'SECRETARIA' | 'ADMIN' | 'SISTEMA';
  tenantId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface FeatureTab {
  key: string;
  name: string;
  order: number;
  configJson: unknown;
}
export interface FeaturesResponse {
  tabs: FeatureTab[];
  config: Record<string, unknown>;
}

export interface ApiClass {
  id: string;
  code: string;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'ENCERRADA';
  maxStudents: number | null;
  createdAt: string;
  discipline: {
    id: string;
    name: string;
    code: string;
    workloadHours: number;
    course: { id: string; name: string; code: string };
  };
  period: { id: string; name: string; startDate: string; endDate: string; isActive: boolean };
  _count: { enrollments: number; teacherAssignments: number };
}

export interface Assignment {
  id: string;
  classId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  maxScore: string;
  createdAt: string;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  fileUrl: string | null;
  submittedAt: string;
  isLate: boolean;
  score: string | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  label: string;
  value: string;
  gradedById: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  lessonId: string | null;
  present: boolean;
  date: string;
}

export interface LiveClass {
  id: string;
  classId: string;
  title: string;
  scheduledAt: string;
  videoLink: string | null;
  status: 'AGENDADA' | 'AO_VIVO' | 'ENCERRADA';
  createdAt: string;
}

export interface Invoice {
  id: string;
  studentId: string;
  classId: string | null;
  description: string;
  amount: string;
  dueDate: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  gatewayId: string | null;
  createdAt: string;
}

export interface PixResponse {
  qrCode: string;
  copyPaste: string;
}
export interface BoletoResponse {
  boletoUrl: string;
  digitableLine: string;
}

export interface Document {
  id: string;
  studentId: string;
  type: string;
  status: 'SOLICITADO' | 'EM_ANALISE' | 'EMITIDO' | 'RECUSADO';
  fileUrl: string | null;
  notes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  requestedAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  studentId: string;
  subject: string;
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'FECHADO';
  createdAt: string;
  closedAt: string | null;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export const dashApi = {
  me: () => apiClient.get<UserMe>('/users/me').then((r) => r.data),
  features: () => apiClient.get<FeaturesResponse>('/me/features').then((r) => r.data),
  classes: () => apiClient.get<ApiClass[]>('/classes').then((r) => r.data),
  assignments: (id: string) =>
    apiClient.get<Assignment[]>(`/classes/${id}/assignments`).then((r) => r.data),
  grades: (id: string) => apiClient.get<Grade[]>(`/classes/${id}/grades`).then((r) => r.data),
  attendance: (id: string) =>
    apiClient.get<AttendanceRecord[]>(`/classes/${id}/attendance`).then((r) => r.data),
  liveClasses: () => apiClient.get<LiveClass[]>('/live-classes/upcoming').then((r) => r.data),
  invoices: () => apiClient.get<Invoice[]>('/finance/invoices').then((r) => r.data),
  generatePix: (id: string) =>
    apiClient.post<PixResponse>(`/finance/invoices/${id}/pix`).then((r) => r.data),
  generateBoleto: (id: string) =>
    apiClient.post<BoletoResponse>(`/finance/invoices/${id}/boleto`).then((r) => r.data),
  documents: () => apiClient.get<Document[]>('/documents').then((r) => r.data),
  createDocument: (data: { type: string; description?: string }) =>
    apiClient.post<Document>('/documents', data).then((r) => r.data),
  reviewDocument: (id: string, data: { status: string; notes?: string }) =>
    apiClient.post(`/documents/${id}/review`, data).then((r) => r.data),
  tickets: () => apiClient.get<Ticket[]>('/tickets').then((r) => r.data),
  ticket: (id: string) => apiClient.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
  createTicket: (data: { subject: string }) =>
    apiClient.post<Ticket>('/tickets', data).then((r) => r.data),
  sendMessage: (id: string, content: string) =>
    apiClient.post<TicketMessage>(`/tickets/${id}/messages`, { content }).then((r) => r.data),
  updateTicket: (id: string, status: string) =>
    apiClient.patch(`/tickets/${id}/status`, { status }).then((r) => r.data),
  notifCount: () => apiClient.get<{ count: number }>('/notifications/count').then((r) => r.data),
  notifs: () => apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
  chat: (message: string, conversationId?: string) =>
    apiClient
      .post<{ reply: string; conversationId: string }>('/assistant/chat', {
        message,
        conversationId,
      })
      .then((r) => r.data),
};
