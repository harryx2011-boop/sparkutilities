import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FormatCombobox({ value, onChange, formats, placeholder, sourceExt, disabled }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (fmt) => {
    onChange(value === fmt ? '' : fmt);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-44 h-9 justify-between text-xs font-normal"
          disabled={disabled}
        >
          <span className="truncate">{value || placeholder || 'Select format…'}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList className="max-h-52">
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No match.
            </CommandEmpty>
            <CommandGroup>
              {formats.map(fmt => (
                <CommandItem
                  key={fmt}
                  value={fmt}
                  onSelect={() => handleSelect(fmt)}
                  className="text-xs cursor-pointer"
                >
                  <Check className={cn('mr-1.5 h-3 w-3 shrink-0', value === fmt ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{fmt}</span>
                  {fmt === sourceExt && (
                    <span className="text-[10px] text-muted-foreground ml-1">keep</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
