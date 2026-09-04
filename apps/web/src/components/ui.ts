'use client';

/**
 * Fronteira de cliente para o @gba/components.
 *
 * O pacote é um barrel único: importar QUALQUER coisa dele avalia o módulo
 * inteiro, e há componentes que chamam `createContext`. Num Server Component
 * isso quebra o render. Reexportar daqui, com `'use client'`, mantém a landing
 * como Server Component e empurra só a subárvore de UI para o cliente.
 */
export {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  Input,
  Label,
  Separator,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@gba/components';
