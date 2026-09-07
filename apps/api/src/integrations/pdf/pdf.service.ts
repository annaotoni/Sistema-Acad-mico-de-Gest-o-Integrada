import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  // Gera PDF de documento oficial com campos dinâmicos
  generate(data: {
    title: string;
    studentName: string;
    studentEmail: string;
    documentType: string;
    issuedAt: Date;
    body: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(18)
        .text(data.title, { align: 'center' })
        .moveDown()
        .fontSize(12)
        .text(`Aluno: ${data.studentName}`)
        .text(`E-mail: ${data.studentEmail}`)
        .text(`Tipo: ${data.documentType}`)
        .text(`Emitido em: ${data.issuedAt.toLocaleDateString('pt-BR')}`)
        .moveDown()
        .text(data.body, { align: 'justify' });

      doc.end();
    });
  }
}
