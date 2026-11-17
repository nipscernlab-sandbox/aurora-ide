/**
 * vhdl.ts: o VHDL (.vhd, .vhdl) no Monaco da AURORA IDE.
 *
 * O Monaco não traz VHDL. Aqui ficam o realce (Monarch, sem diferenciar
 * maiúsculas, como a linguagem), a configuração (comentários `--` e o
 * `/* *\/` do VHDL-2008, parênteses, indentação) e os modelos de código mais
 * usados (entidade, arquitetura, processo, instância, testbench).
 *
 * As palavras reservadas são as do VHDL-2008 e do VHDL-2019, as mesmas que a
 * AURORA recusa como nome de entidade (`aurora_core::vhdl`). A simulação é em
 * VHDL-2008, no GHDL.
 *
 * Só tipos do Monaco são importados: quem registra recebe o namespace pronto.
 */
import type * as Monaco from 'monaco-editor/editor/editor.api';

export const VHDL_LANGUAGE_ID = 'vhdl';

// ---------------------------------------------------------------------------
// Vocabulário
// ---------------------------------------------------------------------------

const KEYWORDS = [
  'abs', 'access', 'after', 'alias', 'all', 'and', 'architecture', 'array', 'assert', 'assume',
  'assume_guarantee', 'attribute', 'begin', 'block', 'body', 'buffer', 'bus', 'case',
  'component', 'configuration', 'constant', 'context', 'cover', 'default', 'disconnect',
  'downto', 'else', 'elsif', 'end', 'entity', 'exit', 'fairness', 'file', 'for', 'force',
  'function', 'generate', 'generic', 'group', 'guarded', 'if', 'impure', 'in', 'inertial',
  'inout', 'is', 'label', 'library', 'linkage', 'literal', 'loop', 'map', 'mod', 'nand', 'new',
  'next', 'nor', 'not', 'null', 'of', 'on', 'open', 'or', 'others', 'out', 'package',
  'parameter', 'port', 'postponed', 'private', 'procedure', 'process', 'property', 'protected',
  'pure', 'range', 'record', 'register', 'reject', 'release', 'rem', 'report', 'restrict',
  'restrict_guarantee', 'return', 'rol', 'ror', 'select', 'sequence', 'severity', 'shared',
  'signal', 'sla', 'sll', 'sra', 'srl', 'strong', 'subtype', 'then', 'to', 'transport', 'type',
  'unaffected', 'units', 'until', 'use', 'variable', 'view', 'vmode', 'vprop', 'vunit', 'wait',
  'when', 'while', 'with', 'xnor', 'xor',
];

/** Os tipos dos pacotes `std` e `ieee` que um projeto usa sempre. */
const TYPES = [
  'bit', 'bit_vector', 'boolean', 'boolean_vector', 'character', 'delay_length', 'integer',
  'integer_vector', 'natural', 'positive', 'real', 'real_vector', 'severity_level', 'string',
  'time', 'time_vector', 'std_logic', 'std_logic_vector', 'std_ulogic', 'std_ulogic_vector',
  'signed', 'unsigned', 'ufixed', 'sfixed', 'float', 'line', 'text', 'side', 'width',
  'file_open_kind', 'file_open_status',
];

/** Os valores e funções que aparecem em quase todo arquivo. */
const CONSTANTS = ['true', 'false', 'note', 'warning', 'error', 'failure', 'now'];

const FUNCTIONS = [
  'rising_edge', 'falling_edge', 'to_integer', 'to_unsigned', 'to_signed', 'resize',
  'std_logic_vector', 'to_hstring', 'to_string', 'shift_left', 'shift_right',
  'finish', 'stop',
];

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export const vhdlConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: { lineComment: '--', blockComment: ['/*', '*/'] },
  brackets: [['(', ')']],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
  // `clk'event` e `a_b`: o apóstrofo não entra na palavra.
  wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
  indentationRules: {
    increaseIndentPattern:
      /^.*\b(begin|then|else|is|loop|generate|process|record|units)\s*(--.*)?$|^.*\(\s*(--.*)?$|^\s*when\b.*=>\s*(--.*)?$/i,
    decreaseIndentPattern: /^\s*(end|else|elsif|begin|when)\b|^\s*\)/i,
  },
  folding: {
    markers: {
      start: /^\s*--\s*#?region\b/,
      end: /^\s*--\s*#?endregion\b/,
    },
  },
};

// ---------------------------------------------------------------------------
// Tokenizador
// ---------------------------------------------------------------------------

/** Monarch do VHDL. Tokens emitidos ganham o sufixo `.vhdl`. */
export const vhdlMonarch: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.vhdl',
  ignoreCase: true,

  keywords: KEYWORDS,
  typeKeywords: TYPES,
  constants: CONSTANTS,
  functions: FUNCTIONS,
  operators: ['=>', '<=', ':=', '/=', '>=', '**', '<>', '?=', '?/=', '??', '=', '<', '>', '+', '-', '*', '/', '&', '|'],
  symbols: /[=><!~?:&|+\-*/^%]+/,

  tokenizer: {
    root: [
      [/--.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Literal de bits: x"0F", b"0101", o"17", e com largura no 2008 (8x"FF").
      [/\b\d*[bBoOxXdD]"[^"]*"/, 'number.hex'],
      [/"([^"]|"")*"/, 'string'],
      // Literal de caractere ('1', 'Z') antes do atributo (clk'event).
      [/'.'/, 'string'],
      [/'[a-zA-Z_]\w*/, 'attribute'],

      // Números: com base (16#FF#), reais e inteiros, com `_` entre dígitos.
      [/\d[\d_]*#[0-9a-fA-F_]+(\.[0-9a-fA-F_]*)?#([eE][+-]?\d+)?/, 'number.hex'],
      [/\d[\d_]*\.\d[\d_]*([eE][+-]?\d+)?/, 'number.float'],
      [/\d[\d_]*([eE][+-]?\d+)?/, 'number'],

      [
        /[a-zA-Z][\w]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'type',
            '@constants': 'constant',
            '@functions': 'predefined',
            '@default': 'identifier',
          },
        },
      ],
      // Identificador estendido: \nome qualquer\.
      [/\\[^\\\n]*\\/, 'identifier'],

      [/[()]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      [/\s+/, 'white'],
    ],
    comment: [
      [/[^*/]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[*/]/, 'comment'],
    ],
  },
};

// ---------------------------------------------------------------------------
// Modelos de código
// ---------------------------------------------------------------------------

interface Modelo {
  rotulo: string;
  detalhe: string;
  corpo: string;
}

const MODELOS: Modelo[] = [
  {
    rotulo: 'library ieee',
    detalhe: 'std_logic_1164 e numeric_std',
    corpo: 'library ieee;\nuse ieee.std_logic_1164.all;\nuse ieee.numeric_std.all;\n',
  },
  {
    rotulo: 'entity',
    detalhe: 'entity ... is port (...); end entity;',
    corpo:
      'entity ${1:nome} is\n\tport (\n\t\t${2:clk} : in  std_logic;\n\t\t${3:y}   : out std_logic\n\t);\nend entity ${1:nome};\n',
  },
  {
    rotulo: 'architecture',
    detalhe: 'architecture ... of ... is begin ... end architecture;',
    corpo: 'architecture ${1:rtl} of ${2:nome} is\nbegin\n\t$0\nend architecture ${1:rtl};\n',
  },
  {
    rotulo: 'process (clk)',
    detalhe: 'processo síncrono, com rising_edge',
    corpo:
      'process (${1:clk})\nbegin\n\tif rising_edge(${1:clk}) then\n\t\t$0\n\tend if;\nend process;',
  },
  {
    rotulo: 'process (all)',
    detalhe: 'processo combinacional (VHDL-2008)',
    corpo: 'process (all)\nbegin\n\t$0\nend process;',
  },
  {
    rotulo: 'if',
    detalhe: 'if ... then ... end if;',
    corpo: 'if ${1:condicao} then\n\t$0\nend if;',
  },
  {
    rotulo: 'case',
    detalhe: 'case ... is when ... end case;',
    corpo: 'case ${1:seletor} is\n\twhen ${2:valor} =>\n\t\t$0\n\twhen others =>\n\t\tnull;\nend case;',
  },
  {
    rotulo: 'for generate',
    detalhe: 'rotulo : for i in ... generate',
    corpo: '${1:gen} : for ${2:i} in 0 to ${3:7} generate\n\t$0\nend generate ${1:gen};',
  },
  {
    rotulo: 'instance',
    detalhe: 'u0 : entity work.<entidade> port map (...)',
    corpo: '${1:u0} : entity work.${2:entidade}\n\tport map (\n\t\t$0\n\t);',
  },
  {
    rotulo: 'signal',
    detalhe: 'signal ... : std_logic;',
    corpo: 'signal ${1:nome} : ${2:std_logic};',
  },
  {
    rotulo: 'clock',
    detalhe: 'relógio de testbench',
    corpo: '${1:clk} <= not ${1:clk} after ${2:5 ns};',
  },
  {
    rotulo: 'report',
    detalhe: 'report ... severity ...',
    corpo: 'report "${1:mensagem}" severity ${2|note,warning,error,failure|};',
  },
  {
    rotulo: 'assert',
    detalhe: 'assert ... report ... severity error',
    corpo: 'assert ${1:condicao} report "${2:mensagem}" severity ${3|error,failure,warning,note|};',
  },
  {
    rotulo: 'std.env.finish',
    detalhe: 'termina a simulação (VHDL-2008)',
    corpo: 'std.env.finish;',
  },
];

function provedorDeModelos(monaco: typeof Monaco): Monaco.languages.CompletionItemProvider {
  return {
    provideCompletionItems(model, position) {
      const palavra = model.getWordUntilPosition(position);
      const intervalo = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: palavra.startColumn,
        endColumn: palavra.endColumn,
      };
      const suggestions = MODELOS.map((m) => ({
        label: m.rotulo,
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: m.detalhe,
        insertText: m.corpo,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: intervalo,
      }));
      return { suggestions };
    },
  };
}

/** Registra o VHDL: linguagem, configuração, tokenizador e modelos. */
export function registerVhdl(monaco: typeof Monaco): Monaco.IDisposable {
  monaco.languages.register({
    id: VHDL_LANGUAGE_ID,
    extensions: ['.vhd', '.vhdl'],
    aliases: ['VHDL', 'vhdl'],
  });
  const descartes: Monaco.IDisposable[] = [
    monaco.languages.setLanguageConfiguration(VHDL_LANGUAGE_ID, vhdlConfiguration),
    monaco.languages.setMonarchTokensProvider(VHDL_LANGUAGE_ID, vhdlMonarch),
    monaco.languages.registerCompletionItemProvider(VHDL_LANGUAGE_ID, provedorDeModelos(monaco)),
  ];
  return {
    dispose(): void {
      descartes.forEach((d) => d.dispose());
    },
  };
}
