export interface ExcelColumn<T> {
  header: string;
  value: (row: T, index: number) => string | number | null | undefined;
}

export interface ExcelExportOptions<T> {
  filename: string;
  title: string;
  churchName?: string;
  churchAddress?: string | null;
  subtitle?: string;
  rows: T[];
  columns: ExcelColumn<T>[];
  generatedAt?: Date;
  signatureLabel?: string;
}

export function exportStyledExcel<T>(options: ExcelExportOptions<T>): void {
  const generatedAt = options.generatedAt || new Date();
  const html = buildExportHtml(options, generatedAt, 'excel');

  const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.xls') ? options.filename : `${options.filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportStyledPdf<T>(options: ExcelExportOptions<T>): void {
  const generatedAt = options.generatedAt || new Date();
  const html = buildExportHtml(options, generatedAt, 'pdf');
  const win = window.open('', '_blank');
  if (!win) {
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function buildExportHtml<T>(options: ExcelExportOptions<T>, generatedAt: Date, mode: 'excel' | 'pdf'): string {
  const columnCount = Math.max(options.columns.length, 1);
  const title = options.filename.replace(/\.[^.]+$/, '') || options.title;
  const heading = exportHeading(options);
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            font-family: Inter, Arial, sans-serif;
            color: #111;
            margin: ${mode === 'pdf' ? '24px' : '0'};
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            padding: 12px 0 14px;
          }
          .subtitle {
            color: #475569;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
            padding: 0 0 18px;
          }
          th {
            background: #f3f4f6;
            border: 1px solid #cbd5e1;
            font-weight: 700;
            text-align: left;
            padding: 9px 10px;
          }
          td {
            border: 1px solid #dbe3ee;
            padding: 8px 10px;
            vertical-align: top;
          }
          .meta td {
            border: 0;
            padding-top: 26px;
            font-weight: 600;
          }
          .signature-line {
            border-bottom: 1px solid #111;
          }
          @media print {
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td class="title" colspan="${columnCount}">${escapeHtml(heading || options.title)}</td>
          </tr>
          ${options.subtitle ? `<tr><td class="subtitle" colspan="${columnCount}">${escapeHtml(options.subtitle)}</td></tr>` : ''}
          <tr><td colspan="${columnCount}">&nbsp;</td></tr>
          <tr>
            ${options.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}
          </tr>
          ${options.rows.map((row, rowIndex) => `
            <tr>
              ${options.columns.map((column) => `<td>${escapeHtml(column.value(row, rowIndex))}</td>`).join('')}
            </tr>
          `).join('')}
          <tr class="meta">
            <td colspan="${Math.max(Math.floor(columnCount / 2), 1)}">Data: ${escapeHtml(formatDate(generatedAt))}</td>
            <td colspan="${Math.max(columnCount - Math.floor(columnCount / 2), 1)}">
              ${escapeHtml(options.signatureLabel || 'Semnătura')}: <span class="signature-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </td>
          </tr>
        </table>
        ${mode === 'pdf' ? `
          <script>
            window.addEventListener('load', function () {
              requestAnimationFrame(function () {
                setTimeout(function () {
                  window.focus();
                  window.print();
                }, 150);
              });
            });
          </script>
        ` : ''}
      </body>
    </html>
  `;
  return html;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function exportHeading<T>(options: ExcelExportOptions<T>): string {
  const title = String(options.title ?? '').trim();
  const churchName = String(options.churchName ?? '').trim();
  const churchAddress = String(options.churchAddress ?? '').trim();
  if (!title) {
    return [churchName, churchAddress].filter(Boolean).join(' - ');
  }
  if (title.endsWith(':') && churchName) {
    return [title + ' ' + churchName, churchAddress].filter(Boolean).join(' - ');
  }
  return [title, churchName, churchAddress].filter(Boolean).join(' - ');
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
