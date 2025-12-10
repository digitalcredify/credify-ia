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
exports.ingestOperationData = exports.checkIfRangeExists = exports.QDRANT_OPERATION_COLLECTION_NAME = void 0;
exports.isRangeContained = isRangeContained;
const traceable_1 = require("langsmith/traceable");
const documents_1 = require("@langchain/core/documents");
const qdrant_1 = require("@langchain/qdrant");
const config_1 = require("../../config");
exports.QDRANT_OPERATION_COLLECTION_NAME = "credify_operation_collection";
function parseDate(dateString) {
    return new Date(dateString);
}
function isRangeContained(requestStart, requestEnd, existingStart, existingEnd) {
    return requestStart >= existingStart && requestEnd <= existingEnd;
}
exports.checkIfRangeExists = (0, traceable_1.traceable)(function checkIfRangeExists(startDate, endDate, startHour, endHour) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            console.log(`[Operation Ingest] Verificando se range ${startDate} a ${endDate} ${startHour}h - ${endHour}h já existe...`);
            const requestStart = parseDate(startDate);
            const requestEnd = parseDate(endDate);
            const requestStartHour = parseInt(startHour);
            const requestEndHour = parseInt(endHour);
            const scrollResult = yield config_1.qdrantClient.scroll(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                limit: 100,
                with_payload: true,
                with_vector: false
            });
            if (!scrollResult.points || scrollResult.points.length === 0) {
                console.log(`[Operation Ingest] Nenhum range encontrado na coleção.`);
                return false;
            }
            const existingRanges = new Set();
            for (const point of scrollResult.points) {
                const payload = point.payload;
                if (((_a = payload === null || payload === void 0 ? void 0 : payload.metadata) === null || _a === void 0 ? void 0 : _a.startDate) &&
                    ((_b = payload === null || payload === void 0 ? void 0 : payload.metadata) === null || _b === void 0 ? void 0 : _b.endDate) &&
                    ((_c = payload === null || payload === void 0 ? void 0 : payload.metadata) === null || _c === void 0 ? void 0 : _c.startHour) !== undefined &&
                    ((_d = payload === null || payload === void 0 ? void 0 : payload.metadata) === null || _d === void 0 ? void 0 : _d.endHour) !== undefined) {
                    const rangeKey = `${payload.metadata.startDate}|${payload.metadata.endDate}|${payload.metadata.startHour}|${payload.metadata.endHour}`;
                    existingRanges.add(rangeKey);
                }
            }
            console.log(`[Operation Ingest] Encontrados ${existingRanges.size} ranges únicos na coleção.`);
            for (const rangeKey of existingRanges) {
                const [existingStartStr, existingEndStr, existingStartHourStr, existingEndHourStr] = rangeKey.split('|');
                const existingStart = parseDate(existingStartStr);
                const existingEnd = parseDate(existingEndStr);
                const existingStartHour = parseInt(existingStartHourStr);
                const existingEndHour = parseInt(existingEndHourStr);
                const dateRangeContained = isRangeContained(requestStart, requestEnd, existingStart, existingEnd);
                const hourRangeContained = requestStartHour >= existingStartHour && requestEndHour <= existingEndHour;
                if (dateRangeContained && hourRangeContained) {
                    console.log(`[Operation Ingest] ✅ Range solicitado está contido em: ${existingStartStr} a ${existingEndStr} (${existingStartHourStr}h - ${existingEndHourStr}h)`);
                    return true;
                }
            }
            console.log(`[Operation Ingest] ❌ Range solicitado NÃO está contido em nenhum range existente.`);
            return false;
        }
        catch (error) {
            if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
                console.log(`[Operation Ingest] Coleção não existe ainda.`);
                return false;
            }
            console.error("[Operation Ingest] Erro ao verificar ranges:", error);
            return false;
        }
    });
}, { name: "Check If Range Exists", run_type: "retriever" });
function ensureOperationCollectionExists() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const collectionInfo = yield config_1.qdrantClient.getCollection(exports.QDRANT_OPERATION_COLLECTION_NAME);
            console.log(`[Qdrant] Coleção '${exports.QDRANT_OPERATION_COLLECTION_NAME}' já existe.`);
            return;
        }
        catch (error) {
            if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
                console.log(`[Qdrant] Coleção não encontrada. Criando '${exports.QDRANT_OPERATION_COLLECTION_NAME}'...`);
                try {
                    yield config_1.qdrantClient.createCollection(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                        vectors: {
                            size: 1536,
                            distance: "Cosine"
                        }
                    });
                    console.log(`[Qdrant] ✅ Coleção criada!`);
                    yield config_1.qdrantClient.createPayloadIndex(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                        field_name: "metadata.startDate",
                        field_schema: "keyword"
                    });
                    yield config_1.qdrantClient.createPayloadIndex(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                        field_name: "metadata.endDate",
                        field_schema: "keyword"
                    });
                    yield config_1.qdrantClient.createPayloadIndex(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                        field_name: "metadata.startHour",
                        field_schema: "integer"
                    });
                    yield config_1.qdrantClient.createPayloadIndex(exports.QDRANT_OPERATION_COLLECTION_NAME, {
                        field_name: "metadata.endHour",
                        field_schema: "integer"
                    });
                    console.log(`[Qdrant] ✅ Índices criados para startDate, endDate, startHour e endHour!`);
                }
                catch (createError) {
                    if (createError.message && createError.message.includes("already exists")) {
                        console.log(`[Qdrant] Coleção já foi criada por outra requisição.`);
                        return;
                    }
                    throw createError;
                }
            }
            else {
                throw error;
            }
        }
    });
}
function processOperationData(jsonData, startDate, endDate, startHour, endHour) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const documents = [];
    if ((_a = jsonData.datasets) === null || _a === void 0 ? void 0 : _a.products) {
        for (const product of jsonData.datasets.products) {
            const content = `
Produto: ${product.product.name}
ID: ${product.product.id}
Total de execuções: ${product.total}
Sucessos: ${product.successes}
Sucessos com dados: ${product.successesWithData}
Sucessos sem dados: ${product.successesWithoutData}
Falhas: ${product.fails}
Pendentes: ${product.pendings}
Tempo médio de execução: ${product.averageExecutionTime}ms
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "product", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), productId: product.product.id, productName: product.product.name }, product)
            }));
        }
    }
    if ((_b = jsonData.datasets) === null || _b === void 0 ? void 0 : _b.hourlyMetrics) {
        for (const hourly of jsonData.datasets.hourlyMetrics) {
            const content = `
Hora: ${hourly.hour}:00
Total de execuções: ${hourly.total}
Sucessos: ${hourly.successes}
Sucessos com dados: ${hourly.successesWithData}
Sucessos sem dados: ${hourly.successesWithoutData}
Falhas: ${hourly.fails}
Pendentes: ${hourly.pendings}
Tempo médio de execução: ${hourly.averageExecutionTime}ms
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "hourlyMetric", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), hour: hourly.hour }, hourly)
            }));
        }
    }
    if ((_c = jsonData.datasets) === null || _c === void 0 ? void 0 : _c.applicationsOrigin) {
        for (const app of jsonData.datasets.applicationsOrigin) {
            const content = `
Aplicação: ${app.application.name}
ID: ${app.application.id}
Total de execuções: ${app.total}
Sucessos: ${app.successes}
Sucessos com dados: ${app.successesWithData}
Sucessos sem dados: ${app.successesWithoutData}
Falhas: ${app.fails}
Pendentes: ${app.pendings}
Tempo médio de execução: ${app.averageExecutionTime}ms
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "application", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), applicationId: app.application.id, applicationName: app.application.name }, app)
            }));
        }
    }
    if ((_d = jsonData.datasets) === null || _d === void 0 ? void 0 : _d.usersList) {
        for (const user of jsonData.datasets.usersList) {
            const content = `
Usuário: ${user.user.login}
ID: ${user.user.id}
Total de execuções: ${user.total}
Sucessos: ${user.successes}
Sucessos com dados: ${user.successesWithData}
Sucessos sem dados: ${user.successesWithoutData}
Falhas: ${user.fails}
Pendentes: ${user.pendings}
Tempo médio de execução: ${user.averageExecutionTime}ms
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "user", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), userId: user.user.id, userLogin: user.user.login }, user)
            }));
        }
    }
    if ((_e = jsonData.datasets) === null || _e === void 0 ? void 0 : _e.dailyMetrics) {
        for (const daily of jsonData.datasets.dailyMetrics) {
            const content = `
Data: ${daily.date}
Total de execuções: ${daily.total}
Sucessos: ${daily.successes}
Sucessos com dados: ${daily.successesWithData}
Sucessos sem dados: ${daily.successesWithoutData}
Falhas: ${daily.fails}
Pendentes: ${daily.pendings}
Tempo médio de execução: ${daily.averageExecutionTime}ms
Total mapeado: ${((_f = daily.fields) === null || _f === void 0 ? void 0 : _f.totalMapped) || 0}
Total retornado: ${((_g = daily.fields) === null || _g === void 0 ? void 0 : _g.totalReturned) || 0}
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "dailyMetric", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), date: daily.date }, daily)
            }));
        }
    }
    if ((_h = jsonData.datasets) === null || _h === void 0 ? void 0 : _h.companiesBreakdown) {
        for (const company of jsonData.datasets.companiesBreakdown) {
            const content = `
Empresa: ${company.company.name}
ID: ${company.company.id}
Tipo: ${company.company.type}
Totais da empresa:
- Total de execuções: ${company.totals.total}
- Sucessos: ${company.totals.successes}
- Sucessos com dados: ${company.totals.successesWithData}
- Sucessos sem dados: ${company.totals.successesWithoutData}
- Falhas: ${company.totals.fails}
- Pendentes: ${company.totals.pendings}
- Tempo médio de execução: ${company.totals.averageExecutionTime}ms
            `.trim();
            documents.push(new documents_1.Document({
                pageContent: content,
                metadata: Object.assign({ type: "company", startDate,
                    endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), companyId: company.company.id, companyName: company.company.name, companyType: company.company.type }, company.totals)
            }));
            if (company.users) {
                for (const user of company.users) {
                    const userContent = `
Usuário: ${user.login}
ID: ${user.id}
Conta: ${user.accountName}
Empresa: ${company.company.name}
Total de execuções: ${user.total}
Sucessos: ${user.successes}
Sucessos com dados: ${user.successesWithData}
Sucessos sem dados: ${user.successesWithoutData}
Falhas: ${user.fails}
Pendentes: ${user.pendings}
Tempo médio de execução: ${user.averageExecutionTime}ms
                    `.trim();
                    documents.push(new documents_1.Document({
                        pageContent: userContent,
                        metadata: Object.assign({ type: "companyUser", startDate,
                            endDate, startHour: parseInt(startHour), endHour: parseInt(endHour), userId: user.id, userLogin: user.login, companyId: company.company.id, companyName: company.company.name }, user)
                    }));
                }
            }
        }
    }
    return documents;
}
exports.ingestOperationData = (0, traceable_1.traceable)(function ingestOperationData(jsonData, startDate, endDate, startHour, endHour) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Operation Ingest] Iniciando ingestão para range: ${startDate} a ${endDate} (${startHour}h - ${endHour}h)`);
            yield ensureOperationCollectionExists();
            const documents = processOperationData(jsonData, startDate, endDate, startHour, endHour);
            console.log(`[Operation Ingest] ${documents.length} documentos criados`);
            if (documents.length === 0) {
                console.log(`[Operation Ingest] Nenhum documento para ingerir.`);
                return;
            }
            const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
                client: config_1.qdrantClient,
                collectionName: exports.QDRANT_OPERATION_COLLECTION_NAME,
            });
            yield vectorStore.addDocuments(documents);
            console.log(`[Operation Ingest] ✅ ${documents.length} documentos ingeridos com sucesso!`);
        }
        catch (error) {
            console.error("[Operation Ingest] Erro ao ingerir dados:", error);
            throw error;
        }
    });
}, { name: "Ingest Operation Data", run_type: "tool" });
