export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const content = [
    columns.map((column) => csvCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(','))
  ].join('\n');

  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
