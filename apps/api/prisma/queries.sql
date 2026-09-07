-- ═══════════════════════════════════════════════════════════════════════════
-- SAGI — Consultas SQL para verificação e inspeção dos dados do seed
-- Banco: PostgreSQL  |  Schema: public
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Usuários ────────────────────────────────────────────────────────────────

-- Todos os usuários do sistema (sem hash de senha)
SELECT id, email, role, status, tenant_id, email_verified_at, created_at
FROM users
ORDER BY role, email;

-- Contagem por role
SELECT role, COUNT(*) AS total
FROM users
GROUP BY role
ORDER BY role;


-- ─── Turmas com Disciplina e Período ─────────────────────────────────────────

-- Visão completa de cada turma
SELECT
  c.id,
  c.code AS turma_code,
  d.name AS disciplina,
  d.code AS disc_code,
  co.name AS curso,
  p.name AS periodo,
  c.status,
  c.max_students,
  COUNT(DISTINCT e.id)  AS matriculados,
  COUNT(DISTINCT ta.id) AS professores
FROM classes c
JOIN disciplines d   ON c.discipline_id = d.id
JOIN courses co      ON d.course_id = co.id
JOIN academic_periods p ON c.period_id = p.id
LEFT JOIN enrollments e  ON e.class_id = c.id AND e.status = 'ATIVA'
LEFT JOIN teacher_assignments ta ON ta.class_id = c.id
GROUP BY c.id, c.code, d.name, d.code, co.name, p.name, c.status, c.max_students
ORDER BY p.name DESC, d.name, c.code;


-- ─── Matrículas por Aluno ────────────────────────────────────────────────────

SELECT
  u.email AS aluno,
  d.name  AS disciplina,
  c.code  AS turma,
  e.status AS matricula_status
FROM enrollments e
JOIN users u        ON e.student_id = u.id
JOIN classes c      ON e.class_id = c.id
JOIN disciplines d  ON c.discipline_id = d.id
ORDER BY u.email, d.name;


-- ─── Professores por Turma ───────────────────────────────────────────────────

SELECT
  u.email AS professor,
  d.name  AS disciplina,
  c.code  AS turma,
  p.name  AS periodo
FROM teacher_assignments ta
JOIN users u            ON ta.teacher_id = u.id
JOIN classes c          ON ta.class_id = c.id
JOIN disciplines d      ON c.discipline_id = d.id
JOIN academic_periods p ON c.period_id = p.id
ORDER BY u.email, d.name;


-- ─── Atividades com Contagem de Entregas ─────────────────────────────────────

SELECT
  a.title                                  AS atividade,
  d.name                                   AS disciplina,
  c.code                                   AS turma,
  a.due_date,
  a.max_score,
  CASE WHEN a.due_date < NOW() THEN 'Encerrada' ELSE 'Aberta' END AS situacao,
  COUNT(s.id)                              AS entregas,
  COUNT(s.id) FILTER (WHERE s.is_late)    AS atrasadas,
  COUNT(s.id) FILTER (WHERE s.score IS NOT NULL) AS corrigidas
FROM assignments a
JOIN classes c     ON a.class_id = c.id
JOIN disciplines d ON c.discipline_id = d.id
LEFT JOIN submissions s ON s.assignment_id = a.id
GROUP BY a.id, a.title, d.name, c.code, a.due_date, a.max_score
ORDER BY a.due_date;


-- ─── Boletim por Aluno ────────────────────────────────────────────────────────

SELECT
  u.email  AS aluno,
  d.name   AS disciplina,
  c.code   AS turma,
  g.label  AS avaliacao,
  g.value  AS nota
FROM grades g
JOIN users u       ON g.student_id = u.id
JOIN classes c     ON g.class_id = c.id
JOIN disciplines d ON c.discipline_id = d.id
ORDER BY u.email, d.name, g.label;

-- Média por aluno por disciplina
SELECT
  u.email     AS aluno,
  d.name      AS disciplina,
  ROUND(AVG(g.value)::NUMERIC, 2) AS media,
  MIN(g.value) AS menor,
  MAX(g.value) AS maior
FROM grades g
JOIN users u       ON g.student_id = u.id
JOIN classes c     ON g.class_id = c.id
JOIN disciplines d ON c.discipline_id = d.id
GROUP BY u.email, d.name
ORDER BY u.email, d.name;


-- ─── Frequência por Aluno ────────────────────────────────────────────────────

SELECT
  u.email   AS aluno,
  d.name    AS disciplina,
  COUNT(*)  AS total_aulas,
  SUM(CASE WHEN ar.present THEN 1 ELSE 0 END) AS presencas,
  ROUND(100.0 * SUM(CASE WHEN ar.present THEN 1 ELSE 0 END) / COUNT(*), 1) AS freq_pct
FROM attendance_records ar
JOIN users u       ON ar.student_id = u.id
JOIN classes c     ON ar.class_id = c.id
JOIN disciplines d ON c.discipline_id = d.id
GROUP BY u.email, d.name
ORDER BY u.email, d.name;


-- ─── Aulas ao Vivo ───────────────────────────────────────────────────────────

SELECT
  lc.title,
  d.name       AS disciplina,
  c.code       AS turma,
  lc.status,
  lc.scheduled_at,
  lc.video_link
FROM live_classes lc
JOIN classes c     ON lc.class_id = c.id
JOIN disciplines d ON c.discipline_id = d.id
ORDER BY lc.scheduled_at DESC;


-- ─── Financeiro ──────────────────────────────────────────────────────────────

-- Faturas por aluno
SELECT
  u.email       AS aluno,
  i.description AS descricao,
  i.amount,
  i.due_date,
  i.status
FROM invoices i
JOIN users u ON i.student_id = u.id
ORDER BY u.email, i.due_date;

-- Resumo financeiro
SELECT
  status,
  COUNT(*)           AS quantidade,
  SUM(amount)        AS total,
  MIN(due_date)      AS vencimento_mais_antigo
FROM invoices
GROUP BY status
ORDER BY status;

-- Inadimplentes (VENCIDO)
SELECT
  u.email,
  i.description,
  i.amount,
  i.due_date,
  NOW()::DATE - i.due_date AS dias_vencido
FROM invoices i
JOIN users u ON i.student_id = u.id
WHERE i.status = 'VENCIDO'
ORDER BY i.due_date;


-- ─── Documentos ──────────────────────────────────────────────────────────────

SELECT
  u.email  AS aluno,
  d.type   AS tipo,
  d.status,
  d.requested_at,
  d.reviewed_at,
  d.notes
FROM documents d
JOIN users u ON d.student_id = u.id
ORDER BY d.requested_at DESC;

-- Fila de documentos pendentes (secretaria)
SELECT
  u.email  AS aluno,
  d.type   AS tipo,
  d.status,
  d.requested_at,
  NOW() - d.requested_at AS aguardando_ha
FROM documents d
JOIN users u ON d.student_id = u.id
WHERE d.status IN ('SOLICITADO', 'EM_ANALISE')
ORDER BY d.requested_at;


-- ─── Tickets / Protocolos ────────────────────────────────────────────────────

SELECT
  u.email  AS aluno,
  t.subject,
  t.status,
  t.created_at,
  COUNT(tm.id) AS mensagens
FROM tickets t
JOIN users u ON t.student_id = u.id
LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id
GROUP BY t.id, u.email, t.subject, t.status, t.created_at
ORDER BY t.created_at DESC;

-- Thread de um ticket (substitua o UUID)
SELECT
  u.email   AS autor,
  tm.content,
  tm.created_at
FROM ticket_messages tm
JOIN users u ON tm.author_id = u.id
WHERE tm.ticket_id = '00000000-0000-0000-0009-000000000001'
ORDER BY tm.created_at;


-- ─── Notificações ────────────────────────────────────────────────────────────

SELECT
  u.email   AS usuario,
  n.type,
  n.title,
  n.read_at IS NOT NULL AS lida,
  n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC;

-- Não lidas por usuário
SELECT
  u.email,
  COUNT(*) AS nao_lidas
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.read_at IS NULL
GROUP BY u.email
ORDER BY nao_lidas DESC;


-- ─── Features / Parametrização ───────────────────────────────────────────────

-- Todas as features
SELECT key, name, is_core, description FROM features ORDER BY key;

-- Configs por feature e escopo
SELECT
  fc.feature_key,
  fc.scope_type,
  fc.scope_id,
  fc.enabled,
  fc.order,
  fc.label_override
FROM feature_configs fc
ORDER BY fc.feature_key, fc.scope_type, fc.scope_id;

-- Simulação: tabs que um ALUNO veria (lógica do SettingsService)
-- Features core + features habilitadas para role ALUNO ou GLOBAL
SELECT DISTINCT
  f.key,
  COALESCE(rc.label_override, f.name) AS name,
  COALESCE(rc.order, gc.order, 0)     AS "order",
  f.is_core
FROM features f
LEFT JOIN feature_configs gc ON gc.feature_key = f.key AND gc.scope_type = 'GLOBAL'
LEFT JOIN feature_configs rc ON rc.feature_key = f.key AND rc.scope_type = 'ROLE' AND rc.scope_id = 'ALUNO'
WHERE
  f.is_core = TRUE
  OR (
    (gc.enabled = TRUE OR rc.enabled = TRUE)
    AND NOT EXISTS (
      SELECT 1 FROM feature_configs dc
      WHERE dc.feature_key = f.key AND dc.scope_type = 'ROLE'
        AND dc.scope_id = 'ALUNO' AND dc.enabled = FALSE
    )
  )
ORDER BY "order", key;


-- ─── Dashboard Admin — Estatísticas Gerais ───────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'ALUNO')        AS total_alunos,
  (SELECT COUNT(*) FROM users WHERE role = 'PROFESSOR')     AS total_professores,
  (SELECT COUNT(*) FROM classes WHERE status = 'EM_ANDAMENTO') AS turmas_ativas,
  (SELECT COUNT(*) FROM enrollments WHERE status = 'ATIVA') AS matriculas_ativas,
  (SELECT COUNT(*) FROM invoices WHERE status = 'VENCIDO')  AS faturas_vencidas,
  (SELECT COUNT(*) FROM documents WHERE status IN ('SOLICITADO','EM_ANALISE')) AS docs_pendentes,
  (SELECT COUNT(*) FROM tickets WHERE status IN ('ABERTO','EM_ATENDIMENTO'))   AS tickets_abertos;
