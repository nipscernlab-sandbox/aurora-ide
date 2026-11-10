# Desenvolvimento

Como preparar a máquina, rodar e testar o Studio, e onde mexer para cada
tipo de mudança. A arquitetura está em [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Preparar a máquina

| O quê | Versão | Para quê |
|---|---|---|
| Rust | 1.90 ou mais novo (`rust-version` do `src-tauri/Cargo.toml`) | o backend; o Tauri 2.12 pede 1.90 |
| Node.js | 22 | a interface (Vite, TypeScript) |
| Dependências de sistema do Tauri | ver abaixo | WebView e GTK |
| O submódulo `vendor/aurora` | o commit fixado neste repositório | o repositório da AURORA: o servidor que o Studio abre (`aurora serve`, do `crates/aurora-cli`), o `aurora-agent` do assistente e o `aurora-protocol`, que entram por caminho (`../vendor/aurora/crates/`, em `src-tauri/Cargo.toml`), os tipos, que saem de `vendor/aurora/docs/schema`, e o RTL viewer |
| Uma instalação da AURORA | qualquer | o bundle das ferramentas, para rodar o Studio e os testes de fluxo; ou um bundle em `AURORA_TEST_BUNDLE` |

Dependências de sistema, conforme a página de pré-requisitos do Tauri 2
(<https://v2.tauri.app/start/prerequisites/>), confira lá a lista atual:

- **Fedora:** `sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel` e o grupo de desenvolvimento C (`sudo dnf group install c-development`).
- **Debian e Ubuntu:** `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`.
- **macOS:** as Command Line Tools do Xcode.
- **Windows:** as Build Tools do Visual Studio com o C++ e o WebView2 (já vem no Windows 10 e 11 atualizados).

O repositório da AURORA entra como submódulo git em `vendor/aurora`,
fixado num commit:

```
aurora-ide/
  src/                      a interface
  src-tauri/                o backend (Tauri)
  vendor/aurora/            o repositório da AURORA, no commit fixado
    crates/aurora-cli/      o aurora, que o Studio abre como servidor (aurora serve)
    crates/aurora-agent/    o assistente, que o backend linka por caminho
    crates/aurora-protocol/ os tipos do protocolo, também por caminho
    docs/schema/            os tipos que o npm run gen:types lê
    packages/rtl-viewer/    o RTL viewer, que a interface compila do fonte
    examples/               os projetos dos testes de fluxo
```

Clone com o submódulo, ou busque-o depois:

```sh
git clone --recursive https://github.com/nipscernlab-sandbox/aurora-ide
git submodule update --init       # num clone feito sem --recursive
```

O `src-tauri/` tem o próprio `Cargo.lock`, e o build não entra no workspace
do submódulo. Os testes dos fluxos do Studio pedem o bundle instalado (ou
`AURORA_TEST_BUNDLE`) e um `aurora` para servir; no CI
(`.github/workflows/ci.yml`), o `aurora` sai do submódulo e as ferramentas,
da última release da AURORA.

O Studio não linka o Core: tudo da AURORA é pedido ao servidor, um `aurora
serve` filho (ARCHITECTURE.md, seção 3.2). Em desenvolvimento, o servidor
precisa ser o `aurora` do submódulo, que fala os métodos que o Studio pede;
o da instalação pode ser de outra versão. Compile antes e aponte o Studio
para ele com `AURORA_IDE_CLI` (ou a preferência Programa aurora, em
Preferências > Bundle da AURORA), com o caminho absoluto:

```sh
cargo build -p aurora-cli --manifest-path vendor/aurora/Cargo.toml
AURORA_IDE_CLI="$PWD/vendor/aurora/target/debug/aurora" npm run tauri dev
```

O bundle é o da instalação da AURORA, achado pelo Studio e passado ao
servidor em `--toolchain`, ou o de `AURORA_TOOLCHAIN` ou da preferência.

## 2. Rodar

```sh
npm install
npm run tauri dev
```

O `tauri dev` sobe o Vite em `http://localhost:1420`, compila o backend e
abre a janela. Salvar um arquivo de `src/` recarrega a interface na hora;
salvar um de `src-tauri/` recompila e reabre o aplicativo. A primeira
compilação do backend leva vários minutos (o Tauri e o WebKitGTK).

Log do backend no terminal: `RUST_LOG=aurora_ide_lib=debug npm run tauri dev`. O
stderr do servidor da AURORA sai no mesmo log, com o alvo `aurora_serve`.
O inspetor da WebView abre com Ctrl+Shift+I, só na build de
desenvolvimento (o menu de contexto do navegador fica desligado fora dos
campos de texto, em `src/main.tsx`).

## 3. Conferir

| Comando | O que confere |
|---|---|
| `npm run typecheck` | os tipos da interface |
| `npm run build` | os tipos e o empacotamento da interface (Vite) |
| `cd src-tauri && cargo clippy` | o backend, com os avisos do clippy |
| `cd src-tauri && cargo test` | os testes do backend: unidade e os fluxos de verdade |
| `npm run tauri build` | o aplicativo inteiro e os instaladores da plataforma |

Os testes de `src-tauri/tests/flows.rs` rodam, pelo servidor da AURORA,
check, sim, synth e build sobre cópias dos exemplos da AURORA, a correção de
um exercício (`learn`) sobre a trilha de teste do `aurora-learn` e as recusas
do `fpga_build`, com o bundle que o Studio acharia sozinho ou com
`AURORA_TEST_BUNDLE=/caminho/do/toolchain`. O servidor é o `aurora` de
`AURORA_IDE_CLI` ou, sem ela, o `vendor/aurora/target/debug/aurora` (compile
antes, como na seção 1). Os testes de unidade do `server.rs` que
abrem um servidor de verdade também usam `AURORA_IDE_CLI`. Sem bundle ou
sem `aurora`, avisam e passam; com `CI` definido, falham. A IDE só acha
sozinha a instalação do `aurora` que está no `PATH`; fora dele, passe o
bundle em `AURORA_TEST_BUNDLE`, como o CI faz.

No Windows, o binário de testes do backend pode não abrir
(STATUS_ENTRYPOINT_NOT_FOUND, visto com o toolchain GNU do Rust): ele
importa o `TaskDialogIndirect` do comctl32, e o `tauri-build` só liga o
manifesto do Common Controls 6 nos executáveis do aplicativo. O contorno:
copiar o `.exe` de testes para outro nome (o Windows guarda a ativação sem
manifesto do nome antigo), pôr ao lado um `<nome>.exe.manifest` que pede o
`Microsoft.Windows.Common-Controls` 6.0.0.0, pôr a pasta `target/debug` (a
do `WebView2Loader.dll`) no `PATH` e rodar o `.exe` direto. O CI roda os
testes no Linux, onde isso não acontece.

Antes de mandar uma mudança: `typecheck`, `clippy` sem aviso, `cargo test`
e, se mexeu na interface, abrir o Studio e passar pelo que mudou.

### Roteiro de fumaça

Na build de desenvolvimento, a variável `AURORA_IDE_SMOKE` faz a interface
rodar uma sequência de ações sozinha, pelo mesmo caminho dos botões
(`src/dev/smoke.ts`). Serve para conferir a interface de ponta a ponta sem
mouse nem teclado, e para capturar a tela de cada passo:

```sh
AURORA_IDE_SMOKE="wait:2000;open:rtl/contador.v;check;fastSim;synthesize;view:schematic" \
RUST_LOG=info npm run tauri dev
```

Os passos são ids de ação de `actions.ts` (`build`, `check`, `lint`,
`fastSim`, `synthesize`, `toggleTheme`...) ou:

| Passo | Faz |
|---|---|
| `wait:<ms>` | espera |
| `open:<caminho relativo>` | abre um arquivo do projeto |
| `aside:<caminho relativo>` | abre um arquivo no grupo do editor à direita |
| `project:<.spf>` | abre outro projeto |
| `add:<caminho>` | registra um Verilog como Projeto > Adicionar arquivos Verilog, sem o diálogo (caminho absoluto, ou relativo à pasta do projeto) |
| `target:<processador>` | escolhe o alvo (vazio: o projeto) |
| `view:<tipo>[:<nome>]` | abre uma vista |
| `panel:<vista>`, `sidebar:<vista>` | mostra a vista (`info`, `cmm`, `terminal`, `explorer`...) na região onde o layout a pôs; os dois são o mesmo |
| `explorer:<modo>` | mostra o explorador num modo (`sources`, `hierarchy`, `files`) |
| `move:<vista>:<região>` | leva a vista para `left`, `right` ou `panel` |
| `region:<região>:<on\|off>` | mostra ou esconde uma região |
| `bar:<barra>:<valor>` | `menubar`, `toolbar` ou `statusbar` com `on` ou `off`; `activitybar` com `left`, `right` ou `hidden` |
| `layoutlog` | escreve no log a janela numa linha: cada região com as vistas (`>` a ativa, entre parênteses as escondidas), a posição do painel, as barras e os tamanhos |
| `layout:<id>` | aplica um layout com nome: `default` (o Padrão) ou o id de um gravado |
| `click:<seletor>` | clica no elemento |
| `focus:<seletor>` | põe o foco no elemento |
| `key:<tecla>` | manda a tecla ao elemento com foco |
| `type:<seletor>\|<texto>` | escreve num campo, como se fosse digitado |
| `drag:<de>\|<para>` | arrasta com eventos de ponteiro, de centro a centro |
| `osdrop:<seletor>\|<caminho>...` | emite o evento de arrastar do Tauri, como se os arquivos viessem do gerenciador de arquivos e caíssem no centro do elemento |
| `framekey:<tecla>` | uma tecla (`F7`, `Ctrl+B`) como o cliente web da aba de onda aberta a repassa ao Studio: uma mensagem vinda do iframe |
| `editor` | escreve no log os grupos do editor e as abas de cada um (`*` marca o grupo ativo, `>` a aba ativa) |
| `rects:<seletor>` | escreve no log a posição e o tamanho de cada elemento que casa |
| `count:<seletor>` | escreve no log quantos elementos casam |
| `menu:<seletor>` | abre o menu de contexto do elemento (o botão direito no centro dele) e escreve no log os itens, com `-` nos separadores e `(off)` nos desabilitados |
| `choose:<rótulo>` | clica no item do menu aberto que tem esse rótulo |

Cada passo concluído sai no log como `smoke: <passo>`, com o diálogo aberto
entre colchetes (`newFolder [prompt]`), e o fim como `smoke: done`. Uma
ação que abre um diálogo não é esperada até o fim: o roteiro segue para os
passos que o preenchem. Na build de release a variável é ignorada.

Quando a janela abre em branco, o mais rápido é carregar a interface no
Chromium sem interface e ler o console: os erros de carregamento de módulo
(um import que o Vite não resolveu, por exemplo) aparecem lá, antes de
qualquer chamada ao Tauri.

```sh
chromium-browser --headless=new --enable-logging=stderr --virtual-time-budget=20000 \
  --dump-dom http://localhost:1420/ 2>&1 >/dev/null | grep CONSOLE
```

Os erros da interface (exceções, `console.error`, avisos de erro) também vão
para o log do backend, com o alvo `aurora_ide::ui`, e também quanto a
abertura levou (`Startup: modules loaded in ... ms, first frame at ...
ms`, contado da navegação da WebView).

A janela só aparece quando a interface está desenhada (ARCHITECTURE.md,
4.1). No desenvolvimento isso leva pelo menos 3,2 s, o tempo mínimo do splash (`SPLASH_MIN_MS`, em `src/App.tsx`), com o Vite já aquecido, e
mais na primeira vez depois de subir o Vite, que pré-empacota as
dependências; se o Vite não estiver rodando, a janela aparece vazia depois
de 10 s. Um script que espera a janela (com o `wmctrl`, por exemplo)
precisa esperar esse tempo.

## 4. Onde mudar o quê

### Uma ação nova (botão, menu, atalho)

1. Acrescente a ação em `src/actions.ts` (`ACTIONS`): `id`, chave de
   tradução, categoria, atalho, ícone, `enabled` e `run`.
2. Acrescente a chave em `src/i18n/pt.ts` e `src/i18n/en.ts`.
3. Para aparecer num menu, ponha o `id` na lista do menu em
   `src/components/layout/MenuBar.tsx`. A paleta de comandos e a tabela de
   atalhos a pegam sozinhas.

### Uma operação da AURORA na interface

O que é da AURORA (o projeto, os fluxos, o histórico, a placa, os
exercícios) não ganha comando no backend: é um método do protocolo, que a
interface pede pelo `aurora_call`. Se o método ainda não existe, ele nasce no
AURORA, com o passo a passo de
[docs/METODOLOGIA.md](https://github.com/nipscernlab-sandbox/aurora/blob/main/docs/METODOLOGIA.md),
seção 6, e chega ao Studio pelo servidor quando o submódulo passa a apontar
para um commit que o tem (seção 6, abaixo).

1. Acrescente a função em `src/ipc/api.ts`, chamando `aurora('<método>',
   { parâmetros })`. O tipo do resultado já está em
   `src/ipc/aurora-types.ts`, gerado (veja "Um tipo do Core mudou", abaixo).
   O projeto aberto entra sozinho no campo `project`.
2. Um método longo, com progresso (como o `flow.run`), vai como operação:
   `jobs::start`, com o pedido e o que fazer com a resposta.
3. Documente em [IPC.md](IPC.md), na tabela do `aurora_call`.

### Um comando novo no backend

Para o que só existe no Studio (janela, arquivo, terminal, preferência):

1. Escreva a função em `src-tauri/src/commands/<assunto>.rs`, com
   `#[tauri::command]`, `async` e o trabalho dentro de `state::blocking`.
   Devolva `IpcResult<T>`.
2. Registre em `tauri::generate_handler!` (`src-tauri/src/lib.rs`).
3. Acrescente a função em `src/ipc/api.ts`; um tipo que existe apenas no
   Studio vai à mão em `src/ipc/types.ts`.
4. Documente em [IPC.md](IPC.md).
5. Lógica de orquestração (que ferramenta rodar, em que ordem) não entra
   aqui: vai para a AURORA, como método. Se precisar mesmo, isole-a em
   `flows.rs` e anote em ARCHITECTURE.md, seção 8.

### Uma vista nova (aba central)

1. Crie o componente em `src/components/views/`.
2. Acrescente o tipo em `ViewKind` (`src/state/editor.ts`) e, se a vista
   tiver parâmetro, o identificador em `viewTabId`.
3. Ligue em `ViewContent`, `tabTitle` (`EditorArea.tsx`) e `tabIcon`
   (`tabIcons.ts`).

### Uma vista nova numa região (barra lateral ou painel)

1. Acrescente o id em `VIEW_IDS` e a entrada em `VIEW_INFO`
   (`src/state/layoutModel.ts`): rótulo, região padrão e a ação que a revela.
2. Ligue o ícone e o componente em `src/components/layout/viewCatalog.tsx`.
   Os botões da vista vão em `<ViewActions>`; eles aparecem no cabeçalho da
   região onde ela estiver.
3. Acrescente a ação que a revela em `actions.ts` (`revealView` com
   `explicit`) e, se fizer sentido, no menu Exibir.

Os layouts gravados antes não precisam de migração: uma vista que não está
em região nenhuma vai para a região padrão dela (`normalizeBody`). Pelo
mesmo motivo, um item novo da barra de ferramentas ou de status
(`TOOLBAR_ITEMS`, `STATUS_ITEMS`) aparece sozinho: o layout guarda o que
está escondido, não o que aparece.

### Um tipo do Core mudou

```sh
npm run gen:types     # relê vendor/aurora/docs/schema/*.json
git diff src/ipc/aurora-types.ts
```

`AURORA_REPO=/outro/aurora npm run gen:types` lê de outro lugar.

### Cores, temas e medidas

As cores ficam nos temas, em `src/themes/catalog.ts`; cada tema
dá as cores da interface, da sintaxe, do editor e dos terminais, e o Monaco
e os consoles saem dele. Componente usa variável CSS (`var(--text-1)`),
nunca cor literal. Uma variável nova entra em `UiColors`
(`src/themes/model.ts`) e em todos os temas; o TypeScript aponta o tema que
ficou sem ela.

Para um tema novo, um objeto a mais no catálogo, com a fonte das cores na
tabela do começo do arquivo. Uma paleta com escuro e claro são dois
objetos, cada um com o outro no `pair`; o `settings.json` grava o id do
escuro, que não muda depois de lançado.

Os temas da AURORA IDE (o Boreal, que é o padrão, o Austral, o Nebulosa,
o Alvorada e o Lunar, cada um com o seu claro) saem da função `aurora` do
catálogo: os mesmos
cinzas quase neutros e uma cor de destaque por paleta, que na sintaxe vai
para as palavras reservadas e os tipos, com uma segunda cor em números e
textos. As medidas (fontes, espaços, raios, alturas) ficam
em `src/styles/tokens.css`.

### Gramáticas de C± e do assembly

`src/editor/languages/cmm.ts` e `asm.ts`. A fonte da verdade é o léxico do
YANC (`CMMComp.l`, `ASMComp.l`, `isa.tsv` no repositório do YANC), não a
AURORA: onde as duas divergem há um comentário dizendo o que vale.

## 5. Convenções

- Comentários e documentação em português; identificadores em inglês, como
  na AURORA.
- Texto de interface sempre por `t('chave')`, nunca literal no componente.
- Sem travessão nem emoji em texto de interface, comentário ou documento.
- Rust: `cargo fmt`, `clippy` sem aviso, `#![forbid(unsafe_code)]`.
- Um commit por assunto, com a mensagem em português, como na AURORA.

## 6. Versão, submódulo e release

A IDE tem versão própria, separada da AURORA: a primeira com o nome novo é
a 8.0.0. Ela está em quatro lugares deste repositório, que andam juntos:
`package.json`, `package-lock.json`, `src-tauri/Cargo.toml` e
`src-tauri/tauri.conf.json`. O `release.yml` recusa versões diferentes, e
a IDE só sobe de versão quando muda (o
[docs/RELEASE.md](https://github.com/nipscernlab-sandbox/aurora/blob/main/docs/RELEASE.md)
da AURORA, seção 6.1). Anote a mudança em [CHANGELOG.md](../CHANGELOG.md).

### A versão da AURORA que a IDE usa

É o commit do submódulo `vendor/aurora`. Para trocar:

```sh
git -C vendor/aurora fetch
git -C vendor/aurora checkout <tag ou commit>
npm run gen:types                       # os tipos do schema novo
git add vendor/aurora src/ipc/aurora-types.ts
```

O CI confere que o `src/ipc/aurora-types.ts` é o que o schema do submódulo
gera. Um método novo do protocolo passa por três passos: a AURORA com o
método na main dela, o ponteiro e a release da IDE, e a release da AURORA
com a IDE nova no bundle. O `PROTOCOL_VERSION` que a IDE confere ao
conectar (`src-tauri/src/server.rs`) só muda quando o protocolo deixa de
ser compatível.

### Release

1. Na main, com a versão nova nos quatro lugares e a seção dela no
   CHANGELOG.md:

   ```sh
   git tag v8.1.0 && git push origin v8.1.0
   ```

2. O `.github/workflows/release.yml` compila a IDE nas três plataformas e
   publica `aurora-ide-<versão>-<plataforma>.tar.gz` com o `SHA256SUMS`. Os
   SHA-256 também saem no resumo da execução.
3. No repositório da AURORA, o pacote `studio` do `bundle/versions.json`
   recebe a versão, a URL e o SHA-256 de cada plataforma, e a release
   seguinte da AURORA leva a IDE nova a quem atualiza. É assim a partir da
   AURORA 1.1.0; até ela, o bundle compilava a IDE da pasta `studio/` do
   repositório da AURORA.

Sem tag (Actions > release > Run workflow), o mesmo workflow só compila e
guarda os arquivos na execução, para conferir antes de publicar.

Os ícones do app em `src-tauri/icons/` saem de `public/brand/aurora-icon.svg`.
O `tauri icon` gera também os de Android e iOS, que o Studio não usa, então
gere numa pasta à parte e copie só os que já existem:

```sh
npx tauri icon public/brand/aurora-icon.svg -o /tmp/aurora-icons
for f in src-tauri/icons/*; do cp "/tmp/aurora-icons/$(basename "$f")" "$f"; done
```

`npm run tauri build` gera os instaladores da plataforma em que roda
(`.deb`, `.rpm` e AppImage no Linux; `.dmg` no macOS; `.msi` e `.exe` no
Windows). Eles não vão para os usuários: o Studio sai no instalador da
AURORA, a partir dos arquivos da release deste repositório, que o
`release.yml` compila com `tauri build --no-bundle` (e só o `.app` no
macOS).
