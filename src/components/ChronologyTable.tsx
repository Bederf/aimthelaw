import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, FileText, MoreVertical, Pin, Search, X } from "lucide-react";
import { format } from 'date-fns';

export interface ChronologyEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  source?: string;
  sourceId?: string;
  sourceDocument?: string;
  isPinned?: boolean;
}

interface ChronologyTableProps {
  events: ChronologyEvent[];
  onExport?: () => void;
  onViewSource?: (sourceId: string) => void;
  onTogglePin?: (eventId: string, isPinned: boolean) => void;
  onDelete?: (eventId: string) => void;
}

export function ChronologyTable({
  events,
  onExport,
  onViewSource,
  onTogglePin,
  onDelete
}: ChronologyTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ChronologyEvent>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    // Filter events by search query
    const filtered = events.filter(event => {
      const searchLower = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        (event.sourceDocument && event.sourceDocument.toLowerCase().includes(searchLower))
      );
    });

    // Sort events
    return [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        const aValue = a.date.getTime();
        const bValue = b.date.getTime();
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        const aValue = String(a[sortField]).toLowerCase();
        const bValue = String(b[sortField]).toLowerCase();
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
  }, [events, searchQuery, sortField, sortDirection]);

  // Toggle sort direction or change sort field
  const handleSort = (field: keyof ChronologyEvent) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field: keyof ChronologyEvent) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Get source badge
  const getSourceBadge = (source?: string) => {
    if (!source) return null;

    switch (source.toLowerCase()) {
      case 'manual':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Manual</Badge>;
      case 'ai_analysis':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">AI</Badge>;
      case 'system':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">System</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chronology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Calendar className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="w-[100px] cursor-pointer"
                onClick={() => handleSort('date')}
              >
                Date{getSortIndicator('date')}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('title')}
              >
                Event{getSortIndicator('title')}
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  {searchQuery
                    ? 'No matching events found'
                    : 'No chronology events available'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEvents.map((event) => (
                <TableRow key={event.id} className={event.isPinned ? 'bg-amber-50' : undefined}>
                  <TableCell className="font-medium">
                    {formatDate(event.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium flex items-center gap-1">
                        {event.title}
                        {event.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.description}
                      </div>
                      {event.sourceDocument && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <FileText className="h-3 w-3 inline mr-1" />
                          {event.sourceDocument}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSourceBadge(event.source)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {event.sourceId && onViewSource && (
                          <DropdownMenuItem onClick={() => onViewSource(event.sourceId!)}>
                            View source document
                          </DropdownMenuItem>
                        )}
                        {onTogglePin && (
                          <DropdownMenuItem onClick={() => onTogglePin(event.id, !event.isPinned)}>
                            {event.isPinned ? 'Unpin event' : 'Pin event'}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDelete(event.id)}
                          >
                            Delete event
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Showing {filteredAndSortedEvents.length} of {events.length} events
      </div>
    </div>
  );
} 