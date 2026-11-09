<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/aurora-lockup-reverse.svg">
    <img src="public/brand/aurora-lockup.svg" alt="AURORA" width="300">
  </picture>
</h1>

<p align="center">
  <a href="https://nipscern.com"><img src="https://img.shields.io/badge/NIPS--CERN-UFJF-236ADE" alt="NIPS-CERN, UFJF"></a>
</p>

A AURORA IDE é o ambiente gráfico da
[AURORA](https://github.com/nipscernlab-sandbox/aurora) para projetos
Verilog e processadores SAPHO. Cria e abre projetos `.spf`, edita C±, C e
Verilog, compila pelo YANC, verifica e simula com Icarus Verilog e
Verilator, sintetiza com Yosys, desenha o esquemático com Graphviz, abre a
onda no surfer-aurora e guarda o relatório de cada operação. Sucede a
AURORA 7, feita em Electron.

Até 2026-10-29 se chamava Lace Studio. Até 2026-11-09 ficava na pasta
`studio/` do repositório da AURORA, de onde veio com o histórico.

## Instalar

A IDE vem no instalador da AURORA, como o componente `studio`, marcado em
todos os perfis: veja a
[instalação da AURORA](https://github.com/nipscernlab-sandbox/aurora#instalar).
Numa instalação sem ela, `aurora install studio`. Não há instalador
separado. Instalada assim, a IDE fica no bundle (`toolchain/studio/`), usa
o bundle em que está e se atualiza com a AURORA, pelo `aurora update`.

Ela usa o WebView do sistema:

- no Windows 10 e 11, o WebView2, que vem com o sistema atualizado;
- no Linux, o webkit2gtk 4.1 (`libwebkit2gtk-4.1-0` no Debian e no Ubuntu,
  `webkit2gtk4.1` no Fedora), que o Fedora KDE e o Arch não trazem;
- no macOS, o do sistema, em Apple Silicon com o macOS 13 ou mais novo.

## A IDE e a AURORA

A regra de negócio fica toda na AURORA. A IDE abre um `aurora serve` filho
e pede pelo protocolo dele tudo o que é da AURORA: projetos, fluxos,
histórico, placa e exercícios. Ao conectar, ela confere a versão do
protocolo e recusa um `aurora` que fale outra. Como cada versão da IDE usa
os métodos da AURORA do mesmo bundle, as duas saem juntas:

| AURORA IDE | AURORA | Protocolo |
|---|---|---|
| 8.0.0 | 1.0.0 | 2 |
| 8.1.0 | 1.1.0, ainda não lançada | 2 |

Neste repositório, a AURORA entra como submódulo git em `vendor/aurora`,
fixado num commit. Dali vêm o `aurora` que serve nos testes e no
desenvolvimento, os crates `aurora-agent` e `aurora-protocol`, o schema de
onde saem os tipos da interface e o RTL viewer. Trocar a versão da AURORA
que a IDE usa é trocar esse ponteiro.

## Compilar do fonte

Rust 1.90 ou mais novo, Node.js 22 e as dependências de sistema do Tauri 2;
a lista por sistema está em [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

```sh
git clone --recursive https://github.com/nipscernlab-sandbox/aurora-ide
cd aurora-ide
npm ci
cargo build -p aurora-cli --manifest-path vendor/aurora/Cargo.toml
AURORA_IDE_CLI="$PWD/vendor/aurora/target/debug/aurora" npm run tauri dev
```

O `tauri dev` abre a IDE e recarrega a interface ao salvar. O servidor é o
`aurora` compilado do submódulo, que fala os métodos que a IDE pede; as
ferramentas são as da instalação da AURORA. Num clone sem o submódulo,
`git submodule update --init`.

Testes:

```sh
npm run typecheck                       # TypeScript
cd src-tauri && cargo test              # Rust, inclusive os fluxos contra o bundle instalado
```

## Releases

Uma tag `vX.Y.Z` compila a IDE nas três plataformas
(`.github/workflows/release.yml`) e publica um arquivo por plataforma,
`aurora-ide-<versão>-linux-x64.tar.gz`, `-darwin-arm64.tar.gz` e
`-windows-x64.tar.gz`, com o `SHA256SUMS` e as notas do
[CHANGELOG.md](CHANGELOG.md). Cada arquivo tem o que vai em
`toolchain/studio/` no bundle: o executável `aurora-ide` e o ícone no Linux
e no Windows, o `AURORA IDE.app` no macOS. A partir da AURORA 1.1.0, o
bundle da AURORA baixa esses arquivos e confere o SHA-256 de cada um,
fixado no `bundle/versions.json` do repositório da AURORA.

## Documentação

| Documento | Para quê |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | usar a IDE: a janela, os fluxos Verilog e SAPHO, consoles, atalhos, preferências, problemas comuns |
| [docs/AURORA_PARITY.md](docs/AURORA_PARITY.md) | cada recurso da AURORA 7 e onde está nesta IDE, ou o que falta |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | como a IDE é feita: backend, interface, operações, estado, segurança |
| [docs/IPC.md](docs/IPC.md) | a referência de cada comando entre a interface e o backend |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | preparar a máquina, rodar, testar, onde mudar o quê, versão e release |
| [CONTRIBUTING.md](CONTRIBUTING.md) | o que conferir antes de mandar uma mudança |
| [CHANGELOG.md](CHANGELOG.md) | mudanças por versão |

## Licença

MIT, em [LICENSE](LICENSE).

NIPS-CERN, Núcleo de Instrumentação e Processamento de Sinais, Faculdade de
Engenharia da UFJF. <https://nipscern.com>
