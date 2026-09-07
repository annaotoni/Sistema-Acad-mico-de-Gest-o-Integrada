import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hash(plain: string) {
  return argon2.hash(plain);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Features (parametrização de abas) ──────────────────────────────────────
  const features = [
    {
      key: 'inicio',
      name: 'Início',
      isCore: true,
      description: 'Tela inicial com resumo',
    },
    {
      key: 'turmas',
      name: 'Turmas',
      isCore: true,
      description: 'Turmas e disciplinas',
    },
    {
      key: 'atividades',
      name: 'Atividades',
      isCore: false,
      description: 'Atividades e entregas',
    },
    {
      key: 'notas',
      name: 'Notas',
      isCore: false,
      description: 'Notas e feedback',
    },
    {
      key: 'aovivo',
      name: 'Ao vivo',
      isCore: false,
      description: 'Aulas ao vivo',
    },
    {
      key: 'financeiro',
      name: 'Financeiro',
      isCore: false,
      description: 'Cobranças e pagamentos',
    },
    {
      key: 'documentos',
      name: 'Documentos',
      isCore: false,
      description: 'Documentos oficiais',
    },
    {
      key: 'protocolos',
      name: 'Protocolos',
      isCore: false,
      description: 'Atendimento e suporte',
    },
    {
      key: 'parametrizacao',
      name: 'Parametrização',
      isCore: false,
      description: 'Configuração de features',
    },
    {
      key: 'assistant',
      name: 'Assistente',
      isCore: false,
      description: 'Chatbot acadêmico',
    },
  ];

  for (const f of features) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, isCore: f.isCore, description: f.description },
      create: f,
    });
  }
  console.log('✅ Features criadas');

  // Recria todos os feature configs do zero (idempotente para seed)
  await prisma.featureConfig.deleteMany();
  await prisma.featureConfig.createMany({
    data: [
      // Habilitadas globalmente
      {
        featureKey: 'inicio',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 1,
      },
      {
        featureKey: 'turmas',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 2,
      },
      {
        featureKey: 'atividades',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 3,
      },
      {
        featureKey: 'notas',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 4,
      },
      {
        featureKey: 'aovivo',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 5,
      },
      {
        featureKey: 'assistant',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: true,
        order: 10,
      },
      // Financeiro por role
      {
        featureKey: 'financeiro',
        scopeType: 'ROLE',
        scopeId: 'ALUNO',
        enabled: true,
        order: 6,
      },
      {
        featureKey: 'financeiro',
        scopeType: 'ROLE',
        scopeId: 'SECRETARIA',
        enabled: true,
        order: 6,
      },
      {
        featureKey: 'financeiro',
        scopeType: 'ROLE',
        scopeId: 'ADMIN',
        enabled: true,
        order: 6,
      },
      {
        featureKey: 'financeiro',
        scopeType: 'ROLE',
        scopeId: 'PROFESSOR',
        enabled: false,
        order: 0,
      },
      // Documentos por role
      {
        featureKey: 'documentos',
        scopeType: 'ROLE',
        scopeId: 'ALUNO',
        enabled: true,
        order: 7,
      },
      {
        featureKey: 'documentos',
        scopeType: 'ROLE',
        scopeId: 'SECRETARIA',
        enabled: true,
        order: 7,
      },
      {
        featureKey: 'documentos',
        scopeType: 'ROLE',
        scopeId: 'ADMIN',
        enabled: true,
        order: 7,
      },
      // Protocolos por role
      {
        featureKey: 'protocolos',
        scopeType: 'ROLE',
        scopeId: 'ALUNO',
        enabled: true,
        order: 8,
      },
      {
        featureKey: 'protocolos',
        scopeType: 'ROLE',
        scopeId: 'PROFESSOR',
        enabled: true,
        order: 8,
      },
      {
        featureKey: 'protocolos',
        scopeType: 'ROLE',
        scopeId: 'SECRETARIA',
        enabled: true,
        order: 8,
      },
      {
        featureKey: 'protocolos',
        scopeType: 'ROLE',
        scopeId: 'ADMIN',
        enabled: true,
        order: 8,
      },
      // Parametrização desabilitada globalmente, habilitada apenas para ADMIN
      {
        featureKey: 'parametrizacao',
        scopeType: 'GLOBAL',
        scopeId: null,
        enabled: false,
        order: 0,
      },
      {
        featureKey: 'parametrizacao',
        scopeType: 'ROLE',
        scopeId: 'ADMIN',
        enabled: true,
        order: 9,
      },
    ],
  });

  console.log('✅ FeatureConfigs criadas');

  // ── Tenant ─────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sagi' },
    update: {},
    create: { name: 'Faculdade Integrada SAGI', slug: 'sagi' },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // ── Usuários ───────────────────────────────────────────────────────────────
  const senha = await hash('Sagi@2026');
  const agora = new Date();

  const [admin, secretaria, helena, carlos, rafael, maria, joao, ana, pedro] =
    await Promise.all([
      prisma.user.upsert({
        where: { email: 'admin@sagi.edu.br' },
        update: {},
        create: {
          email: 'admin@sagi.edu.br',
          passwordHash: senha,
          role: 'ADMIN',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'secretaria@sagi.edu.br' },
        update: {},
        create: {
          email: 'secretaria@sagi.edu.br',
          passwordHash: senha,
          role: 'SECRETARIA',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'helena@sagi.edu.br' },
        update: {},
        create: {
          email: 'helena@sagi.edu.br',
          passwordHash: senha,
          role: 'PROFESSOR',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'carlos@sagi.edu.br' },
        update: {},
        create: {
          email: 'carlos@sagi.edu.br',
          passwordHash: senha,
          role: 'PROFESSOR',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'rafael@sagi.edu.br' },
        update: {},
        create: {
          email: 'rafael@sagi.edu.br',
          passwordHash: senha,
          role: 'ALUNO',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'maria@sagi.edu.br' },
        update: {},
        create: {
          email: 'maria@sagi.edu.br',
          passwordHash: senha,
          role: 'ALUNO',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'joao@sagi.edu.br' },
        update: {},
        create: {
          email: 'joao@sagi.edu.br',
          passwordHash: senha,
          role: 'ALUNO',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'ana@sagi.edu.br' },
        update: {},
        create: {
          email: 'ana@sagi.edu.br',
          passwordHash: senha,
          role: 'ALUNO',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
      prisma.user.upsert({
        where: { email: 'pedro@sagi.edu.br' },
        update: {},
        create: {
          email: 'pedro@sagi.edu.br',
          passwordHash: senha,
          role: 'ALUNO',
          tenantId: tenant.id,
          emailVerifiedAt: agora,
          status: 'ACTIVE',
        },
      }),
    ]);

  const alunos = [rafael, maria, joao, ana, pedro];
  console.log(`✅ ${2 + alunos.length + 2} usuários criados`);

  // ── Cursos e Disciplinas ───────────────────────────────────────────────────
  const cursoES = await prisma.course.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ES' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Engenharia de Software',
      code: 'ES',
      description: 'Bacharelado em Engenharia de Software',
    },
  });
  const cursoADM = await prisma.course.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ADM' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administração',
      code: 'ADM',
      description: 'Bacharelado em Administração',
    },
  });

  const disciplinasES = await Promise.all([
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoES.id, code: 'CAL' } },
      update: {},
      create: {
        courseId: cursoES.id,
        name: 'Cálculo Aplicado',
        code: 'CAL',
        workloadHours: 80,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoES.id, code: 'ALG' } },
      update: {},
      create: {
        courseId: cursoES.id,
        name: 'Álgebra Linear',
        code: 'ALG',
        workloadHours: 60,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoES.id, code: 'EDO' } },
      update: {},
      create: {
        courseId: cursoES.id,
        name: 'Equações Diferenciais',
        code: 'EDO',
        workloadHours: 60,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoES.id, code: 'EDD' } },
      update: {},
      create: {
        courseId: cursoES.id,
        name: 'Estruturas de Dados',
        code: 'EDD',
        workloadHours: 80,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoES.id, code: 'ESI' } },
      update: {},
      create: {
        courseId: cursoES.id,
        name: 'Engenharia de Software I',
        code: 'ESI',
        workloadHours: 60,
      },
    }),
  ]);
  const [discCAL, discALG, discEDO, discEDD] = disciplinasES;

  await Promise.all([
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoADM.id, code: 'MEC' } },
      update: {},
      create: {
        courseId: cursoADM.id,
        name: 'Microeconomia',
        code: 'MEC',
        workloadHours: 60,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoADM.id, code: 'GFI' } },
      update: {},
      create: {
        courseId: cursoADM.id,
        name: 'Gestão Financeira',
        code: 'GFI',
        workloadHours: 60,
      },
    }),
    prisma.discipline.upsert({
      where: { courseId_code: { courseId: cursoADM.id, code: 'MKT' } },
      update: {},
      create: {
        courseId: cursoADM.id,
        name: 'Marketing',
        code: 'MKT',
        workloadHours: 40,
      },
    }),
  ]);

  console.log('✅ Cursos e disciplinas criados');

  // ── Períodos Letivos ───────────────────────────────────────────────────────
  const periodo2026_1 = await prisma.academicPeriod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: '2026.1',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-07-31'),
      isActive: true,
    },
  });
  const _periodo2025_2 = await prisma.academicPeriod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      name: '2025.2',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-01-31'),
      isActive: false,
    },
  });

  console.log('✅ Períodos letivos criados');

  // ── Turmas ─────────────────────────────────────────────────────────────────
  const [calT01, calT02, algT01, edoT01, eddT01] = await Promise.all([
    prisma.class.upsert({
      where: {
        disciplineId_periodId_code: {
          disciplineId: discCAL.id,
          periodId: periodo2026_1.id,
          code: 'T01',
        },
      },
      update: {},
      create: {
        disciplineId: discCAL.id,
        periodId: periodo2026_1.id,
        code: 'T01',
        status: 'EM_ANDAMENTO',
        maxStudents: 45,
      },
    }),
    prisma.class.upsert({
      where: {
        disciplineId_periodId_code: {
          disciplineId: discCAL.id,
          periodId: periodo2026_1.id,
          code: 'T02',
        },
      },
      update: {},
      create: {
        disciplineId: discCAL.id,
        periodId: periodo2026_1.id,
        code: 'T02',
        status: 'EM_ANDAMENTO',
        maxStudents: 45,
      },
    }),
    prisma.class.upsert({
      where: {
        disciplineId_periodId_code: {
          disciplineId: discALG.id,
          periodId: periodo2026_1.id,
          code: 'T01',
        },
      },
      update: {},
      create: {
        disciplineId: discALG.id,
        periodId: periodo2026_1.id,
        code: 'T01',
        status: 'EM_ANDAMENTO',
        maxStudents: 45,
      },
    }),
    prisma.class.upsert({
      where: {
        disciplineId_periodId_code: {
          disciplineId: discEDO.id,
          periodId: periodo2026_1.id,
          code: 'T01',
        },
      },
      update: {},
      create: {
        disciplineId: discEDO.id,
        periodId: periodo2026_1.id,
        code: 'T01',
        status: 'EM_ANDAMENTO',
        maxStudents: 45,
      },
    }),
    prisma.class.upsert({
      where: {
        disciplineId_periodId_code: {
          disciplineId: discEDD.id,
          periodId: periodo2026_1.id,
          code: 'T01',
        },
      },
      update: {},
      create: {
        disciplineId: discEDD.id,
        periodId: periodo2026_1.id,
        code: 'T01',
        status: 'EM_ANDAMENTO',
        maxStudents: 40,
      },
    }),
  ]);

  console.log('✅ Turmas criadas');

  // ── Vínculos de Professor ──────────────────────────────────────────────────
  const vinculos = [
    { teacherId: helena.id, classId: calT01.id },
    { teacherId: helena.id, classId: calT02.id },
    { teacherId: helena.id, classId: algT01.id },
    { teacherId: helena.id, classId: edoT01.id },
    { teacherId: carlos.id, classId: eddT01.id },
  ];
  for (const v of vinculos) {
    await prisma.teacherAssignment.upsert({
      where: {
        teacherId_classId: { teacherId: v.teacherId, classId: v.classId },
      },
      update: {},
      create: v,
    });
  }
  console.log('✅ Vínculos de professor criados');

  // ── Matrículas ─────────────────────────────────────────────────────────────
  const matriculas = [
    // CAL-T01: todos os alunos
    ...alunos.map((a) => ({
      studentId: a.id,
      classId: calT01.id,
      status: 'ATIVA' as const,
    })),
    // CAL-T02: maria, joao, ana
    { studentId: maria.id, classId: calT02.id, status: 'ATIVA' as const },
    { studentId: joao.id, classId: calT02.id, status: 'ATIVA' as const },
    { studentId: ana.id, classId: calT02.id, status: 'ATIVA' as const },
    // ALG-T01: rafael, maria, joao
    { studentId: rafael.id, classId: algT01.id, status: 'ATIVA' as const },
    { studentId: maria.id, classId: algT01.id, status: 'ATIVA' as const },
    { studentId: joao.id, classId: algT01.id, status: 'ATIVA' as const },
    // EDO-T01: rafael, ana, pedro
    { studentId: rafael.id, classId: edoT01.id, status: 'ATIVA' as const },
    { studentId: ana.id, classId: edoT01.id, status: 'ATIVA' as const },
    { studentId: pedro.id, classId: edoT01.id, status: 'ATIVA' as const },
    // EDD-T01: maria, joao, ana, pedro
    { studentId: maria.id, classId: eddT01.id, status: 'ATIVA' as const },
    { studentId: joao.id, classId: eddT01.id, status: 'ATIVA' as const },
    { studentId: ana.id, classId: eddT01.id, status: 'ATIVA' as const },
    { studentId: pedro.id, classId: eddT01.id, status: 'ATIVA' as const },
  ];
  for (const m of matriculas) {
    await prisma.enrollment.upsert({
      where: {
        studentId_classId: { studentId: m.studentId, classId: m.classId },
      },
      update: {},
      create: m,
    });
  }
  console.log('✅ Matrículas criadas');

  // ── Aulas (Lessons) ────────────────────────────────────────────────────────
  const lessonsCAL = await Promise.all([
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0001-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000001',
        classId: calT01.id,
        title: 'Introdução a Limites',
        order: 1,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0001-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000002',
        classId: calT01.id,
        title: 'Derivadas e Regras de Derivação',
        order: 2,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0001-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000003',
        classId: calT01.id,
        title: 'Integrais Definidas',
        order: 3,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0001-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000004',
        classId: calT01.id,
        title: 'Séries de Taylor',
        order: 4,
        status: 'DRAFT',
      },
    }),
  ]);
  const [l_cal_1, l_cal_2, l_cal_3] = lessonsCAL;

  const lessonsALG = await Promise.all([
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0002-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000001',
        classId: algT01.id,
        title: 'Matrizes e Operações',
        order: 1,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0002-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000002',
        classId: algT01.id,
        title: 'Determinantes',
        order: 2,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0002-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000003',
        classId: algT01.id,
        title: 'Sistemas Lineares',
        order: 3,
        status: 'PUBLISHED',
      },
    }),
  ]);
  const [l_alg_1, l_alg_2] = lessonsALG;

  const lessonsEDD = await Promise.all([
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0003-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000001',
        classId: eddT01.id,
        title: 'Arrays e Listas Encadeadas',
        order: 1,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0003-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000002',
        classId: eddT01.id,
        title: 'Pilhas e Filas',
        order: 2,
        status: 'PUBLISHED',
      },
    }),
    prisma.lesson.upsert({
      where: { id: '00000000-0000-0000-0003-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000003',
        classId: eddT01.id,
        title: 'Recursão e Árvores Binárias',
        order: 3,
        status: 'PUBLISHED',
      },
    }),
  ]);
  const [l_edd_1, l_edd_2] = lessonsEDD;

  console.log('✅ Aulas criadas');

  // ── Materiais ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.material.upsert({
      where: { id: '00000000-0000-0000-0004-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0004-000000000001',
        classId: calT01.id,
        lessonId: l_cal_1.id,
        title: 'Slides — Limites',
        url: 'https://storage.sagi.edu.br/cal/slides-limites.pdf',
        type: 'PDF',
        status: 'PUBLISHED',
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-0000-0004-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0004-000000000002',
        classId: calT01.id,
        lessonId: l_cal_2.id,
        title: 'Slides — Derivadas',
        url: 'https://storage.sagi.edu.br/cal/slides-derivadas.pdf',
        type: 'PDF',
        status: 'PUBLISHED',
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-0000-0004-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0004-000000000003',
        classId: calT01.id,
        lessonId: l_cal_3.id,
        title: 'Lista de Exercícios 03',
        url: 'https://storage.sagi.edu.br/cal/lista-03.pdf',
        type: 'PDF',
        status: 'PUBLISHED',
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-0000-0004-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0004-000000000004',
        classId: algT01.id,
        lessonId: l_alg_1.id,
        title: 'Slides — Matrizes',
        url: 'https://storage.sagi.edu.br/alg/slides-matrizes.pdf',
        type: 'PDF',
        status: 'PUBLISHED',
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-0000-0004-000000000005' },
      update: {},
      create: {
        id: '00000000-0000-0000-0004-000000000005',
        classId: eddT01.id,
        lessonId: l_edd_1.id,
        title: 'Código-fonte — Arrays',
        url: 'https://github.com/sagi-edd/arrays',
        type: 'LINK',
        status: 'PUBLISHED',
      },
    }),
  ]);
  console.log('✅ Materiais criados');

  // ── Atividades (Assignments) ────────────────────────────────────────────────
  const passado = (dias: number) => new Date(Date.now() - dias * 86400_000);
  const futuro = (dias: number) => new Date(Date.now() + dias * 86400_000);

  const [atCAL_1, _atCAL_2, _atCAL_3, atALG_1, _atALG_2, atEDD_1, _atEDD_2] =
    await Promise.all([
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000001' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000001',
          classId: calT01.id,
          lessonId: l_cal_3.id,
          title: 'Lista 03 · Integrais',
          description: 'Resolver os exercícios 1 ao 20 da lista de integrais.',
          dueDate: passado(14),
          maxScore: 10,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000002' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000002',
          classId: calT01.id,
          title: 'Lista 04 · Séries de Taylor',
          description: 'Série de Taylor para funções trigonométricas.',
          dueDate: futuro(10),
          maxScore: 10,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000003' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000003',
          classId: calT01.id,
          title: 'Trabalho Final · Aplicações de Cálculo',
          description:
            'Modelagem de problema real usando cálculo diferencial e integral.',
          dueDate: futuro(30),
          maxScore: 20,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000004' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000004',
          classId: algT01.id,
          lessonId: l_alg_2.id,
          title: 'Quiz 01 · Matrizes e Determinantes',
          description:
            'Questões sobre operações matriciais e cálculo de determinantes.',
          dueDate: passado(7),
          maxScore: 10,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000005' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000005',
          classId: algT01.id,
          title: 'Lista 02 · Sistemas Lineares',
          description:
            'Resolver sistemas usando escalonamento e regra de Cramer.',
          dueDate: futuro(7),
          maxScore: 10,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000006' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000006',
          classId: eddT01.id,
          lessonId: l_edd_2.id,
          title: 'Implementação · Pilha e Fila em Python',
          description:
            'Implementar pilha e fila usando listas e com desempenho O(1).',
          dueDate: passado(5),
          maxScore: 10,
        },
      }),
      prisma.assignment.upsert({
        where: { id: '00000000-0000-0000-0005-000000000007' },
        update: {},
        create: {
          id: '00000000-0000-0000-0005-000000000007',
          classId: eddT01.id,
          title: 'Projeto · Árvore Binária de Busca',
          description: 'Implementar ABB com inserção, remoção e busca.',
          dueDate: futuro(14),
          maxScore: 20,
        },
      }),
    ]);
  console.log('✅ Atividades criadas');

  // ── Submissões ─────────────────────────────────────────────────────────────
  // Atividade 1 (CAL Lista 03 — já encerrada): todos entregaram
  for (const aluno of [rafael, maria, joao, ana, pedro]) {
    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: atCAL_1.id,
          studentId: aluno.id,
        },
      },
      update: {},
      create: {
        assignmentId: atCAL_1.id,
        studentId: aluno.id,
        content: 'Resolução da lista 03 de integrais.',
        isLate: false,
        submittedAt: passado(15),
        score: [8.5, 9.0, 7.5, 8.0, 6.5][alunos.indexOf(aluno)],
        feedback: 'Boa resolução!',
        gradedAt: passado(10),
      },
    });
  }

  // Atividade 4 (ALG Quiz 01 — já encerrada): rafael e maria entregaram; joao entregou atrasado
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: atALG_1.id,
        studentId: rafael.id,
      },
    },
    update: {},
    create: {
      assignmentId: atALG_1.id,
      studentId: rafael.id,
      content: 'Respostas do quiz.',
      isLate: false,
      submittedAt: passado(8),
      score: 9.0,
      feedback: 'Excelente!',
      gradedAt: passado(6),
    },
  });
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: { assignmentId: atALG_1.id, studentId: maria.id },
    },
    update: {},
    create: {
      assignmentId: atALG_1.id,
      studentId: maria.id,
      content: 'Respostas do quiz.',
      isLate: false,
      submittedAt: passado(8),
      score: 7.5,
      feedback: 'Bom trabalho.',
      gradedAt: passado(6),
    },
  });
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: { assignmentId: atALG_1.id, studentId: joao.id },
    },
    update: {},
    create: {
      assignmentId: atALG_1.id,
      studentId: joao.id,
      content: 'Entrega atrasada.',
      isLate: true,
      submittedAt: passado(5),
      score: 5.0,
      feedback: 'Penalidade por atraso.',
      gradedAt: passado(4),
    },
  });

  // Atividade 6 (EDD Pilha e Fila — já encerrada): maria e joao entregaram
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: { assignmentId: atEDD_1.id, studentId: maria.id },
    },
    update: {},
    create: {
      assignmentId: atEDD_1.id,
      studentId: maria.id,
      content: 'https://github.com/maria/edd-pilha',
      isLate: false,
      submittedAt: passado(6),
      score: 9.5,
      feedback: 'Implementação elegante!',
      gradedAt: passado(3),
    },
  });
  await prisma.submission.upsert({
    where: {
      assignmentId_studentId: { assignmentId: atEDD_1.id, studentId: joao.id },
    },
    update: {},
    create: {
      assignmentId: atEDD_1.id,
      studentId: joao.id,
      content: 'https://github.com/joao/edd-pilha',
      isLate: false,
      submittedAt: passado(5),
      score: 8.0,
      feedback: 'Boa implementação.',
      gradedAt: passado(2),
    },
  });

  console.log('✅ Submissões criadas');

  // ── Notas (Grades) ─────────────────────────────────────────────────────────
  // Limpa notas existentes para estas turmas e recria
  await prisma.grade.deleteMany({
    where: { classId: { in: [calT01.id, algT01.id, eddT01.id] } },
  });
  await prisma.grade.createMany({
    data: [
      // CAL-T01
      {
        studentId: rafael.id,
        classId: calT01.id,
        label: 'N1',
        value: 8.5,
        gradedById: helena.id,
      },
      {
        studentId: rafael.id,
        classId: calT01.id,
        label: 'N2',
        value: 7.0,
        gradedById: helena.id,
      },
      {
        studentId: maria.id,
        classId: calT01.id,
        label: 'N1',
        value: 9.0,
        gradedById: helena.id,
      },
      {
        studentId: maria.id,
        classId: calT01.id,
        label: 'N2',
        value: 8.5,
        gradedById: helena.id,
      },
      {
        studentId: joao.id,
        classId: calT01.id,
        label: 'N1',
        value: 6.5,
        gradedById: helena.id,
      },
      {
        studentId: joao.id,
        classId: calT01.id,
        label: 'N2',
        value: 7.0,
        gradedById: helena.id,
      },
      {
        studentId: ana.id,
        classId: calT01.id,
        label: 'N1',
        value: 7.5,
        gradedById: helena.id,
      },
      {
        studentId: pedro.id,
        classId: calT01.id,
        label: 'N1',
        value: 6.0,
        gradedById: helena.id,
      },
      // ALG-T01
      {
        studentId: rafael.id,
        classId: algT01.id,
        label: 'N1',
        value: 9.0,
        gradedById: helena.id,
      },
      {
        studentId: maria.id,
        classId: algT01.id,
        label: 'N1',
        value: 8.0,
        gradedById: helena.id,
      },
      {
        studentId: joao.id,
        classId: algT01.id,
        label: 'N1',
        value: 5.5,
        gradedById: helena.id,
      },
      // EDD-T01
      {
        studentId: maria.id,
        classId: eddT01.id,
        label: 'N1',
        value: 9.5,
        gradedById: carlos.id,
      },
      {
        studentId: joao.id,
        classId: eddT01.id,
        label: 'N1',
        value: 8.0,
        gradedById: carlos.id,
      },
      {
        studentId: ana.id,
        classId: eddT01.id,
        label: 'N1',
        value: 7.0,
        gradedById: carlos.id,
      },
      {
        studentId: pedro.id,
        classId: eddT01.id,
        label: 'N1',
        value: 6.5,
        gradedById: carlos.id,
      },
    ],
  });
  console.log('✅ Notas criadas');

  // ── Frequência ─────────────────────────────────────────────────────────────
  const attendanceData = [
    {
      classId: calT01.id,
      lessonId: l_cal_1.id,
      date: passado(21),
      students: [
        { id: rafael.id, p: true },
        { id: maria.id, p: true },
        { id: joao.id, p: false },
        { id: ana.id, p: true },
        { id: pedro.id, p: true },
      ],
    },
    {
      classId: calT01.id,
      lessonId: l_cal_2.id,
      date: passado(14),
      students: [
        { id: rafael.id, p: true },
        { id: maria.id, p: true },
        { id: joao.id, p: true },
        { id: ana.id, p: true },
        { id: pedro.id, p: false },
      ],
    },
    {
      classId: calT01.id,
      lessonId: l_cal_3.id,
      date: passado(7),
      students: [
        { id: rafael.id, p: true },
        { id: maria.id, p: true },
        { id: joao.id, p: true },
        { id: ana.id, p: false },
        { id: pedro.id, p: true },
      ],
    },
    {
      classId: algT01.id,
      lessonId: l_alg_1.id,
      date: passado(18),
      students: [
        { id: rafael.id, p: true },
        { id: maria.id, p: true },
        { id: joao.id, p: true },
      ],
    },
    {
      classId: algT01.id,
      lessonId: l_alg_2.id,
      date: passado(11),
      students: [
        { id: rafael.id, p: true },
        { id: maria.id, p: false },
        { id: joao.id, p: true },
      ],
    },
    {
      classId: eddT01.id,
      lessonId: l_edd_1.id,
      date: passado(16),
      students: [
        { id: maria.id, p: true },
        { id: joao.id, p: true },
        { id: ana.id, p: true },
        { id: pedro.id, p: true },
      ],
    },
    {
      classId: eddT01.id,
      lessonId: l_edd_2.id,
      date: passado(9),
      students: [
        { id: maria.id, p: true },
        { id: joao.id, p: true },
        { id: ana.id, p: false },
        { id: pedro.id, p: true },
      ],
    },
  ];

  for (const rec of attendanceData) {
    for (const s of rec.students) {
      await prisma.attendanceRecord.upsert({
        where: {
          classId_studentId_lessonId_date: {
            classId: rec.classId,
            studentId: s.id,
            lessonId: rec.lessonId,
            date: rec.date,
          },
        },
        update: {},
        create: {
          classId: rec.classId,
          studentId: s.id,
          lessonId: rec.lessonId,
          present: s.p,
          date: rec.date,
          recordedById: helena.id,
        },
      });
    }
  }
  console.log('✅ Frequência criada');

  // ── Aulas ao Vivo ──────────────────────────────────────────────────────────
  const liveClasses = [
    {
      id: '00000000-0000-0000-0006-000000000001',
      classId: calT01.id,
      title: 'Cálculo — Dúvidas sobre Integrais',
      scheduledAt: new Date(Date.now() - 30 * 60_000),
      status: 'AO_VIVO' as const,
      videoLink: 'https://meet.sagi.edu.br/cal-t01-live',
    },
    {
      id: '00000000-0000-0000-0006-000000000002',
      classId: calT02.id,
      title: 'Revisão · Séries de Taylor',
      scheduledAt: futuro(1),
      status: 'AGENDADA' as const,
      videoLink: 'https://meet.sagi.edu.br/cal-t02-taylor',
    },
    {
      id: '00000000-0000-0000-0006-000000000003',
      classId: algT01.id,
      title: 'Álgebra — Sistemas Lineares ao vivo',
      scheduledAt: futuro(3),
      status: 'AGENDADA' as const,
      videoLink: 'https://meet.sagi.edu.br/alg-t01-sistemas',
    },
    {
      id: '00000000-0000-0000-0006-000000000004',
      classId: eddT01.id,
      title: 'Recursão e Árvores Binárias',
      scheduledAt: passado(8),
      status: 'ENCERRADA' as const,
      videoLink: null,
    },
    {
      id: '00000000-0000-0000-0006-000000000005',
      classId: eddT01.id,
      title: 'Pilhas e Filas — Implementação',
      scheduledAt: passado(16),
      status: 'ENCERRADA' as const,
      videoLink: null,
    },
  ];

  for (const lc of liveClasses) {
    await prisma.liveClass.upsert({
      where: { id: lc.id },
      update: { status: lc.status },
      create: lc,
    });
  }
  console.log('✅ Aulas ao vivo criadas');

  // ── Faturas (Invoices) ─────────────────────────────────────────────────────
  const invoiceData = [
    // rafael
    {
      id: '00000000-0000-0000-0007-000000000001',
      studentId: rafael.id,
      description: 'Mensalidade Fevereiro/2026',
      amount: 1200.0,
      dueDate: passado(30),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000002',
      studentId: rafael.id,
      description: 'Mensalidade Março/2026',
      amount: 1200.0,
      dueDate: passado(3),
      status: 'VENCIDO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000003',
      studentId: rafael.id,
      description: 'Mensalidade Abril/2026',
      amount: 1200.0,
      dueDate: futuro(27),
      status: 'PENDENTE' as const,
    },
    // maria
    {
      id: '00000000-0000-0000-0007-000000000004',
      studentId: maria.id,
      description: 'Mensalidade Fevereiro/2026',
      amount: 1200.0,
      dueDate: passado(30),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000005',
      studentId: maria.id,
      description: 'Mensalidade Março/2026',
      amount: 1200.0,
      dueDate: passado(3),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000006',
      studentId: maria.id,
      description: 'Mensalidade Abril/2026',
      amount: 1200.0,
      dueDate: futuro(27),
      status: 'PENDENTE' as const,
    },
    // joao
    {
      id: '00000000-0000-0000-0007-000000000007',
      studentId: joao.id,
      description: 'Mensalidade Fevereiro/2026',
      amount: 1200.0,
      dueDate: passado(30),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000008',
      studentId: joao.id,
      description: 'Mensalidade Março/2026',
      amount: 1200.0,
      dueDate: passado(3),
      status: 'VENCIDO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000009',
      studentId: joao.id,
      description: 'Mensalidade Abril/2026',
      amount: 1200.0,
      dueDate: futuro(27),
      status: 'PENDENTE' as const,
    },
    // ana
    {
      id: '00000000-0000-0000-0007-000000000010',
      studentId: ana.id,
      description: 'Mensalidade Fevereiro/2026',
      amount: 1200.0,
      dueDate: passado(30),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000011',
      studentId: ana.id,
      description: 'Mensalidade Março/2026',
      amount: 1200.0,
      dueDate: passado(3),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000012',
      studentId: ana.id,
      description: 'Mensalidade Abril/2026',
      amount: 1200.0,
      dueDate: futuro(27),
      status: 'PENDENTE' as const,
    },
    // pedro
    {
      id: '00000000-0000-0000-0007-000000000013',
      studentId: pedro.id,
      description: 'Mensalidade Fevereiro/2026',
      amount: 1200.0,
      dueDate: passado(30),
      status: 'PAGO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000014',
      studentId: pedro.id,
      description: 'Mensalidade Março/2026',
      amount: 1200.0,
      dueDate: passado(3),
      status: 'VENCIDO' as const,
    },
    {
      id: '00000000-0000-0000-0007-000000000015',
      studentId: pedro.id,
      description: 'Mensalidade Abril/2026',
      amount: 1200.0,
      dueDate: futuro(27),
      status: 'PENDENTE' as const,
    },
  ];

  for (const inv of invoiceData) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: { status: inv.status },
      create: inv,
    });
  }

  // Pagamento registrado para as faturas PAGO
  const pagasIds = [
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0007-000000000004',
    '00000000-0000-0000-0007-000000000005',
    '00000000-0000-0000-0007-000000000007',
    '00000000-0000-0000-0007-000000000010',
    '00000000-0000-0000-0007-000000000011',
    '00000000-0000-0000-0007-000000000013',
  ];
  for (const invId of pagasIds) {
    const existing = await prisma.payment.findFirst({
      where: { invoiceId: invId },
    });
    if (!existing) {
      await prisma.payment.create({
        data: {
          invoiceId: invId,
          gatewayId: `pay-${invId.slice(-8)}`,
          paidAt: passado(25),
          method: 'PIX',
          amount: 1200.0,
          gatewayPayload: {
            status: 'CONFIRMED',
            txId: `tx-${invId.slice(-8)}`,
          },
        },
      });
    }
  }
  console.log('✅ Faturas e pagamentos criados');

  // ── Documentos ─────────────────────────────────────────────────────────────
  const docsData = [
    {
      id: '00000000-0000-0000-0008-000000000001',
      studentId: rafael.id,
      type: 'Histórico Escolar',
      status: 'EMITIDO' as const,
      fileUrl: 'https://storage.sagi.edu.br/docs/historico-rafael.pdf',
      reviewedById: secretaria.id,
      reviewedAt: passado(5),
    },
    {
      id: '00000000-0000-0000-0008-000000000002',
      studentId: rafael.id,
      type: 'Declaração de Matrícula',
      status: 'EM_ANALISE' as const,
      fileUrl: null,
      reviewedById: null,
      reviewedAt: null,
    },
    {
      id: '00000000-0000-0000-0008-000000000003',
      studentId: maria.id,
      type: 'Atestado de Frequência',
      status: 'SOLICITADO' as const,
      fileUrl: null,
      reviewedById: null,
      reviewedAt: null,
    },
    {
      id: '00000000-0000-0000-0008-000000000004',
      studentId: joao.id,
      type: 'Histórico Escolar',
      status: 'EMITIDO' as const,
      fileUrl: 'https://storage.sagi.edu.br/docs/historico-joao.pdf',
      reviewedById: secretaria.id,
      reviewedAt: passado(10),
    },
    {
      id: '00000000-0000-0000-0008-000000000005',
      studentId: ana.id,
      type: 'Declaração de Matrícula',
      status: 'RECUSADO' as const,
      fileUrl: null,
      notes: 'Matrícula irregular — regularizar situação financeira.',
      reviewedById: secretaria.id,
      reviewedAt: passado(2),
    },
    {
      id: '00000000-0000-0000-0008-000000000006',
      studentId: pedro.id,
      type: 'Atestado de Frequência',
      status: 'SOLICITADO' as const,
      fileUrl: null,
      reviewedById: null,
      reviewedAt: null,
    },
  ];

  for (const doc of docsData) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: { status: doc.status },
      create: doc,
    });
  }
  console.log('✅ Documentos criados');

  // ── Tickets ────────────────────────────────────────────────────────────────
  const t1 = await prisma.ticket.upsert({
    where: { id: '00000000-0000-0000-0009-000000000001' },
    update: { status: 'EM_ATENDIMENTO' },
    create: {
      id: '00000000-0000-0000-0009-000000000001',
      studentId: rafael.id,
      subject: 'Dúvida sobre reposição de aula de Cálculo',
      status: 'EM_ATENDIMENTO',
    },
  });
  const _t2 = await prisma.ticket.upsert({
    where: { id: '00000000-0000-0000-0009-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000002',
      studentId: maria.id,
      subject: 'Solicitação de revisão de nota N1 em Álgebra',
      status: 'ABERTO',
    },
  });
  const t3 = await prisma.ticket.upsert({
    where: { id: '00000000-0000-0000-0009-000000000003' },
    update: { status: 'RESOLVIDO' },
    create: {
      id: '00000000-0000-0000-0009-000000000003',
      studentId: joao.id,
      subject: 'Problema com acesso ao material de EDD',
      status: 'RESOLVIDO',
      closedAt: passado(1),
    },
  });
  const _t4 = await prisma.ticket.upsert({
    where: { id: '00000000-0000-0000-0009-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000004',
      studentId: ana.id,
      subject: 'Boleto de março não gerado corretamente',
      status: 'ABERTO',
    },
  });

  // Mensagens do ticket 1
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000001',
      ticketId: t1.id,
      authorId: rafael.id,
      content:
        'Olá, faltei na aula do dia 10/03 por motivo de saúde. Como posso repor a presença?',
    },
  });
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000002',
      ticketId: t1.id,
      authorId: secretaria.id,
      content:
        'Bom dia! Você precisa apresentar atestado médico em até 48h. Após isso, a presença será abonada.',
    },
  });
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000003',
      ticketId: t1.id,
      authorId: rafael.id,
      content: 'Entendido! Vou providenciar o atestado. Obrigado.',
    },
  });

  // Mensagens do ticket 3
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000004',
      ticketId: t3.id,
      authorId: joao.id,
      content: 'O link do material de EDD está retornando erro 404.',
    },
  });
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000005',
      ticketId: t3.id,
      authorId: secretaria.id,
      content: 'O link foi atualizado no sistema. Tente novamente!',
    },
  });
  await prisma.ticketMessage.upsert({
    where: { id: '00000000-0000-0000-000A-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-000A-000000000006',
      ticketId: t3.id,
      authorId: joao.id,
      content: 'Funcionou! Obrigado.',
    },
  });

  console.log('✅ Tickets e mensagens criados');

  // ── Notificações ───────────────────────────────────────────────────────────
  type NotifInput = {
    userId: string;
    type: string;
    title: string;
    body: string;
    readAt?: Date | null;
  };
  const notifs: NotifInput[] = [
    {
      userId: rafael.id,
      type: 'nota.lancada',
      title: 'Nota lançada — Cálculo N1',
      body: 'Sua nota N1 em Cálculo Aplicado foi lançada: 8,5.',
      readAt: passado(5),
    },
    {
      userId: rafael.id,
      type: 'atividade.prazo_proximo',
      title: 'Prazo próximo — Lista 04',
      body: 'Lista 04 · Séries de Taylor vence em 10 dias.',
      readAt: null,
    },
    {
      userId: rafael.id,
      type: 'aula.comecando',
      title: 'Aula ao vivo começando!',
      body: 'Cálculo Aplicado — Dúvidas sobre Integrais está ao vivo agora.',
      readAt: null,
    },
    {
      userId: rafael.id,
      type: 'pagamento.vencido',
      title: 'Fatura vencida — Março/2026',
      body: 'Sua mensalidade de março está vencida. Regularize para evitar bloqueios.',
      readAt: null,
    },
    {
      userId: maria.id,
      type: 'nota.lancada',
      title: 'Nota lançada — EDD N1',
      body: 'Sua nota N1 em Estruturas de Dados foi lançada: 9,5.',
      readAt: passado(2),
    },
    {
      userId: maria.id,
      type: 'atividade.prazo_proximo',
      title: 'Prazo próximo — Projeto ABB',
      body: 'Projeto · Árvore Binária de Busca vence em 14 dias.',
      readAt: null,
    },
    {
      userId: joao.id,
      type: 'pagamento.vencido',
      title: 'Fatura vencida — Março/2026',
      body: 'Sua mensalidade de março está vencida. Regularize para evitar bloqueios.',
      readAt: null,
    },
    {
      userId: joao.id,
      type: 'protocolo.respondido',
      title: 'Protocolo respondido',
      body: 'Seu protocolo sobre material de EDD foi resolvido.',
      readAt: passado(1),
    },
    {
      userId: ana.id,
      type: 'documento.emitido',
      title: 'Documento recusado',
      body: 'Sua solicitação de Declaração de Matrícula foi recusada. Verifique a situação financeira.',
      readAt: null,
    },
    {
      userId: pedro.id,
      type: 'atividade.prazo_proximo',
      title: 'Prazo próximo — Projeto ABB',
      body: 'Projeto · Árvore Binária de Busca vence em 14 dias.',
      readAt: null,
    },
    {
      userId: secretaria.id,
      type: 'documento.solicitado',
      title: 'Novo documento solicitado',
      body: 'Pedro solicitou Atestado de Frequência.',
      readAt: null,
    },
    {
      userId: secretaria.id,
      type: 'protocolo.aberto',
      title: 'Novo protocolo aberto',
      body: 'Ana abriu protocolo: Boleto de março não gerado corretamente.',
      readAt: null,
    },
    {
      userId: admin.id,
      type: 'sistema',
      title: 'Seed concluído',
      body: 'Banco de dados populado com dados de demonstração.',
      readAt: null,
    },
  ];

  for (const n of notifs) {
    await prisma.notification
      .create({
        data: n,
      })
      .catch(() => {
        /* ignora duplicata em re-seed */
      });
  }
  console.log('✅ Notificações criadas');

  // ── Resumo final ───────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎓 Seed concluído! Usuários para login:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  admin@sagi.edu.br       → ADMIN');
  console.log('  secretaria@sagi.edu.br  → SECRETARIA');
  console.log('  helena@sagi.edu.br      → PROFESSOR (4 turmas)');
  console.log('  carlos@sagi.edu.br      → PROFESSOR (1 turma)');
  console.log('  rafael@sagi.edu.br      → ALUNO     (CAL, ALG, EDO)');
  console.log('  maria@sagi.edu.br       → ALUNO     (CAL×2, ALG, EDD)');
  console.log('  joao@sagi.edu.br        → ALUNO     (CAL×2, ALG, EDD)');
  console.log('  ana@sagi.edu.br         → ALUNO     (CAL, EDO, EDD)');
  console.log('  pedro@sagi.edu.br       → ALUNO     (CAL, EDO, EDD)');
  console.log('  Senha: Sagi@2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
