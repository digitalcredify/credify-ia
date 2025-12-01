"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestJuridicoDetailedData = void 0;
const documents_1 = require("@langchain/core/documents");
const qdrant_1 = require("@langchain/qdrant");
const config_1 = require("../../config");
const traceable_1 = require("langsmith/traceable");
const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection';
/**
 * Função auxiliar para converter objetos REGISTRO* em arrays
 */
const registroObjectToArray = (obj) => {
    if (!obj || typeof obj !== 'object')
        return [];
    return Object.keys(obj)
        .filter(key => key.startsWith('REGISTRO'))
        .sort((a, b) => {
        const numA = parseInt(a.replace('REGISTRO', ''));
        const numB = parseInt(b.replace('REGISTRO', ''));
        return numA - numB;
    })
        .map(key => obj[key]);
};
/**
 * Formata os assuntos CNJ do processo
 */
const formatAssuntos = (assuntosObj) => {
    const assuntosArray = registroObjectToArray(assuntosObj);
    if (assuntosArray.length === 0)
        return "Sem assuntos registrados";
    return assuntosArray
        .map((assunto, index) => {
        const titulo = assunto.TITULO || "N/A";
        const codigoCNJ = assunto.CODIGOCNJ || "N/A";
        return `${index + 1}. ${titulo} (CNJ: ${codigoCNJ})`;
    })
        .join("\n");
};
/**
 * Formata as partes do processo com advogados
 */
const formatPartes = (partesObj) => {
    const partesArray = registroObjectToArray(partesObj);
    if (partesArray.length === 0)
        return "Sem partes registradas";
    return partesArray
        .map((parte, index) => {
        const tipo = parte.TIPO || "N/A";
        const nome = parte.NOME || "N/A";
        const polo = parte.POLO || "N/A";
        const documento = parte.CPF || parte.CNPJ || "N/A";
        const advogadosArray = registroObjectToArray(parte.ADVOGADOS);
        const advogados = advogadosArray.length > 0
            ? advogadosArray
                .map((adv) => {
                const nomeAdv = adv.NOME || "N/A";
                const oab = adv.OAB
                    ? `OAB ${adv.OAB.UF}/${adv.OAB.NUMERO}`
                    : "OAB não informada";
                return `${nomeAdv} (${oab})`;
            })
                .join(", ")
            : "Sem advogados registrados";
        return (`${index + 1}. ${tipo} - ${nome}\n` +
            `   - Polo: ${polo}\n` +
            `   - Documento: ${documento}\n` +
            `   - Advogados: ${advogados}`);
    })
        .join("\n\n");
};
const formatMovimentos = (movimentosObj) => {
    const movimentosArray = registroObjectToArray(movimentosObj);
    if (movimentosArray.length === 0)
        return "Sem movimentos registrados";
    const ultimosMovimentos = movimentosArray.slice(0, 10);
    return ultimosMovimentos
        .map((mov, index) => {
        const nomeOriginalArray = registroObjectToArray(mov.NOMEORIGINAL);
        const descricao = nomeOriginalArray.length > 0
            ? nomeOriginalArray[0]
            : mov.DESCRICAO || "N/A";
        const data = mov.DATA || "N/A";
        return `${index + 1}. [${data}] ${descricao}`;
    })
        .join("\n");
};
exports.ingestJuridicoDetailedData = (0, traceable_1.traceable)(function ingestJuridicoDetailedData(fullJson, document, name, existingSessionId, processId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        console.log("⚖️ [Juridico Detailed Ingest] Iniciando ingestão de dados detalhados...");
        console.log(`📌 [Juridico Detailed Ingest] SessionID: ${existingSessionId} (reutilizado)`);
        console.log(`🔖 [Juridico Detailed Ingest] ProcessID: ${processId}`);
        const processData = (_a = fullJson === null || fullJson === void 0 ? void 0 : fullJson.RESPOSTA) === null || _a === void 0 ? void 0 : _a.DATA;
        if (!processData) {
            console.warn("⚠️ [Juridico Detailed Ingest] Nenhum dado de processo encontrado.");
            return { sessionId: existingSessionId, count: 0 };
        }
        const pageContent = `
🔖 PROCESSO ID: ${processId}
📋 TIPO: CONSULTA DETALHADA (JURÍDICO COMPLETO)

═══════════════════════════════════════════════════════════════
IDENTIFICAÇÃO DO PROCESSO
═══════════════════════════════════════════════════════════════
- Número CNJ: ${processData.NUMEROPROCESSOUNICO || "N/A"}
- URL do Processo: ${processData.URLPROCESSO || "N/A"}
- Grau: ${processData.GRAUPROCESSO || "N/A"}
- Sistema: ${processData.SISTEMA || "N/A"}
- Segmento: ${processData.SEGMENTO || "N/A"}

═══════════════════════════════════════════════════════════════
LOCALIZAÇÃO E COMPETÊNCIA
═══════════════════════════════════════════════════════════════
- Tribunal: ${processData.TRIBUNAL || "N/A"}
- UF: ${processData.UF || "N/A"}
- Órgão Julgador: ${processData.ORGAOJULGADOR || "N/A"}
- Unidade de Origem: ${processData.UNIDADEORIGEM || "N/A"}
- Juiz: ${processData.JUIZ || "N/A"}

═══════════════════════════════════════════════════════════════
CLASSIFICAÇÃO
═══════════════════════════════════════════════════════════════
- Área: ${processData.AREA || "N/A"}
- Classe Processual: ${((_b = processData.CLASSEPROCESSUAL) === null || _b === void 0 ? void 0 : _b.NOME) || "N/A"} (CNJ: ${((_c = processData.CLASSEPROCESSUAL) === null || _c === void 0 ? void 0 : _c.CODIGOCNJ) || "N/A"})

ASSUNTOS:
${formatAssuntos(processData.ASSUNTOSCNJ)}

═══════════════════════════════════════════════════════════════
DATAS IMPORTANTES
═══════════════════════════════════════════════════════════════
- Data de Distribuição: ${processData.DATADISTRIBUICAO || "N/A"}
- Data de Autuação: ${processData.DATAAUTUACAO || "N/A"}
- Data de Processamento: ${processData.DATAPROCESSAMENTO || "N/A"}

═══════════════════════════════════════════════════════════════
VALOR E CARACTERÍSTICAS
═══════════════════════════════════════════════════════════════
- Valor da Causa: ${((_d = processData.VALORCAUSA) === null || _d === void 0 ? void 0 : _d.MOEDA) || "R$"} ${((_e = processData.VALORCAUSA) === null || _e === void 0 ? void 0 : _e.VALOR) || "0"}
- Justiça Gratuita: ${processData.EJUSTICAGRATUITA === "1" ? "Sim" : "Não"}
- Processo Digital: ${processData.EPROCESSODIGITAL === "1" ? "Sim" : "Não"}
- Status: ${((_f = processData.STATUSPREDICTUS) === null || _f === void 0 ? void 0 : _f.STATUSPROCESSO) || "N/A"}

═══════════════════════════════════════════════════════════════
PARTES ENVOLVIDAS
═══════════════════════════════════════════════════════════════
${formatPartes(processData.PARTES)}

═══════════════════════════════════════════════════════════════
MOVIMENTOS PROCESSUAIS (ÚLTIMOS 10)
═══════════════════════════════════════════════════════════════
${formatMovimentos(processData.MOVIMENTOS)}

═══════════════════════════════════════════════════════════════
DADOS DO ALVO DA CONSULTA
═══════════════════════════════════════════════════════════════
- Nome: ${name}
- Documento: ${document}
        `.trim();
        const partesArray = registroObjectToArray(processData.PARTES);
        const autores = partesArray.filter((p) => p.POLO === "ATIVO").map((p) => p.NOME).join(", ");
        const reus = partesArray.filter((p) => p.POLO === "PASSIVO").map((p) => p.NOME).join(", ");
        const detailedDocument = new documents_1.Document({
            pageContent: pageContent,
            metadata: {
                sessionId: existingSessionId,
                processId: processId,
                name: name,
                document: document,
                processNumber: processData.NUMEROPROCESSOUNICO,
                area: processData.AREA,
                tribunal: processData.TRIBUNAL,
                uf: processData.UF,
                value: parseFloat(((_g = processData.VALORCAUSA) === null || _g === void 0 ? void 0 : _g.VALOR) || "0"),
                status: ((_h = processData.STATUSPREDICTUS) === null || _h === void 0 ? void 0 : _h.STATUSPROCESSO) || "N/A",
                grau: processData.GRAUPROCESSO || "N/A",
                classe: ((_j = processData.CLASSEPROCESSUAL) === null || _j === void 0 ? void 0 : _j.NOME) || "N/A",
                dataDistribuicao: processData.DATADISTRIBUICAO || "N/A",
                juiz: processData.JUIZ || "N/A",
                orgaoJulgador: processData.ORGAOJULGADOR || "N/A",
                autores: autores || "N/A",
                reus: reus || "N/A",
                source: "api_juridica_detailed",
                isDetailed: true,
                partesCount: partesArray.length,
                movimentosCount: registroObjectToArray(processData.MOVIMENTOS).length,
                assuntosCount: registroObjectToArray(processData.ASSUNTOSCNJ).length
            }
        });
        console.log(`[Juridico Detailed Ingest] Inserindo 1 documento detalhado para o processo ${processId}...`);
        const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
            client: config_1.qdrantClient,
            collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
        });
        yield vectorStore.addDocuments([detailedDocument]);
        console.log(`[Juridico Detailed Ingest] ✅ Sucesso! Dados detalhados adicionados ao SessionID: ${existingSessionId}`);
        return {
            sessionId: existingSessionId,
            count: 1,
            processId: processId
        };
    });
}, { name: "Ingestão de dados DETALHADOS - JURIDICO", run_type: "tool" });
