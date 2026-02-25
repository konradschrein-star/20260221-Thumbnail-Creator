'use client';

import { commonStyles, colors } from '../../styles';

interface TableColumn {
  header: string;
  key: string;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  emptyMessage?: string;
}

export default function Table({ columns, data, emptyMessage = 'No data available' }: TableProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textMuted,
          backgroundColor: colors.background,
          borderRadius: '8px',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={commonStyles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...commonStyles.tableHeader,
                  ...(column.width ? { width: column.width } : {}),
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.key} style={commonStyles.tableCell}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
