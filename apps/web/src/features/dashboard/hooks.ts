import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashApi } from './api';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: dashApi.me, staleTime: 300_000 });
export const useFeatures = () =>
  useQuery({ queryKey: ['features'], queryFn: dashApi.features, staleTime: 300_000 });
export const useClasses = () =>
  useQuery({ queryKey: ['classes'], queryFn: dashApi.classes, staleTime: 60_000 });
export const useAssignments = (id: string) =>
  useQuery({
    queryKey: ['assignments', id],
    queryFn: () => dashApi.assignments(id),
    enabled: !!id,
    staleTime: 60_000,
  });
export const useGrades = (id: string) =>
  useQuery({
    queryKey: ['grades', id],
    queryFn: () => dashApi.grades(id),
    enabled: !!id,
    staleTime: 60_000,
  });
export const useAttendance = (id: string) =>
  useQuery({
    queryKey: ['attendance', id],
    queryFn: () => dashApi.attendance(id),
    enabled: !!id,
    staleTime: 60_000,
  });
export const useLiveClasses = () =>
  useQuery({
    queryKey: ['live-classes'],
    queryFn: dashApi.liveClasses,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
export const useInvoices = () =>
  useQuery({ queryKey: ['invoices'], queryFn: dashApi.invoices, staleTime: 30_000 });
export const useDocuments = () =>
  useQuery({ queryKey: ['documents'], queryFn: dashApi.documents, staleTime: 30_000 });
export const useTickets = () =>
  useQuery({ queryKey: ['tickets'], queryFn: dashApi.tickets, staleTime: 30_000 });
export const useTicket = (id: string) =>
  useQuery({
    queryKey: ['ticket', id],
    queryFn: () => dashApi.ticket(id),
    enabled: !!id,
    staleTime: 10_000,
  });
export const useNotifCount = () =>
  useQuery({
    queryKey: ['notif-count'],
    queryFn: dashApi.notifCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-count'] }),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashApi.createTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useSendMessage(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => dashApi.sendMessage(ticketId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashApi.createDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useGeneratePix() {
  return useMutation({ mutationFn: dashApi.generatePix });
}

export function useGenerateBoleto() {
  return useMutation({ mutationFn: dashApi.generateBoleto });
}
