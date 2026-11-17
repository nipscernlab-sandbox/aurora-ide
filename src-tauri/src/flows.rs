//! Os fluxos do Studio: o pedido da interface (o `FlowRequest` do
//! protocolo, em JSON, com `flow`) vai ao servidor da AURORA
//! ([`crate::server`]) pelo `flow.run`, e o resultado volta com o que só o
//! Studio acrescenta: a onda numa aba.
//!
//! A composição em si (compilar antes, parar no primeiro build que falhar,
//! registrar o Verilog gerado, simular, ler as portas, gravar o relatório,
//! abrir a onda, corrigir um exercício) é a da AURORA, a mesma da CLI, e roda
//! no servidor. Aqui ficam só as decisões da interface: o programa
//! `aurora-ide` do comando que vai para o histórico, e se a onda abre em
//! janela ou numa aba (preferência `wave_viewer`).

use camino::Utf8Path;
use serde_json::{Value, json};

use crate::error::{IpcError, IpcResult, codes};
use crate::jobs::{JobMessage, Operation};
use crate::server::AuroraServer;
use crate::settings::Settings;
use crate::toolchain;

/// Quanto do `stdout` e do `stderr` de cada passo vai no resultado final. A
/// interface já recebeu cada linha pelos eventos (menos na simulação rápida,
/// que mostra só o fim da etapa que falhar); o resultado leva o fim, para o
/// resumo, sem mandar megabytes de uma vez.
const STEP_OUTPUT_LIMIT: usize = 256 * 1024;

/// O programa do comando de um fluxo do Studio: quem rodou foi o Studio, não
/// a CLI (`aurora-ide sim -p soma`).
const PROGRAM: &str = "aurora-ide";

/// O que fazer com a resposta do servidor no fim de um fluxo.
pub struct Finisher {
    flow: String,
    command: String,
    wave_tab: bool,
    /// A simulação rápida, que não mostra a saída das ferramentas nem os
    /// valores das portas.
    fast: bool,
}

/// O pedido ao servidor para o fluxo `request`, com as decisões da
/// interface, e o que fazer com a resposta.
pub fn plan(
    server: &AuroraServer,
    settings: &Settings,
    spf: &Utf8Path,
    request: Value,
) -> IpcResult<(Operation, Finisher)> {
    let flow = request["flow"]
        .as_str()
        .ok_or_else(|| IpcError::new(codes::INVALID_ARGUMENT, "The flow request has no flow"))?
        .to_owned();
    let command = server
        .call(
            settings,
            "flow.command",
            json!({ "request": request, "program": PROGRAM }),
        )?
        .as_str()
        .unwrap_or(PROGRAM)
        .to_owned();
    // A onda numa aba é do Studio: o servidor não a abre, e a interface
    // recebe o caminho em `wave_tab`.
    let opens_wave = flow == "simulate" && request["open_wave"] == true;
    let tab = opens_wave
        && settings.wave_viewer == "tab"
        && toolchain::surfer_web(server, settings).is_some();
    // A simulação rápida não mostra o que as ferramentas escrevem (o `quiet`
    // de src/state/jobs.ts) nem os valores das portas, então o servidor nem
    // manda a saída ao vivo nem os valores (`port_values_limit`; a AURORA
    // 1.1.0 não conhece o campo e manda todos, que o `finish` descarta). O
    // fim de cada saída continua no resultado, para a etapa que falhar.
    let fast = flow == "simulate" && request["fast"] == true;
    let mut options = json!({ "command": command, "wave": if tab { "none" } else { "window" } });
    if fast {
        options["port_values_limit"] = json!(0);
    }
    let operation = Operation {
        command: command.clone(),
        method: "flow.run",
        params: json!({
            "project": spf,
            "request": request,
            "options": options,
            "output": !fast,
            "step_output_limit": STEP_OUTPUT_LIMIT,
        }),
    };
    let finisher = Finisher {
        flow,
        command,
        wave_tab: tab,
        fast,
    };
    Ok((operation, finisher))
}

impl Finisher {
    /// A mensagem final da interface: o `FlowOutcome` do servidor, com
    /// `wave_tab` (a onda que a interface abre numa aba, no lugar da
    /// janela). `failed` é a AURORA não conseguir rodar; um fluxo que rodou e
    /// falhou é `finished` com `succeeded: false`, e um cancelado antes de
    /// começar também.
    pub fn finish(self, reply: IpcResult<Value>) -> JobMessage {
        let mut outcome = match reply {
            Ok(outcome) => outcome,
            Err(error) if error.code == codes::CANCELLED => self.cancelled(),
            Err(error) => return JobMessage::Failed { error },
        };
        let wave_tab = if self.wave_tab {
            outcome
                .pointer("/simulation/waveform/path")
                .cloned()
                .unwrap_or(Value::Null)
        } else {
            Value::Null
        };
        if let Some(fields) = outcome.as_object_mut() {
            fields.insert("wave_tab".to_owned(), wave_tab);
        }
        // A simulação rápida não mostra os valores das portas (`writeOutcome`
        // em src/state/jobs.ts), e com 25 milhões de clocks eles eram 4
        // milhões, 30 MiB de JSON que a interface leria e guardaria à toa. O
        // servidor que conhece o `port_values_limit` já não os manda; o da
        // AURORA 1.1.0 manda, e eles param aqui. A porta segue com o caminho
        // e o erro de leitura; os valores estão no `output_<n>.txt` e na aba
        // do processador.
        if self.fast
            && let Some(outputs) = outcome.get_mut("outputs").and_then(Value::as_array_mut)
        {
            for port in outputs {
                if let Some(values) = port.get_mut("values") {
                    *values = Value::Array(Vec::new());
                }
            }
        }
        JobMessage::Finished { outcome }
    }

    /// O resultado de um fluxo cancelado antes de começar, no formato do
    /// `FlowOutcome` do protocolo: nada rodou, então as listas vêm vazias e
    /// o resto nulo.
    fn cancelled(&self) -> Value {
        json!({
            "flow": self.flow,
            "command": self.command,
            "status": "cancelled",
            "succeeded": false,
            "builds": [],
            "registered": [],
            "not_built": [],
            "outputs": [],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn finisher(wave_tab: bool) -> Finisher {
        Finisher {
            flow: "simulate".to_owned(),
            command: "aurora-ide sim".to_owned(),
            wave_tab,
            fast: false,
        }
    }

    #[test]
    fn the_fast_simulation_does_not_pass_the_port_values_on() {
        let outcome = json!({
            "flow": "simulate", "status": "succeeded", "succeeded": true,
            "outputs": [
                { "port": 0, "path": "/p/output_0.txt", "values": [1, 2, 3], "error": null },
                {
                    "port": 1, "path": "/p/output_1.txt", "values": [],
                    "error": { "code": "invalid_data_file", "message": "/p/output_1.txt:3: x" },
                },
            ],
        });
        let fast = Finisher {
            fast: true,
            ..finisher(false)
        };
        let JobMessage::Finished { outcome: quick } = fast.finish(Ok(outcome.clone())) else {
            panic!("finished");
        };
        assert_eq!(quick["outputs"][0]["values"], json!([]));
        assert_eq!(quick["outputs"][0]["path"], "/p/output_0.txt");
        assert_eq!(quick["outputs"][1]["error"]["code"], "invalid_data_file");
        // A simulação com onda continua com os valores.
        let JobMessage::Finished { outcome } = finisher(false).finish(Ok(outcome)) else {
            panic!("finished");
        };
        assert_eq!(outcome["outputs"][0]["values"], json!([1, 2, 3]));
    }

    #[test]
    fn the_outcome_gets_the_wave_tab() {
        let outcome = json!({
            "flow": "simulate", "status": "succeeded", "succeeded": true,
            "simulation": { "waveform": { "path": "/p/tb.fst" } },
        });
        let JobMessage::Finished { outcome } = finisher(true).finish(Ok(outcome.clone())) else {
            panic!("finished");
        };
        assert_eq!(outcome["wave_tab"], "/p/tb.fst");
        let JobMessage::Finished { outcome } = finisher(false).finish(Ok(outcome)) else {
            panic!("finished");
        };
        assert!(outcome["wave_tab"].is_null());
    }

    #[test]
    fn a_flow_cancelled_before_it_started_finishes_cancelled() {
        let reply = Err(IpcError::new(codes::CANCELLED, "Cancelled"));
        let JobMessage::Finished { outcome } = finisher(false).finish(reply) else {
            panic!("finished");
        };
        assert_eq!(outcome["status"], "cancelled");
        assert_eq!(outcome["builds"], json!([]));
        let reply = Err(IpcError::new("toolchain_missing", "No bundle"));
        assert!(matches!(
            finisher(false).finish(reply),
            JobMessage::Failed { .. }
        ));
    }
}
