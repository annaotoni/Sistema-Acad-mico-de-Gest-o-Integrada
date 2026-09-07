-- Adiciona gateway_id em payments para idempotência de webhooks do gateway de pagamento.
-- NULL é permitido (baixas manuais não têm event ID). UNIQUE no PostgreSQL ignora NULLs.
ALTER TABLE "payments" ADD COLUMN "gateway_id" TEXT;
CREATE UNIQUE INDEX "payments_gateway_id_key" ON "payments"("gateway_id");
