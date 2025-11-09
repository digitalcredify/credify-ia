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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.ingestData = ingestData;
exports.createVectorIndex = createVectorIndex;
exports.checkIfDataExists = checkIfDataExists;
const config_1 = require("../config");
const EMBEDDING_DIMENSIONS = 1536;
function getEmbedding(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield config_1.openAIClient.embeddings.create({
                input: data,
                model: 'text-embedding-3-small',
            });
            if (response.data && response.data.length > 0) {
                return response.data[0].embedding;
            }
            throw new Error("Nenhum embedding encontrado na OpenAI response.");
        }
        catch (error) {
            console.error("Erro ao gerar o embedding da OpenAI:", error);
            return null;
        }
    });
}
function ingestData(jsonData, month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Iniciando ingestão de dados...');
        try {
            const documents = jsonData.data;
            if (!Array.isArray(documents)) {
                throw new Error("O JSON recebido não contém um array 'data'.");
            }
            console.log(`Documentos JSON encontrados: ${documents.length}`);
            const insertDocuments = yield Promise.all(documents.map((doc) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const textToEmbed = `
                Empresa: ${(_b = (_a = doc.company) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'N/A'}
                Plano: ${(_d = (_c = doc.plan) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'N/A'}
                Organização: ${(_f = (_e = doc.organization) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : 'N/A'}
                Representante: ${(_h = (_g = doc.representative) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : 'N/A'}
            `;
                const embedding = yield getEmbedding(textToEmbed);
                return Object.assign(Object.assign({}, doc), { embedding: embedding, month: month });
            })));
            const validDocuments = insertDocuments.filter(d => d.embedding);
            if (validDocuments.length === 0) {
                throw new Error("Nenhum documento foi 'embedado' com sucesso.");
            }
            yield config_1.vectorCollection.deleteMany({ month: month });
            const result = yield config_1.vectorCollection.insertMany(validDocuments, { ordered: false });
            console.log(`Documentos JSON inseridos para ${month}: ${result.insertedCount}`);
            return result.insertedCount;
        }
        catch (error) {
            console.error("Erro de ingestão:", error);
            throw error;
        }
    });
}
function createVectorIndex() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        try {
            const existingIndex = yield config_1.vectorCollection.listSearchIndexes().toArray();
            if (existingIndex.some(index => index.name === "vector_index")) {
                console.log("Vector index already exists. Skipping creation.");
                return;
            }
            const index = {
                name: "vector_index",
                type: "vectorSearch",
                definition: {
                    "fields": [
                        { "type": "vector", "path": "embedding", "numDimensions": EMBEDDING_DIMENSIONS, "similarity": "cosine" },
                        // ADICIONA OS CAMPOS DE FILTRO
                        { "type": "filter", "path": "month" },
                        { "type": "filter", "path": "representative.name" },
                        { "type": "filter", "path": "organization.name" },
                        { "type": "filter", "path": "company.type" },
                        { "type": "filter", "path": "company.name" }
                    ]
                }
            };
            const result = yield config_1.vectorCollection.createSearchIndex(index);
            console.log(`Novo index criado => ${result} `);
            console.log("Verificando se o indice está pronto...");
            let isQueryable = false;
            while (!isQueryable) {
                const cursor = config_1.vectorCollection.listSearchIndexes();
                try {
                    for (var _d = true, cursor_1 = (e_1 = void 0, __asyncValues(cursor)), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                        _c = cursor_1_1.value;
                        _d = false;
                        const index = _c;
                        const i = index;
                        if (i.name === result) {
                            if (i.queryable) {
                                console.log(`${result} está pronto para consulta.`);
                                isQueryable = true;
                            }
                            else {
                                yield new Promise(resolve => setTimeout(resolve, 5000));
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        catch (error) {
            console.error("Erro ao criar vector Index:", error);
            throw error;
        }
    });
}
function checkIfDataExists(month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Verificando se dados para o mês ${month} já existem...`);
        try {
            const doc = yield config_1.vectorCollection.findOne({ month: month });
            if (doc) {
                console.log(`Dados para ${month} encontrados.`);
                return true;
            }
            console.log(`Dados para ${month} não encontrados.`);
            return false;
        }
        catch (error) {
            console.error("Erro ao verificar dados:", error);
            return false;
        }
    });
}
