'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string | React.ReactNode;
  render?: (value: any, item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  customActions?: (item: T) => React.ReactNode;
  addLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  onAdd,
  onEdit,
  onDelete,
  customActions,
  addLabel = 'Add New',
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = searchable
    ? data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-11 w-72 rounded-full bg-progress-soft animate-pulse" />
          <div className="h-11 w-36 rounded-full bg-progress-soft animate-pulse" />
        </div>
        <div className="rounded-xl bg-card px-7 py-4 shadow-lift">
          <div className="h-10 border-b border-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-border last:border-b-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {searchable && (
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-card pl-10 shadow-lift"
            />
          </div>
        )}
        {!searchable && <div />}
        
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-card px-4 py-2 shadow-lift">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={String(column.key)}>
                  {column.label}
                </TableHead>
              ))}
              {(onEdit || onDelete || customActions) && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (onEdit || onDelete || customActions ? 1 : 0)}
                  className="py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || '')}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete || customActions) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Edit className="size-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                            aria-label="Supprimer"
                            title="Supprimer"
                            className="text-now-ink hover:bg-now-soft hover:text-now-ink"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                        {customActions && customActions(item)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
