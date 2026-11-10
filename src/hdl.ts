// As extensões de HDL que a interface reconhece, num lugar só: o editor, os
// ícones, a árvore de arquivos, o arrastar, o diálogo de abrir e os links do
// console usam estas. Quem decide a linguagem de um arquivo do projeto é o
// Core (`language` de cada arquivo, `SourceLanguage`); aqui fica só o que a
// interface precisa antes de perguntar a ele.

import { extension } from './util/paths';

/** Verilog e SystemVerilog, com os `include` (`.vh`, `.svh`). */
export const VERILOG_EXTENSIONS = ['v', 'sv', 'vh', 'svh'];

/** VHDL. */
export const VHDL_EXTENSIONS = ['vhd', 'vhdl'];

/** O que o projeto registra como módulo, entidade ou testbench de HDL: o
 * Core aceita `.v`, `.sv`, `.vhd` e `.vhdl` (e o `.py` do cocotb, à parte). */
export const REGISTRABLE_EXTENSIONS = ['v', 'sv', 'vhd', 'vhdl'];

export const isVerilog = (path: string): boolean => VERILOG_EXTENSIONS.includes(extension(path));

export const isVhdl = (path: string): boolean => VHDL_EXTENSIONS.includes(extension(path));

/** Verilog ou VHDL, inclusive os `include` do Verilog. */
export const isHdl = (path: string): boolean => isVerilog(path) || isVhdl(path);

/** Pode entrar no projeto como módulo, entidade ou testbench de HDL. */
export const isRegistrable = (path: string): boolean => REGISTRABLE_EXTENSIONS.includes(extension(path));

/** A linguagem de um arquivo novo: Verilog, VHDL ou, num testbench, Python
 * (cocotb). */
export type HdlChoice = 'verilog' | 'vhdl' | 'cocotb';

/** O simulador que roda o testbench `testbench` com a preferência
 * `preference` (a de Verilog): um testbench VHDL roda sempre no GHDL, a regra
 * do Core (`Simulator`). Só para mostrar; quem decide é o Core, e o
 * resultado diz qual rodou. */
export function simulatorFor(preference: string, testbench: string | null | undefined): string {
  return testbench && isVhdl(testbench) ? 'ghdl' : preference;
}

/** O nome de cada simulador, para a interface. */
export function simulatorLabel(simulator: string): string {
  switch (simulator) {
    case 'icarus':
      return 'Icarus';
    case 'verilator':
      return 'Verilator';
    case 'ghdl':
      return 'GHDL';
    default:
      return simulator;
  }
}
