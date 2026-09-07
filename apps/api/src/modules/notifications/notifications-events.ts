export const NOTIFICATION_EVENTS = {
  NOTA_LANCADA: 'nota.lancada',
  AULA_COMECANDO: 'aula.comecando',
  BOLETO_DISPONIVEL: 'boleto.disponivel',
  PAGAMENTO_CONFIRMADO: 'pagamento.confirmado',
  PAGAMENTO_VENCIDO: 'pagamento.vencido',
  PROTOCOLO_RESPONDIDO: 'protocolo.respondido',
  DOCUMENTO_EMITIDO: 'documento.emitido',
  ATIVIDADE_PRAZO_PROXIMO: 'atividade.prazo_proximo',
} as const;

export type NotificationEventType =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

export interface NotificationEvent {
  type: NotificationEventType;
  userId: string;
  title: string;
  body: string;
}
